/**
 * Recipe: Cold Outreach Sequence (3 emails)
 *
 * Generates a personalized 3-email cold outreach sequence for a list of contacts.
 * Uses the full agentic loop: OBSERVE → RECALL → REASON → GENERATE → ACT → UPDATE.
 *
 * Usage:
 *   PERSONIZE_SECRET_KEY=sk_live_... npx ts-node recipes/cold-outreach-sequence.ts
 *
 * Environment:
 *   PERSONIZE_SECRET_KEY  — required
 *   SENDGRID_API_KEY      — optional, for actual delivery
 *   DRY_RUN=true          — preview without delivering (default)
 */

import { Personize } from '@personize/sdk';
import 'dotenv/config';
import * as fs from 'fs';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
const DRY_RUN = process.env.DRY_RUN !== 'false';
const STATE_FILE = '.outreach-state.json';

interface OutreachState {
    lastRunAt: string;
    sent: Record<string, { emailsSent: number; lastSentAt: string }>;
}

function loadState(): OutreachState {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); }
    catch { return { lastRunAt: '', sent: {} }; }
}

function saveState(state: OutreachState) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function assembleContext(email: string): Promise<string> {
    const sections: string[] = [];

    // Governance variables — outreach rules, tone, ICP definitions
    const vars = await client.ai.smartGuidelines({
        message: 'cold outreach email best practices, ICP definitions, tone guidelines',
        tags: ['sales', 'outreach'],
    });
    if (vars.data?.compiledContext) {
        sections.push('## Organizational Guidelines\n' + vars.data.compiledContext);
    }

    // Entity context — everything known about this contact
    const digest = await client.memory.smartDigest({
        email,
        type: 'Contact',
        token_budget: 2000,
        include_properties: true,
        include_memories: true,
    });
    if (digest.data?.compiledContext) {
        sections.push('## Contact Context\n' + digest.data.compiledContext);
    }

    // Semantic recall — previous outreach history
    const recalled = await client.memory.smartRecall({
        query: 'previous outreach emails sent, responses received',
        email,
        limit: 5,
        min_score: 0.4,
        fast_mode: true,
    });
    if (recalled.data?.results && Array.isArray(recalled.data.results) && recalled.data.results.length > 0) {
        sections.push('## Previous Outreach\n' + recalled.data.results.map((m: any) =>
            `- ${m.text || m.content || JSON.stringify(m)}`
        ).join('\n'));
    }

    return sections.join('\n\n---\n\n');
}

async function generateSequence(email: string, context: string, nextEmailNum: number) {
    const emailInstructions = [];

    // Only generate emails not yet sent
    if (nextEmailNum <= 1) {
        emailInstructions.push({
            prompt: 'Write Email 1 (introduction): Open with a specific observation about their company or role. Present our value prop through the lens of their pain point. End with a soft CTA (reply or short call). Keep under 150 words.',
            maxSteps: 5,
        });
    }
    if (nextEmailNum <= 2) {
        emailInstructions.push({
            prompt: 'Write Email 2 (value-add follow-up, send 3 days after Email 1): Share a relevant insight, case study, or stat. Connect it to their specific situation. End with a slightly stronger CTA. Keep under 150 words.',
            maxSteps: 5,
        });
    }
    if (nextEmailNum <= 3) {
        emailInstructions.push({
            prompt: 'Write Email 3 (breakup, send 5 days after Email 2): Brief and direct. Acknowledge they may be busy. Offer one final compelling reason. Easy yes/no CTA. Keep under 100 words.',
            maxSteps: 3,
        });
    }

    if (emailInstructions.length === 0) {
        console.log(`   Sequence complete for ${email}, all 3 emails sent.`);
        return null;
    }

    const result = await client.ai.prompt({
        context,
        instructions: [
            { prompt: 'Analyze the contact. Identify their role, company, likely pain points, and the strongest angle for outreach. Note anything already communicated.', maxSteps: 3 },
            ...emailInstructions,
        ],
        evaluate: true,
        evaluationCriteria: 'Each email must: (1) reference at least 1 specific fact about the contact, (2) follow organizational tone guidelines, (3) have a distinct angle from the other emails, (4) include a clear CTA.',
    });

    return result.data;
}

