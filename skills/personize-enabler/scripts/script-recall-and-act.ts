/**
 * =============================================================================
 * MASTERCLASS SCRIPT: Recall and Act
 * =============================================================================
 *
 * PATTERN: Outbound -- recall context --> check governance --> take action --> store result
 *
 * This is the core loop that makes AI agents context-aware. Without it, agents
 * generate blind, generic output. With it, every action is informed by everything
 * Personize knows about the entity.
 *
 * THE SEQUENCE (and why order matters):
 *   1. RECALL  -- pull entity context from memory (who is this person? what do we know?)
 *   2. GOVERN  -- check organizational guidelines (what are we allowed to say/do?)
 *   3. ACT     -- generate content or take action using context + governance
 *   4. STORE   -- memorize the outcome (so future agents know what happened)
 *
 * WHY THIS ORDER:
 *   - Recall BEFORE acting: context-aware actions vs blind actions
 *   - Governance BEFORE generating: constraints prevent brand damage, compliance violations
 *   - Store AFTER acting: creates audit trail, other agents can see what happened
 *   - Skip any step and you get a dumb agent. The sequence IS the intelligence.
 *
 * HOW TO ADAPT:
 *   Replace the action in Step 3 with your own logic -- the pattern stays the same.
 *   - Email generation: recall contact context, check brand voice, generate email
 *   - Risk assessment: recall account data, check compliance rules, score risk
 *   - Meeting prep: recall all interactions, check relationship guidelines, create brief
 *   - Lead scoring: recall engagement data, check scoring model, compute score
 *
 * USAGE:
 *   # Dry run -- show what would happen without executing
 *   npx ts-node script-recall-and-act.ts --action generate-email --limit 5
 *
 *   # Live execution
 *   npx ts-node script-recall-and-act.ts --action generate-email --limit 10 --live
 *
 *   # With specific query filter
 *   npx ts-node script-recall-and-act.ts \
 *     --query "deal_stage equals Qualified" \
 *     --action summarize --live
 *
 * =============================================================================
 */

import { Personize } from '@personize/sdk';

// =============================================================================
// Step 0: CLI Argument Parsing
// =============================================================================

const args = process.argv.slice(2);
const get = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const has = (flag: string) => args.includes(flag);

// =============================================================================
// Step 1: Configuration
// =============================================================================

const dryRun = !has('--live');
const action = get('--action') || 'summarize';
const queryFilter = get('--query');
const limit = parseInt(get('--limit') || '10', 10);

if (!process.env.PERSONIZE_SECRET_KEY) {
  console.error(JSON.stringify({ error: 'PERSONIZE_SECRET_KEY environment variable not set' }));
  process.exit(1);
}

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

// Supported actions -- add your own here
const VALID_ACTIONS = ['generate-email', 'summarize', 'assess-risk'] as const;
type ActionType = typeof VALID_ACTIONS[number];

if (!VALID_ACTIONS.includes(action as ActionType)) {
  console.error(JSON.stringify({
    error: `Unknown action: ${action}`,
    validActions: VALID_ACTIONS,
  }));
  process.exit(1);
}

// =============================================================================
// Step 2: Find Target Entities
// =============================================================================
// WHY filterByProperty: This is a deterministic filter (no LLM, no credit cost).
// It finds records matching structured conditions like "deal_stage = Qualified".
// Use this for batch operations where you know the filter criteria.
//
// Alternative: memory.search() uses semantic search (LLM-powered) for fuzzy queries
// like "accounts that seem disengaged". Costs 1 credit per call but handles ambiguity.
//
// TO ADAPT: Change the filter conditions to match your use case.

function parseQueryToConditions(query?: string): Array<{
  propertyName: string;
  operator: string;
  value: string;
}> {
  if (!query) return [];

  // Simple parser: "propertyName operator value"
  // Examples: "deal_stage equals Qualified", "last_activity_days greaterThan 30"
  // WHY simple: This script teaches the pattern. In production, you would accept
  // structured JSON conditions directly or use a real query parser.
  const parts = query.split(/\s+/);
  if (parts.length >= 3) {
    return [{
      propertyName: parts[0],
      operator: parts[1],
      value: parts.slice(2).join(' '),
    }];
  }
  return [];
}

