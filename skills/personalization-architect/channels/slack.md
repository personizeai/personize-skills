# Channel: Slack

## Setup Options

### Option 1: Incoming Webhook (simplest)

1. Go to https://api.slack.com/apps → Create New App → From scratch
2. Enable **Incoming Webhooks** → Add New Webhook to Workspace
3. Choose a channel → Copy the webhook URL
4. Set `SLACK_WEBHOOK_URL` in your environment

### Option 2: Slack Web API (more features)

```bash
npm install @slack/web-api
```

Create a Slack app with `chat:write` scope and set `SLACK_BOT_TOKEN`.

## Send via Webhook (Simple)

```typescript
async function sendSlackWebhook(message: string, webhookUrl?: string) {
    const url = webhookUrl || process.env.SLACK_WEBHOOK_URL!;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
    });

    if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
    }
}
```

## Send via Web API (Rich Messages)

```typescript
import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

async function sendSlackMessage(channel: string, text: string, blocks?: any[]) {
    await slack.chat.postMessage({
        channel,     // '#sales-alerts' or 'C01234ABCDE'
        text,        // fallback text for notifications
        blocks,      // rich layout blocks (optional)
    });
}
```

## Formatting for Slack

Slack uses its own markdown variant (mrkdwn):

```typescript
function formatForSlack(content: {
    title: string;
    email: string;
    body: string;
    urgency?: 'high' | 'medium' | 'low';
}): string {
    const urgencyEmoji = {
        high: '🔴',
        medium: '🟡',
        low: '🟢',
    }[content.urgency || 'medium'];

    return [
        `${urgencyEmoji} *${content.title}*`,
        `Contact: <mailto:${content.email}|${content.email}>`,
        '',
        content.body,
        '',
        `_Generated at ${new Date().toLocaleString()}_`,
    ].join('\n');
}
```

## Rich Block Messages

For structured alerts with sections and actions:

```typescript
function buildAlertBlocks(alert: {
    title: string;
    email: string;
    healthScore: string;
    summary: string;
    action: string;
}) {
    return [
        {
            type: 'header',
            text: { type: 'plain_text', text: alert.title },
        },
        {
            type: 'section',
            fields: [
                { type: 'mrkdwn', text: `*Contact:*\n<mailto:${alert.email}|${alert.email}>` },
                { type: 'mrkdwn', text: `*Health:*\n${alert.healthScore}` },
            ],
        },
        {
            type: 'section',
            text: { type: 'mrkdwn', text: alert.summary },
        },
        { type: 'divider' },
        {
            type: 'section',
            text: { type: 'mrkdwn', text: `*Recommended Action:* ${alert.action}` },
        },
    ];
}
```

## Post to Multiple Channels

Route alerts to different channels based on urgency or team:

```typescript
async function routeSlackAlert(alert: {
    urgency: 'high' | 'medium' | 'low';
    team: 'sales' | 'cs' | 'product';
    message: string;
}) {
    const channelMap: Record<string, string> = {
        'sales-high':   '#sales-urgent',
        'sales-medium': '#sales-updates',
        'sales-low':    '#sales-digest',
        'cs-high':      '#cs-escalations',
        'cs-medium':    '#cs-updates',
        'cs-low':       '#cs-digest',
        'product-high': '#product-alerts',
        'product-medium':'#product-updates',
        'product-low':  '#product-digest',
    };

    const channel = channelMap[`${alert.team}-${alert.urgency}`] || '#general';
    await sendSlackWebhook(alert.message, process.env[`SLACK_WEBHOOK_${channel.replace('#', '').toUpperCase()}`]);
}
```

## Rate Limits

- Webhooks: ~1 request/second per webhook URL
- Web API: Tier 2 rate limit (~20 requests/minute per method)
- Add a 1-second delay between messages in batch scenarios
