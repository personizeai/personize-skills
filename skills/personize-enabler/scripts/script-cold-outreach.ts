/**
 * script-cold-outreach.ts
 *
 * Send personalized cold outreach emails to contacts.
 * Flow: search contacts -> recall context per contact -> check governance ->
 *       generate email via AI -> send via SMTP -> memorize sent email.
 *
 * Usage:
 *   PERSONIZE_SECRET_KEY=... npx ts-node script-cold-outreach.ts \
 *     --campaign "Q2 Outbound" \
 *     --limit 10 \
 *     --sender outreach@mycompany.com \
 *     --smtp-host smtp.mycompany.com \
 *     --smtp-user user \
 *     --smtp-pass pass \
 *     --dry-run=false
 *
 * Flags:
 *   --campaign <name>     Campaign name/tag to label outreach (required)
 *   --limit <n>           Max contacts to email (default: 10)
 *   --sender <email>      From email address (or set SMTP_FROM)
 *   --smtp-host <host>    SMTP host (or set SMTP_HOST)
 *   --smtp-port <port>    SMTP port (default: 587)
 *   --smtp-user <user>    SMTP username (or set SMTP_USER)
 *   --smtp-pass <pass>    SMTP password (or set SMTP_PASS)
 *   --dry-run=false       Pass this flag to actually send (default: dry run)
 *
 * Requirements:
 *   npm install nodemailer @types/nodemailer
 */

import { Personize } from '@personize/sdk';

// ── CLI helpers ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const get = (flag: string): string | undefined => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (flag: string): boolean => args.includes(flag);
const dryRun = !has('--dry-run=false');

if (!process.env.PERSONIZE_SECRET_KEY) {
  console.error(JSON.stringify({ error: 'PERSONIZE_SECRET_KEY not set' }));
  process.exit(1);
}

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

// ── Config ───────────────────────────────────────────────────────────────────

const campaign  = get('--campaign');
const limit     = parseInt(get('--limit') ?? '10', 10);
const sender    = get('--sender') ?? process.env.SMTP_FROM ?? '';
const smtpHost  = get('--smtp-host') ?? process.env.SMTP_HOST;
const smtpPort  = parseInt(get('--smtp-port') ?? process.env.SMTP_PORT ?? '587', 10);
const smtpUser  = get('--smtp-user') ?? process.env.SMTP_USER;
const smtpPass  = get('--smtp-pass') ?? process.env.SMTP_PASS;

if (!campaign) {
  console.error(JSON.stringify({ error: '--campaign <name> is required' }));
  process.exit(1);
}

// ── SMTP sender ───────────────────────────────────────────────────────────────

async function sendEmail(opts: {
  to: string;
  from: string;
  subject: string;
  text: string;
}): Promise<void> {
  if (!smtpHost) throw new Error('SMTP_HOST not configured — set --smtp-host or SMTP_HOST env var');
  if (!smtpUser) throw new Error('SMTP_USER not configured');
  if (!smtpPass) throw new Error('SMTP_PASS not configured');

  // Dynamic import so nodemailer is optional at script parse time
  const nodemailer = require('nodemailer');
  const transport = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transport.sendMail({
    from: opts.from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
  });
}

