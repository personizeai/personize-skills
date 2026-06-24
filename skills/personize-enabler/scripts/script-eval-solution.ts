/**
 * script-eval-solution.ts
 *
 * Evaluation harness for a Personize solution. Loads scenarios from a JSON file,
 * runs the right eval per scenario type, prints a results table + summary.
 *
 * Build evals FIRST: run against a baseline (no tuned schema/governance) to find the
 * gaps, then build to pass. Re-run after every schema or guideline change.
 *
 * Eval types -> the call each makes -> what it proves:
 *   extraction -> client.evaluate.memorizationAccuracy() -> schema pulls the right typed values
 *   recall     -> client.memory.smartRecall()            -> query returns the expected record in top-K
 *   governance -> client.ai.smartGuidelines()            -> task routes to the expected guideline
 *
 * Scenario file = JSON array of { name, type, input, expected }. One example per type:
 *   { "name": "extracts Company", "type": "extraction", "input": "Jane, VP Eng at Acme ...",
 *     "expected": { "collectionId": "col_contacts", "properties": { "Company": "Acme" } } }
 *   { "name": "finds quiet acct", "type": "recall", "input": "accounts that went quiet",
 *     "expected": { "mode": "fast", "email": "ops@acme.com" } }
 *   { "name": "cold email tone", "type": "governance", "input": "write a cold email to a CTO",
 *     "expected": { "guideline": "Cold Email Tone" } }
 *
 * Usage:
 *   npx tsx script-eval-solution.ts --file scenarios.json                  # dry run (default)
 *   npx tsx script-eval-solution.ts --file scenarios.json --dry-run=false  # execute
 *   npx tsx script-eval-solution.ts --file scenarios.json --threshold 0.85 --dry-run=false
 *   npx tsx script-eval-solution.ts --help
 *
 * Flags:
 *   --file <path>      Scenarios JSON file, forward-slash path (required).
 *   --threshold <0..1> Pass threshold for extraction accuracy (default: 0.8).
 *   --dry-run=false    Pass to actually call the API (default: dry run, no calls).
 *   --help             Print this header and exit.
 */

import * as fs from 'fs';
import { Personize } from '@personize/sdk';

// -- Self-documenting constants ------------------------------------------------

const VALID_TYPES = ['extraction', 'recall', 'governance'] as const;
type EvalType = typeof VALID_TYPES[number];

const DEFAULT_THRESHOLD = 0.8; // extraction: fraction of expected properties correct
const RECALL_TOP_K = 10;       // recall hits to inspect for the expected record
// Credits per eval, for the dry-run forecast: 1/extract, 1/fast recall, 2/deep, governance free.
const CREDITS = { extraction: 1, recallFast: 1, recallDeep: 2, governance: 0 };

// -- CLI (same idiom as the other enabler scripts) -----------------------------

const args = process.argv.slice(2);
const get = (f: string) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const has = (f: string) => args.includes(f);

if (has('--help')) {
  const src = fs.readFileSync(__filename, 'utf-8');
  console.log(src.slice(src.indexOf('/**') + 3, src.indexOf('*/')).replace(/^\s*\*?/gm, '').trim());
  process.exit(0);
}

const dryRun = !has('--dry-run=false');
const filePath = get('--file');
const threshold = Math.max(0, Math.min(1, parseFloat(get('--threshold') ?? String(DEFAULT_THRESHOLD))));

// -- Types ---------------------------------------------------------------------

interface Scenario { name: string; type: EvalType; input: string; expected: Record<string, any>; }
interface Result {
  name: string; type: EvalType; pass: boolean;
  score?: number; detail: string; credits: number; ms: number; error?: string;
}

const eq = (a: unknown, b: unknown) =>
  String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
const creditsFor = (s: Scenario) =>
  s.type === 'extraction' ? CREDITS.extraction
    : s.type === 'recall' ? (s.expected.mode === 'deep' ? CREDITS.recallDeep : CREDITS.recallFast)
    : CREDITS.governance;

// -- Scenario loading + validation ---------------------------------------------

function loadScenarios(path: string): Scenario[] {
  let parsed: unknown;
  try { parsed = JSON.parse(fs.readFileSync(path, 'utf-8')); }
  catch (err) { throw new Error(`Cannot read/parse scenario file: ${(err as Error).message}`); }
  if (!Array.isArray(parsed)) throw new Error('Scenario file must be a JSON array');

  return (parsed as Scenario[]).map((s, i) => {
    if (!s.name) throw new Error(`Scenario ${i} missing "name"`);
    if (!VALID_TYPES.includes(s.type)) throw new Error(`"${s.name}": bad type "${s.type}" (use ${VALID_TYPES.join('|')})`);
    if (typeof s.input !== 'string') throw new Error(`"${s.name}": missing string "input"`);
    if (!s.expected || typeof s.expected !== 'object') throw new Error(`"${s.name}": missing "expected" object`);
    return s;
  });
}

// -- Eval runners (one per type), each returns the scoring fields ---------------

