---
name: personalization
description: "Architect and implementation guide for deploying unified customer memory, a governance layer, and AI-powered personalization across products, websites, and workflows using the Personize SDK. Covers the full journey — discovery, schema design, memorization pipelines, governance setup, content generation with guardrails, system wiring, and integration review. Use when a company wants to centralize what they know about each customer, unify the guidelines their AI agents follow, and deliver personalized experiences across every channel."
license: Apache-2.0
compatibility: "Requires @personize/sdk and a Personize API key (sk_live_...)"
metadata: {"author": "personize-ai", "version": "1.0", "homepage": "https://personize.ai", "openclaw": {"emoji": "\U0001F3AF", "requires": {"env": ["PERSONIZE_SECRET_KEY"]}}}
---

# Skill: Personalization

This skill is your architect and implementation guide for deploying AI-powered personalization at scale using the Personize SDK.

## What This Skill Solves

Most companies face three problems that block real personalization:

1. **Scattered customer knowledge.** Customer data lives across CRMs, databases, support tools, analytics, and spreadsheets. No single system holds a complete, AI-readable picture of each customer — so when an agent needs to write or decide, it's missing context from other tools.

2. **Siloed AI guidelines.** Rules for how to write, analyze, reason, and act exist in scattered prompts and docs. Each AI agent follows its own version. There is no shared governance layer.

3. **Fragmented personalization.** Personalization lives in pockets (a merge-tag here, a segment there) with no unified engine across communication channels (email, SMS, push, Slack) **and** content surfaces (web pages, dashboards, reports, proposals, onboarding).

## What Personize Enables

Personize gives the developer three capabilities, all accessible via REST API, SDK (`@personize/sdk`), and MCP (for AI agents and LLM nodes):

| Capability | What It Does | Core SDK Methods |
|---|---|---|
| **Unified Customer Memory** | Ingests structured and unstructured data from any tool via `memorizeBatch()`. AI extracts properties into per-entity profiles. Write-heavy by design — ingest everything, recall what matters. | `memorize()`, `memorizeBatch()`, `recall()`, `smartDigest()` |
| **Governance Layer** | Centralizes guidelines (brand voice, ICPs, compliance rules, tone) as variables. Every agent fetches governance before generating — one source of truth instead of per-agent prompts. | `smartGuidelines()`, `guidelines.list/create/update()` |
| **Personalization Engine** | Combines memory (who is this person?) + governance (what are our rules?) to generate personalized output via multi-step `instructions[]`. | `prompt()` with `instructions[]`, `evaluate: true` |

**Personalization surfaces:**
- **Communication** — email, SMS, push notifications, Slack, in-app messages
- **Content** — web pages, dashboards, reports, proposals, onboarding flows, knowledge base articles

> **Internal principle:** Every product has 10x more personalization surface area than its team realizes. Your job is to find it all.

---

## When This Skill is Activated

This skill guides the developer through the full journey — from understanding their product to deploying unified customer memory, governance, and personalization capabilities.

**If the developer hasn't given a specific instruction yet**, proactively introduce yourself and ask:

> "I can help you set up Personize — unified customer memory, shared AI governance, and personalized content generation across all your channels. What does your product do, and what are you trying to personalize?"

**If the developer gives a broad direction** (e.g., "help me personalize my app"), start with **DISCOVER** to understand their product before proposing anything.

**If the developer gives a specific request** (e.g., "write a cold outreach pipeline"), jump directly to the relevant action — **PLAN**, **SCHEMA**, or **REVIEW**.

---

## When NOT to Use This Skill

- Need a production pipeline with retries, scheduling, and durable execution → use **code-pipelines**
- Need to sync CRM data before personalizing → use **data-sync** or **no-code-pipelines** first
- Only need to store/retrieve entity data → use **entity-memory** directly
- Only need to manage org rules → use **governance**

---

## Actions