async function findTargetEntities(): Promise<Array<{
  recordId: string;
  email?: string;
  websiteUrl?: string;
  type?: string;
  properties?: Record<string, unknown>;
}>> {
  const conditions = parseQueryToConditions(queryFilter);

  if (conditions.length > 0) {
    // WHY filterByProperty over search: No LLM cost, deterministic results,
    // faster execution. Perfect for batch operations with known criteria.
    const result = await client.memory.filterByProperty({
      conditions: conditions as any,
      limit,
    });

    // filterByProperty returns record IDs with matched property values
    const records = result.data?.records || [];
    return records.map((r: any) => ({
      recordId: r.recordId,
      email: r.email,
      websiteUrl: r.websiteUrl,
      type: r.type,
      properties: r.properties,
    }));
  }

  // No filter: use search to find recent/active entities
  // WHY search as fallback: Without explicit conditions, we do a broad search.
  // The query "active records" is semantic -- the AI interprets intent.
  const result = await client.memory.search({
    query: queryFilter || 'active records',
    limit,
    includeProperties: true,
  });

  const records = result.data?.results || result.data || [];
  return (Array.isArray(records) ? records : []).map((r: any) => ({
    recordId: r.recordId,
    email: r.email,
    websiteUrl: r.websiteUrl,
    type: r.type,
    properties: r.properties,
  }));
}

// =============================================================================
// Step 3: The Core Loop -- Recall --> Govern --> Act --> Store
// =============================================================================
// This is the heart of every context-aware AI agent. Each step builds on the
// previous one. Removing any step makes the agent worse.

interface LoopResult {
  recordId: string;
  identity: string;
  status: 'success' | 'failed' | 'skipped';
  action: string;
  output?: string;
  error?: string;
}

