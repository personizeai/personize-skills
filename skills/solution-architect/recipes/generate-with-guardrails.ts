/**
 * Recipe: Generate with Guardrails
 *
 * Demonstrates the GENERATE action — producing content with production-quality
 * guardrails for format, honesty, structure, and personalization calibration.
 *
 * Supports all channels: email, sms, slack, push, in-app.
 * Enforces:
 *   - Channel-specific formatting (HTML for email, plain text for SMS, etc.)
 *   - No hallucination — only facts from context
 *   - Subject and body as separate fields (email)
 *   - Length limits per channel
 *   - Sensitive content flagging
 *   - Feedback loop — remembers what was generated
 *
 * Usage:
 *   PERSONIZE_SECRET_KEY=sk_live_... npx ts-node recipes/generate-with-guardrails.ts
 *
 * Environment:
 *   PERSONIZE_SECRET_KEY  — required
 *   CHANNEL=email         — channel to generate for (email|sms|slack|push|in-app)
 *   PURPOSE="cold outreach" — what the message is for
 *   DRY_RUN=true          — preview without delivering (default)
 */

import { Personize } from '@personize/sdk';
import 'dotenv/config';
import * as fs from 'fs';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
const DRY_RUN = process.env.DRY_RUN !== 'false';
const CHANNEL = (process.env.CHANNEL || 'email') as Channel;
const PURPOSE = process.env.PURPOSE || 'personalized outreach';