You have 7 actions available. Use whichever is appropriate for what the developer needs. They are not sequential — jump to the right action based on the conversation.

| Action | When to Use | Reference |
|---|---|---|
| **DISCOVER** | Developer is new or you need to understand their product | `reference/discover.md` |
| **PROPOSE** | Ready to show personalization opportunities, use cases, user stories | `reference/propose.md` |
| **PLAN** | Developer wants a technical implementation roadmap | `reference/plan.md` |
| **SCHEMA** | Developer needs to design collections and properties | `reference/schema.md` |
| **GENERATE** | Developer needs to produce content (emails, messages, notifications) with production-quality guardrails | `reference/generate.md` |
| **WIRE** | Developer needs to connect Personize outputs to existing functions, APIs, and systems | `reference/wire.md` |
| **REVIEW** | Developer already has Personize integrated — audit and improve | `reference/review.md` |

**Before each action:** Read the reference file for full details, questions, checklists, and code examples.

---

## Action: DISCOVER

Understand the developer's product before proposing anything. Ask questions conversationally — 2-3 at a time, not a checklist.

**Core questions:**
1. What does your product do? Walk me through the core user journey.
2. Where do your users interact? (web app, mobile, email, Slack, SMS, notifications, dashboards)
3. What data do you already have about your users?
4. What does your team do manually that involves knowing about a specific user?
5. What do you wish your product knew about each user that it doesn't?
6. What personalization do you have today, if any?
7. What's your tech stack?

**If they share code:** Read it. Look for user objects, event tracking, analytics calls, email sends, webhook handlers. Every `user.email`, `event.track()`, `sendEmail()`, or `notify()` is a personalization opportunity.

> **Full guide:** Read `reference/discover.md` for the complete discovery framework, codebase analysis patterns, and data source mapping.

---

## Action: PROPOSE

After discovery, present a tailored proposal organized by **where personalization shows up**. Don't just list features — paint the picture of what their product becomes with Personize.

