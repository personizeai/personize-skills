/**
 * script-fleet-dispatch.ts
 *
 * Fleet Dispatch -- one bounded subagent per record (Production Pattern N).
 *
 * Runs the SAME fixed chain across a record set and returns predictable cost and
 * uniform output: select -> forecast -> (per record) Recall -> Govern -> Act -> Write back.
 * The unit of work is ONE record, not an open-ended agent looping over all of them, so
 * cost = records x per-record token envelope x tier -- forecastable before you spend a credit.
 *
 * What it does:
 *   - Selects the record set via filterByProperty (free, deterministic) or a JSON list.
 *   - Forecasts cost before dispatch and asks for confirmation past a threshold.
 *   - Processes records with a concurrency cap (a fleet, not a stampede).
 *   - Hard isolation: each subagent's recall is scoped to its own record key.
 *   - Retry-once-then-skip per record so one bad record never aborts the fleet.
 *   - Checkpoints progress to a JSON file and resumes (skips already-done records).
 *   - Dry-run by default: prints the plan + forecast, writes nothing.
 *
 * Usage:
 *   # Select by property filter, preview the plan + forecast (writes nothing)
 *   npx ts-node script-fleet-dispatch.ts \
 *     --type Company \
 *     --filter '[{"propertyName":"tier","operator":"equals","value":"enterprise"}]' \
 *     --task enrich
 *
 *   # Or pass an explicit record list instead of a filter
 *   npx ts-node script-fleet-dispatch.ts \
 *     --records '[{"email":"alice@acme.com"},{"websiteUrl":"acme.com"}]' --task score
 *
 *   # Live run with a concurrency cap and a higher confirm threshold
 *   npx ts-node script-fleet-dispatch.ts --type Company --task enrich \
 *     --concurrency 5 --confirm-threshold 200 --live
 *
 *   # Resume an interrupted run from its checkpoint (done records are skipped)
 *   npx ts-node script-fleet-dispatch.ts --type Company --task enrich \
 *     --checkpoint .fleet-enrich.json --resume --live
 *
 * Flags:
 *   --task <id>              Per-record chain to run: enrich|score|summarize (default: summarize)
 *   --type <entityType>      Entity type for filterByProperty + recall scoping (default: contact)
 *   --filter <json>          JSON array of { propertyName, operator, value } conditions
 *   --records <json>         JSON array of { email?|websiteUrl?|recordId? } (overrides --filter)
 *   --limit <n>              Max records to select via filter (default: 100, max: 200)
 *   --concurrency <n>        Max records processed in parallel (default: 4, max: 20)
 *   --tier <tier>           Act tier: basic|pro|ultra (default: pro)
 *   --confirm-threshold <n>  Ask before dispatch if forecast credits exceed this (default: 100)
 *   --checkpoint <path>      Progress file (default: .fleet-<task>.json)
 *   --resume                 Skip records already recorded done in the checkpoint
 *   --yes                    Skip the confirmation prompt (for non-interactive runs)
 *   --live                   Actually run + write back (default: dry run)
 *   --help                   Print this help and exit
 */

import * as fs from 'fs';
import * as readline from 'readline';
import { Personize } from '@personize/sdk';

// ── CLI helpers ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const get = (flag: string): string | undefined => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (flag: string): boolean => args.includes(flag);

if (has('--help')) {
  // The header comment IS the help text; print it verbatim so --help is self-documenting.
  const self = fs.readFileSync(__filename, 'utf-8');
  const doc = self.slice(self.indexOf('/**') + 3, self.indexOf('*/'));
  console.log(doc.replace(/^\s*\* ?/gm, '').trim());
  process.exit(0);
}

const dryRun = !has('--live');

if (!process.env.PERSONIZE_SECRET_KEY) {
  console.error(JSON.stringify({ error: 'PERSONIZE_SECRET_KEY not set' }));
  process.exit(1);
}

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

// ── Config + self-documenting constants ──────────────────────────────────────

const VALID_TASKS = ['enrich', 'score', 'summarize'] as const;
type TaskId = typeof VALID_TASKS[number];

const task             = (get('--task') as TaskId) ?? 'summarize';
const entityType       = get('--type') ?? 'contact';
const filterArg        = get('--filter');
const recordsArg       = get('--records');
const limit            = Math.min(parseInt(get('--limit') ?? '100', 10), 200);
const concurrency      = Math.min(Math.max(parseInt(get('--concurrency') ?? '4', 10), 1), 20);
const tier             = (get('--tier') as 'basic' | 'pro' | 'ultra') ?? 'pro';
const confirmThreshold = parseInt(get('--confirm-threshold') ?? '100', 10);
const checkpointPath   = get('--checkpoint') ?? `.fleet-${task}.json`;
const resume           = has('--resume');
const autoYes          = has('--yes');

