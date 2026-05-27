/**
 * script-daily-digest.ts
 *
 * Morning briefing: summarize overnight activity and post to Slack.
 * Run daily via cron (e.g., 8am): searches recent memorizations,
 * summarizes with AI, and posts a digest to a Slack webhook.
 *
 * Usage:
 *   PERSONIZE_SECRET_KEY=... npx ts-node script-daily-digest.ts \
 *     --hours 12 \
 *     --slack-webhook https://hooks.slack.com/services/... \
 *     --dry-run=false
 *
 * Flags:
 *   --hours <n>              Hours to look back (default: 12)
 *   --slack-webhook <url>    Slack incoming webhook URL (or set SLACK_WEBHOOK_URL)
 *   --dry-run=false          Pass this flag to actually post (default: dry run)
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

const hours       = parseInt(get('--hours') ?? '12', 10);
const slackUrl    = get('--slack-webhook') ?? process.env.SLACK_WEBHOOK_URL;
const since       = new Date(Date.now() - hours * 3600 * 1000).toISOString();

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

// ── Slack poster ──────────────────────────────────────────────────────────────

async function postToSlack(text: string): Promise<void> {
  if (!slackUrl) throw new Error('--slack-webhook or SLACK_WEBHOOK_URL is required');
  const resp = await fetch(slackUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Slack webhook error ${resp.status}: ${body}`);
  }
}

// ── Analytics helper ──────────────────────────────────────────────────────────

interface AnalyticsOverview {
  total_memorizations?: number;
  total_recalls?: number;
  active_records?: number;
  [key: string]: unknown;
}

async function getAnalytics(): Promise<AnalyticsOverview> {
  try {
    const result = await withRetry(() =>
      (client as unknown as { analytics?: { overview: () => Promise<unknown> } }).analytics?.overview()
    );
    return (result as AnalyticsOverview) ?? {};
  } catch {
    return {};
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const summary = { total: 0, succeeded: 0, failed: 0, skipped: 0 };

  process.stderr.write(`Daily digest: last ${hours} hours (since ${since}), dryRun: ${dryRun}\n`);

  // Step 1: Search recent activity
  let recentItems: Array<{ text: string; email?: string; createdAt?: string }> = [];
  try {
    const searchResult = await withRetry(() =>
      client.memory.search({
        groups: [{ conditions: [] }],
        pageSize: 100,
        includeMemories: true,
      })
    );

    const memories = (searchResult as unknown as { memories?: unknown[] }).memories
      ?? (Array.isArray(searchResult) ? searchResult : []);

    recentItems = (memories as Array<Record<string, unknown>>)
      .filter(m => {
        const createdAt = m['createdAt'] ?? m['timestamp'];
        return createdAt ? new Date(String(createdAt)) >= new Date(since) : false;
      })
      .map(m => ({
        text:      String(m['text'] ?? m['content'] ?? ''),
        email:     m['email'] ? String(m['email']) : undefined,
        createdAt: m['createdAt'] ? String(m['createdAt']) : undefined,
      }));

  } catch (err) {
    process.stderr.write(`Search warning: ${(err as Error).message}\n`);
  }

  summary.total = recentItems.length;
  process.stderr.write(`Found ${recentItems.length} recent items.\n`);

  // Step 2: Get analytics overview
  const analytics = await getAnalytics();

  // Step 3: Generate AI summary
  let aiSummary = '';
  if (recentItems.length > 0) {
    const recentText = recentItems
      .slice(0, 30)
      .map(m => `[${m.email ?? 'system'}] ${m.text.substring(0, 200)}`)
      .join('\n---\n');

    try {
      const promptResult = await withRetry(() =>
        client.ai.prompt({
          prompt: [
            `Summarize the following activity from the last ${hours} hours for a morning briefing.`,
            '',
            'Activity:',
            recentText,
            '',
            'Analytics:',
            analytics.total_memorizations != null ? `- Memorizations: ${analytics.total_memorizations}` : '',
            analytics.total_recalls != null ? `- Recalls: ${analytics.total_recalls}` : '',
            analytics.active_records != null ? `- Active records: ${analytics.active_records}` : '',
            '',
            'Instructions:',
            '- Write a concise Slack-friendly morning briefing (use bullet points)',
            '- Highlight key contacts with notable activity',
            '- Flag any risks or urgent items',
            '- Keep it under 400 words',
            '- Use Slack markdown (bold with *text*, bullet with -)',
            '',
            '<output name="digest">briefing text</output>',
          ].filter(Boolean).join('\n'),
          outputs: [{ name: 'digest' }],
          tier: 'basic',
        })
      );

      aiSummary = String(
        (promptResult as unknown as { outputs?: Record<string, unknown> }).outputs?.['digest']
          ?? (promptResult as unknown as { text?: string }).text
          ?? ''
      );
    } catch (err) {
      process.stderr.write(`AI summary error: ${(err as Error).message}\n`);
      aiSummary = `Found ${recentItems.length} memory items in the last ${hours} hours.`;
    }
  } else {
    aiSummary = `No new activity in the last ${hours} hours.`;
  }

  // Step 4: Build Slack message
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const slackMessage = [
    `:sunrise: *Daily Digest — ${dateStr}*`,
    `_Last ${hours} hours_`,
    '',
    aiSummary,
    '',
    analytics.total_memorizations != null
      ? `*Stats:* ${analytics.total_memorizations} memorizations | ${analytics.total_recalls ?? 0} recalls | ${analytics.active_records ?? 0} active records`
      : '',
  ].filter(line => line !== undefined).join('\n');

  if (dryRun) {
    process.stderr.write('--- DRY RUN: Slack message preview ---\n');
    process.stderr.write(slackMessage + '\n');
    process.stderr.write('--- End preview ---\n');
    console.log(JSON.stringify({
      mode: 'dry-run',
      ...summary,
      hours,
      preview: slackMessage,
      message: 'Pass --dry-run=false to post to Slack',
    }));
    return;
  }

  if (!slackUrl) {
    console.error(JSON.stringify({ error: '--slack-webhook or SLACK_WEBHOOK_URL is required for live mode' }));
    process.exit(1);
  }

  try {
    await postToSlack(slackMessage);
    summary.succeeded++;
    process.stderr.write('Posted to Slack.\n');
  } catch (err) {
    summary.failed++;
    process.stderr.write(`Slack post failed: ${(err as Error).message}\n`);
  }

  console.log(JSON.stringify({ ...summary, hours, mode: 'live' }));
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