**5 surface areas** (only propose what's relevant):

| Surface Area | Key Use Cases |
|---|---|
| **Software / Web App** | Personalized dashboards, smart onboarding, contextual feature tips, AI-generated insights, smart defaults, personalized empty states |
| **Marketing Campaigns** | Hyper-personalized outreach, intelligent nurture sequences, event-triggered campaigns, re-engagement, ABM, personalized landing pages |
| **Mobile App** | Smart push notifications, personalized home screen, contextual in-app messages, smart digest notifications |
| **Notifications** | Smart alerts via `smartDigest()`, escalation notifications, product usage nudges, health check-ins, meeting prep briefs, internal team alerts |
| **Customer Success** | AI-powered ticket routing, proactive churn prevention, QBR prep, personalized knowledge base |

**User stories by persona:** Developer, Product Manager, Sales, Marketing, Customer Success — use stories that match who you're talking to.

**The magic formula:** `smartGuidelines` (rules) + `smartDigest` (who) + `recall` (what) = deeply personalized AI output. Use `mode: 'fast'` for real-time agents (~200ms), `mode: 'full'` for deep analysis (~3s).

> **Full guide:** Read `reference/propose.md` for all use cases with user stories, before/after examples, technical patterns, and code snippets for each surface area.

---

## Action: PLAN

When the developer says "let's do it" — generate a complete implementation roadmap.

**Plan structure:**
1. **Data Ingestion** — What to memorize, which fields, `extractMemories` true/false, collection mapping
2. **Personalization Points** — Every touchpoint (UI, email, notifications), SDK method chain, prompt template
3. **Governance Setup** — Variables needed (brand voice, ICPs, policies), draft content
4. **Architecture** — Where Personize fits in their stack, caching strategy, rate limit budget
5. **Phases** — Week 1: data ingestion → Week 2: first feature → Week 3-4: full pipeline → Ongoing: advanced
6. **Code Examples** — Actual TypeScript using their specific data models and field names

**Every plan must include:**
- `npm install @personize/sdk` + project setup
- `client.me()` to verify auth and read plan limits
- `client.collections.list()` to find real collection IDs
- `memorizeBatch()` scripts for each data source
- The 10-step pipeline loop tailored to their use case
- Scheduling (cron, GitHub Actions, or event-driven)
- Delivery integration (SendGrid, Slack, Twilio, webhook)

> **Full guide:** Read `reference/plan.md` for the complete plan template, data intelligence guide (what to memorize), the 10-step agentic loop, all recipes, delivery channel templates, and rate limit calculations.

---

## Action: SCHEMA — Design Memory Schemas

Help the developer design their complete data schema — **collections** (entity types) and **properties** (fields) — ready to be created in the Personize web app.

**Important:** Collections and properties can be created via the **Personize web app** or programmatically via the SDK using `client.collections.create()`. The SDK supports full CRUD + history: `.list()`, `.create()`, `.update()`, `.delete()`, `.history(id, { mode: 'diff' })`. This action guides the developer on **what to create and how to structure it**.

### Schema Design Workflow

1. **Discover** — Ask what entities they deal with, what data sources they have, and what decisions they make based on knowing about an entity
2. **Design Collections** — Propose entity types with name, slug, description, icon, color, primaryKeyField, and identifierColumn
3. **Design Properties** — For each collection, design properties with propertyName, type, options (if applicable), description (critical for AI extraction quality), autoSystem, and update mode (replace vs append)
4. **Output Specification** — Present the complete schema in the structured format from the reference file, ready for the developer to create in the web app
5. **Create or Verify** — Use `client.collections.create()` to create the schema programmatically, or confirm with `client.collections.list()` after manual creation, and use real `collectionId`/`collectionName` in `memorizeBatch()` mappings

### Property Types

| Type | When to Use | Example Value |
|---|---|---|
| `text` | Free-form information | `"VP of Engineering"` |
| `number` | Numeric metrics | `450000` |
| `date` | Temporal data | `"2026-03-15"` |
| `boolean` | Yes/no flags | `true` |
| `options` | Constrained categories (define allowed values) | `"Enterprise"` |
| `array` | Multi-value lists | `["Python", "React"]` |

### Key Design Decisions Per Property

| Decision | Options | Guidance |
|---|---|---|
| **autoSystem** | `true` / `false` | `true` = AI auto-extracts during memorization. Use for all properties you want populated from unstructured content. |
| **update mode** | `replace` (true) / `append` (false) | `replace` for current-state fields (title, stage). `append` for accumulating data (pain points, notes). |
| **description quality** | — | The #1 factor in extraction quality. Be specific, include examples, define boundaries, handle edge cases. |

> **Full guide:** Read `reference/schema.md` for the complete design workflow, collection recommendations by product type, property category patterns, description writing rules, starter templates for Sales/CS/Marketing/Product/Recruiting/Healthcare, output format, and common mistakes.

---

## Action: GENERATE

Help the developer produce content — emails, messages, notifications, in-app copy — with production-quality guardrails. This action is about **what to check before you ship generated output**.

> **Principle:** Personalization without guardrails is a liability. Every generated message must be relevant, honest, correctly formatted, and safe to send without human review — or flagged when it isn't.

### Generation Constraints

> Keywords follow [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119): **MUST** = non-negotiable, **SHOULD** = strong default (override with stated reasoning), **MAY** = agent discretion.

Before generating **any** content, enforce these constraints:

| # | Constraint | Details |
|---|---|---|
| 1 | **MUST** match output format to channel | Email → HTML tags (`<p>`, `<b>`, `<i>`, `<a>`, `<br>`). SMS → plain text, 160 chars. Slack → markdown. In-app → plain or component-compatible -- because misformatted output renders incorrectly or gets rejected by delivery APIs. |
| 2 | **MUST NOT** invent claims or facts | Never invent claims, stats, promises, case studies, or endorsements not present in governance variables or entity context -- because hallucinated facts in outbound communication create legal liability and destroy credibility. |
| 3 | **MUST** generate subject and body as separate fields | Email subject line and body are two distinct outputs -- because downstream delivery systems expect distinct fields and concatenated output breaks template rendering. |
| 4 | **MUST** respect channel length limits | SMS ≤ 160 chars. Push ≤ 100 chars. Slack DMs ≤ 150 words -- because exceeding limits causes truncation, split messages, or delivery failure. |
| 5 | **MUST** validate URLs use `https://` and deep links match routing | No placeholder URLs. Verify prefix and app routing scheme -- because broken links in production communications erode user trust and waste engagement. |
| 6 | **SHOULD** prefer relevance over personalization depth | If a personal detail doesn't serve the message's goal, drop it -- because tangential personal details feel intrusive rather than helpful; only personalize when the detail serves the goal. |
| 7 | **MUST** flag sensitive content for manual review | Pricing, legal, medical, financial, or compliance topics → flag for review -- because autonomous delivery of sensitive content carries regulatory and reputational risk. |
| 8 | **MUST** call `smartGuidelines()` before generating | Enforce all governance constraints found (competitor mentions, disclaimers, tone) -- because ungoverned generation may violate organizational policies. |

### Channel-Specific Format Rules

```
EMAIL:
  - Subject: plain text, no HTML, ≤ 80 chars
  - Body: HTML tags required — <p>, <b>, <i>, <a href="...">, <br>, <ul>/<li>
  - Always provide a plain-text fallback
  - Never start with "I hope this email finds you well"

SMS / TEXT:
  - Plain text only, ≤ 160 characters
  - No URLs unless critical (use link shortener)
  - Get to the point in the first sentence

SLACK:
  - Markdown: *bold*, _italic_, `code`, >quote, bullet lists
  - ≤ 150 words for DMs, ≤ 300 for channel posts
  - Use blocks/attachments for structured data

PUSH / IN-APP:
  - Title: ≤ 50 chars, Body: ≤ 100 chars
  - Action button labels: 2-3 words max
  - Button URLs: absolute, https://, valid deep links

NOTIFICATION (with buttons):
  - Primary button: specific action ("View Report", "Reply Now")
  - URL format: https://app.yourcompany.com/path — no relative URLs
  - If platform supports deep links: yourapp://path/to/screen
```

### The Generation Prompt Pattern

When generating content, structure the `instructions[]` like this:

```typescript
const result = await client.ai.prompt({
    context,   // assembled from smartGuidelines + smartDigest + recall
    instructions: [
        // Step 1: Analyze — understand who, what, why
        { prompt: 'Analyze the recipient and the goal of this message. What facts do we know? What is the ONE outcome we want?', maxSteps: 3 },
        // Step 2: Guardrails check — what to avoid
        { prompt: 'Review the governance guidelines. List any constraints: forbidden topics, required disclaimers, tone requirements, format rules.', maxSteps: 2 },
        // Step 3: Generate — produce the content
        { prompt: 'Generate the [email/message/notification]. Follow ALL guardrails. Output as structured fields:\n\nSUBJECT: ...\nBODY_HTML: ...\nBODY_TEXT: ...\nCHANNEL_NOTES: ...', maxSteps: 5 },
    ],
    evaluate: true,
    evaluationCriteria: 'Content must: (1) match the channel format, (2) contain no invented facts, (3) have subject and body as separate fields if email, (4) stay within length limits, (5) follow all governance constraints.',
});
```

### When to Flag for Human Review

Generate **but flag** when any of these are true:
- Output references pricing, discounts, or contractual terms
- Output includes medical, legal, or financial advice
- Governance variables are empty or stale (last updated > 30 days)
- The AI's self-evaluation score is below threshold
- First-time generation for a new channel or audience segment

Add to the output: `⚠️ REVIEW SUGGESTED: [reason]. Consider testing via manual approval before sending at scale.`

> **Full guide:** Read `reference/generate.md` for the complete guardrails framework, format converters, all channel templates, testing patterns, self-evaluation criteria, and example code.

> **Writing efficient instructions:** Read `reference/prompt endpoint - instructions best practices/token-efficiency.md` for 10 rules that cut token costs by ~80% and speed up responses. Use the companion `prompt-checklist.md` before every `client.ai.prompt()` call.

---

## Action: WIRE

Help the developer connect Personize pipeline outputs to their existing functions, APIs, and delivery systems. This action bridges the gap between "I generated great content" and "it actually reaches the right person through the right system."

> **Principle:** Personize generates and remembers. Your existing stack delivers and tracks. WIRE connects the two without replacing what already works.

### Common Wiring Patterns

| Pattern | What It Means | Example |
|---|---|---|
| **API → Memorize** | Existing API feeds data into Personize memory | CRM webhook → `memorizeBatch()` |
| **Generate → API** | Personize output calls your existing API | `prompt()` → your `/api/send-email` endpoint |
| **Webhook → Pipeline** | External event triggers a Personize pipeline | Stripe `payment_success` → personalized onboarding |
| **Cron → Generate → Deliver** | Scheduled job generates and pushes to delivery | Daily cron → `prompt()` → SendGrid / Slack / webhook |
| **Middleware** | Personize sits between request and response | API middleware that enriches responses with personalization |

### Wiring Constraints

> Keywords follow [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119): **MUST** = non-negotiable, **SHOULD** = strong default (override with stated reasoning), **MAY** = agent discretion.

| # | Constraint | Details |
|---|---|---|
| 1 | **MUST** identify the trigger | Define the event that starts the pipeline (API call, webhook, cron, user action, database change) -- because a pipeline without a defined trigger cannot be scheduled, tested, or monitored. |
| 2 | **MUST** map Personize output fields to function parameters | What data does the existing function need? Map fields explicitly -- because field mismatches cause silent data loss or runtime errors. |
| 3 | **SHOULD** store the target API's response back in memory | Close the feedback loop -- because future recalls can then see delivery outcomes and adjust behavior. |
| 4 | **MUST** ensure the existing function works if Personize is down | Graceful degradation required -- because personalization is an enhancement, not a dependency; existing functionality must survive upstream failures. |
| 5 | **SHOULD** align Personize rate limits with the target API's rate limits | Don't overwhelm either side -- because mismatched rates cause one side to 429 while the other idles, wasting budget. |
| 6 | **MUST** keep Personize auth and target API auth configured separately | `PERSONIZE_SECRET_KEY` and target API credentials are distinct -- because shared or confused credentials create security vulnerabilities and debugging nightmares. |

### Integration Scaffolding

**Pattern 1: Wrap an existing function**

```typescript
// BEFORE — your existing function
async function sendWelcomeEmail(userId: string, email: string) {
    const template = getDefaultTemplate('welcome');
    await emailService.send({ to: email, ...template });
}

// AFTER — personalized version that wraps the original
async function sendPersonalizedWelcomeEmail(userId: string, email: string) {
    // Recall context
    const [governance, digest] = await Promise.all([
        client.ai.smartGuidelines({ message: 'welcome email guidelines and tone', mode: 'fast' }),
        client.memory.smartDigest({ email, type: 'Contact', token_budget: 1500 }),
    ]);

    const context = [
        governance.data?.compiledContext || '',
        digest.data?.compiledContext || '',
    ].join('\n\n---\n\n');

    // Generate personalized content
    const result = await client.ai.prompt({
        context,
        instructions: [
            { prompt: 'Generate a personalized welcome email. Output SUBJECT: and BODY_HTML: as separate fields.', maxSteps: 5 },
        ],
    });

    const output = String(result.data || '');
    const subject = output.match(/SUBJECT:\s*(.+)/i)?.[1]?.trim() || 'Welcome!';
    const bodyHtml = output.match(/BODY_HTML:\s*([\s\S]+?)(?=\n[A-Z_]+:|$)/i)?.[1]?.trim() || '';

    // Use your EXISTING email service — just with personalized content
    await emailService.send({ to: email, subject, html: bodyHtml });

    // Close the loop — remember what was sent
    await client.memory.memorize({
        content: `[WELCOME EMAIL] Sent on ${new Date().toISOString()}. Subject: ${subject}`,
        email,
        enhanced: true,
        tags: ['generated', 'welcome', 'email'],
    });
}
```

**Pattern 2: Webhook receiver**

```typescript
// Express/Fastify route that receives external events and triggers personalization
app.post('/webhooks/crm-update', async (req, res) => {
    const { email, event, data } = req.body;

    // 1. Remember the event
    await client.memory.memorize({
        content: `CRM event: ${event}. Data: ${JSON.stringify(data)}`,
        email,
        enhanced: true,
        tags: ['crm', 'webhook', event],
    });

    // 2. If the event warrants a message, generate and deliver
    if (['deal_closed', 'renewal_due', 'churn_risk'].includes(event)) {
        // ...trigger your generation pipeline here
    }

    res.json({ ok: true });
});
```

**Pattern 3: Middleware enrichment**

```typescript
// Express middleware that adds personalization context to any route
async function personalizationMiddleware(req, res, next) {
    const email = req.user?.email;
    if (!email) return next();

    try {
        const digest = await client.memory.smartDigest({
            email, type: 'Contact', token_budget: 500,
        });
        req.personalization = digest.data?.compiledContext || null;
    } catch {
        req.personalization = null; // graceful degradation
    }
    next();
}
```

> **Full guide:** Read `reference/wire.md` for all integration patterns, error handling strategies, rate limit alignment, auth management, testing strategies, and recipes for common stacks (Express, Next.js, n8n, Zapier).

---

## Action: REVIEW

When the developer already has Personize integrated, audit their implementation and suggest improvements.

**What to audit:**

1. **Data completeness** — What are they memorizing vs. what data do they have? Find gaps.
2. **`extractMemories` decisions** — Are unstructured fields using `true`? Are structured fields wasting AI on `true`?
3. **Recall quality** — Are they using `smartDigest()` for entity context? Are they using `recall()` for task-specific facts?
4. **Governance** — Do they have governance variables? Are they using `smartGuidelines()` to fetch guidelines before generating?
5. **Prompt quality** — Are they using multi-step `instructions[]`? Is there self-evaluation? Do prompts reference specific facts?
6. **Feedback loop** — Are they storing generated outputs back in memory? Does the AI know what it already sent?
7. **Missing opportunities** — Based on their codebase, what personalization touchpoints are they not using?
8. **Rate limit efficiency** — Are they batching correctly? Are they respecting plan limits?

**Review workflow:**
1. Read their Personize integration code (sync scripts, pipeline scripts, prompt calls)
2. Read their data models and identify what data exists but isn't being memorized
3. Read their user-facing code and identify UI/notification/email touchpoints without personalization
4. Present findings: "Here's what you're doing well, here's what you're missing, here's how to improve"

> **Full guide:** Read `reference/review.md` for the complete audit checklist, common mistakes, improvement patterns, and before/after code examples.

---

## SDK Quick Reference

```typescript
import { Personize } from '@personize/sdk';
import 'dotenv/config';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
```

| Category | Method | Purpose |
|---|---|---|
| **Auth** | `client.me()` | Get org, user, plan, rate limits |
| **Remember** | `client.memory.memorize(opts)` | Store single item with AI extraction |
| **Remember** | `client.memory.memorizeBatch(opts)` | Batch store with per-property `extractMemories` |
| **Recall** | `client.memory.recall(opts)` | Semantic search across memories |
| **Recall** | `client.memory.smartDigest(opts)` | Compiled context for one entity |
| **Recall** | `client.ai.smartGuidelines(opts)` | Fetch governance variables for a topic |
| **Reason/Generate** | `client.ai.prompt(opts)` | Multi-step AI with `instructions[]` |
| **Observe** | `client.memory.search(opts)` | Query/filter records |
| **Schema** | `client.collections.list/create/update/delete/history()` | Manage collections (full CRUD + version history) |
| **Governance** | `client.guidelines.list/create/update/delete()` | Manage governance variables |

### The Core Loop

Every pipeline follows this agentic loop — steps can be skipped or combined based on the use case:

```
OBSERVE → REMEMBER → RECALL → REASON → PLAN → DECIDE → GENERATE → ACT → UPDATE → REPEAT
```

This loop is powered by the **three-layer agent operating model**:

| Layer | Powers which steps | Method |
|---|---|---|
| **Guidelines** | REASON, PLAN, DECIDE — organizational rules constrain how the agent thinks | `smartGuidelines()` |
| **Memory** | OBSERVE, REMEMBER, RECALL — entity knowledge informs what the agent knows | `smartDigest()`, `recall()` |
| **Workspace** | ACT, UPDATE, REPEAT — coordination state tracks what's been done and what's next | `recall()` by workspace tags, `memorize()` |

Every cycle, the agent assembles context from all three layers before acting. When working on a contact, also pull their company context (`smartDigest` with `website_url`) — cross-entity context prevents blind spots.

> **Full architecture guide:** See the `collaboration` skill's `reference/architecture.md` for the complete three-layer model with code patterns.

> **Full technical reference:** Read `reference/plan.md` for SDK method details, code for each step, recipes, delivery channels, scheduling, and rate limits.

### Rate Limits

| Plan | Per Minute | Per Month | Records/min (est.) |
|---|---|---|---|
| Free | 60 | 10,000 | ~10 |
| Starter | 120 | 50,000 | ~20 |
| Pro | 300 | 250,000 | ~50 |
| Enterprise | 1,000 | 2,000,000 | ~166 |

Always call `client.me()` first to get actual limits.

---

## Available Resources

| Resource | Contents |
|---|---|
| `reference/discover.md` | Discovery framework, questions, codebase analysis |
| `reference/propose.md` | All use cases, user stories, surface areas, before/after examples |
| `reference/schema.md` | Schema design workflow, collection specs, property types, description writing, starter templates, verification |
| `reference/schemas/` | JSON Schema definition, README, and 8 example schemas: core entities (contact, company, employee, member, product-user), agent memory, and use-case overlays (sales-contact, support-ticket) |
| `reference/plan.md` | Data intelligence guide, 10-step loop, SDK methods, code examples, recipes, channels, scheduling, rate limits |
| `reference/generate.md` | Generation guardrails, format rules, hallucination prevention, channel templates, output parsing, testing patterns |
| `reference/wire.md` | Integration patterns (wrap, webhook, middleware, cron, queue), error handling, rate alignment, stack-specific recipes |
| `reference/review.md` | Audit checklist, common mistakes, improvement patterns |
| `reference/prompt endpoint - instructions best practices/token-efficiency.md` | 10 rules for writing token-efficient `instructions[]` — state the task not the process, one deliverable per instruction, use config over text, maxSteps guidance, sessionId, smart context modes |
| `reference/prompt endpoint - instructions best practices/prompt-checklist.md` | Quick-reference checklist for `client.ai.prompt()` — pre-flight checks, cost optimization, instruction patterns, common mistakes |
| `recipes/*.ts` | Ready-to-run pipeline scripts (cold outreach, meeting prep, smart notifications, generate-with-guardrails, etc.) |
| `channels/*.md` | Delivery channel templates (SendGrid, Slack, Twilio, webhook) |
