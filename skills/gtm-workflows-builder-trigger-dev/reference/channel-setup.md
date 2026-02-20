# Channel Setup Guide

How to connect Gmail, HubSpot, Salesforce, Slack, and Twilio in Trigger.dev tasks using native libraries. No third-party auth services needed.

---

## Gmail (googleapis)

### Option A: Service Account (Recommended for Your Own Domain)

Best for: Your company's own Gmail accounts. No user interaction required.

**Setup:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project, enable Gmail API
3. Create a Service Account (IAM > Service Accounts)
4. Download the JSON key file
5. Enable domain-wide delegation in Google Workspace Admin:
   - Admin Console > Security > API Controls > Domain-wide Delegation
   - Add the service account client ID
   - Scopes: `https://www.googleapis.com/auth/gmail.readonly, ...gmail.send, ...gmail.modify`
6. Base64-encode the JSON key: `base64 -i key.json`
7. Set `GMAIL_SERVICE_ACCOUNT_KEY` and `GMAIL_DELEGATED_USER` in env

```typescript
import { google } from "googleapis";

const credentials = JSON.parse(
  Buffer.from(process.env.GMAIL_SERVICE_ACCOUNT_KEY!, "base64").toString()
);
const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ["https://www.googleapis.com/auth/gmail.readonly",
           "https://www.googleapis.com/auth/gmail.send"],
  subject: process.env.GMAIL_DELEGATED_USER,   // impersonate this user
});
const gmail = google.gmail({ version: "v1", auth });
```

### Option B: OAuth2 with Refresh Token

Best for: Personal Gmail or when you can't set up domain-wide delegation.

**Setup:**
1. Create OAuth 2.0 credentials in Google Cloud Console
2. Use the OAuth2 playground or a script to get a refresh token
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`

```typescript
const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const gmail = google.gmail({ version: "v1", auth });
```

### Gmail Push Notifications (Real-Time)

Instead of polling, use Google Pub/Sub push notifications:

```typescript
// One-time setup: create a Pub/Sub topic and subscription
// pointing to your webhook endpoint, then:
await gmail.users.watch({
  userId: "me",
  requestBody: {
    topicName: "projects/your-project/topics/gmail-inbound",
    labelIds: ["INBOX"],
  },
});
// Google will POST to your webhook when new emails arrive
// Webhook triggers your Trigger.dev task
```

---

## HubSpot (@hubspot/api-client)

### Auth: Private App Access Token

Best for: Your own HubSpot account. Simplest setup.

**Setup:**
1. HubSpot > Settings > Integrations > Private Apps
2. Create a private app with scopes: `crm.objects.contacts.read`, `crm.objects.contacts.write`, `crm.objects.deals.read`, `crm.objects.companies.read`
3. Copy the access token
4. Set `HUBSPOT_ACCESS_TOKEN` in env

```typescript
import { Client as HubSpotClient } from "@hubspot/api-client";

const hubspot = new HubSpotClient({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN!,
});

// Search contacts
const results = await hubspot.crm.contacts.searchApi.doSearch({
  filterGroups: [{
    filters: [{ propertyName: "lifecyclestage", operator: "EQ", value: "lead" }],
  }],
  properties: ["firstname", "lastname", "email", "company", "jobtitle"],
  limit: 100,
  after: "0",
  sorts: [],
});
```

### HubSpot Webhooks (Real-Time Events)

1. HubSpot > Settings > Integrations > Private Apps > Webhooks
2. Subscribe to events: `contact.creation`, `contact.propertyChange`, `deal.creation`
3. Point webhook URL to your API endpoint
4. Your endpoint triggers a Trigger.dev task

---

## Salesforce (jsforce)

### Auth: Username/Password + Security Token

Best for: Your own Salesforce org. No OAuth setup needed.

**Setup:**
1. Get your security token: Salesforce > Settings > Reset My Security Token
2. Set `SALESFORCE_USERNAME`, `SALESFORCE_PASSWORD`, `SALESFORCE_SECURITY_TOKEN`

```typescript
import jsforce from "jsforce";

const sf = new jsforce.Connection({
  loginUrl: process.env.SALESFORCE_LOGIN_URL || "https://login.salesforce.com",
});

await sf.login(
  process.env.SALESFORCE_USERNAME!,
  process.env.SALESFORCE_PASSWORD! + process.env.SALESFORCE_SECURITY_TOKEN!
);

// Query leads
const result = await sf.query(
  "SELECT Id, Email, Name, Company, Title, Status FROM Lead WHERE CreatedDate = TODAY"
);
```

### Salesforce Outbound Messages (Real-Time)

1. Setup > Workflow Rules > Create a rule on Lead/Contact
2. Add an Outbound Message action pointing to your webhook URL
3. Your endpoint triggers a Trigger.dev task

---

## Slack (@slack/web-api)

### Auth: Bot Token

**Setup:**
1. Go to [api.slack.com/apps](https://api.slack.com/apps), create an app
2. Bot Token Scopes: `chat:write`, `channels:read`
3. Install to workspace, copy the Bot Token (`xoxb-...`)
4. Set `SLACK_BOT_TOKEN` in env

```typescript
import { WebClient } from "@slack/web-api";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN!);

await slack.chat.postMessage({
  channel: "sales-alerts",
  text: "New hot lead: John @ Acme Corp",
});
```

### Slack Events (Incoming Messages)

1. Enable Event Subscriptions in your Slack app
2. Subscribe to `message.channels`, `app_mention`
3. Point Request URL to your API endpoint
4. Your endpoint triggers a Trigger.dev task

---

## Twilio (twilio)

### Auth: Account SID + Auth Token

```typescript
import Twilio from "twilio";

const twilio = Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

// Send SMS
await twilio.messages.create({
  body: "Follow-up: Here's the case study we discussed.",
  from: process.env.TWILIO_PHONE_NUMBER!,
  to: "+1234567890",
});
```

### Twilio Webhooks (Incoming SMS)

1. Twilio Console > Phone Numbers > Configure webhook URL
2. Twilio POSTs to your endpoint when an SMS is received
3. Your endpoint triggers a Trigger.dev task

---

## SendGrid (fetch — no SDK needed)

### Auth: API Key

```typescript
await fetch("https://api.sendgrid.com/v3/mail/send", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    personalizations: [{ to: [{ email: "lead@company.com" }] }],
    from: { email: "outreach@yourdomain.com", name: "Your Name" },
    subject: "Quick question about Acme Corp",
    content: [{ type: "text/html", value: "<p>Your email here</p>" }],
  }),
});
```