if (!VALID_TASKS.includes(task)) {
  console.error(JSON.stringify({ error: `Unknown --task: ${task}`, validTasks: VALID_TASKS }));
  process.exit(1);
}

// Per-record token envelope -> credit cost, by tier. The whole point of the fleet:
// total spend = records x this number. Tune to your account's measured rates.
const TIER_CREDITS: Record<typeof tier, number> = { basic: 1, pro: 3, ultra: 6 };
// recall (smartRecall, fast) + govern (smartGuidelines, fast) + act (ai.prompt @ tier).
const CREDITS_PER_RECORD = 1 /* recall */ + 1 /* govern */ + TIER_CREDITS[tier];

// ── Record selection ─────────────────────────────────────────────────────────

interface FleetRecord { recordId?: string; email?: string; websiteUrl?: string }

/** Stable per-record key for isolation, checkpointing, and logging. */
function keyOf(r: FleetRecord): string {
  return r.recordId ?? r.email ?? r.websiteUrl ?? JSON.stringify(r);
}

async function selectRecords(): Promise<FleetRecord[]> {
  // Explicit list wins -- lets a caller drive the fleet from an upstream stage.
  if (recordsArg) {
    const parsed = JSON.parse(recordsArg) as FleetRecord[];
    return parsed.filter(r => r.recordId || r.email || r.websiteUrl);
  }
  // Otherwise select via filterByProperty: free, deterministic, no LLM cost.
  const conditions = filterArg ? JSON.parse(filterArg) : [];
  const result = await client.memory.filterByProperty({ type: entityType, conditions, limit });
  const records = (result.data?.records ?? []) as Array<{ recordId: string }>;
  return records.map(r => ({ recordId: r.recordId }));
}

// ── Checkpointing (resume support) ───────────────────────────────────────────

type Outcome = 'succeeded' | 'failed' | 'skipped';
interface Checkpoint { task: string; done: Record<string, Outcome> }

function loadCheckpoint(): Checkpoint {
  if (resume && fs.existsSync(checkpointPath)) {
    try { return JSON.parse(fs.readFileSync(checkpointPath, 'utf-8')); } catch { /* fall through */ }
  }
  return { task, done: {} };
}

function saveCheckpoint(cp: Checkpoint): void {
  try { fs.writeFileSync(checkpointPath, JSON.stringify(cp, null, 2)); }
  catch (err) { process.stderr.write(`Checkpoint write failed: ${(err as Error).message}\n`); }
}

// ── The per-record chain: Recall -> Govern -> Act -> Write back ───────────────
// This is the editable heart of the fleet. Every subagent runs exactly this, so the
// output shape is identical across the whole run. Swap the Act prompt / write-back
// property per task -- keep the four-step skeleton.

interface ChainResult { key: string; status: Outcome; summary?: string; error?: string }

async function runChain(record: FleetRecord): Promise<ChainResult> {
  const key = keyOf(record);
  // Identity scope -- the SAME object is passed to every step so recall, govern, and
  // write-back all stay locked to this one record. Hard isolation, no cross-bleed.
  const scope: { recordId?: string; email?: string; websiteUrl?: string; type: string } = {
    ...(record.recordId  ? { recordId: record.recordId }   : {}),
    ...(record.email     ? { email: record.email }         : {}),
    ...(record.websiteUrl ? { websiteUrl: record.websiteUrl } : {}),
    type: entityType,
  };

  // 1. RECALL -- the record's own compacted history, scoped to its key (isolation).
  const recall = await client.memory.smartRecall({
    ...scope,
    query: `everything known about this ${entityType} relevant to: ${task}`,
    mode: 'fast',
  });
  const context = (recall as any).data?.results?.map((r: any) => r.text).join('\n')
    ?? (recall as any).data?.answer ?? '';

  // 2. GOVERN -- the org guidelines that apply to this task (selective, not all of them).
  const gov = await client.ai.smartGuidelines({ message: `${task} a ${entityType}`, mode: 'fast' });
  const guidelines = (gov as any).compiledContext ?? (gov as any).data?.content ?? '';

  // 3. ACT -- one ai.prompt at the chosen tier. Fabrication refusal is baked in: when a
  // field can't be grounded, the model must say UNKNOWN rather than invent a value.
  const PROMPTS: Record<TaskId, string> = {
    enrich:    'Extract verifiable firmographic/contact facts. For any field you cannot ground in the context, output "UNKNOWN" -- never guess.',
    score:     'Score this record 0-100 for fit and give a one-line justification grounded in the context. If there is too little signal, output "INSUFFICIENT".',
    summarize: 'Write a 3-bullet executive brief: who they are, relationship status, recommended next action. Use only facts present in the context.',
  };
  const act = await client.ai.prompt({
    instructions: [
      [
        PROMPTS[task],
        '', 'WHAT WE KNOW (scoped to this record only):', context || '(no prior context)',
        '', 'ORG GUIDELINES (follow strictly):', guidelines || '(none found)',
        '', 'Return your result inside <output name="result">...</output>.',
      ].join('\n'),
    ],
    outputs: [{ name: 'result' }],
    tier,
  });
  const summary = String((act as any).outputs?.result ?? (act as any).text ?? '').trim();

  if (!summary) return { key, status: 'skipped', error: 'empty output -- insufficient context' };

  // 4. WRITE BACK -- append-only to a per-task log array on the record (push, never
  // overwrite). Keeps an auditable trail and never clobbers a teammate's write.
  if (!dryRun) {
    // Identity passed via `scope` (recordId | email | websiteUrl) -- the backend resolves
    // whichever is present to the canonical recordId before applying the append.
    await client.memory.update({
      ...scope,
      propertyName: `fleet_${task}_log`,
      arrayPush: { items: [{ at: new Date().toISOString(), tier, result: summary.slice(0, 2000) }] },
      reason: `fleet-dispatch:${task}`,
    } as any);
  }

  return { key, status: 'succeeded', summary: summary.slice(0, 240) };
}

