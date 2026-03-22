# Reference: WIRE Action

Complete integration guide for connecting Personize pipelines to existing functions, APIs, and delivery systems. Covers wiring patterns, error handling, rate limit alignment, auth management, graceful degradation, and recipes for common stacks.

---

## The WIRE Principle

Personize doesn't replace your stack — it enriches it. The WIRE action helps developers connect Personize to what they already have:

- **Existing API endpoints** — add personalization to responses
- **Existing email/notification functions** — swap static templates for AI-generated content
- **Existing webhooks** — trigger Personize pipelines from external events
- **Existing cron jobs** — add a personalization layer to batch operations
- **Existing middleware** — inject context into request handlers

---

## Integration Patterns

### SmartGuidelines — Broad vs. Targeted Fetch

Two modes for fetching governance context — choose based on whether the task is open-ended or requires specific known guidelines:

```typescript
// Broad (semantic) — let the system route to relevant guidelines by topic
const governance = await client.ai.smartGuidelines({
    message: 'cold outbound email for VP of Sales at a SaaS company',
    tags: ['outbound', 'email'],         // optional: filter to guidelines with these tags
    excludeTags: ['internal'],           // optional: exclude draft/internal guidelines
    mode: 'fast',                        // 'fast' (~200ms) | 'deep' (~3s) | 'auto'
});

// Targeted — force-include specific guidelines by ID (bypasses scoring)
const governance = await client.ai.smartGuidelines({
    message: 'pricing email follow-up',
    guidelineIds: ['action_abc123', 'action_def456'],  // always included regardless of relevance score
});

// Targeted by name — server resolves names to IDs (case-insensitive)
const governance = await client.ai.smartGuidelines({
    message: 'renewal conversation',
    guidelineNames: ['Sales Playbook', 'Pricing Policy'],
});

// governance.data.compiledContext — ready-to-inject markdown with guidelines
// governance.data.selection — which guidelines matched and why
```

> Use **broad** for open-ended tasks where you don't know which guidelines apply. Use **targeted** when you know exactly which policy must be enforced — e.g., "always include the pricing disclaimer guideline" or "this agent must follow the compliance checklist."

---

### Pattern 1: Wrap & Enhance

The simplest pattern — wrap an existing function to add personalization while keeping the original signature.

```typescript
// ─── Your existing function ───
async function sendWelcomeEmail(userId: string, email: string) {
    const template = getDefaultTemplate('welcome');
    await emailService.send({ to: email, ...template });
}

// ─── Personized version ───
async function sendWelcomeEmail(userId: string, email: string) {
    try {
        // Assemble personalization context
        const [governance, digest] = await Promise.all([
            client.ai.smartGuidelines({
                message: 'welcome email guidelines, onboarding tone, first-impression rules',
            }),
            client.memory.smartDigest({
                email,
                type: 'Contact',
                token_budget: 1500,
                include_properties: true,
                include_memories: true,
            }),
        ]);

        const context = [
            governance.data?.compiledContext || '',
            digest.data?.compiledContext || '',
        ].filter(Boolean).join('\n\n---\n\n');

        // Generate personalized content
        const result = await client.ai.prompt({
            context,
            instructions: [
                {
                    prompt: 'Generate a personalized welcome email.\n\nSUBJECT: (plain text, ≤ 80 chars)\nBODY_HTML: (with <p>, <b>, <i> tags)\nBODY_TEXT: (plain text fallback)',
                    maxSteps: 5,
                },
            ],
        });

        const output = String(result.data || '');
        const subject = output.match(/SUBJECT:\s*(.+)/i)?.[1]?.trim();
        const bodyHtml = output.match(/BODY_HTML:\s*([\s\S]+?)(?=\nBODY_TEXT:|$)/i)?.[1]?.trim();
        const bodyText = output.match(/BODY_TEXT:\s*([\s\S]+)/i)?.[1]?.trim();

        // Deliver via existing service
        await emailService.send({
            to: email,
            subject: subject || 'Welcome!',
            html: bodyHtml || getDefaultTemplate('welcome').html,
            text: bodyText,
        });

        // Remember what was sent (feedback loop)
        await client.memory.memorize({
            content: `[WELCOME EMAIL] Sent ${new Date().toISOString()}. Subject: ${subject}`,
            email,
            enhanced: true,
            tags: ['generated', 'welcome', 'email'],
        });

    } catch (err) {
        // GRACEFUL DEGRADATION — fall back to original behavior
        console.error('Personization failed, falling back to default:', err);
        const template = getDefaultTemplate('welcome');
        await emailService.send({ to: email, ...template });
    }
}
```