async function processEntity(entity: {
  recordId: string;
  email?: string;
  websiteUrl?: string;
  type?: string;
  properties?: Record<string, unknown>;
}): Promise<LoopResult> {
  const identity = entity.email || entity.websiteUrl || entity.recordId;

  try {
    // =========================================================================
    // RECALL: Pull entity context from memory
    // =========================================================================
    // WHY smartDigest: It compiles ALL known information about an entity into a
    // token-budgeted markdown block. Properties, memories, recent interactions --
    // everything the AI needs to act intelligently.
    //
    // Alternative: smartRecall (for specific questions about an entity)
    //   const recall = await client.memory.smartRecall({
    //     query: 'What are this contact\'s main pain points?',
    //     email: entity.email,
    //     mode: 'deep',  // 'fast' for speed, 'deep' for thorough answer
    //   });
    //
    // WHY digest over recall here: We need the FULL picture, not answers to
    // specific questions. The action step will decide what matters.

    const digestPayload: any = { maxTokens: 2000 };

    // WHY we scope by identity: Without scoping, you get org-wide results.
    // With scoping, you get everything about THIS specific entity.
    if (entity.email) {
      digestPayload.email = entity.email;
    } else if (entity.websiteUrl) {
      digestPayload.websiteUrl = entity.websiteUrl;
    } else if (entity.recordId) {
      digestPayload.recordId = entity.recordId;
    }

    const digest = await client.memory.smartDigest(digestPayload);

    const entityContext = digest.data?.digest || digest.data?.markdown || '';

    if (!entityContext || entityContext.length < 20) {
      // WHY skip sparse entities: If we have almost no context, the generated
      // output will be generic garbage. Better to skip and flag for enrichment.
      return {
        recordId: entity.recordId,
        identity,
        status: 'skipped',
        action,
        error: 'Insufficient context (entity has too little data for meaningful action)',
      };
    }

    // =========================================================================
    // GOVERN: Check organizational guidelines before acting
    // =========================================================================
    // WHY governance is mandatory: Without it, the AI might:
    //   - Use the wrong tone (casual email to a Fortune 500 CEO)
    //   - Promise things you can not deliver ("unlimited support")
    //   - Violate compliance rules (mentioning competitors, sharing pricing)
    //   - Ignore brand voice guidelines
    //
    // smartGuidelines selects the RELEVANT guidelines for this specific task.
    // You might have 50 guidelines total, but only 3 apply to "generate email".
    // WHY selective: Sending all 50 guidelines would waste tokens and confuse the AI.

    const governanceResult = await client.ai.smartGuidelines({
      task: `${action} for a ${entity.type || 'record'}`,
      context: entityContext.substring(0, 500),  // Enough context for relevance matching
      maxContentTokens: 1500,  // Token budget for guidelines
    });

    const guidelines = governanceResult.data?.guidelines
      || governanceResult.data?.content
      || '';

    // =========================================================================
    // ACT: Generate content or take action using context + governance
    // =========================================================================
    // WHY responses API: It is the most powerful generation endpoint. It supports
    // multi-step orchestration, tool use, and structured output. For simple text
    // generation, you could use ai.prompt() instead.
    //
    // TO ADAPT: Replace this switch with your own action logic.
    // The key insight: you always pass entityContext + guidelines to the AI.
    // The context makes it specific, the guidelines make it safe.

    let prompt: string;

    switch (action as ActionType) {
      case 'generate-email':
        prompt = `You are writing a personalized outreach email.

ENTITY CONTEXT (everything we know about this person/company):
${entityContext}

ORGANIZATIONAL GUIDELINES (you MUST follow these):
${guidelines}

Write a short, personalized email that:
1. References specific details from the entity context (not generic platitudes)
2. Follows all organizational guidelines strictly
3. Has a clear, specific call to action
4. Is under 200 words

Output the email subject line and body.`;
        break;

      case 'summarize':
        prompt = `Summarize everything we know about this entity in a concise executive brief.

ENTITY CONTEXT:
${entityContext}

ORGANIZATIONAL GUIDELINES:
${guidelines}

Create a 3-5 bullet point summary covering:
1. Key identifying information
2. Relationship status and history
3. Notable insights or risks
4. Recommended next actions`;
        break;

      case 'assess-risk':
        prompt = `Assess the risk level of this account/relationship.

ENTITY CONTEXT:
${entityContext}

ORGANIZATIONAL GUIDELINES:
${guidelines}

Evaluate:
1. Engagement level (active, declining, dormant)
2. Risk signals (complaints, delayed payments, competitor mentions)
3. Relationship health score (1-10 with justification)
4. Recommended action (retain, nurture, escalate, flag)`;
        break;

      default:
        prompt = `Analyze the following entity context and provide insights.\n\n${entityContext}`;
    }

    // WHY responses.create over ai.prompt: responses.create supports multi-step
    // orchestration and tool use. Even if we are not using tools here, using the
    // same API means the agent can be upgraded to tool-use later without rewriting.
    const result = await client.responses.create({
      instructions: prompt,
      model: 'openai/gpt-4o-mini',  // Cost-effective for batch processing
    });

    const output = result.output_text || result.output?.text || '';

    // =========================================================================
    // STORE: Memorize the outcome
    // =========================================================================
    // WHY store outcomes: Three reasons.
    //   1. Audit trail: You can prove what was generated, when, and with what context
    //   2. Learning: Future recalls will include this action and its result
    //   3. Coordination: Other agents can see what this agent did and avoid duplicating
    //
    // Example: If an email-generation agent stores "Sent intro email on 2026-04-07",
    // a follow-up agent running next week will see that and can reference it.

    if (!dryRun) {
      const memorizePayload: any = {
        content: `Action performed: ${action}\nDate: ${new Date().toISOString()}\nResult:\n${output.substring(0, 2000)}`,
        type: entity.type || 'Record',
        tags: ['agent-action', action],
        tier: 'basic',  // WHY basic: We are storing a known output, not mining insights.
                        // Basic tier stores it fast and cheap. Use 'pro' only when
                        // the content needs AI extraction.
      };

      // Scope the memorize to the same entity
      if (entity.email) memorizePayload.email = entity.email;
      else if (entity.websiteUrl) memorizePayload.website_url = entity.websiteUrl;
      else if (entity.recordId) memorizePayload.record_id = entity.recordId;

      await client.memory.memorize(memorizePayload);
    }

    return {
      recordId: entity.recordId,
      identity,
      status: 'success',
      action,
      output: output.substring(0, 500),  // Truncate for summary
    };
  } catch (error: any) {
    return {
      recordId: entity.recordId,
      identity,
      status: 'failed',
      action,
      error: error.message || 'Unknown error',
    };
  }
}