/** Retry-once-then-skip: one transient failure is retried; a second downgrades to skip
 *  so a single bad record can never abort the fleet. */
async function processRecord(record: FleetRecord): Promise<ChainResult> {
  const key = keyOf(record);
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await runChain(record);
    } catch (err) {
      const msg = (err as Error).message ?? 'unknown';
      if (attempt === 2) return { key, status: 'skipped', error: `skipped after retry: ${msg}` };
      process.stderr.write(`  ${key}: attempt 1 failed (${msg}), retrying once...\n`);
    }
  }
  return { key, status: 'skipped', error: 'unreachable' };
}

// ── Concurrency-capped runner ────────────────────────────────────────────────
// A fixed pool of N workers pulls from a shared queue. Caps in-flight subagents so the
// fleet doesn't stampede the API -- predictable concurrency, predictable rate.

async function runFleet(records: FleetRecord[], cp: Checkpoint): Promise<ChainResult[]> {
  const results: ChainResult[] = [];
  let cursor = 0;
  let completed = 0;

  async function worker(): Promise<void> {
    while (cursor < records.length) {
      const record = records[cursor++];
      const result = await processRecord(record);
      results.push(result);
      cp.done[result.key] = result.status;
      saveCheckpoint(cp); // checkpoint after every record -- resume picks up exactly here
      completed++;
      process.stderr.write(
        `[${completed}/${records.length}] ${result.key}: ${result.status}` +
        (result.error ? ` (${result.error})` : '') + '\n'
      );
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, records.length) }, () => worker()));
  return results;
}

// ── Confirmation prompt ──────────────────────────────────────────────────────

function confirm(question: string): Promise<boolean> {
  if (autoYes) return Promise.resolve(true);
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise(resolve =>
    rl.question(`${question} [y/N] `, ans => { rl.close(); resolve(/^y(es)?$/i.test(ans.trim())); })
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const cp = loadCheckpoint();

  const all = await selectRecords();
  // Resume: drop records the checkpoint already finished, so a re-run only does what's left.
  const pending = resume ? all.filter(r => !cp.done[keyOf(r)]) : all;

  const forecastCredits = pending.length * CREDITS_PER_RECORD;
  const plan = {
    task, entityType, tier, concurrency,
    selected: all.length,
    alreadyDone: all.length - pending.length,
    toProcess: pending.length,
    creditsPerRecord: CREDITS_PER_RECORD,
    forecastCredits,
    checkpoint: checkpointPath,
    dryRun,
  };
  process.stderr.write(`Fleet plan: ${JSON.stringify(plan)}\n`);

  if (pending.length === 0) {
    console.log(JSON.stringify({ ...plan, status: 'nothing-to-do' }));
    return;
  }

  if (dryRun) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      ...plan,
      sample: pending.slice(0, 5).map(keyOf),
      message: 'Pass --live to dispatch the fleet',
    }, null, 2));
    return;
  }

  // Cost gate: forecast is records x per-record envelope; confirm past the threshold.
  if (forecastCredits > confirmThreshold) {
    const ok = await confirm(
      `Forecast ~${forecastCredits} credits for ${pending.length} records (${task}/${tier}). Proceed?`
    );
    if (!ok) {
      console.log(JSON.stringify({ ...plan, status: 'aborted-by-user' }));
      return;
    }
  }

  const results = await runFleet(pending, cp);

  const tally = (s: Outcome) => results.filter(r => r.status === s).length;
  console.log(JSON.stringify({
    mode: 'live',
    ...plan,
    succeeded: tally('succeeded'),
    failed: tally('failed'),
    skipped: tally('skipped'),
    checkpointSaved: checkpointPath,
  }, null, 2));
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
