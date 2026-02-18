# Channel: Email via SendGrid

## Setup

```bash
npm install @sendgrid/mail
```

Set `SENDGRID_API_KEY` in your environment. Create one at https://app.sendgrid.com/settings/api_keys.

You also need a verified sender identity (domain or single sender) — see SendGrid docs.

## Send a Single Email

```typescript
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

interface EmailContent {
    to: string;
    subject: string;
    html: string;
    text?: string;  // plain-text fallback
}

async function sendEmail(content: EmailContent) {
    await sgMail.send({
        to: content.to,
        from: {
            email: 'outreach@yourcompany.com',  // must be a verified sender
            name: 'Your Company',
        },
        subject: content.subject,
        html: content.html,
        text: content.text || content.html.replace(/<[^>]*>/g, ''),
        trackingSettings: {
            clickTracking: { enable: true },
            openTracking: { enable: true },
        },
    });
    console.log(`Email sent to ${content.to}`);
}
```

## Parse AI-Generated Content

When the AI generates an email, it typically includes a `Subject: ...` line. Parse it:

```typescript
function parseGeneratedEmail(raw: string): { subject: string; body: string } {
    const lines = raw.trim().split('\n');
    let subject = 'Message from Your Company';
    let bodyStart = 0;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().startsWith('subject:')) {
            subject = lines[i].replace(/^subject:\s*/i, '').trim();
            bodyStart = i + 1;
            break;
        }
    }

    const body = lines.slice(bodyStart).join('\n').trim();
    return { subject, body };
}
```

## Send Batch (Multiple Recipients)

SendGrid supports up to 1,000 personalizations per request:

```typescript
async function sendBatch(emails: EmailContent[]) {
    // SendGrid batch limit is 1000 per request
    const BATCH_SIZE = 500;

    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
        const batch = emails.slice(i, i + BATCH_SIZE);
        await sgMail.send(batch.map(e => ({
            to: e.to,
            from: { email: 'outreach@yourcompany.com', name: 'Your Company' },
            subject: e.subject,
            html: e.html,
            text: e.text || e.html.replace(/<[^>]*>/g, ''),
        })));
        console.log(`Sent batch ${Math.floor(i / BATCH_SIZE) + 1}`);
    }
}
```

## HTML Wrapper

Wrap AI-generated plain text in a simple responsive HTML email:

```typescript
function wrapInHtml(body: string, preheader?: string): string {
    // Convert markdown-style formatting to HTML
    const html = body
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
<p>${html}</p>
</body>
</html>`;
}
```

## Rate Limits

SendGrid free tier: 100 emails/day. Paid plans: varies by tier.
Add a delay between sends to avoid throttling:

```typescript
await new Promise(r => setTimeout(r, 200)); // 200ms between emails
```

## Alternative: Amazon SES

If using AWS SES instead of SendGrid:

```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: 'us-east-1' });

await ses.send(new SendEmailCommand({
    Source: 'outreach@yourcompany.com',
    Destination: { ToAddresses: [email] },
    Message: {
        Subject: { Data: subject },
        Body: { Html: { Data: htmlBody } },
    },
}));
```

## Alternative: Resend

```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
    from: 'outreach@yourcompany.com',
    to: email,
    subject,
    html: htmlBody,
});
```