**Key point:** The `catch` block falls back to the original template. Personize failures should never break existing functionality.

---

### Pattern 2: Webhook → Pipeline

Receive events from external systems and trigger personalization pipelines.

```typescript
import express from 'express';

const app = express();
app.use(express.json());

// ─── CRM webhook: contact updated ───
app.post('/webhooks/crm/contact-updated', async (req, res) => {
    const { email, fields, event } = req.body;

    // Step 1: REMEMBER — store the update in memory
    await client.memory.memorizeBatch({
        records: [{
            recordId: email,
            collectionName: 'Contacts',
            properties: Object.fromEntries(
                Object.entries(fields).map(([key, value]) => [
                    key,
                    {
                        value: String(value),
                        extractMemories: typeof value === 'string' && value.length > 100,
                    },
                ])
            ),
        }],
    });

    // Step 2: If event warrants action, trigger a pipeline
    const actionableEvents: Record<string, string> = {
        'deal_closed': 'onboarding sequence',
        'renewal_due': 'renewal reminder',
        'churn_risk_high': 'retention outreach',
        'upgrade_signal': 'expansion opportunity',
    };

    const pipeline = actionableEvents[event];
    if (pipeline) {
        // Queue for async processing (don't block the webhook)
        queuePipeline({ email, purpose: pipeline, trigger: event });
    }

    res.json({ received: true });
});

// ─── Payment webhook: subscription events ───
app.post('/webhooks/stripe', async (req, res) => {
    const event = req.body;

    if (event.type === 'customer.subscription.created') {
        const email = event.data.object.customer_email;
        const plan = event.data.object.items.data[0]?.plan?.nickname;

        await client.memory.memorize({
            content: `Subscription created: ${plan} plan on ${new Date().toISOString()}`,
            email,
            enhanced: true,
            tags: ['subscription', 'payment', 'lifecycle'],
        });

        queuePipeline({ email, purpose: 'new subscriber welcome', trigger: 'subscription.created' });
    }

    res.json({ ok: true });
});
```

---

### Pattern 3: API Middleware — Enrich Responses

Add a middleware layer that injects personalization into API responses.

```typescript
// ─── Middleware: attach personalization context to requests ───
async function personalize(req: any, res: any, next: any) {
    const email = req.user?.email;
    if (!email) return next();

    try {
        const digest = await client.memory.smartDigest({
            email,
            type: 'Contact',
            token_budget: 500,
            include_properties: true,
        });
        req.personalization = {
            context: digest.data?.compiledContext || null,
            properties: digest.data?.properties || {},
        };
    } catch {
        req.personalization = null; // graceful degradation — never block the request
    }
    next();
}

// ─── Usage in a route ───
app.get('/api/dashboard', personalize, async (req, res) => {
    const data = await getDashboardData(req.user.id);

    if (req.personalization?.context) {
        // Generate a personalized insight for the dashboard
        const insight = await client.ai.prompt({
            context: req.personalization.context + '\n\nDashboard data: ' + JSON.stringify(data.summary),
            instructions: [
                { prompt: 'Write a 1-2 sentence personalized insight about this dashboard data. Reference the user\'s goals or recent activity.', maxSteps: 3 },
            ],
        });
        data.personalizedInsight = String(insight.data || '');
    }

    res.json(data);
});
```

---

### Pattern 4: Cron → Generate → Deliver

Scheduled jobs that batch-generate and deliver personalized content.

```typescript
// ─── Daily cron: personalized digest emails ───
async function dailyDigestJob() {
    const exported = await client.memory.search({
        type: 'Contact',
        returnRecords: true,
        pageSize: 100,
        groups: [{
            id: 'active', logic: 'AND',
            conditions: [
                { property: 'email', operator: 'IS_SET' },
                { property: 'digest_opt_in', operator: 'EQ', value: 'true' },
            ],
        }],
    });

    const records = exported.data?.records || {};

    for (const [recordId, props] of Object.entries(records)) {
        const email = (props as any).email?.value;
        if (!email) continue;

        try {
            const content = await generateWithGuardrails({
                email,
                channel: 'email',
                purpose: 'daily digest',
            });

            if (content.reviewFlag) {
                console.log(`Flagged for review: ${email} — ${content.reviewFlag}`);
                continue; // skip delivery, send to review queue
            }

            await deliverEmail(email, content);

            await client.memory.memorize({
                content: `[DAILY DIGEST] Sent ${new Date().toISOString()}. Subject: ${content.subject}`,
                email,
                enhanced: true,
                tags: ['generated', 'digest', 'email'],
            });

        } catch (err: any) {
            console.error(`Digest failed for ${email}:`, err.message);
        }

        await new Promise(r => setTimeout(r, 2000)); // rate limit pause
    }
}
```