/** (1) Extraction accuracy via the three-phase memorizationAccuracy eval. */
async function runExtraction(client: Personize, s: Scenario): Promise<Partial<Result>> {
  if (!s.expected.collectionId) return { pass: false, detail: 'expected.collectionId required' };
  const res: any = await client.evaluate.memorizationAccuracy({
    collectionId: s.expected.collectionId,
    input: s.input,
    skipStorage: true, // never pollute real memory from an eval
  });

  const got: Record<string, unknown> = {};
  for (const p of res?.phases ?? [])
    for (const pv of p?.extraction?.propertyValues ?? []) got[String(pv.propertyName)] = pv.value;

  const want: Record<string, unknown> = s.expected.properties ?? {};
  const keys = Object.keys(want);
  if (!keys.length) return { pass: false, detail: 'expected.properties is empty' };

  const misses = keys.filter(k => !eq(got[k], want[k]))
    .map(k => got[k] === undefined ? `${k}(omitted)` : `${k}=${JSON.stringify(got[k])}`);
  const score = (keys.length - misses.length) / keys.length;
  return { pass: score >= threshold, score, detail: misses.length ? `off: ${misses.join(', ')}` : 'all correct' };
}

/** (2) Recall quality: expected record present in top-K. Precision proxy = 1/|results|. */
async function runRecall(client: Personize, s: Scenario): Promise<Partial<Result>> {
  const mode = (s.expected.mode === 'deep' ? 'deep' : 'fast') as 'fast' | 'deep';
  const res: any = await client.memory.smartRecall({
    query: s.input, mode, limit: RECALL_TOP_K,
    ...(s.expected.email && { email: s.expected.email }),
    ...(s.expected.recordId && { recordId: s.expected.recordId }),
    ...(s.expected.websiteUrl && { websiteUrl: s.expected.websiteUrl }),
  });

  const results: any[] = res?.data?.results ?? res?.results ?? [];
  const want = String(s.expected.email ?? s.expected.recordId ?? s.expected.websiteUrl ?? '').toLowerCase();
  const hit = results.some(r =>
    [r.email, r.recordId, r.websiteUrl].filter(Boolean).some(v => String(v).toLowerCase() === want));
  return {
    pass: want ? hit : results.length > 0,
    score: results.length ? Number(((hit ? 1 : 0) / results.length).toFixed(3)) : 0,
    detail: want ? `${hit ? 'found' : 'MISSED'} "${want}" in top ${results.length}` : `${results.length} result(s)`,
  };
}

/** (3) Governance routing: expected guideline name appears in the selection. */
async function runGovernance(client: Personize, s: Scenario): Promise<Partial<Result>> {
  const want = String(s.expected.guideline ?? '').toLowerCase();
  if (!want) return { pass: false, detail: 'expected.guideline (name) required' };
  const res: any = await client.ai.smartGuidelines({ message: s.input });
  const names: string[] = (res?.selection ?? res?.data?.selection ?? [])
    .map((g: any) => String(g.name ?? g.title ?? '').toLowerCase());
  const routed = names.some(n => n.includes(want));
  // Report the full selection so a plausible-but-wrong route is visible too.
  return { pass: routed, detail: `${routed ? 'routed' : 'NOT routed'} -> [${names.join(', ') || 'none'}]` };
}

async function runScenario(client: Personize, s: Scenario): Promise<Result> {
  const t0 = Date.now();
  const base = { name: s.name, type: s.type, credits: creditsFor(s) };
  try {
    const runner = { extraction: runExtraction, recall: runRecall, governance: runGovernance }[s.type];
    const r = await runner(client, s);
    return { ...base, pass: r.pass ?? false, score: r.score, detail: r.detail ?? '', ms: Date.now() - t0 };
  } catch (err) {
    return { ...base, pass: false, credits: 0, detail: 'errored', error: (err as Error).message, ms: Date.now() - t0 };
  }
}

// -- Main ----------------------------------------------------------------------

async function main() {
  if (!filePath) { console.error(JSON.stringify({ error: '--file <path> required (try --help)' })); process.exit(1); }

  const scenarios = loadScenarios(filePath);
  const byType = scenarios.reduce((m, s) => ((m[s.type] = (m[s.type] ?? 0) + 1), m), {} as Record<string, number>);
  const forecast = scenarios.reduce((n, s) => n + creditsFor(s), 0);

  if (dryRun) {
    console.log(JSON.stringify({
      mode: 'dry-run', file: filePath, threshold, scenarios: scenarios.length,
      byType, estimatedCredits: forecast,
      plan: scenarios.map(s => ({ name: s.name, type: s.type })),
      message: 'Pass --dry-run=false to execute',
    }, null, 2));
    return;
  }

  if (!process.env.PERSONIZE_SECRET_KEY) { console.error(JSON.stringify({ error: 'PERSONIZE_SECRET_KEY not set' })); process.exit(1); }
  const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

  // Sequential: avoids rate limits, keeps credit spend observable.
  const results: Result[] = [];
  for (const s of scenarios) results.push(await runScenario(client, s));

  // Results table -> stderr (human); summary JSON -> stdout (machine).
  console.table(results.map(r => ({
    result: r.error ? 'ERROR' : r.pass ? 'PASS' : 'FAIL',
    type: r.type, score: r.score ?? '-', ms: r.ms,
    name: r.name, detail: r.error ?? r.detail,
  })));

  const passed = results.filter(r => r.pass).length;
  const scored = results.filter(r => typeof r.score === 'number') as Required<Pick<Result, 'score'>>[];
  const avgAccuracy = scored.length
    ? Number((scored.reduce((a, r) => a + r.score, 0) / scored.length).toFixed(3)) : null;

  console.log(JSON.stringify({
    mode: 'live', file: filePath, threshold,
    total: results.length, passed, failed: results.length - passed,
    avgAccuracy, totalCredits: results.reduce((a, r) => a + r.credits, 0), byType,
  }, null, 2));

  if (passed < results.length) process.exit(1); // usable as a CI gate
}

main().catch(err => { console.error(JSON.stringify({ error: (err as Error).message })); process.exit(1); });