type Channel = 'email' | 'sms' | 'slack' | 'push' | 'in-app';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FORMAT RULES — Channel-specific instructions for the AI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getFormatInstructions(channel: Channel): string {
    const rules: Record<Channel, string> = {
        email: `EMAIL FORMAT RULES:
- Subject line: plain text, no HTML, ≤ 80 chars. SEPARATE field.
- Body: HTML tags required — <p> for paragraphs, <b> for bold, <i> for italic, <a href="..."> for links, <br> for line breaks.
- Also provide a plain-text version (no HTML tags).
- Max ~300 words for outreach, ~500 for newsletters.
- No generic openings ("I hope this finds you well").`,

        sms: `SMS FORMAT RULES:
- Plain text ONLY — no HTML, no markdown.
- MUST be ≤ 160 characters total.
- First sentence IS the message. No filler.
- No salutation or signature — they waste characters.`,

        slack: `SLACK FORMAT RULES:
- Slack markdown: *bold*, _italic_, \`code\`, >quote, bullet lists.
- ≤ 150 words.
- Links: <https://url|Display Text>.
- Be concise and scannable.`,

        push: `PUSH NOTIFICATION FORMAT RULES:
- Title: ≤ 50 characters.
- Body: ≤ 100 characters.
- Button label: 2-3 words max ("View Report", "Reply Now").
- Button URL: must be absolute https:// or valid deep link (yourapp://path).
- NO placeholder URLs.`,

        'in-app': `IN-APP NOTIFICATION FORMAT RULES:
- Body: ≤ 100 words.
- If action button supported: specific verb label, absolute URL.
- Light formatting only.`,
    };
    return rules[channel] || rules.email;
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTEXT ASSEMBLY — Governance + Entity + History
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function assembleContext(email: string, purpose: string): Promise<string> {
    const sections: string[] = [];

    // Layer 1: Governance — rules, tone, constraints, approved claims
    const governance = await client.ai.smartGuidelines({
        message: `${purpose} — tone, format, compliance rules, approved claims and stats`,
        tags: ['content', 'generation', 'guardrails'],
    });
    if (governance.data?.compiledContext) {
        sections.push('## Organizational Guidelines\n' + governance.data.compiledContext);
    } else {
        sections.push('## ⚠️ No Governance Found\nNo organizational guidelines were found. Generate conservatively — no stats, claims, or promises without explicit approval.');
    }

    // Layer 2: Entity context — who is this for?
    const digest = await client.memory.smartDigest({
        email,
        type: 'Contact',
        token_budget: 2000,
        include_properties: true,
        include_memories: true,
    });
    if (digest.data?.compiledContext) {
        sections.push('## Recipient Context\n' + digest.data.compiledContext);
    }

    // Layer 3: Previous outputs — avoid repetition
    const history = await client.memory.recall({
        query: `previous ${purpose} messages sent`,
        email,
        limit: 5,
        minScore: 0.4,
    });
    if (history.data && Array.isArray(history.data) && history.data.length > 0) {
        sections.push('## Previously Sent Content\n' + history.data.map((m: any) =>
            `- ${m.text || m.content || JSON.stringify(m)}`
        ).join('\n'));
    }

    return sections.join('\n\n---\n\n');
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GENERATION — With full guardrails
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface GeneratedContent {
    channel: Channel;
    subject?: string;
    bodyHtml?: string;
    bodyText: string;
    buttonLabel?: string;
    buttonUrl?: string;
    reviewFlag?: string;
}

async function generateWithGuardrails(email: string, channel: Channel, purpose: string): Promise<GeneratedContent> {
    const context = await assembleContext(email, purpose);
    const formatInstructions = getFormatInstructions(channel);

    const outputFields = channel === 'email'
        ? 'SUBJECT: (plain text, no HTML, ≤ 80 chars)\nBODY_HTML: (full HTML with <p>, <b>, <i>, <a>, <br> tags)\nBODY_TEXT: (plain text fallback)'
        : 'BODY_TEXT: (the message content)';

    const buttonFields = ['push', 'in-app'].includes(channel)
        ? '\nBUTTON_LABEL: (2-3 words, e.g. "View Report")\nBUTTON_URL: (absolute https:// URL or deep link)'
        : '';

    const result = await client.ai.prompt({
        context,
        instructions: [
            // Step 1: ANALYZE — understand recipient and goal
            {
                prompt: `Analyze the recipient and the goal of this message.
Goal: ${purpose}
Channel: ${channel}

Answer:
1. What specific facts do we know about this person?
2. What is the ONE outcome we want from this message?
3. Which 1-2 personal facts are RELEVANT to this goal? (Not just interesting — relevant.)
4. What have we already sent them? What to avoid repeating?`,
                maxSteps: 3,
            },
            // Step 2: GUARDRAILS — review governance constraints
            {
                prompt: `Review the organizational guidelines above. List every constraint:
- Forbidden topics, claims, or competitor mentions
- Required disclaimers or legal text
- Tone and voice requirements
- Stats or case studies that ARE explicitly approved to cite

CRITICAL RULE: If a fact, statistic, case study, or claim is NOT in the context above — you MUST NOT invent it. Only use what's provided. If the context is thin, write a shorter, honest message rather than padding with invented details.`,
                maxSteps: 2,
            },
            // Step 3: GENERATE — produce the content
            {
                prompt: `Generate the message for the ${channel} channel.

${formatInstructions}

OUTPUT FORMAT (use these exact labels):
${outputFields}${buttonFields}
SENSITIVE: YES or NO (YES if content involves pricing, legal, medical, financial, or compliance topics — explain why)

RULES:
- Every fact you reference MUST come from the context above
- Do NOT invent statistics, case studies, customer names, quotes, or endorsements
- ${channel === 'email' ? 'Subject and body are SEPARATE fields — never merge them' : ''}
- Personalize with relevant facts only — do not mention tangential personal details
- If you lack context to write a strong message, write a shorter honest one instead of padding`,
                maxSteps: 5,
            },
        ],
        evaluate: true,
        evaluationCriteria: '(1) No fabricated facts or promises, (2) Format matches channel rules, (3) Within length limits, (4) Subject/body separate if email, (5) Governance constraints followed, (6) Personalization is relevant not tangential.',
    });

    return parseOutput(String(result.data || ''), channel);
}

function parseOutput(raw: string, channel: Channel): GeneratedContent {
    const result: GeneratedContent = { channel, bodyText: '' };

    const subjectMatch = raw.match(/SUBJECT:\s*(.+)/i);
    if (subjectMatch) result.subject = subjectMatch[1].trim();

    const htmlMatch = raw.match(/BODY_HTML:\s*([\s\S]+?)(?=\n(?:BODY_TEXT|BUTTON_LABEL|SENSITIVE)[:\s])/i);
    if (htmlMatch) result.bodyHtml = htmlMatch[1].trim();

    const textMatch = raw.match(/BODY_TEXT:\s*([\s\S]+?)(?=\n(?:BUTTON_LABEL|SENSITIVE)[:\s]|$)/i);
    if (textMatch) result.bodyText = textMatch[1].trim();

    const buttonLabelMatch = raw.match(/BUTTON_LABEL:\s*(.+)/i);
    const buttonUrlMatch = raw.match(/BUTTON_URL:\s*(.+)/i);
    if (buttonLabelMatch) result.buttonLabel = buttonLabelMatch[1].trim();
    if (buttonUrlMatch) result.buttonUrl = buttonUrlMatch[1].trim();

    const sensitiveMatch = raw.match(/SENSITIVE:\s*(YES|NO)/i);
    if (sensitiveMatch?.[1]?.toUpperCase() === 'YES') {
        const reason = raw.match(/SENSITIVE:\s*YES[,.\s]*(.+)/i)?.[1]?.trim();
        result.reviewFlag = reason || 'Content flagged for manual review';
    }

    if (!result.bodyText && !result.bodyHtml) {
        result.bodyText = raw.trim();
    }

    return result;
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HALLUCINATION CHECK — Post-generation validation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function checkForHallucination(output: string, context: string): string[] {
    const warnings: string[] = [];

    // Check for percentage claims not in context
    const percentages = output.match(/\d+%/g) || [];
    for (const pct of percentages) {
        if (!context.includes(pct)) {
            warnings.push(`Possible fabricated stat: "${pct}" not found in context`);
        }
    }

    // Check for "our clients" success claims
    if (/our (clients|customers|users).*(?:saw|achieved|reported|experienced)/i.test(output)) {
        warnings.push('Contains client success claim — verify against governance');
    }

    // Check for named case studies
    if (/case study|for example,.*(?:inc|corp|llc|ltd)/i.test(output)) {
        warnings.push('Possible fabricated case study reference');
    }

    return warnings;
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PIPELINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function run() {
    const { data: me } = await client.me();
    if (!me) throw new Error('Auth failed');
    console.log(`Generate with Guardrails — org: ${me.organization.id}`);
    console.log(`Channel: ${CHANNEL} | Purpose: ${PURPOSE}`);
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

    // OBSERVE — fetch contacts
    console.log('OBSERVE: Fetching contacts...');
    const exported = await client.memory.search({
        type: 'Contact',
        returnRecords: true,
        pageSize: DRY_RUN ? 5 : 50, // small batch for dry run
        groups: [{
            id: 'g1', logic: 'AND',
            conditions: [{ field: 'email', operator: 'IS_SET' }],
        }],
    });

    const records = exported.data?.records || {};
    const contacts = Object.entries(records);
    console.log(`Found ${contacts.length} contacts\n`);

    const results: Array<{ email: string; content: GeneratedContent; warnings: string[] }> = [];

    for (const [recordId, properties] of contacts) {
        const email = (properties as any).email?.value;
        if (!email) continue;

        console.log(`── ${email} ──`);

        try {
            // GENERATE — with full guardrails
            const content = await generateWithGuardrails(email, CHANNEL, PURPOSE);

            // POST-GENERATION VALIDATION
            const allText = [content.subject, content.bodyHtml, content.bodyText].filter(Boolean).join(' ');
            const warnings = checkForHallucination(allText, ''); // ideally pass context here

            if (warnings.length > 0) {
                console.log(`   ⚠️ Warnings: ${warnings.join('; ')}`);
            }

            if (content.reviewFlag) {
                console.log(`   ⚠️ REVIEW FLAG: ${content.reviewFlag}`);
                console.log(`   → Consider testing via manual approval before sending at scale.`);
            }

            results.push({ email, content, warnings });

            if (DRY_RUN) {
                console.log(`   Channel: ${content.channel}`);
                if (content.subject) console.log(`   Subject: ${content.subject}`);
                if (content.bodyHtml) console.log(`   HTML: ${content.bodyHtml.substring(0, 200)}...`);
                console.log(`   Text: ${content.bodyText.substring(0, 200)}...`);
                if (content.buttonLabel) console.log(`   Button: [${content.buttonLabel}](${content.buttonUrl})`);
                console.log();
            } else {
                // DELIVER — using your existing delivery service
                // See channels/*.md for SendGrid, Slack, Twilio, webhook examples
                console.log(`   [DELIVERED] via ${content.channel}`);

                // UPDATE — remember what was sent
                await client.memory.memorize({
                    content: `[GENERATED] ${PURPOSE} via ${CHANNEL} on ${new Date().toISOString()}. Subject: ${content.subject || 'N/A'}. Body: ${content.bodyText.substring(0, 300)}`,
                    email,
                    enhanced: true,
                    tags: ['generated', PURPOSE.replace(/\s+/g, '-'), CHANNEL],
                });
            }

        } catch (err: any) {
            if (err?.response?.status === 429) {
                const retryAfter = err.response.data?.retryAfterSeconds || 60;
                console.log(`   Rate limited. Waiting ${retryAfter}s...`);
                await new Promise(r => setTimeout(r, retryAfter * 1000));
            } else {
                console.error(`   Error: ${err.message}`);
            }
        }

        await new Promise(r => setTimeout(r, 2000)); // rate limit pause
    }

    // Write review file in dry run mode.
    // Strip raw HTML from the persisted review — store only plain text so the
    // file never contains executable markup from untrusted LLM output.
    if (DRY_RUN && results.length > 0) {
        const safeResults = results.map(r => ({
            email: r.email,
            warnings: r.warnings,
            content: {
                channel: r.content.channel,
                subject: r.content.subject,
                // bodyHtml omitted — plain text version is sufficient for review
                bodyText: r.content.bodyText,
                buttonLabel: r.content.buttonLabel,
                buttonUrl: r.content.buttonUrl,
                reviewFlag: r.content.reviewFlag,
            },
        }));
        const reviewFile = `generation-review-${Date.now()}.json`;
        fs.writeFileSync(reviewFile, JSON.stringify(safeResults, null, 2));
        console.log(`\nReview file written: ${reviewFile}`);
        console.log(`Inspect the generated content before enabling delivery (DRY_RUN=false).`);
    }

    console.log(`\n── Summary ──`);
    console.log(`Generated: ${results.length}`);
    console.log(`Flagged for review: ${results.filter(r => r.content.reviewFlag).length}`);
    console.log(`With warnings: ${results.filter(r => r.warnings.length > 0).length}`);
}

run().catch(err => { console.error('Fatal:', err.message || err); process.exit(1); });
