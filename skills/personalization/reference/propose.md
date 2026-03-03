# Reference: PROPOSE Action

All personalization use cases, user stories, before/after examples, and technical patterns organized by surface area.

---

## How to Present a Proposal

1. **Only include surface areas relevant to their product** — Don't propose mobile if they don't have an app
2. **Lead with the most impactful use case** — The one that solves their biggest pain
3. **Use user stories matching their persona** — Developer stories for engineers, PM stories for product people
4. **Show before/after examples** — The contrast sells the value
5. **Include the technical pattern** — Developers want to see how it works, not just what it does

---

## Surface Area 1: Software / Web Application

**The opportunity:** Every screen, dashboard, and interaction can be uniquely tailored based on everything you know about the user.

### Use Cases

| Use Case | What Happens | User Story |
|---|---|---|
| **Personalized Dashboard** | AI generates greeting, insights, recommended actions, tips — unique per user | *"As a user, when I log in I see insights about MY data and next steps that matter to ME, not a generic dashboard."* |
| **Smart Onboarding** | AI adapts onboarding flow based on user's role, company size, goals | *"As a new user, the onboarding wizard skips steps I don't need and highlights features relevant to my use case."* |
| **Contextual Feature Tips** | AI surfaces undiscovered features based on usage patterns | *"As a user who exports CSV daily, I see a tip: 'Did you know you can schedule automated exports?'"* |
| **Personalized Search Results** | AI re-ranks results based on user's history and preferences | *"As a user, search results prioritize content relevant to my role and past behavior."* |
| **Dynamic Help Content** | Help articles adapt to the user's technical level and feature usage | *"As a non-technical user, I see simplified explanations. As a developer, I see API examples."* |
| **Smart Defaults** | Forms and settings pre-fill based on user patterns and preferences | *"As a returning user, the report builder remembers my preferred date range, metrics, and format."* |
| **AI-Generated Insights** | Natural language summaries of the user's data, trends, anomalies | *"As a manager, I see 'Your team resolved 23% more tickets this week — Sarah handled the most complex ones.'"* |
| **Personalized Empty States** | When a section is empty, show relevant suggestions instead of generic prompts | *"As a new user with no contacts, I see 'Import from HubSpot' because the AI knows I mentioned HubSpot during signup."* |

### Technical Pattern

Define UI variable slots, let AI fill them per user via `smartDigest()` + `ai.prompt()`. Your app handles layout — AI handles content.

```typescript
// Define what the AI should generate for each page
const DASHBOARD_VARIABLES = [
    { key: 'greeting',           description: 'Personalized greeting referencing recent activity', maxLength: 150 },
    { key: 'recommended_actions', description: 'JSON array of 3 next actions based on usage', type: 'json' },
    { key: 'insight_of_the_day', description: 'One data-driven insight about their metrics', maxLength: 200 },
    { key: 'onboarding_tip',    description: 'Next setup step (empty if fully onboarded)', maxLength: 150 },
];

// Generate all variables in one prompt call
const digest = await client.memory.smartDigest({ email, type: 'Contact', token_budget: 2500 });

const result = await client.ai.prompt({
    context: digest.data?.compiledContext,
    instructions: [{
        prompt: `Generate personalized UI variables as JSON: ${JSON.stringify(DASHBOARD_VARIABLES.map(v => v.key))}`,
        maxSteps: 5,
    }],
});

// Your web app/CMS injects the values:
//   <h1>{{greeting}}</h1>
//   <p class="insight">{{insight_of_the_day}}</p>
```

> See `recipes/web-personalization.ts` for the full implementation with caching and framework integration examples.

---

## Surface Area 2: Marketing Campaigns

**The opportunity:** Every campaign becomes a segment of one. AI writes unique copy for each recipient based on everything you know about them.

### Use Cases

| Use Case | What Happens | User Story |
|---|---|---|
| **Hyper-Personalized Cold Outreach** | AI writes unique emails per prospect — different angle, different pain point, different CTA | *"As a sales rep, each prospect gets an email that references their specific company, role, and likely pain points — not mail merge."* |
| **Intelligent Nurture Sequences** | AI adapts the next email based on what the prospect did (opened, clicked, replied, ignored) | *"As a marketer, my nurture sequence evolves — if they clicked the pricing page, the next email addresses ROI."* |
| **Event-Triggered Campaigns** | AI generates messages when specific events happen (signup, upgrade, churn signal) | *"As a product manager, when a user hits a usage milestone, they get a personalized congratulations + next-level feature tip."* |
| **Re-engagement Campaigns** | AI crafts win-back messages based on why the user went quiet | *"As a marketer, dormant users get messages that reference what they used to love about the product."* |
| **Account-Based Marketing** | AI generates account-specific content for multi-stakeholder deals | *"As an ABM manager, each stakeholder at the target account gets messaging tailored to their role and concerns."* |
| **Personalized Landing Pages** | AI generates headline, subheadline, testimonial, CTA per visitor segment | *"As a visitor from a healthcare company, I see healthcare-specific copy and a healthcare case study."* |