---

### Pattern 5: Event-Driven Pipeline (Queue-Based)

For production systems, use a queue to decouple event capture from personalization.

```typescript
// ─── Producer: push events to queue ───
async function queuePipeline(event: {
    email: string;
    purpose: string;
    trigger: string;
    data?: any;
}) {
    // Use your existing queue: SQS, BullMQ, RabbitMQ, etc.
    await queue.add('personalize', event, {
        delay: 1000,           // small delay to let memory settle
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
    });
}

// ─── Consumer: process from queue ───
queue.process('personalize', async (job) => {
    const { email, purpose, trigger, data } = job.data;

    const content = await generateWithGuardrails({
        email,
        channel: 'email',
        purpose,
        additionalContext: data ? JSON.stringify(data) : undefined,
    });

    await deliverEmail(email, content);

    await client.memory.memorize({
        content: `[${purpose.toUpperCase()}] Triggered by ${trigger}. Sent ${new Date().toISOString()}.`,
        email,
        enhanced: true,
        tags: ['generated', trigger, purpose],
    });
});
```

---

## Error Handling & Graceful Degradation

### The Rule

> Personize failures must NEVER break existing functionality. If personalization fails, fall back to the default behavior.

### Patterns

```typescript
// ─── Pattern: Try-personalize, catch-default ───
async function getEmailContent(email: string, type: string) {
    try {
        const personalized = await generateWithGuardrails({ email, channel: 'email', purpose: type });
        return { subject: personalized.subject, html: personalized.bodyHtml, text: personalized.bodyText };
    } catch (err) {
        console.warn(`Personalization failed for ${email}, using default template:`, err);
        return getDefaultTemplate(type);
    }
}

// ─── Pattern: Timeout wrapper ───
async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]);
}

// Usage: max 10s for personalization, then fall back
const content = await withTimeout(
    generateWithGuardrails({ email, channel: 'email', purpose: 'welcome' }),
    10_000,
    { channel: 'email', bodyText: getDefaultTemplate('welcome').text } as GeneratedContent,
);

// ─── Pattern: Circuit breaker ───
let failures = 0;
const MAX_FAILURES = 5;

async function personalizeWithCircuitBreaker(email: string, purpose: string) {
    if (failures >= MAX_FAILURES) {
        console.warn('Circuit breaker open — skipping personalization');
        return getDefaultTemplate(purpose);
    }

    try {
        const result = await generateWithGuardrails({ email, channel: 'email', purpose });
        failures = 0; // reset on success
        return result;
    } catch (err) {
        failures++;
        console.warn(`Personalization failure ${failures}/${MAX_FAILURES}:`, err);
        return getDefaultTemplate(purpose);
    }
}
```

---

## Rate Limit Alignment

When wiring Personize to an external API, both sides have rate limits. Align them.

```typescript
// ─── Get both rate limits ───
const { data: me } = await client.me();
const personizeRpm = me?.plan?.limits?.requestsPerMinute || 60;

// Your external API's limit (check their docs)
const sendgridRpm = 100; // example

// Use the LOWER of the two
const effectiveRpm = Math.min(personizeRpm, sendgridRpm);
const delayMs = Math.ceil(60_000 / effectiveRpm);

console.log(`Effective rate: ${effectiveRpm}/min — ${delayMs}ms between operations`);

// Apply in your loop
for (const contact of contacts) {
    await processContact(contact);
    await new Promise(r => setTimeout(r, delayMs));
}
```

---

## Auth Management

Keep Personize auth separate from your other service credentials.

```typescript
// .env file structure
// PERSONIZE_SECRET_KEY=sk_live_...
// SENDGRID_API_KEY=SG.xxx
// SLACK_WEBHOOK_URL=https://hooks.slack.com/...
// STRIPE_SECRET_KEY=sk_live_...

// Initialize each service independently
const personize = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// Validate all connections at startup
async function validateConnections() {
    const checks: Array<{ name: string; check: () => Promise<boolean> }> = [
        {
            name: 'Personize',
            check: async () => { const r = await personize.me(); return !!r.data; },
        },
        {
            name: 'SendGrid',
            check: async () => { return !!process.env.SENDGRID_API_KEY; },
        },
        // ...add checks for each service
    ];

    for (const { name, check } of checks) {
        try {
            const ok = await check();
            console.log(`${ok ? '✓' : '✗'} ${name}`);
        } catch (err: any) {
            console.log(`✗ ${name}: ${err.message}`);
        }
    }
}
```

