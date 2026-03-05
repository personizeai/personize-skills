/**
 * Recipe: Product Usage Alert
 *
 * Monitors product usage patterns, detects notable signals (drop-off, adoption,
 * milestone), and generates personalized in-app nudges or team alerts.
 *
 * Uses the full loop: OBSERVE → RECALL → REASON → DECIDE → GENERATE → ACT → UPDATE.
 *
 * Usage:
 *   PERSONIZE_SECRET_KEY=sk_live_... npx ts-node recipes/product-usage-alert.ts
 *
 * Environment:
 *   PERSONIZE_SECRET_KEY  — required
 *   SLACK_WEBHOOK_URL     — optional, for internal team alerts
 *   DRY_RUN=true          — preview without delivering (default)
 */

import { Personize } from '@personize/sdk';
import 'dotenv/config';
import * as fs from 'fs';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
const DRY_RUN = process.env.DRY_RUN !== 'false';
const STATE_FILE = '.usage-alert-state.json';

interface AlertState {
    lastRunAt: string;
    processedRecordIds: string[];
}

function loadState(): AlertState {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); }
    catch { return { lastRunAt: '', processedRecordIds: [] }; }
}

function saveState(state: AlertState) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function run() {
    const { data: me } = await client.me();
    if (!me) throw new Error('Auth failed');
    console.log(`Product Usage Alerts — org: ${me.organization.id}`);
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

    const state = loadState();

    // OBSERVE — fetch users with product usage data
    console.log('OBSERVE: Fetching users with usage data...');
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
    const newRecords = Object.entries(records).filter(
        ([id]) => !state.processedRecordIds.includes(id)
    );
    console.log(`Found ${newRecords.length} users to analyze\n`);

    for (const [recordId, properties] of newRecords) {
        const email = (properties as any).email?.value;
        if (!email) continue;

        console.log(`── Analyzing: ${email} ──`);

        try {
            // RECALL — gather usage context
            const sections: string[] = [];

            const vars = await client.ai.smartGuidelines({
                message: 'product usage monitoring, engagement scoring, churn signals, feature adoption metrics',
            });
            if (vars.data?.compiledContext) {
                sections.push('## Product Guidelines\n' + vars.data.compiledContext);
            }

            const digest = await client.memory.smartDigest({
                email,
                type: 'Contact',
                token_budget: 2000,
                include_properties: true,
                include_memories: true,
            });
            if (digest.data?.compiledContext) {
                sections.push('## User Profile & Usage\n' + digest.data.compiledContext);
            }

            const recalled = await client.memory.recall({
                query: 'product usage, feature adoption, login frequency, engagement signals',
                email,
                limit: 10,
                minScore: 0.3,
            });
            if (recalled.data && Array.isArray(recalled.data) && recalled.data.length > 0) {
                sections.push('## Usage Signals\n' + recalled.data.map((m: any) =>
                    `- ${m.text || m.content || JSON.stringify(m)}`
                ).join('\n'));
            }

            const context = sections.join('\n\n---\n\n');

            // REASON → DECIDE → GENERATE
            const result = await client.ai.prompt({
                context,
                instructions: [
                    // REASON — analyze usage
                    {
                        prompt: `Analyze this user's product engagement. Determine:
1. Overall engagement level (active / declining / inactive / new)
2. Features they use most vs features they haven't discovered
3. Any notable signals (drop-off, sudden increase, milestone reached)
4. Risk assessment: is this user at risk of churning?

If there is insufficient usage data, say so explicitly.`,
                        maxSteps: 3,
                    },
                    // DECIDE — should we alert?
                    {
                        prompt: `Based on the analysis, decide:
1. Is an alert or nudge warranted? (yes/no)
2. If yes, who should be notified? (user directly, CS team, account owner, or no one)
3. What type? (feature-tip, re-engagement, congratulations, churn-risk-alert, onboarding-nudge)
4. Channel: in-app notification, email, or Slack (for internal alerts)
5. Urgency: immediate, next-business-day, or weekly-digest

If no alert is warranted, respond with "NO_ALERT: [reason]".`,
                        maxSteps: 2,
                    },
                    // GENERATE — create the alert content
                    {
                        prompt: `If an alert is warranted, generate it. Format rules:
- For user-facing: friendly, helpful, under 100 words, with a specific action they can take
- For internal Slack: use *bold* headers, bullet points, include the user's email and key metrics
- For email: include a subject line on its own line prefixed with "Subject: "

If you decided NO_ALERT above, output only: "NO_ALERT"`,
                        maxSteps: 3,
                    },
                ],
                evaluate: true,
                evaluationCriteria: 'Alert must reference specific usage data from the context. No generic advice.',
                metadata: { recordId },
            });

            const output = String(result.data || '');

            if (output.includes('NO_ALERT')) {
                console.log('   No alert needed.\n');
            } else {
                // ACT — deliver the alert
                if (DRY_RUN) {
                    console.log(`   [DRY RUN] Would send alert for ${email}:`);
                    console.log(`   ${output.substring(0, 200)}...\n`);
                } else {
                    // Deliver to Slack for internal alerts
                    if (process.env.SLACK_WEBHOOK_URL) {
                        await fetch(process.env.SLACK_WEBHOOK_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: output }),
                        });
                        console.log(`   Delivered to Slack.\n`);
                    }
                }

                // UPDATE — store the alert in memory
                await client.memory.memorize({
                    content: `[USAGE-ALERT] Generated on ${new Date().toISOString()}.\n${output.substring(0, 500)}`,
                    speaker: 'System: Usage Alert Pipeline',
                    enhanced: true,
                    tags: ['generated', 'usage-alert', 'pipeline-output'],
                    email,
                });
            }

            state.processedRecordIds.push(recordId);

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
    console.log('\nUsage alert run complete.');
}

run().catch(err => { console.error('Fatal:', err.message || err); process.exit(1); });