### Technical Pattern

The 10-step agentic loop: Observe new prospects → Recall their context → Reason about the best angle → Generate unique content → Deliver via email/ads/landing page.

```typescript
const sequence = await client.ai.prompt({
    context: assembledContext,
    instructions: [
        { prompt: 'Analyze the contact and identify the strongest angle for outreach.', maxSteps: 3 },
        { prompt: 'Write Email 1 (introduction): specific observation + value prop + soft CTA.', maxSteps: 5 },
        { prompt: 'Write Email 2 (value-add, 3 days later): insight + their situation + stronger CTA.', maxSteps: 5 },
        { prompt: 'Write Email 3 (breakup, 5 days later): brief + final reason + yes/no CTA.', maxSteps: 3 },
    ],
    evaluate: true,
    evaluationCriteria: 'Each email: under 150 words, references a specific fact, distinct angle, clear CTA.',
});
```

> See `recipes/cold-outreach-sequence.ts` for the full 3-email sequence with timing and state tracking.

---

## Surface Area 3: Mobile App

**The opportunity:** Mobile is intimate — push notifications, in-app messages, and UI personalization must feel helpful, not spammy. AI decides **what**, **when**, and **whether** to notify.

### Use Cases

| Use Case | What Happens | User Story |
|---|---|---|
| **Smart Push Notifications** | AI decides whether to send, what to say, and when — based on user context | *"As a user, I only get push notifications that are relevant to me, at times when I'm usually active."* |
| **Personalized Home Screen** | AI reorders content, surfaces relevant items, adjusts layout per user | *"As a frequent user of analytics, the home screen prioritizes my dashboards over the social feed."* |
| **Contextual In-App Messages** | AI triggers messages at the right moment based on behavior | *"As a user who just completed my first project, I see a celebration + suggestion for what to try next."* |
| **Smart Digest Notifications** | Instead of 10 separate alerts, AI compiles one meaningful daily digest | *"As a busy user, I get one morning notification summarizing everything important, not 10 pings throughout the day."* |
| **Location-Aware Personalization** | AI adjusts content based on locale, timezone, local events | *"As a user in Tokyo, I see content relevant to my timezone and local market."* |

### Technical Pattern

Your mobile app calls a personalization API endpoint that runs `smartDigest()` + `ai.prompt()` and returns JSON for the app to render.

```typescript
// API endpoint: GET /api/personalize/:userId
const digest = await client.memory.smartDigest({ email: user.email, type: 'Contact', token_budget: 2000 });

const result = await client.ai.prompt({
    context: digest.data?.compiledContext,
    instructions: [{
        prompt: 'Generate personalized mobile home screen content as JSON: { greeting, topAction, insightCard, notificationSummary }',
        maxSteps: 3,
    }],
});

// Return JSON to mobile app
res.json(JSON.parse(result.data));
```

---

## Surface Area 4: Notifications (Email, Slack, SMS, In-App, Webhook)

**The opportunity:** The difference between a notification users ignore and one they act on is personalization.

### Before/After

- **Generic:** "You have 3 new leads this week"
- **Personized:** "Jane — 3 new leads landed, including one from Initech (the company you mentioned wanting to expand into). Sarah Chen, their VP Eng, downloaded your API docs — might be worth a warm intro since you both spoke at CloudConf."

### Use Cases

| Use Case | What Happens | User Story |
|---|---|---|
| **Smart Alerts** | AI generates uniquely personalized alerts for each recipient via `smartDigest()` | *"As a sales manager, my daily briefing references specific deals, specific reps, and specific actions — not generic KPIs."* |
| **Escalation Notifications** | AI detects at-risk situations and crafts escalation messages with full context | *"As a CS manager, I get a Slack alert: 'Acme Corp health declining — 3 unanswered tickets, login frequency down 40%, renewal in 30 days.'"* |
| **Product Usage Nudges** | AI spots underutilized features and sends relevant tips | *"As a user who exports data manually, I get an email: 'You exported 12 reports last month. Did you know you can schedule them?'"* |
| **Customer Health Check-Ins** | AI assesses health and generates the right message — value-reinforcement if healthy, concern if declining | *"As a customer, I get a check-in that references my actual usage and wins, not a generic 'how's it going?'"* |
| **Meeting Prep Briefs** | AI compiles everything known about a contact into a one-page brief before meetings | *"As a sales rep, before every call I get a brief with talking points, landmines to avoid, and the prospect's recent activity."* |
| **Internal Team Alerts** | AI notifies the right team member about the right customer event | *"As a support lead, when a VIP customer submits a ticket, I get a Slack alert with their full context and history."* |

### Delivery Channels

