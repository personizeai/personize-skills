/**
 * Recipe: Customer Health Check-In
 *
 * Assesses customer health (engagement, sentiment, renewal risk) and generates
 * personalized check-in messages — value-reinforcement for healthy customers,
 * proactive outreach for at-risk ones.
 *
 * Uses: OBSERVE → RECALL → REASON → DECIDE → GENERATE → ACT → UPDATE.
 *
 * Usage:
 *   PERSONIZE_SECRET_KEY=sk_live_... npx ts-node recipes/health-check-message.ts
 *
 * Environment:
 *   PERSONIZE_SECRET_KEY  — required
 *   SENDGRID_API_KEY      — optional, for email delivery
 *   SLACK_WEBHOOK_URL     — optional, for internal escalation alerts
 *   DRY_RUN=true          — preview without delivering (default)
 */

import { Personize } from '@personize/sdk';
import 'dotenv/config';
import * as fs from 'fs';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
const DRY_RUN = process.env.DRY_RUN !== 'false';
const STATE_FILE = '.health-check-state.json';

interface HealthState {
    lastRunAt: string;
    checkedRecordIds: string[];
}

function loadState(): HealthState {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); }
    catch { return { lastRunAt: '', checkedRecordIds: [] }; }
}

function saveState(state: HealthState) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function run() {
    const { data: me } = await client.me();
    if (!me) throw new Error('Auth failed');
    console.log(`Customer Health Check — org: ${me.organization.id}`);
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

    const state = loadState();

    // OBSERVE — fetch customer records
    console.log('OBSERVE: Fetching customers...');
    const exported = await client.memory.search({
        type: 'Contact',
        returnRecords: true,
        pageSize: 50,
        groups: [{
            id: 'g1', logic: 'AND',
            conditions: [
                { field: 'email', operator: 'IS_SET' },
            ],
        }],
    });

    const records = exported.data?.records || {};
    const toCheck = Object.entries(records).filter(
        ([id]) => !state.checkedRecordIds.includes(id)
    );
    console.log(`${toCheck.length} customers to assess\n`);

    const summary = { healthy: 0, atRisk: 0, escalated: 0, noData: 0 };

    for (const [recordId, properties] of toCheck) {
        const email = (properties as any).email?.value;
        if (!email) continue;

        console.log(`── ${email} ──`);

        try {
            // RECALL — assemble health context
            const sections: string[] = [];

            const vars = await client.ai.smartGuidelines({
                message: 'customer success guidelines, health scoring criteria, check-in best practices, renewal process',
            });
            if (vars.data?.compiledContext) {
                sections.push('## CS Guidelines\n' + vars.data.compiledContext);
            }

            const digest = await client.memory.smartDigest({
                email,
                type: 'Contact',
                token_budget: 2500,
                include_properties: true,
                include_memories: true,
            });
            if (digest.data?.compiledContext) {
                sections.push('## Customer Profile\n' + digest.data.compiledContext);
            }

            const recalled = await client.memory.recall({
                query: 'support tickets, satisfaction, complaints, positive feedback, renewal, churn risk',
                email,
                limit: 10,
                minScore: 0.3,
            });
            if (recalled.data && Array.isArray(recalled.data) && recalled.data.length > 0) {
                sections.push('## Health Signals\n' + recalled.data.map((m: any) =>
                    `- ${m.text || m.content || JSON.stringify(m)}`
                ).join('\n'));
            }

            const context = sections.join('\n\n---\n\n');

            // REASON → DECIDE → GENERATE
            const result = await client.ai.prompt({
                context,
                instructions: [
                    // REASON — assess health
                    {
                        prompt: `Assess this customer's health:
1. Engagement level: active / declining / inactive / new
2. Sentiment: positive / neutral / negative / unknown
3. Upcoming milestones: renewal dates, onboarding completion, contract changes
4. Unresolved issues: open tickets, unanswered questions, known blockers
5. Overall health score: healthy / at-risk / critical

If there is insufficient data to assess, say "INSUFFICIENT_DATA".`,
                        maxSteps: 3,
                    },
                    // DECIDE — determine action
                    {
                        prompt: `Based on the health assessment, decide:
- If HEALTHY: write a value-reinforcement message highlighting their wins and success metrics
- If AT-RISK: write a proactive check-in addressing potential issues before they escalate
- If CRITICAL: write an urgent internal alert for the CS team with recommended actions
- If INSUFFICIENT_DATA: output "NO_ACTION: insufficient data"

Also decide channel: email (customer-facing), Slack (internal team alert), or both.`,
                        maxSteps: 3,
                    },
                    // GENERATE
                    {
                        prompt: `Generate the message(s). Format:
- Customer email: warm, personal, reference specific details. Include "Subject: ..." on first line.
- Internal Slack: use *bold*, bullet points, include health score and recommended actions.
- If NO_ACTION, output only "NO_ACTION".`,
                        maxSteps: 5,
                    },
                ],
                evaluate: true,
                evaluationCriteria: 'Message must reference specific facts from the customer context. Health assessment must be evidence-based.',
                metadata: { recordId },
            });

            const output = String(result.data || '');

            if (output.includes('NO_ACTION') || output.includes('INSUFFICIENT_DATA')) {
                console.log('   No action needed.\n');
                summary.noData++;
            } else if (output.toLowerCase().includes('critical') || output.toLowerCase().includes('urgent')) {
                summary.escalated++;
                if (DRY_RUN) {
                    console.log(`   [DRY RUN] ESCALATION for ${email}:`);
                    console.log(`   ${output.substring(0, 200)}...\n`);
                } else if (process.env.SLACK_WEBHOOK_URL) {
                    await fetch(process.env.SLACK_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: `🚨 *Customer Health Alert*\n${output}` }),
                    });
                    console.log('   Escalated to Slack.\n');
                }
            } else if (output.toLowerCase().includes('at-risk') || output.toLowerCase().includes('declining')) {
                summary.atRisk++;
                if (DRY_RUN) {
                    console.log(`   [DRY RUN] At-risk check-in for ${email}:`);
                    console.log(`   ${output.substring(0, 200)}...\n`);
                }
            } else {
                summary.healthy++;
                if (DRY_RUN) {
                    console.log(`   [DRY RUN] Healthy check-in for ${email}:`);
                    console.log(`   ${output.substring(0, 200)}...\n`);
                }
            }

            // UPDATE — store health assessment
            await client.memory.memorize({
                content: `[HEALTH-CHECK] Assessed on ${new Date().toISOString()}.\n${output.substring(0, 500)}`,
                speaker: 'System: Health Check Pipeline',
                enhanced: true,
                tags: ['generated', 'health-check', 'pipeline-output'],
                email,
            });

            state.checkedRecordIds.push(recordId);

        } catch (err: any) {
            if (err?.response?.status === 429) {
                const retryAfter = err.response.data?.retryAfterSeconds || 60;
                console.log(`Rate limited. Waiting ${retryAfter}s...`);
                await new Promise(r => setTimeout(r, retryAfter * 1000));
            } else {
                console.error(`Error for ${email}:`, err.message);
            }
        }

        await new Promise(r => setTimeout(r, 2000));
    }

    saveState({ ...state, lastRunAt: new Date().toISOString() });

    console.log('\n── Summary ──');
    console.log(`Healthy: ${summary.healthy}`);
    console.log(`At-risk: ${summary.atRisk}`);
    console.log(`Escalated: ${summary.escalated}`);
    console.log(`Insufficient data: ${summary.noData}`);
    console.log('Health check run complete.');
}

run().catch(err => { console.error('Fatal:', err.message || err); process.exit(1); });
