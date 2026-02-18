# Channel: Generic Webhook (HTTP POST)

Use this for any destination that accepts HTTP requests: in-app notifications, CRM writeback, custom APIs, Zapier/Make/n8n, or any third-party service.

## Basic Webhook Delivery

```typescript
interface WebhookPayload {
    email: string;
    recordId: string;
    type: string;          // 'outreach', 'alert', 'nudge', 'report'
    channel: string;       // 'email', 'in-app', 'slack', 'sms'
    priority: string;      // 'immediate', 'next-business-day', 'weekly-digest'
    content: string;       // the AI-generated content
    metadata?: Record<string, any>;
}

async function deliverWebhook(url: string, payload: WebhookPayload, headers?: Record<string, string>) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
        body: JSON.stringify({
            ...payload,
            timestamp: new Date().toISOString(),
            source: 'personize-pipeline',
        }),
    });

    if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Webhook failed: ${response.status} ${response.statusText} — ${body}`);
    }

    return response.json().catch(() => ({}));
}
```

## Common Auth Patterns

### Bearer Token

```typescript
await deliverWebhook(url, payload, {
    'Authorization': `Bearer ${process.env.WEBHOOK_API_KEY}`,
});
```

### API Key Header

```typescript
await deliverWebhook(url, payload, {
    'X-API-Key': process.env.WEBHOOK_API_KEY!,
});
```

### HMAC Signature

```typescript
import { createHmac } from 'crypto';

function signPayload(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
}

const body = JSON.stringify(payload);
const signature = signPayload(body, process.env.WEBHOOK_SECRET!);

await fetch(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
    },
    body,
});
```

## In-App Notification Pattern

Push AI-generated notifications to your own app's API:

```typescript
async function sendInAppNotification(notification: {
    userId: string;
    title: string;
    body: string;
    actionUrl?: string;
    priority: 'low' | 'medium' | 'high';
}) {
    await deliverWebhook(
        `${process.env.APP_API_URL}/api/notifications`,
        {
            email: '',
            recordId: notification.userId,
            type: 'in-app-notification',
            channel: 'in-app',
            priority: notification.priority,
            content: notification.body,
            metadata: {
                title: notification.title,
                actionUrl: notification.actionUrl,
            },
        },
        { 'Authorization': `Bearer ${process.env.APP_API_KEY}` },
    );
}
```

## CRM Writeback Pattern

Push AI-generated notes back to a CRM:

```typescript
// HubSpot — create a note on a contact
async function writebackHubSpot(contactId: string, note: string) {
    await fetch('https://api.hubapi.com/crm/v3/objects/notes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
            properties: {
                hs_note_body: note,
                hs_timestamp: new Date().toISOString(),
            },
            associations: [{
                to: { id: contactId },
                types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }],
            }],
        }),
    });
}

// Salesforce — create a Task or Note
async function writebackSalesforce(contactId: string, note: string, accessToken: string) {
    await fetch(`${process.env.SF_INSTANCE_URL}/services/data/v59.0/sobjects/Task`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
            WhoId: contactId,
            Subject: 'AI-Generated Note',
            Description: note,
            Status: 'Completed',
            Priority: 'Normal',
        }),
    });
}
```

## Zapier / Make / n8n Webhook

These automation platforms accept generic webhook payloads:

```typescript
// Zapier Webhook
await deliverWebhook(process.env.ZAPIER_WEBHOOK_URL!, payload);

// Make (Integromat) Webhook
await deliverWebhook(process.env.MAKE_WEBHOOK_URL!, payload);

// n8n Webhook
await deliverWebhook(process.env.N8N_WEBHOOK_URL!, payload);
```

The payload structure from `WebhookPayload` above works with all three. Set up the webhook trigger in each platform to receive and route the data.

## Retry with Exponential Backoff

For production webhook delivery, add retry logic:

```typescript
async function deliverWithRetry(
    url: string,
    payload: WebhookPayload,
    headers?: Record<string, string>,
    maxRetries: number = 3,
) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await deliverWebhook(url, payload, headers);
        } catch (err: any) {
            if (attempt === maxRetries) throw err;

            const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
            console.log(`Webhook attempt ${attempt + 1} failed. Retrying in ${delay / 1000}s...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
}
```

## Multiple Destinations

Route to different webhooks based on the AI's DECIDE step:

```typescript
const destinationMap: Record<string, string> = {
    'in-app':  process.env.APP_WEBHOOK_URL!,
    'crm':     process.env.CRM_WEBHOOK_URL!,
    'zapier':  process.env.ZAPIER_WEBHOOK_URL!,
    'n8n':     process.env.N8N_WEBHOOK_URL!,
};

async function routeToDestination(destination: string, payload: WebhookPayload) {
    const url = destinationMap[destination];
    if (!url) {
        console.warn(`No webhook URL configured for destination: ${destination}`);
        return;
    }
    await deliverWithRetry(url, payload);
}
```