// =============================================================================
// Step 4: Batch Processing with Rate Awareness
// =============================================================================
// WHY sequential entity processing: Each entity goes through recall + governance +
// generate + memorize (4 API calls). Processing 10 entities in parallel would mean
// 40 concurrent API calls, which will hit rate limits immediately.
//
// WHY 1 credit per recall matters: If you have 100 credits and process 100 entities
// with smartDigest (1 credit each) + responses.create (varies by model), you could
// exhaust your balance mid-run. Always check balance before large batch operations.

async function main() {
  try {
    // Check credit balance before starting
    // WHY check first: Running 100 entities and failing at entity 50 because
    // credits ran out wastes time and leaves the job half-done.
    const creditsResult = await client.analytics.credits();
    const balance = creditsResult.data?.balance ?? creditsResult.data?.credits ?? 0;

    // Rough estimate: each entity costs ~3 credits (digest + guidelines + generate)
    const estimatedCost = limit * 3;

    console.log(JSON.stringify({
      status: 'starting',
      action,
      query: queryFilter || '(no filter)',
      limit,
      dryRun,
      creditBalance: balance,
      estimatedCost,
      sufficient: balance >= estimatedCost,
    }));

    if (balance < estimatedCost && !dryRun) {
      console.error(JSON.stringify({
        warning: `Credit balance (${balance}) may be insufficient for ${limit} entities (estimated ${estimatedCost} credits). Proceeding anyway -- will stop if credits run out.`,
      }));
    }

    // Find target entities
    const entities = await findTargetEntities();

    console.log(JSON.stringify({
      status: 'entities_found',
      count: entities.length,
      sample: entities.slice(0, 3).map(e => e.email || e.websiteUrl || e.recordId),
    }));

    if (entities.length === 0) {
      console.log(JSON.stringify({
        status: 'complete',
        total: 0, succeeded: 0, failed: 0, skipped: 0, dryRun,
        message: 'No matching entities found. Try a different --query.',
      }));
      return;
    }

    // Dry-run: preview what would happen
    if (dryRun) {
      console.log(JSON.stringify({
        status: 'dry_run_preview',
        message: 'Pass --live to execute for real',
        action,
        entitiesWouldProcess: entities.length,
        sampleEntities: entities.slice(0, 5).map(e => ({
          identity: e.email || e.websiteUrl || e.recordId,
          type: e.type,
          hasProperties: Object.keys(e.properties || {}).length > 0,
        })),
        estimatedCredits: entities.length * 3,
      }));

      console.log(JSON.stringify({
        status: 'complete',
        total: entities.length, succeeded: 0, failed: 0, skipped: entities.length, dryRun: true,
      }));
      return;
    }

    // Process each entity through the core loop
    const results: LoopResult[] = [];

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const result = await processEntity(entity);
      results.push(result);

      // Progress report
      console.log(JSON.stringify({
        status: 'entity_processed',
        index: i + 1,
        total: entities.length,
        identity: result.identity,
        result: result.status,
        ...(result.error ? { error: result.error } : {}),
      }));
    }

    // Final summary
    const succeeded = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    console.log(JSON.stringify({
      status: 'complete',
      total: results.length,
      succeeded,
      failed,
      skipped,
      dryRun: false,
      results: results.map(r => ({
        identity: r.identity,
        status: r.status,
        ...(r.output ? { outputPreview: r.output.substring(0, 200) } : {}),
        ...(r.error ? { error: r.error } : {}),
      })),
    }));
  } catch (error: any) {
    console.error(JSON.stringify({
      status: 'fatal_error',
      error: error.message || 'Unknown error',
      stack: error.stack,
    }));
    process.exit(1);
  }
}

main();
