/**
 * Recipe: Batch Pipeline (Generic)
 *
 * A configurable pipeline that processes a batch of records through the full
 * 10-step agentic loop. Customize the pipeline config to change behavior
 * without rewriting the loop logic.
 *
 * Usage:
 *   PERSONIZE_SECRET_KEY=sk_live_... npx ts-node recipes/batch-pipeline.ts
 *
 * Environment:
 *   PERSONIZE_SECRET_KEY  — required
 *   DRY_RUN=true          — preview without delivering (default)
 */

import { Personize } from '@personize/sdk';
import 'dotenv/config';
import * as fs from 'fs';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
const DRY_RUN = process.env.DRY_RUN !== 'false';

// ──────────────────────────────────────────────────────────────
// PIPELINE CONFIG — Customize this section for your use case
// ──────────────────────────────────────────────────────────────

interface PipelineConfig {
    name: string;
    stateFile: string;
    schedule: string;                         // human-readable (for docs/logging)
    observe: {
        entityType: string;
        pageSize: number;
        conditions: Array<{ property: string; operator: string; value?: string }>;
    };
    recall: {
        smartGuidelinesMessage: string;
        smartGuidelinesTags?: string[];
        recallQuery: string;
        tokenBudget: number;
    };
    reason: {
        instructions: Array<{ prompt: string; maxSteps: number }>;
        evaluationCriteria: string;
    };
    act: {
        channel: 'console' | 'slack' | 'email' | 'webhook';
        webhookUrl?: string;
    };
    update: {
        tags: string[];
        speaker: string;
    };
    rateLimitPauseMs: number;
}

// ── Example: Weekly product adoption report ──
const config: PipelineConfig = {
    name: 'Weekly Product Adoption Report',
    stateFile: '.batch-pipeline-state.json',
    schedule: 'Weekly (Monday 8am)',
    observe: {
        entityType: 'Contact',
        pageSize: 100,
        conditions: [
            { property: 'email', operator: 'IS_SET' },
        ],
    },
    recall: {
        smartGuidelinesMessage: 'product features, adoption metrics, engagement scoring',
        smartGuidelinesTags: ['product'],
        recallQuery: 'product usage, feature adoption, engagement trends',
        tokenBudget: 2000,
    },
    reason: {
        instructions: [
            {
                prompt: 'Analyze this contact\'s product engagement. What features do they use? What are they missing? Are there any concerning patterns?',
                maxSteps: 3,
            },
            {
                prompt: 'Based on the analysis, generate a brief personalized recommendation: one feature they should try next and why it would help them.',
                maxSteps: 3,
            },
        ],
        evaluationCriteria: 'Recommendation must reference specific usage data. No generic "try our features" advice.',
    },
    act: {
        channel: 'console',  // Change to 'slack', 'email', or 'webhook' for real delivery
    },
    update: {
        tags: ['generated', 'product-adoption', 'pipeline-output'],
        speaker: 'System: Batch Pipeline',
    },
    rateLimitPauseMs: 2000,
};

// ──────────────────────────────────────────────────────────────
// PIPELINE ENGINE — Reusable loop logic (don't modify)
// ──────────────────────────────────────────────────────────────

interface PipelineState {
    lastRunAt: string;
    processedRecordIds: string[];
    stats: { processed: number; generated: number; errors: number };
}

function loadState(file: string): PipelineState {
    try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
    catch { return { lastRunAt: '', processedRecordIds: [], stats: { processed: 0, generated: 0, errors: 0 } }; }
}

function saveState(file: string, state: PipelineState) {
    fs.writeFileSync(file, JSON.stringify(state, null, 2));
}