---

## Stack-Specific Recipes

### Next.js API Route

```typescript
// pages/api/personalize/[action].ts  (or app/api/personalize/[action]/route.ts)
import { Personize } from '@personize/sdk';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

export async function POST(req: Request) {
    const { email, action, data } = await req.json();

    switch (action) {
        case 'memorize':
            const memResult = await client.memory.memorizeBatch({ records: data.records });
            return Response.json(memResult.data);

        case 'digest':
            const digest = await client.memory.smartDigest({
                email, type: 'Contact', token_budget: 1000,
            });
            return Response.json({ context: digest.data?.compiledContext });

        case 'generate':
            // Use the GENERATE guardrails
            const content = await generateWithGuardrails({
                email, channel: data.channel, purpose: data.purpose,
            });
            return Response.json(content);

        default:
            return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
}
```

### Express Middleware Stack

```typescript
import express from 'express';
import { Personize } from '@personize/sdk';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
const app = express();

// Middleware 1: Attach Personize client to request
app.use((req: any, res, next) => {
    req.personize = client;
    next();
});

// Middleware 2: Personalization context (only for authenticated routes)
app.use('/api/personalized/*', async (req: any, res, next) => {
    if (!req.user?.email) return next();
    try {
        const digest = await client.memory.smartDigest({
            email: req.user.email, type: 'Contact', token_budget: 500,
        });
        req.pContext = digest.data?.compiledContext || null;
    } catch { req.pContext = null; }
    next();
});

// Route: use personalization context
app.get('/api/personalized/home', async (req: any, res) => {
    const baseData = await getHomeData(req.user.id);
    if (req.pContext) {
        // ...generate personalized content...
    }
    res.json(baseData);
});
```

### n8n / Zapier / Automation Platforms

For no-code/low-code platforms, use a webhook endpoint as the bridge:

```typescript
// Your webhook endpoint that n8n/Zapier calls
app.post('/api/personize-bridge', async (req, res) => {
    const { action, email, purpose, channel, records } = req.body;

    try {
        let result: any;

        switch (action) {
            case 'memorize':
                result = await client.memory.memorizeBatch({ records });
                break;
            case 'generate':
                result = await generateWithGuardrails({ email, channel, purpose });
                break;
            case 'digest':
                result = await client.memory.smartDigest({ email, type: 'Contact', token_budget: 1500 });
                break;
            default:
                return res.status(400).json({ error: 'Unknown action' });
        }

        res.json({ ok: true, data: result });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
```

---

---

## Pattern 6: MCP Tool Provider

When Personize is a tool in an external orchestrator (OpenClaw, CoWork, CrewAI, LangGraph, n8n AI nodes), the wiring is the MCP connection itself.

### How It Works

```
External Orchestrator
  ├── Agent receives task (from user, scheduler, or event)
  ├── Agent calls: memory_recall_pro (Personize MCP) -- get context
  ├── Agent calls: ai_smart_guidelines (Personize MCP) -- get rules
  ├── Agent reasons with combined context + rules
  ├── Agent calls: your_delivery_api or other MCP tools -- act
  ├── Agent calls: memory_store_pro (Personize MCP) -- record outcome
  └── Agent calls: memory_update_property (Personize MCP) -- update status
```

### MCP Connection Setup

**API Key in URL (simplest -- works for Cursor, Windsurf, n8n, Zapier, LangChain):**
```
https://agent.personize.ai/mcp/sse?api_key=sk_live_YOUR_KEY
```

**API Key in header (more secure -- for clients that support custom headers):**
```
URL: https://agent.personize.ai/mcp/sse
Header: Authorization: Bearer sk_live_YOUR_KEY
```

**OAuth (required for ChatGPT, Claude web/Desktop):**
```
URL: https://agent.personize.ai/mcp/sse?organizationId=org_YOUR_ORG
Client ID: 1oe3h50chvlddca1110ncmr7bg
```

### Scoping Tools Per Agent

Not every agent needs all 13 tools. Scope by role:

| Agent Role | Tools Needed |
|---|---|
| **Read-only researcher** | `memory_recall_pro`, `memory_digest`, `memory_get_properties`, `ai_smart_guidelines`, `memory_search` |
| **Content generator** | Above + `ai_prompt` |
| **Data writer** | Above + `memory_store_pro`, `memory_update_property`, `memory_batch_memorize`, `memory_upsert` |
| **Governance manager** | Above + `guideline_create`, `guideline_update`, `guideline_list`, `guideline_read` |

