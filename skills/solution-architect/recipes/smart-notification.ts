/**
 * Recipe: Smart Notification — Uniquely Personalized Alerts
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ FOR PRODUCTION USE: @personize/signal                           │
 * │                                                                  │
 * │ This recipe demonstrates the underlying SDK calls that Signal   │
 * │ packages into a production-ready engine with:                   │
 * │   - Built-in channels (SES, SendGrid, Slack, InApp)            │
 * │   - Dedup + fatigue prevention (daily cap, dedup window)        │
 * │   - Digest pipeline (deferred → compiled weekly digest)         │
 * │   - Workspace integration (tasks, notes, updates per entity)   │
 * │   - Feedback loop (memorizes what was sent)                     │
 * │   - Cost controls (pre-check skips, rate limiting)              │
 * │                                                                  │
 * │ npm install @personize/signal @personize/sdk                    │
 * │ See: signal/README.md and signal/examples/                      │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Uses smartDigest() to assemble deep context about each user, then generates
 * notifications that are impossible without AI: referencing specific facts,
 * history, preferences, and behavioral signals to craft messages that feel
 * like they were written by someone who truly knows the recipient.
 *
 * The difference from generic notifications:
 *   Generic:  "You have 3 new leads this week"
 *   Smart:    "Jane — 3 new leads landed, including one from Initech (the
 *              company you mentioned wanting to expand into). Sarah Chen,
 *              their VP Eng, downloaded your API docs yesterday — might be
 *              worth a warm intro since you both spoke at CloudConf."
 *
 * Usage:
 *   PERSONIZE_SECRET_KEY=sk_live_... npx ts-node recipes/smart-notification.ts
 *
 * Environment:
 *   PERSONIZE_SECRET_KEY  — required
 *   SLACK_WEBHOOK_URL     — optional, for Slack delivery
 *   SENDGRID_API_KEY      — optional, for email delivery
 *   DRY_RUN=true          — preview without delivering (default)
 */

import { Personize } from '@personize/sdk';
import 'dotenv/config';
import * as fs from 'fs';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
const DRY_RUN = process.env.DRY_RUN !== 'false';
const STATE_FILE = '.smart-notification-state.json';

interface NotificationState {
    lastRunAt: string;
    notifiedRecordIds: string[];
}

function loadState(): NotificationState {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); }
    catch { return { lastRunAt: '', notifiedRecordIds: [] }; }
}

function saveState(state: NotificationState) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTEXT ASSEMBLY — The Secret Sauce
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Smart notifications are only as good as the context you give the AI.
// We assemble THREE layers of context, each serving a different purpose.