async function deliver(email: string, content: string, emailNum: number) {
    if (DRY_RUN) {
        console.log(`   [DRY RUN] Would send email #${emailNum} to ${email}:`);
        console.log(`   ${String(content).substring(0, 200)}...\n`);
        return;
    }

    // Replace with actual SendGrid/SES/Resend delivery
    // See channels/sendgrid.md for full template
    console.log(`   [DELIVERED] Email #${emailNum} to ${email}`);
}

async function run() {
    const { data: me } = await client.me();
    if (!me) throw new Error('Auth failed');
    console.log(`Cold Outreach Sequence — org: ${me.organization.id}`);
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (set DRY_RUN=false to deliver)' : 'LIVE'}\n`);

    const state = loadState();

    // OBSERVE — fetch contacts to target
    console.log('OBSERVE: Fetching contacts...');
    const exported = await client.memory.search({
        type: 'Contact',
        returnRecords: true,
        pageSize: 50,
        groups: [{
            id: 'g1', logic: 'AND',
            conditions: [
                { property: 'email', operator: 'IS_SET' },
            ],
        }],
    });

    const records = exported.data?.records || {};
    console.log(`Found ${Object.keys(records).length} contacts\n`);

    for (const [recordId, properties] of Object.entries(records)) {
        const email = (properties as any).email?.value;
        if (!email) continue;

        const contactState = state.sent[email] || { emailsSent: 0, lastSentAt: '' };
        const nextEmailNum = contactState.emailsSent + 1;

        if (nextEmailNum > 3) continue; // sequence complete

        // Check timing — don't send Email 2 until 3 days after Email 1, etc.
        if (contactState.lastSentAt) {
            const daysSinceLast = (Date.now() - new Date(contactState.lastSentAt).getTime()) / (1000 * 60 * 60 * 24);
            const requiredGap = nextEmailNum === 2 ? 3 : nextEmailNum === 3 ? 5 : 0;
            if (daysSinceLast < requiredGap) {
                console.log(`⏳ ${email}: waiting ${Math.ceil(requiredGap - daysSinceLast)} more days before email #${nextEmailNum}`);
                continue;
            }
        }

        console.log(`── ${email} (email #${nextEmailNum}) ──`);

        try {
            // RECALL
            const context = await assembleContext(email);

            // REASON + GENERATE
            const content = await generateSequence(email, context, nextEmailNum);
            if (!content) continue;

            // ACT
            await deliver(email, String(content), nextEmailNum);

            // UPDATE — store what was sent
            await client.memory.memorize({
                content: `[OUTREACH] Email #${nextEmailNum} sent on ${new Date().toISOString()}.\nContent: ${String(content).substring(0, 500)}`,
                speaker: 'System: Cold Outreach Pipeline',
                enhanced: true,
                tags: ['generated', 'outreach', `sequence:email-${nextEmailNum}`],
                email,
            });

            state.sent[email] = {
                emailsSent: nextEmailNum,
                lastSentAt: new Date().toISOString(),
            };

        } catch (err: any) {
            if (err?.response?.status === 429) {
                const retryAfter = err.response.data?.retryAfterSeconds || 60;
                console.log(`Rate limited. Waiting ${retryAfter}s...`);
                await new Promise(r => setTimeout(r, retryAfter * 1000));
            } else {
                console.error(`Error for ${email}:`, err.message);
            }
        }

        await new Promise(r => setTimeout(r, 2000)); // rate-limit pause
    }

    saveState({ ...state, lastRunAt: new Date().toISOString() });
    console.log('\nSequence run complete.');
}

run().catch(err => { console.error('Fatal:', err.message || err); process.exit(1); });