### Testing MCP Wiring

Verify the agent can:
1. **List tools** -- should see 13+ Personize tools
2. **Read** -- `memory_recall_pro` with a known entity returns data
3. **Write** -- `memory_store_pro` stores a test memory, `memory_recall_pro` retrieves it
4. **Governance** -- `ai_smart_guidelines` returns guidelines for a real task

---

## Pattern 7: Outbound Webhooks (Personize -> External)

Personize can push data OUT to your systems via webhook destinations.

### Setup

Configure destinations in the Personize dashboard: **Integrations > Destinations**

### Delivery Architecture

```
Event in Personize
  └── SQS Queue (Webhook_Core_SQS)
       └── webhookCore Lambda
            └── HTTP POST to your URL
                 ├── X-Personize-Signature: sha256=<HMAC-SHA256 hex>
                 ├── X-Personize-Signature-Alg: HMAC-SHA256
                 └── Body: raw event payload (NOT wrapped in envelope)
```

- **Timeout:** ~1.5s fire-and-forget -- your receiver must respond fast
- **Retries:** Configurable with exponential backoff
- **SSRF protection:** Blocks private/internal IP ranges

### Receiver Example

```typescript
import crypto from 'crypto';

app.post('/webhooks/personize', async (req, res) => {
    // Verify HMAC signature
    const signature = req.headers['x-personize-signature'] as string;
    const expected = 'sha256=' + crypto
        .createHmac('sha256', process.env.WEBHOOK_SECRET!)
        .update(JSON.stringify(req.body))
        .digest('hex');

    if (signature !== expected) {
        return res.status(401).json({ error: 'Invalid signature' });
    }

    // Body is the raw event payload (NOT wrapped in an envelope)
    const payload = req.body;

    // Process based on your destination's event configuration
    await processWebhookPayload(payload);

    res.json({ ok: true }); // Respond fast -- webhook times out at ~1.5s
});
```

### When to Use Outbound Webhooks

| Use Case | Direction | Trigger |
|---|---|---|
| CRM sync | Personize -> CRM | Memory updated |
| Delivery | Personize -> email/Slack/SMS | Generation completed |
| Alerting | Personize -> monitoring | Threshold crossed |
| Data export | Personize -> data warehouse | Scheduled or on-demand |

---

## The 4-Leg Data Flow -- Wiring Checklist

For every integration, explicitly map which legs are active:

| Leg | Direction | Wiring Pattern | Verify |
|---|---|---|---|
| **Leg 1: Ingest** | External -> Personize | Webhook receiver, batch script, CRM sync, event stream | Data appears in `memory_recall_pro` or `search()` |
| **Leg 2: Context** | Personize -> Agents/Code | SDK `smartDigest`/`recall`/`smartGuidelines`, or MCP tool calls | Context assembly returns meaningful data |
| **Leg 3: Learn Back** | Agents -> Personize | `memorize()` outcomes, `memory_update_property`, `guideline_update` | Past actions visible in future recalls |
| **Leg 4: Deliver** | Personize -> External | Outbound webhooks, agent API calls, SDK delivery code | External system receives and processes data |

**Common mistakes:**
- Missing Leg 3: generating content but never storing what was sent -> future generations don't know what happened
- Missing Leg 1 diversity: only ingesting CRM data, missing support tickets, usage data, enrichment
- Assuming Leg 4 only means email: webhooks, Slack, CRM updates, and dashboard data are all delivery

---

## Testing Wired Integrations

### Step 1: Validate Each Connection

```typescript
// Test Personize auth
const { data: me } = await client.me();
console.log('Personize org:', me?.organization.id);

// Test MCP (if using)
// Have agent call memory_recall_pro with a test query

// Test external service
await emailService.send({ to: 'test@internal.com', subject: 'Wire test', html: '<p>Test</p>' });
```

### Step 2: Dry Run the Full Pipeline

Set `DRY_RUN=true` and verify that:
1. Context assembly works (governance + digest + recall)
2. Generation produces correct format
3. Output parsing extracts the right fields
4. The delivery function receives the correct parameters
5. The learn-back step stores the outcome correctly

### Step 3: Single-Contact Live Test

Run the full pipeline for ONE contact with a real delivery but to a test inbox/channel.

### Step 4: Scale Gradually

10 contacts -> 50 -> 100 -> full list. Monitor for:
- Rate limit errors (429s)
- Degraded output quality at volume
- External API failures
- Memory/CPU usage
- MCP tool call failures (if applicable)