| Channel | Integration | Template |
|---|---|---|
| **Email** | SendGrid, AWS SES, Resend | `channels/sendgrid.md` |
| **Slack** | Webhook + Web API | `channels/slack.md` |
| **SMS / WhatsApp** | Twilio | `channels/twilio.md` |
| **Webhook** (any destination) | Generic HTTP POST | `channels/webhook.md` |
| **In-App** | Your own notification API | Via webhook pattern |
| **CRM Writeback** | HubSpot, Salesforce API | Via webhook pattern |

### Technical Pattern

```typescript
// Layer 1: Rules — what kind of notifications to send
const vars = await client.ai.smartGuidelines({ message: 'notification guidelines' });

// Layer 2: Deep context — EVERYTHING about this person
const digest = await client.memory.smartDigest({
    email: 'jane@acme.com', type: 'Contact',
    token_budget: 3000, include_properties: true, include_memories: true,
});

// Layer 3: Trigger-specific recall
const recalled = await client.memory.recall({ query: triggerEvent, email: 'jane@acme.com' });

// Generate uniquely personalized notification
const notification = await client.ai.prompt({
    context: [vars.data?.compiledContext, digest.data?.compiledContext, recalled.data].join('\n\n'),
    instructions: [
        { prompt: 'Why does this trigger matter to THIS specific person?', maxSteps: 3 },
        { prompt: 'Decide channel (email/slack/sms/in-app) and priority (immediate/standard/digest).', maxSteps: 2 },
        { prompt: 'Write the notification. Reference 2+ specific facts.', maxSteps: 5 },
    ],
});
```

> See `recipes/smart-notification.ts` for the full implementation.

---

## Surface Area 5: Customer Success & Support

**The opportunity:** Every customer interaction is informed by everything the AI knows about that customer.

### Use Cases

| Use Case | What Happens | User Story |
|---|---|---|
| **AI-Powered Ticket Routing** | AI reads the ticket, recalls the customer's history, and routes to the best agent with full context | *"As a support agent, when I pick up a ticket, I already see the customer's history, plan, and related past issues."* |
| **Proactive Churn Prevention** | AI monitors health signals and triggers outreach before the customer churns | *"As a CS manager, I'm alerted 30 days before renewal when a customer's engagement drops."* |
| **QBR Prep** | AI generates quarterly business review materials with the customer's metrics, wins, and recommendations | *"As an account manager, my QBR deck is auto-generated with the customer's actual usage data and ROI metrics."* |
| **Personalized Knowledge Base** | AI recommends help articles based on the user's product usage and technical level | *"As a user searching for help, I see articles that match my skill level and the features I actually use."* |

### Technical Pattern

```typescript
// Customer health check-in
const checkin = await client.ai.prompt({
    context: assembledContext,
    instructions: [
        { prompt: 'Assess customer health: engagement, sentiment, renewal dates, unresolved issues.', maxSteps: 3 },
        { prompt: 'If declining: write personalized check-in. If healthy: write value-reinforcement with their wins.', maxSteps: 5 },
        { prompt: 'Decide urgency and channel. Email for formal, Slack for internal alert, SMS for urgent.', maxSteps: 2 },
    ],
});
```

> See `recipes/health-check-message.ts` and `recipes/product-usage-alert.ts` for full implementations.

---

## User Stories by Persona

Use stories that match who you're talking to.

### For the Developer / Engineering Team
- *"As a developer, I can add personalization to any page by calling one API endpoint — no ML pipeline to build."*
- *"As a developer, I pipe product events into Personize and get AI-powered user context back — no training data required."*
- *"As a developer, I define UI variable slots and the AI fills them per user. My templates stay clean."*
- *"As a developer, governance variables ensure the AI follows our brand voice and policies without per-prompt instructions."*

### For the Product Manager
- *"As a PM, I can see which features are underutilized per user segment and trigger targeted adoption campaigns."*
- *"As a PM, onboarding adapts automatically — power users skip basics, new users get guided tours."*
- *"As a PM, every user's dashboard tells a story about their data, not just shows charts."*

### For the Sales Team
- *"As a sales rep, I never send a generic email. Every outreach references the prospect's specific situation."*
- *"As a sales rep, I get a one-page brief before every call with talking points and landmines."*
- *"As a sales manager, I get daily AI-generated pipeline insights that reference specific deals and reps."*

### For Marketing
- *"As a marketer, every campaign email is unique per recipient — different angle, pain point, and CTA."*
- *"As a marketer, my nurture sequences adapt based on what prospects actually do, not just time delays."*
- *"As a marketer, landing pages show copy that matches the visitor's industry and role."*

### For Customer Success
- *"As a CS manager, I know which customers are at risk before they tell me."*
- *"As a CS manager, my check-in messages reference the customer's actual wins and usage, not a template."*
- *"As a CS manager, QBR materials are auto-generated with real metrics and AI-recommended next steps."*