async function runPipeline(cfg: PipelineConfig) {
    const { data: me } = await client.me();
    if (!me) throw new Error('Auth failed');
    console.log(`Pipeline: ${cfg.name}`);
    console.log(`Org: ${me.organization.id} | Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

    const state = loadState(cfg.stateFile);

    // ── 1. OBSERVE ──
    console.log('1. OBSERVE');
    const exported = await client.memory.search({
        type: cfg.observe.entityType,
        returnRecords: true,
        pageSize: cfg.observe.pageSize,
        groups: [{
            id: 'g1', logic: 'AND' as const,
            conditions: cfg.observe.conditions.map(c => ({
                property: c.property,
                operator: c.operator,
                value: c.value,
            })),
        }],
    });

    const records = exported.data?.records || {};
    const batch = Object.entries(records).filter(
        ([id]) => !state.processedRecordIds.includes(id)
    );
    console.log(`   ${batch.length} new records to process\n`);

    if (batch.length === 0) {
        console.log('Nothing to process.');
        saveState(cfg.stateFile, { ...state, lastRunAt: new Date().toISOString() });
        return;
    }

    for (const [recordId, properties] of batch) {
        const email = (properties as any).email?.value;
        if (!email) continue;

        console.log(`── ${email} ──`);
        state.stats.processed++;

        try {
            // ── 3. RECALL ──
            const contextParts: string[] = [];

            const vars = await client.ai.smartGuidelines({
                message: cfg.recall.smartGuidelinesMessage,
                tags: cfg.recall.smartGuidelinesTags,
            });
            if (vars.data?.compiledContext) {
                contextParts.push('## Guidelines\n' + vars.data.compiledContext);
            }

            const digest = await client.memory.smartDigest({
                email,
                type: cfg.observe.entityType,
                token_budget: cfg.recall.tokenBudget,
                include_properties: true,
                include_memories: true,
            });
            if (digest.data?.compiledContext) {
                contextParts.push('## Context\n' + digest.data.compiledContext);
            }

            const recalled = await client.memory.smartRecall({
                query: cfg.recall.recallQuery,
                email,
                limit: 10,
                min_score: 0.3,
                mode: 'fast',
            });
            if (recalled.data?.results && Array.isArray(recalled.data.results) && recalled.data.results.length > 0) {
                contextParts.push('## Recalled\n' + recalled.data.results.map((m: any) =>
                    `- ${m.text || m.content || JSON.stringify(m)}`
                ).join('\n'));
            }

            const context = contextParts.join('\n\n---\n\n');

            // ── 4-7. REASON → PLAN → DECIDE → GENERATE ──
            const result = await client.ai.prompt({
                context,
                instructions: cfg.reason.instructions,
                evaluate: true,
                evaluationCriteria: cfg.reason.evaluationCriteria,
                metadata: { recordId },
            });

            const output = String(result.data || '');
            state.stats.generated++;

            // ── 8. ACT ──
            if (DRY_RUN) {
                console.log(`   [DRY RUN] ${output.substring(0, 200)}...\n`);
            } else {
                switch (cfg.act.channel) {
                    case 'slack':
                        if (cfg.act.webhookUrl || process.env.SLACK_WEBHOOK_URL) {
                            await fetch(cfg.act.webhookUrl || process.env.SLACK_WEBHOOK_URL!, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ text: output }),
                            });
                        }
                        break;
                    case 'webhook':
                        if (cfg.act.webhookUrl) {
                            await fetch(cfg.act.webhookUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ email, recordId, content: output }),
                            });
                        }
                        break;
                    default:
                        console.log(`   Output: ${output.substring(0, 300)}\n`);
                }
            }

            // ── 9. UPDATE ──
            await client.memory.memorize({
                content: `[${cfg.name.toUpperCase()}] ${new Date().toISOString()}\n${output.substring(0, 500)}`,
                speaker: cfg.update.speaker,
                enhanced: true,
                tags: cfg.update.tags,
                email,
            });

            state.processedRecordIds.push(recordId);

        } catch (err: any) {
            state.stats.errors++;
            if (err?.response?.status === 429) {
                const retryAfter = err.response.data?.retryAfterSeconds || 60;
                console.log(`Rate limited. Waiting ${retryAfter}s...`);
                await new Promise(r => setTimeout(r, retryAfter * 1000));
            } else {
                console.error(`Error for ${email}:`, err.message);
            }
        }

        await new Promise(r => setTimeout(r, cfg.rateLimitPauseMs));
    }

    saveState(cfg.stateFile, { ...state, lastRunAt: new Date().toISOString() });

    console.log('\n── Summary ──');
    console.log(`Processed: ${state.stats.processed}`);
    console.log(`Generated: ${state.stats.generated}`);
    console.log(`Errors: ${state.stats.errors}`);
    console.log('Pipeline complete.');
}

runPipeline(config).catch(err => { console.error('Fatal:', err.message || err); process.exit(1); });