async function assembleDeepContext(email: string, trigger: string): Promise<string> {
    const sections: string[] = [];

    // Layer 1: GOVERNANCE — Rules, tone, what matters to the org
    // This ensures every notification follows company guidelines
    const vars = await client.ai.smartGuidelines({
        message: `notification guidelines for: ${trigger}`,
        tags: ['notifications', 'communications'],
    });
    if (vars.data?.compiledContext) {
        sections.push('## Notification Guidelines\n' + vars.data.compiledContext);
    }

    // Layer 2: ENTITY DIGEST — The complete picture of this person
    // smartDigest compiles ALL known properties + memories into a single context block.
    // This is where the magic happens — the AI sees everything:
    //   - Profile data (name, role, company, plan)
    //   - Behavioral data (features used, search queries, content consumed)
    //   - ML outputs (churn score, lead score, segment)
    //   - Interaction history (emails sent, meetings held)
    //   - Previous notifications sent (to avoid repetition)
    const digest = await client.memory.smartDigest({
        email,
        type: 'Contact',
        token_budget: 3000,     // generous budget for deep personalization
        include_properties: true,
        include_memories: true,
    });
    if (digest.data?.compiledContext) {
        sections.push('## Everything We Know About This Person\n' + digest.data.compiledContext);
    }

    // Layer 3: SEMANTIC RECALL — Specific facts relevant to this trigger
    // If the trigger is "new lead from Initech," recall what we know about Initech
    const recalled = await client.memory.smartRecall({
        query: trigger,
        email,
        limit: 10,
        min_score: 0.3,
        include_property_values: true,
        fast_mode: true,
    });
    if (recalled.data?.results && Array.isArray(recalled.data.results) && recalled.data.results.length > 0) {
        sections.push('## Relevant Context for This Notification\n' + recalled.data.results.map((m: any) =>
            `- ${m.text || m.content || JSON.stringify(m)}`
        ).join('\n'));
    }

    return sections.join('\n\n---\n\n');
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NOTIFICATION GENERATION — Multi-Step Reasoning
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface NotificationRequest {
    email: string;
    trigger: string;           // what happened that triggered the notification
    triggerData?: any;         // structured data about the event
    preferredChannel?: 'email' | 'slack' | 'sms' | 'in-app';
}

interface GeneratedNotification {
    channel: string;
    priority: string;
    subject?: string;          // for email
    body: string;
    reasoning: string;         // why the AI crafted it this way
}

async function generateSmartNotification(req: NotificationRequest): Promise<GeneratedNotification | null> {
    // Assemble the deepest possible context
    const context = await assembleDeepContext(req.email, req.trigger);

    const result = await client.ai.prompt({
        context,
        instructions: [
            // Step 1: UNDERSTAND — What just happened and why it matters to THIS person
            {
                prompt: `A notification was triggered for this person.

Trigger: "${req.trigger}"
${req.triggerData ? `Trigger data: ${JSON.stringify(req.triggerData)}` : ''}

Analyze:
1. Why does this trigger matter to THIS specific person? (Use their context — role, goals, history)
2. What unique angle can we take that a generic notification can't?
3. What specific facts from their history should we reference?
4. Is there a connection between this trigger and something they've been working on, searching for, or asking about?

If this trigger is NOT meaningful for this person (e.g., they already know, it's irrelevant to their role), say "SKIP: [reason]" and stop.`,
                maxSteps: 3,
            },
            // Step 2: DECIDE — Channel, timing, and tone
            {
                prompt: `Decide how to deliver this notification:
1. Channel: ${req.preferredChannel ? `Preferred: ${req.preferredChannel}, but override if another channel is clearly better` : 'Choose the best channel (email, slack, sms, in-app)'}
2. Priority: immediate (time-sensitive, actionable now) / standard (worth knowing today) / digest (can wait for weekly roundup)
3. Tone: urgent / professional / friendly / celebratory — match the situation and what we know about the person

Output your decision as:
CHANNEL: [channel]
PRIORITY: [priority]
TONE: [tone]
REASONING: [one sentence why]`,
                maxSteps: 2,
            },
            // Step 3: GENERATE — Craft the uniquely personalized notification
            {
                prompt: `Write the notification. Make it UNIQUELY personalized — this message should be impossible to send without knowing this person's full context.

Rules:
- Reference at least 2 specific facts about them (not just their name)
- Connect the trigger to their goals, history, or recent activity
- Keep it concise: email body under 200 words, Slack under 150 words, SMS under 160 chars, in-app under 100 words
- Include a specific, actionable next step (not generic "check it out")
- If email: start with "Subject: ..." on its own line
- NEVER start with generic greetings like "I hope this finds you well"
- Sound like a knowledgeable colleague, not a marketing automation tool`,
                maxSteps: 5,
            },
        ],
        evaluate: true,
        evaluationCriteria: 'Notification must: (1) reference 2+ specific facts about the person, (2) connect the trigger to their context, (3) include a specific actionable next step, (4) not exceed word limits.',
    });

    const output = String(result.data || '');

    if (output.includes('SKIP:')) {
        console.log(`   Skipped: ${output.split('SKIP:')[1]?.trim().substring(0, 100)}`);
        return null;
    }

    // Parse the AI's channel/priority decision
    const channelMatch = output.match(/CHANNEL:\s*(email|slack|sms|in-app)/i);
    const priorityMatch = output.match(/PRIORITY:\s*(immediate|standard|digest)/i);
    const reasoningMatch = output.match(/REASONING:\s*(.+)/i);

    return {
        channel: channelMatch?.[1]?.toLowerCase() || req.preferredChannel || 'email',
        priority: priorityMatch?.[1]?.toLowerCase() || 'standard',
        subject: output.match(/Subject:\s*(.+)/i)?.[1]?.trim(),
        body: output,
        reasoning: reasoningMatch?.[1]?.trim() || '',
    };
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DELIVERY — Send through the decided channel
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function deliver(email: string, notification: GeneratedNotification) {
    if (DRY_RUN) {
        console.log(`   [DRY RUN] Channel: ${notification.channel} | Priority: ${notification.priority}`);
        console.log(`   ${notification.body.substring(0, 300)}...\n`);
        return;
    }

    switch (notification.channel) {
        case 'slack':
            if (process.env.SLACK_WEBHOOK_URL) {
                await fetch(process.env.SLACK_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: notification.body }),
                });
            }
            break;

        case 'email':
            // See channels/sendgrid.md for full implementation
            console.log(`   [EMAIL] To: ${email} | Subject: ${notification.subject || 'Notification'}`);
            break;

        case 'sms':
            // See channels/twilio.md for full implementation
            console.log(`   [SMS] To: ${email}`);
            break;

        case 'in-app':
            // See channels/webhook.md for full implementation
            console.log(`   [IN-APP] For: ${email}`);
            break;
    }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PIPELINE — Observe → Notify → Update
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function run() {
    const { data: me } = await client.me();
    if (!me) throw new Error('Auth failed');
    console.log(`Smart Notifications — org: ${me.organization.id}`);
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

    const state = loadState();

    // OBSERVE — Find records that need notification
    console.log('OBSERVE: Checking for notification triggers...');
    const exported = await client.memory.search({
        type: 'Contact',
        returnRecords: true,
        pageSize: 50,
    });

    const records = exported.data?.records || {};
    const targets = Object.entries(records).filter(
        ([id]) => !state.notifiedRecordIds.includes(id)
    );
    console.log(`${targets.length} contacts to evaluate\n`);

    const stats = { sent: 0, skipped: 0, errors: 0 };

    for (const [recordId, properties] of targets) {
        const email = (properties as any).email?.value;
        if (!email) continue;

        console.log(`── ${email} ──`);

        try {
            // Define triggers based on what you observe
            // In production, these come from your event stream, analytics, or polling results
            const triggers = [
                'new activity detected — check if any changes warrant a personalized notification',
            ];

            for (const trigger of triggers) {
                const notification = await generateSmartNotification({
                    email,
                    trigger,
                });

                if (!notification) {
                    stats.skipped++;
                    continue;
                }

                // ACT — deliver
                await deliver(email, notification);
                stats.sent++;

                // UPDATE — remember what we sent
                await client.memory.memorize({
                    content: `[SMART NOTIFICATION] Sent via ${notification.channel} on ${new Date().toISOString()}.` +
                        `\nPriority: ${notification.priority}` +
                        `\nContent: ${notification.body.substring(0, 500)}` +
                        `\nReasoning: ${notification.reasoning}`,
                    speaker: 'System: Smart Notification Pipeline',
                    enhanced: true,
                    tags: ['generated', 'notification', `channel:${notification.channel}`, `priority:${notification.priority}`],
                    email,
                });
            }

            state.notifiedRecordIds.push(recordId);

        } catch (err: any) {
            stats.errors++;
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
    console.log(`Sent: ${stats.sent}`);
    console.log(`Skipped (not relevant): ${stats.skipped}`);
    console.log(`Errors: ${stats.errors}`);
}

run().catch(err => { console.error('Fatal:', err.message || err); process.exit(1); });
