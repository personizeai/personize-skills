/**
 * Gmail helpers using the googleapis library.
 *
 * Auth options:
 * - Service account with domain-wide delegation (recommended for your own domain)
 * - OAuth2 with refresh token (for user-specific access)
 *
 * Setup: https://developers.google.com/gmail/api/quickstart/nodejs
 */
import { google, gmail_v1 } from "googleapis";

/** Create an authenticated Gmail client using a service account. */
export function createGmailClient(): gmail_v1.Gmail {
  const serviceAccountKey = process.env.GMAIL_SERVICE_ACCOUNT_KEY;
  const delegatedUser = process.env.GMAIL_DELEGATED_USER;

  if (serviceAccountKey && delegatedUser) {
    // Service account with domain-wide delegation
    const credentials = JSON.parse(
      Buffer.from(serviceAccountKey, "base64").toString()
    );
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.modify",
      ],
      subject: delegatedUser,
    });
    return google.gmail({ version: "v1", auth });
  }

  // OAuth2 with refresh token
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.gmail({ version: "v1", auth: oauth2 });
}

/** Extract plain text body from a Gmail message. */
export function extractBody(message: gmail_v1.Schema$Message): string {
  const parts = message.payload?.parts || [];
  const textPart =
    parts.find((p) => p.mimeType === "text/plain") ||
    (message.payload?.mimeType === "text/plain" ? message.payload : null);

  if (textPart?.body?.data) {
    return Buffer.from(textPart.body.data, "base64url").toString("utf-8");
  }

  // Fallback: try HTML part and strip tags
  const htmlPart = parts.find((p) => p.mimeType === "text/html");
  if (htmlPart?.body?.data) {
    const html = Buffer.from(htmlPart.body.data, "base64url").toString("utf-8");
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  return message.snippet || "";
}

/** Extract header value from a Gmail message. */
export function getHeader(
  message: gmail_v1.Schema$Message,
  name: string
): string {
  return (
    message.payload?.headers?.find(
      (h) => h.name?.toLowerCase() === name.toLowerCase()
    )?.value || ""
  );
}

/** Extract email address from a "Name <email>" format string. */
export function extractEmail(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/);
  return match ? match[1] : fromHeader.trim();
}

/** Strip quoted reply text from an email body. */
export function stripQuotedReply(body: string): string {
  // Common reply patterns across email clients
  const patterns = [
    /^On .+ wrote:$/m,                    // Gmail, Apple Mail
    /^-{2,}\s*Original Message\s*-{2,}/m, // Outlook
    /^From: .+$/m,                        // Generic forwarding
    /^>+ .+/m,                            // Quoted lines
    /^_{5,}/m,                            // Underline separators
  ];

  let stripped = body;
  for (const pattern of patterns) {
    const match = stripped.search(pattern);
    if (match > 0) {
      stripped = stripped.substring(0, match).trim();
    }
  }
  return stripped;
}

/** Build a raw RFC 2822 reply email for sending via Gmail API. */
export function buildReplyRaw(opts: {
  to: string;
  from: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject.startsWith("Re:") ? opts.subject : `Re: ${opts.subject}`}`,
    `Content-Type: text/html; charset=utf-8`,
    `MIME-Version: 1.0`,
  ];

  if (opts.inReplyTo) headers.push(`In-Reply-To: ${opts.inReplyTo}`);
  if (opts.references) headers.push(`References: ${opts.references}`);

  const raw = headers.join("\r\n") + "\r\n\r\n" + opts.body;
  return Buffer.from(raw).toString("base64url");
}
