/**
 * Notification helpers — Slack and SendGrid.
 *
 * Slack: Uses @slack/web-api with a bot token.
 * SendGrid: Uses the v3 REST API via fetch (no SDK needed).
 */
import { WebClient } from "@slack/web-api";

// ─── Slack ──────────────────────────────────────────────

let _slack: WebClient | null = null;

function getSlackClient(): WebClient {
  if (!_slack) {
    _slack = new WebClient(process.env.SLACK_BOT_TOKEN!);
  }
  return _slack;
}

/** Post a message to a Slack channel. */
export async function notifySlack(
  channel: string,
  text: string,
  opts?: { threadTs?: string }
) {
  const slack = getSlackClient();
  return slack.chat.postMessage({
    channel,
    text,
    thread_ts: opts?.threadTs,
    unfurl_links: false,
  });
}

/** Post a rich Slack message with blocks. */
export async function notifySlackRich(
  channel: string,
  blocks: Array<Record<string, unknown>>,
  text?: string
) {
  const slack = getSlackClient();
  return slack.chat.postMessage({
    channel,
    text: text || "New notification",
    blocks,
  });
}

// ─── SendGrid ───────────────────────────────────────────

/** Send an email via SendGrid v3 API. */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
}) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error("SENDGRID_API_KEY not configured");

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: opts.to }] }],
      from: {
        email: opts.from || process.env.SENDER_EMAIL!,
        name: opts.fromName || process.env.SENDER_NAME || undefined,
      },
      reply_to: opts.replyTo ? { email: opts.replyTo } : undefined,
      subject: opts.subject,
      content: [{ type: "text/html", value: opts.html }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SendGrid error ${response.status}: ${body}`);
  }
}

// ─── Formatting ─────────────────────────────────────────

/** Format a lead alert for Slack. */
export function formatLeadAlert(opts: {
  email: string;
  name: string;
  company: string;
  score: number;
  route: string;
  reason: string;
}): string {
  const emoji = opts.score >= 70 ? ":fire:" : opts.score >= 40 ? ":wave:" : ":eyes:";
  return [
    `${emoji} *New Lead — ${opts.score}/100*`,
    `*${opts.name}* @ ${opts.company}`,
    `Email: ${opts.email}`,
    `Route: ${opts.route}`,
    `Reason: ${opts.reason}`,
  ].join("\n");
}