// ── Retry helper ──────────────────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const msg = (err as Error).message ?? '';
      const isRateLimit = msg.includes('429') || msg.toLowerCase().includes('rate limit');
      if (!isRateLimit || attempt === maxAttempts) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      process.stderr.write(`Rate limit, retrying in ${delay}ms...\n`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const summary = { total: 0, succeeded: 0, failed: 0, skipped: 0 };

  // Search for contacts to outreach (tagged as outreach targets)
  process.stderr.write(`Searching for outreach candidates (campaign: ${campaign}, limit: ${limit})...\n`);

  let contacts: Array<{ email: string; name?: string; company?: string }>;
  try {
    const searchResult = await withRetry(() =>
      client.memory.search({
        type: 'Contact',
        groups: [{ conditions: [] }], // list all contacts
        pageSize: limit,
        returnRecords: true,
      })
    );

    // Extract contact info from results
    const records = (searchResult as unknown as { records?: unknown[] }).records ?? [];
    contacts = records
      .map((r: unknown) => {
        const rec = r as Record<string, unknown>;
        return {
          email:   String(rec['email'] ?? ''),
          name:    String(rec['name'] ?? rec['firstName'] ?? ''),
          company: String(rec['company'] ?? rec['companyName'] ?? ''),
        };
      })
      .filter(c => c.email && c.email !== 'undefined');
  } catch (err) {
    console.error(JSON.stringify({ error: `Search failed: ${(err as Error).message}` }));
    process.exit(1);
  }

  summary.total = contacts.length;
  process.stderr.write(`Found ${contacts.length} contacts. dryRun: ${dryRun}\n`);

  if (contacts.length === 0) {
    console.log(JSON.stringify({ ...summary, message: 'No contacts found to email' }));
    return;
  }

  for (const contact of contacts) {
    process.stderr.write(`Processing ${contact.email}...\n`);

    try {
      // Step 1: Recall context for this contact
      const recallResult = await withRetry(() =>
        client.memory.smartRecall({
          email: contact.email,
          query: 'recent interactions, interests, role, company background, any prior emails sent',
          mode: 'fast',
        })
      );

      const context = (recallResult as unknown as { data?: { results?: Array<{ text: string }> } }).data?.results
        ?.map(r => r.text)
        .join('\n') ?? '';

      // Step 2: Check governance/guidelines for outbound email rules
      const guidelines = await withRetry(() =>
        client.ai.smartGuidelines({
          message: 'outbound cold email writing rules tone CTA compliance',
          mode: 'fast',
        })
      );

      const guidelinesText = (guidelines as unknown as { compiledContext?: string }).compiledContext ?? '';

      // Step 3: Generate personalized email via AI
      const promptResult = await withRetry(() =>
        client.ai.prompt({
          prompt: [
            `Write a short, personalized cold outreach email to ${contact.email}.`,
            contact.name    ? `Their name is ${contact.name}.` : '',
            contact.company ? `They work at ${contact.company}.` : '',
            '',
            'What we know about them:',
            context || '(No prior context found)',
            '',
            'Our outbound guidelines:',
            guidelinesText || '(No specific guidelines found)',
            '',
            'Instructions:',
            '- Keep it under 120 words',
            '- Reference something specific about their role or company',
            '- Include a low-friction CTA (e.g., "worth a quick chat?")',
            '- Do NOT use generic filler phrases',
            '',
            'Respond with:',
            '<output name="subject">subject line here</output>',
            '<output name="body">email body here</output>',
          ].filter(Boolean).join('\n'),
          outputs: [{ name: 'subject' }, { name: 'body' }],
          tier: 'pro',
        })
      );

      const subject = String((promptResult as unknown as { outputs?: Record<string, unknown> }).outputs?.subject
        ?? `Quick question about ${contact.company || 'your work'}`);
      const body = String((promptResult as unknown as { outputs?: Record<string, unknown> }).outputs?.body
        ?? (promptResult as unknown as { text?: string }).text ?? '');

      if (!body) {
        process.stderr.write(`Skipping ${contact.email}: empty generated body\n`);
        summary.skipped++;
        continue;
      }

      if (dryRun) {
        process.stderr.write(`[DRY RUN] Would send to ${contact.email}: "${subject}"\n`);
        summary.succeeded++;
        continue;
      }

      // Step 4: Send the email
      await sendEmail({
        to: contact.email,
        from: sender,
        subject,
        text: body,
      });

      // Step 5: Memorize the outreach
      await withRetry(() =>
        client.memory.memorize({
          email:   contact.email,
          content: [
            `[COLD OUTREACH SENT] ${new Date().toISOString()}`,
            `Campaign: ${campaign}`,
            `Subject: ${subject}`,
            `Body:\n${body}`,
          ].join('\n'),
          speaker: 'cold-outreach-script',
          tags:    ['outbound', 'email-sent', `campaign:${campaign}`],
        })
      );

      summary.succeeded++;
      process.stderr.write(`Sent to ${contact.email}\n`);

      // Pace: 1 email per second to avoid triggering spam filters
      await new Promise(r => setTimeout(r, 1000));

    } catch (err) {
      process.stderr.write(`Error for ${contact.email}: ${(err as Error).message}\n`);
      summary.failed++;
    }
  }

  console.log(JSON.stringify({ ...summary, campaign, mode: dryRun ? 'dry-run' : 'live' }));
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
