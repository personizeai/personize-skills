---
name: personize-code
description: "Builds, deploys, and iterates production-ready AI agent pipelines using Trigger.dev and the Personize SDK (code) or n8n (no-code), and authors the advanced multi-step `instructions[]` prompts those pipelines run. Handles the full lifecycle: interview the user about what they want, design the schema and governance, write the pipeline code, deploy it, monitor results, and iterate based on feedback. Generates TypeScript tasks for outbound sequences, inbound lead processing, conversational reply handlers, enrichment pipelines, and account signal monitoring — all backed by Personize memory, AI context, and governance. Also covers connecting external MCP servers, configuring webhook/S3 destinations, and authoring advanced multi-step prompt patterns (conditional branching by account tier, multi-source data reconciliation, compliance-gated generation, persona fanout, bounded research with source triangulation, few-shot calibrated classification, checklist-gated workflows, self-reflective refinement loops). Use this skill whenever someone wants to build an AI agent, automated workflow, email sequence, drip campaign, cold outreach, lead enrichment, reply handler, account monitor, CRM automation, daily digest, or any durable pipeline — whether they provide technical specs or just describe what they want in plain language. Also trigger for Trigger.dev, n8n, background tasks, self-scheduling follow-ups, GTM automation, 'build me an agent that...', 'I want to automate...', MCPs, webhook destinations, or debugging instruction chains that silently fail, produce inconsistent confidence outputs, loop indefinitely, or write bad data to records."
license: Apache-2.0
compatibility: "Requires Node.js 20+, a Trigger.dev account (cloud or self-hosted), and a Personize API key (sk_live_...)"
metadata: {"author": "personize-ai", "version": "1.0", "homepage": "https://personize.ai", "openclaw": {"emoji": "\u26A1", "requires": {"env": ["PERSONIZE_SECRET_KEY", "TRIGGER_SECRET_KEY"]}}}
---

# Skill: Personize Code Pipelines

Build production-ready Go-To-Market automation pipelines using **Trigger.dev** for durable task execution and the **Personize SDK** for AI-powered memory, context, and personalization.

Every pipeline is TypeScript. Every pipeline is testable. Every pipeline uses the Personize SDK as the core intelligence layer.

---

## When to Use This Skill

- Someone describes an agent or automation they want built — "I want an agent that monitors leads and sends follow-ups"
- Developer wants to build GTM automation (outbound, inbound, enrichment, reply handling)
- Developer asks for "durable workflows", "background tasks", or "scheduled pipelines"
- User wants AI-powered email sequences that learn from every interaction
- User wants to combine CRM data + web research + Personize memory for personalization
- User needs self-scheduling follow-ups that survive server restarts
- User says "build me an agent that..." or "I want to automate..."

**You handle two types of users:**
- **Developers** who know TypeScript → give them scaffold + pipeline templates, they customize
- **Non-developers** who describe what they want → interview them, design everything, write the code, deploy it, iterate based on their feedback

## When NOT to Use This Skill

- User wants no-code/visual workflows → use the **no-code-pipelines** skill instead
- User only needs a one-time data import → use the **entity-memory** skill with `batch-memorize`
- User wants to plan/design before building → use the **solution-architect** skill first, then come here to build

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Trigger.dev — Durable Task Execution                    │
│  • Tasks, retries, schedules, durable wait/sleep         │
│  • Checkpoints survive restarts, deploys, crashes        │
│  • TypeScript — testable, versionable, deployable        │
├──────────────────────────────────────────────────────────┤
│  Personize SDK — AI Intelligence Layer                   │
│  • memory.memorize() — store + AI extract                │
│  • memory.recall() — semantic search across all memory   │
│  • memory.smartDigest() — compiled context per entity    │
│  • ai.smartGuidelines() — retrieve org guidelines           │
│  • ai.prompt() — generate with MCP tools + auto-memorize │
│  • agents.run() — execute multi-step agents with tools   │
├──────────────────────────────────────────────────────────┤
│  App SDKs — Native Libraries (No Wrappers)               │
│  • googleapis (Gmail, Sheets, Calendar)                  │
│  • @hubspot/api-client (HubSpot CRM)                    │
│  • jsforce (Salesforce)                                  │
│  • @slack/web-api (Slack)                                │
│  • twilio (SMS, WhatsApp)                                │
│  • Apollo.io (enrichment), Tavily + Exa (research)       │
└──────────────────────────────────────────────────────────┘
```

---

## The Core Pattern: AI Agent as Pipeline

Personize SDK is the **memory + governance layer**. You can use it with:
- **Personize AI** (`ai.prompt()`, `agents.run()`) — built-in, simplest
- **Any LLM** (OpenAI, Anthropic Claude, Gemini, local models) — bring your own

### Option A: Personize AI with Built-in Tools
```typescript
// Built-in tools (recall, memorize, smart_guidelines, guidelines, etc.)
// are available by default.
const result = await personize.ai.prompt({
  prompt: `Research ${email} and write a personalized cold email.`,
  outputs: [{ name: "email_subject" }, { name: "email_body" }],
  memorize: { email, captureToolResults: true },
  // tier: 'basic' | 'pro' (default) | 'ultra' — selects curated model + credit rate
  // openrouterApiKey: '...' — BYOK (Pro/Enterprise): 10 cr base + 10 cr/extra min
  // model + provider: requires BYOK. Supported providers: openai, anthropic, google, deepseek, xai, openrouter, bedrock. Without BYOK, use tier.
});

// result.data.text — cleaned response (output markers stripped)
// result.data.outputs.email_subject — extracted structured output
// result.data.outputs.email_body — extracted structured output
// result.data.metadata.toolResults — tool return values (always present)
```

> **`outputs`**: The server instructs the LLM to wrap each named deliverable in `<output name="...">` XML markers, then extracts and JSON-parses them server-side. The `text` field contains the cleaned response; structured data goes in `outputs`.

> **`captureToolResults: true`**: Memorizes tool return values (e.g. web search results, enrichment data) alongside extracted outputs. Does NOT change the response body — only affects what gets memorized. Meta tools (`smart_guidelines`, `recall_pro`, etc.) are excluded from capture.

> **MCP Tools:** External MCP servers (Tavily, HubSpot, Zapier, etc.) connected via the [Personize dashboard](https://app.personize.ai) are automatically available to the AI during prompt execution.

> **Attachments:** Send images, PDFs, or documents for multimodal analysis. Provide base64 `data` or a `url`:
> ```typescript
> const result = await personize.ai.prompt({
>   prompt: "Extract key data from this invoice and create a contact record.",
>   attachments: [
>     { name: "invoice.pdf", mimeType: "application/pdf", url: "https://..." },
>   ],
>   outputs: [{ name: "invoice_data" }, { name: "contact_info" }],
>   memorize: { email: extractedEmail, captureToolResults: true },
> });
> ```
> Supported: `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `application/pdf`, `text/plain`, `text/csv`, `text/html`, `text/markdown`, `application/json`. Max 10 attachments, 20 MB each, 50 MB total. In multi-step `instructions[]`, attachments are sent with the first step only.

### Option B: YOUR LLM + Personize Memory (Bring Your Own LLM)
```typescript
import OpenAI from "openai";
import { personize } from "./lib/personize";

// 1. Recall from Personize memory
const digest = await personize.memory.smartDigest({ email, include_properties: true, include_memories: true });

// 2. Get org guidelines from Personize
const guidelines = await personize.ai.smartGuidelines({ message: "outbound email guidelines" });

// 3. YOUR LLM generates content
const completion = await new OpenAI().chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: `Guidelines:\n${guidelines.data.compiledContext}` },
    { role: "user", content: `Write email to ${email}.\n\nContext:\n${digest.data.compiledContext}` },
  ],
});

// 4. Memorize the result back into Personize
await personize.memory.memorize({ email, content: `[SENT] ${completion.choices[0].message.content}`, speaker: "outbound" });
```

### Option C: YOUR LLM with Personize as Function Tools
```typescript
import { OPENAI_TOOLS, executePersonizeTool } from "./lib/personize-tools";

// Give your LLM Personize tools — it decides when to recall, memorize, check guidelines
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Write a follow-up for john@acme.com" }],
  tools: OPENAI_TOOLS,  // personize_recall, personize_memorize, personize_smart_guidelines, personize_smart_digest
});

// Execute tool calls via Personize SDK
for (const tc of response.choices[0].message.tool_calls || []) {
  await executePersonizeTool(tc.function.name, JSON.parse(tc.function.arguments));
}
```

See `reference/personize-sdk-reference.md` for full BYOLLM documentation and `pipelines/outbound/cold-outreach-byollm.ts` for all three patterns in action.

---

## Advanced Multi-Step Instructions (`instructions[]`)

When a pipeline's prompt is more than "do X, return Y" — when it needs to branch on tier, reconcile data from multiple sources, gate output on compliance, fan out to N personas, triangulate research, or refine iteratively — author it as a multi-step `instructions[]` array, not one bloated prompt.

> **API surface:** the `instructions[]` payload works identically on **`/api/v1/prompt`** and **`/api/v1.1/prompt`** (v1.1 mirrors v1's prompt handler). v1 sunsets **2026-07-15**; the payload shape doesn't change between versions. Tested against `@personize/sdk@0.12.0`.

### Pick a pattern

| I need to… | Pattern |
|---|---|
| Branch on account tier (enterprise/mid-market/SMB), each needs a different artifact | **A. Conditional Specialize** |
| Reconcile the same entity across CRM, web scrape, and an uploaded doc | **B. Multi-Source Reconciliation** |
| Score or classify when data is partial — abort wastes good signal | **C. Soft Degradation** |
| Generate outreach that must pass compliance/legal/brand before memorize writes it | **D. Compliance-Gated Generation** |
| Write N personalized variants for different personas on the same account | **E. Multi-Recipient Fanout** |
| Research current events and verify claims across 3+ sources before trusting them | **F. Tool-Bounded Research** |
| Classify replies where adjacent labels drift run-to-run | **G. Few-Shot Calibrated Classification** |
| Gate a workflow on N pre-conditions and produce a structured skip (not an error) | **H. Checklist-Gated Workflow** |
| Iteratively improve a draft until it scores above a quality rubric | **I. Self-Reflective Refinement Loop** |

### Error-handling tiers — pick the lightest

| Tier | Mechanism | When to use |
|---|---|---|
| **T1 Hard abort** | `<abort reason='...'>` halts chain, skips auto-memorize, returns `success: false` | Identity fails, mandatory data missing, fundamental contradiction |
| **T2 Soft degrade** | `<output name='confidence'>low\|medium\|high</output>` + optional warnings | Partial data; caller routes by confidence |
| **T3 Self-correct** | Audit instruction rewrites violations before emit | Math drift, format slips, brand-voice violations |
| **T4 Blast-radius bound** | `maxSteps`, `mcpTools` allowlist, "retry once then skip" inline | MCP/HTTP flakiness, rate-limit windows |

**Anti-pattern:** using T1 for what should be T2. T1 = run is fundamentally invalid. T2 = run is valid but caller deserves a quality signal.

### Quick request template

```json
{
  "instructions": [
    "Instruction 1: gather facts. Use tools. Don't emit output markers yet.",
    "Instruction 2: reason. If you cannot produce a required output, emit <abort reason='...'>...</abort> instead.",
    "Instruction 3: synthesize and emit the output markers."
  ],
  "outputs": [
    { "name": "must_have", "required": true, "collectionId": "...", "propertyId": "..." },
    { "name": "nice_to_have" }
  ],
  "memorize": { "email": "...", "type": "Contact" },
  "tier": "pro"
}
```

### The most common authoring mistakes

- **`agentTools` left at default when tools needed** — model hallucinates "I searched and found…" with no actual search. Set `agentTools: true`.
- **`mcps: true` exploratorily** — 5–20K tokens of unused schema overhead per instruction. Use `mcps: ["specific-id"]`.
- **"Recall what we know" in instruction 1** — SmartRecall already ran; the preamble wastes tokens.
- **Top-level `attachments` for mid-chain data** — attachments at the top level apply to instruction 1 only. Wire per-instruction.
- **Bumping `tier: 'ultra'` to fix bad output** — almost always a prompt-quality problem, not a model-capability problem. Split the instruction first.
- **Conflating stop-workflow with abort** — abort = malformed data (`success: false`). Stop-workflow = pre-conditions correctly failed (`success: true` + `workflow_status: 'stopped'`). Conflating makes analytics treat correct skips as broken runs.

→ Full pattern catalog (BAD/GOOD code for all 9), context-wiring rules, instruction-scope gotchas, and the full anti-pattern catalog: `reference/instructions-advanced.md`, with reusable inline phrases in `reference/instructions-advanced-cookbook.md`.

---

## Action: BUILD — Full Lifecycle Agent Creation

When the user describes what they want (instead of asking for a specific pipeline template), guide them through the full lifecycle. This is the primary action for non-developer users and for developers who want a faster path.

### Phase 1: Interview (2-5 questions)

Understand the agent's purpose. Ask conversationally, not as a checklist:

1. **"What should this agent do?"** — the core automation (monitor leads, send outreach, handle replies, generate reports)
2. **"What data does it work with?"** — CRM, email, product usage, web research, manual input
3. **"Where should results go?"** — Email, Slack, CRM update, webhook, dashboard
4. **"What rules should it follow?"** — Brand voice, compliance, competitor policy, approval workflows
5. **"How often should it run?"** — Real-time (webhook trigger), scheduled (daily/hourly cron), or event-driven (on new lead, on reply)

If the user gives a broad description like "I want an agent that handles my leads," ask follow-up questions. If they give a detailed spec, skip to Phase 2.

### Phase 2: Design

Based on the interview, design four things before writing any code:

**1. Schema** — What collections and properties does this agent need?
```typescript
// Example: Lead monitoring agent
await client.collections.create({
    collectionName: 'Lead',
    properties: [
        { propertyName: 'engagement_score', type: 'number', description: 'AI-assessed engagement level 0-100' },
        { propertyName: 'lifecycle_stage', type: 'options', options: ['new', 'enriched', 'contacted', 'engaged', 'qualified'] },
        { propertyName: 'last_outreach_date', type: 'date', description: 'Date of most recent outbound communication' },
        { propertyName: 'enrichment_status', type: 'options', options: ['pending', 'enriched', 'failed'] },
    ],
});
```

**2. Governance** — What rules constrain the agent?
```typescript
await client.guidelines.create({
    name: 'Outbound Email Rules',
    content: 'Professional but approachable. Max 150 words. Reference a specific fact about the recipient. Never mention competitors by name. Include clear CTA. No emails on weekends.',
    triggerKeywords: ['email', 'outreach', 'outbound', 'cold', 'follow-up'],
    tags: ['outbound', 'email', 'brand-voice'],
});
```

**3. Pipeline architecture** — Which pipeline template(s) to combine, what trigger, what schedule.

**4. Integration map** — Which external services and credentials are needed (CRM, email, enrichment).

Present this design to the user for confirmation before writing code.

### Phase 3: Implement

Write the complete pipeline code:

1. **Copy the scaffold** as the project base
2. **Create the schema** — `collections.create()` calls for all entities
3. **Create governance variables** — `guidelines.create()` calls for all rules
4. **Write the pipeline** — combine patterns from existing templates, customized to their data model and business logic
5. **Set up integrations** — configure env vars and auth for external services
6. **Add monitoring** — include a daily digest pipeline that reports results to Slack or email

Every pipeline MUST follow: **Recall → Contextualize → Act → Memorize → Schedule**

### Phase 4: Deploy

Walk the user through deployment. Read `reference/deploy.md` for the full deployment guide.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in API keys

# 3. Test locally
npx trigger.dev@latest dev

# 4. Test with a single record
# Trigger the task manually via Trigger.dev dashboard or CLI

# 5. Deploy to production
npx trigger.dev@latest deploy
```

### Phase 5: Monitor & Iterate

After deployment, help the user evaluate results and improve:

1. **Check initial results** — "How do the first few outputs look? Any issues?"
2. **Adjust governance** — If tone is wrong, update the governance variable. No code change needed.
3. **Adjust prompts** — If the AI misunderstands the task, refine `instructions[]` or `prompt` text
4. **Adjust pipeline logic** — If the workflow order is wrong, restructure the pipeline
5. **Redeploy** — `npx trigger.dev@latest deploy`
6. **Repeat** until the user is satisfied

**Common iteration patterns:**

| User Feedback | What to Change |
|---|---|
| "Emails are too formal" | Update governance variable (brand voice) |
| "It's emailing people we already talked to" | Add recall check before outreach (dedup) |
| "I want Slack alerts for high-priority leads" | Add Signal/notification step after scoring |
| "It's too slow" | Use `mode: 'fast'` on smartRecall, reduce `token_budget` |
| "Some outputs feel hallucinated" | Add `evaluate: true` with `evaluationCriteria`, tighten governance |
| "I want it to also update HubSpot" | Add HubSpot API call after generation step |

---

## Available Pipelines

### Outbound
| Pipeline | File | Description |
|---|---|---|
| Cold Outreach | `pipelines/outbound/cold-outreach.ts` | Enrich (Apollo) → Research (Tavily/Exa) → Memorize → AI Generate → Send |
| Cold Outreach (BYOLLM) | `pipelines/outbound/cold-outreach-byollm.ts` | Same flow with YOUR LLM (OpenAI/Claude) + Personize as memory layer |
| Multi-Touch Sequence | `pipelines/outbound/multi-touch-sequence.ts` | Self-scheduling 3-step sequence with durable waits + reply detection |

### CRM Lead Management
| Pipeline | File | Description |
|---|---|---|
| HubSpot Lead Review | `pipelines/crm/hubspot-lead-review.ts` | Daily: pull leads → enrich → review engagement → plan follow-ups |
| Salesforce Lead Review | `pipelines/crm/salesforce-lead-review.ts` | Daily: pull leads → enrich → review engagement → plan follow-ups |

### Conversational
| Pipeline | File | Description |
|---|---|---|
| Email Reply Handler | `pipelines/conversational/email-reply-handler.ts` | Gmail inbound → classify intent → AI reply → self-schedule follow-up |
| Slack Bot | `pipelines/conversational/slack-bot.ts` | Team queries → AI answers using Personize memory + meeting prep |

### Signals
| Pipeline | File | Description |
|---|---|---|
| Account Monitor | `pipelines/signals/account-monitor.ts` | Daily: scan accounts via Tavily/Exa for buying signals |
| Daily Digest | `pipelines/signals/daily-digest.ts` | End-of-day engagement summary + pipeline health → Slack |
| Signal Quickstart | `pipelines/signals/signal-quickstart.ts` | Minimal Signal setup: one source, one channel, trigger a test event |
| Signal Multi-Team | `pipelines/signals/signal-multi-team.ts` | Product + Sales + Marketing contribute events; Signal decides notify/defer/skip |

### Generation (Responses API)

The `responses.create()` endpoint is the primary generation endpoint. Supports multi-step orchestration, governance injection, memory recall, client-executed tools, streaming, and BYOK. Use instead of raw LLM calls when you need governance + memory + structured output together.

| Pattern | File | Description |
|---|---|---|
| All patterns | `pipelines/generation/responses-api.ts` | Single-step, multi-step, client tools, BYOK — all in one annotated file |

**When to use Responses API over direct SDK calls:**
- You need governance (guidelines injected automatically per request)
- You need memory context recalled before generation
- You need multi-step orchestration (research → draft → review)
- You need client-executed tools with HMAC-signed state
- You want BYOK (own OpenAI / Anthropic / Google / OpenRouter key)

---

## Quick Start

### 1. Clone the scaffold

```bash
cp -r Skills/code-pipelines/scaffold/ my-gtm-pipelines/
cd my-gtm-pipelines
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in: PERSONIZE_SECRET_KEY, TRIGGER_SECRET_KEY, and any app credentials
```

### 3. Copy the pipelines you need

```bash
cp ../pipelines/outbound/cold-outreach.ts src/trigger/
cp ../pipelines/conversational/email-reply-handler.ts src/trigger/
```

### 4. Dev mode

```bash
npx trigger.dev@latest dev
```

### 5. Deploy

```bash
npx trigger.dev@latest deploy
```

---

## Pipeline Customization Guide

When generating or customizing a pipeline, follow these steps:

### Step 1: Identify the GTM motion
- **Outbound** — we initiate contact (cold email, sequence, signal-triggered outreach)
- **Inbound** — they initiate contact (form, demo request, reply)
- **Enrichment** — data flows in from external sources into Personize memory
- **Signals** — monitoring for triggers/events

### Step 2: Choose the trigger
- `task()` — triggered programmatically or via webhook
- `schedules.task()` — cron-based (daily sync, hourly monitor)
- Webhook endpoint → triggers a task via `myTask.trigger(payload)`

### Step 3: Wire the Personize SDK
Every pipeline should:
1. **Recall** — check what we already know (`memory.recall()` or via MCP tools)
2. **Contextualize** — get org guidelines (`ai.smartGuidelines()` or via MCP tools)
3. **Act** — generate content, score leads, draft replies (`ai.prompt()` or `agents.run()`)
4. **Memorize** — store the interaction (`memory.memorize()` or `memorize:` param)
5. **Schedule** — self-schedule follow-ups if needed (`wait.for()` or `.trigger({ delay })`)

### Step 4: Add app integrations
Use native SDKs. See `reference/channel-setup.md` for setup patterns for each app.

### Step 5: Deploy and test
```bash
npx trigger.dev@latest dev    # local testing
npx trigger.dev@latest deploy # production
```

---

## No-Code Pipelines (n8n)

For users who prefer visual workflows over TypeScript. n8n has 400+ app integrations. Use when: user is non-technical, the workflow is linear with no complex branching, or they want to get running in under 30 minutes.

**When to use n8n vs Trigger.dev:**
- n8n: visual, low-code, quick setup, good for simple sync/export flows
- Trigger.dev: code, durable retries, complex branching, >5 min tasks, production scale

**Four importable workflow templates** (`templates/`):

| Template | File | What It Does |
|---|---|---|
| HubSpot → Personize | `templates/hubspot-to-personize.json` | Sync HubSpot contacts into Personize memory on change |
| Webhook → Personize | `templates/webhook-to-personize.json` | Real-time ingest: any webhook event → memorize |
| Personize → Slack | `templates/personize-to-slack.json` | Export Personize recall results to a Slack channel |
| Google Sheets → Personize | `templates/gsheets-to-personize.json` | Import rows from a Sheet into Personize as batch |

**To deploy:** download template JSON → import into n8n → configure Personize API key node (HTTP Request, Authorization: Bearer sk_live_...) → set trigger → test → activate.

Four workflow patterns (Sync IN, Sync OUT, Per-Record AI Enrichment, Webhook → Memorize) plus rate limit handling and step-by-step build guide: `reference/n8n-reference.md`.

---

## MCPs & Destinations

### Connecting External MCP Servers

Let Personize agents call tools from external MCP servers. MUST call `client.mcps.test()` before `client.mcps.create()` — verify connectivity first.

```typescript
// 1. Test
const test = await client.mcps.test({
    serverUrl: 'https://mcp.example.com/sse',
    transportType: 'sse',  // 'sse' | 'http' | 'streamable-http'
    authType: 'bearer',    // 'bearer' | 'api_key' | 'none'
    apiKey: 'sk-...',
});
if (!test.data.connected) throw new Error(`MCP test failed: ${test.data.error}`);

// 2. Register
const mcp = await client.mcps.create({
    name: 'My Tools Server',
    serverUrl: 'https://mcp.example.com/sse',
    transportType: 'sse',
    authType: 'bearer',
    apiKey: 'sk-...',
});

// 3. Disable specific tools agents should not call
await client.mcps.updateTools(mcp.data.id, {
    disabledTools: ['send_email', 'delete_record'],
});

// 4. Refresh after the server adds/removes tools
await client.mcps.refreshTools(mcp.data.id);
```

Other methods: `client.mcps.list()`, `client.mcps.get(id)`, `client.mcps.update(id, opts)`, `client.mcps.remove(id)`.

### Routing Events to Destinations

Route Personize events to webhooks or S3. MUST call `client.destinations.test(id)` after `create()`. Use `client.destinations.getLogs(id)` to debug delivery failures.

```typescript
// Webhook destination
const dest = await client.destinations.create({
    name: 'Memory Events Webhook',
    type: 'webhook',
    config: {
        url: 'https://your-app.com/webhooks/personize',
        method: 'POST',
        secret: 'your-hmac-secret',  // Signature sent as X-Personize-Signature
    },
    events: ['memory.created', 'record.updated'],
    retryPolicy: { maxRetries: 3, backoffMs: 1000 },
});
await client.destinations.test(dest.data.id);

// Signature verification (Node.js)
import crypto from 'crypto';
const sig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
const valid = sig === req.headers['x-personize-signature'];
```

**Delivery notes:** webhook payload is the raw event object (no envelope). Timeout: ~1.5s — receivers must respond quickly. S3 type also supported (`config.bucketName`, `config.region`, `config.prefix`).

Other methods: `client.destinations.list()`, `client.destinations.get(id)`, `client.destinations.update(id, opts)`, `client.destinations.remove(id)`.

---

## Reference Documentation

| Doc | File | Content |
|---|---|---|
| Trigger.dev Patterns | `reference/trigger-dev-patterns.md` | Tasks, waits, schedules, retries, batch operations |
| Personize SDK Reference | `reference/personize-sdk-reference.md` | All SDK methods, MCP tools, auto-memorize patterns |
| Enrichment APIs | `reference/enrichment-apis.md` | Apollo.io + Tavily API patterns, rate limits, costs |
| Channel Setup | `reference/channel-setup.md` | Gmail, HubSpot, Salesforce, Slack, Twilio setup |
| Deploy & Iterate | `reference/deploy.md` | Deployment, env vars, monitoring, iteration patterns, scaling, troubleshooting |
| n8n Reference | `reference/n8n-reference.md` | Workflow patterns, node reference, rate limit handling, step-by-step guide |
| Advanced Multi-Step Instructions | `reference/instructions-advanced.md` | 9 advanced patterns (conditional branching, multi-source reconciliation, compliance gating, fanout, self-refinement), error-handling tiers, anti-patterns |
| Patterns (BAD/GOOD examples) | `reference/instructions-advanced-patterns.md` | Full BAD/GOOD code for all 9 advanced instruction patterns |
| Cookbook (inline phrases) | `reference/instructions-advanced-cookbook.md` | Reusable inline error-handling phrases for instruction prompts |

---

## Shared Libraries

The `scaffold/lib/` directory contains reusable helpers:

| File | Purpose |
|---|---|
| `lib/personize.ts` | Personize client singleton + `generateWithTools()` + `runAgent()` helpers |
| `lib/personize-tools.ts` | Personize SDK methods as LLM function tools (OpenAI + Anthropic formats) |
| `lib/llm.ts` | BYOLLM helpers: context injection, OpenAI/Claude with Personize tools, recall-generate-memorize loop |
| `lib/gmail.ts` | Gmail read/send/reply helpers using googleapis |
| `lib/hubspot.ts` | HubSpot contact search/update helpers |
| `lib/enrichment.ts` | Apollo + Tavily + Exa wrappers with waterfall pattern |
| `lib/notifications.ts` | Slack + SendGrid notification helpers |

---

## Constraints

> Keywords follow [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119): **MUST** = non-negotiable, **SHOULD** = strong default (override with stated reasoning), **MAY** = agent discretion.

1. **MUST** use the Personize SDK as the memory and governance layer in every pipeline -- because pipelines without memory lose context between runs and ignore organizational rules.
2. **MUST** follow the Recall → Contextualize → Act → Memorize → Schedule pattern in every pipeline -- because skipping steps produces ungoverned, context-blind, or non-learning automation.
3. **SHOULD** use native app SDKs (googleapis, @hubspot/api-client, jsforce, @slack/web-api) over generic HTTP wrappers -- because native SDKs handle auth refresh, pagination, and error codes automatically.
4. **SHOULD** use `ai.prompt()` with `memorize: { captureToolResults: true }` for generation tasks -- because it closes the feedback loop automatically without extra memorize calls.
5. **MAY** use any LLM provider (OpenAI, Anthropic, Google, local models) alongside Personize memory -- because the SDK is LLM-agnostic; the memory and governance layer works with any generation backend.

---

## Cost Estimates

### Per-pipeline execution costs (approximate)

| Pipeline | Trigger.dev | Personize | Apollo | Tavily | Total |
|---|---|---|---|---|---|
| Cold outreach (1 lead) | ~$0.001 | ~$0.01 | 1-8 credits | 1 search | ~$0.02-0.05 |
| Multi-touch (3 steps) | ~$0.003 | ~$0.03 | 0 (already enriched) | 0 | ~$0.03 |
| Batch enrich (100 leads) | ~$0.05 | ~$0.50 | 100-800 credits | 100 searches | ~$2-5 |
| Daily signal monitor (50 accounts) | ~$0.02 | ~$0.10 | 0 | 50 searches | ~$0.60 |
| Email reply handler (1 reply) | ~$0.001 | ~$0.01 | 0 | 0 | ~$0.01 |

Trigger.dev: $0.0000169/sec (Micro machine). Personize: per plan. Apollo: $0.20/credit overage. Tavily: $0.01/search.

### Generate Tiers & Direct Providers

`ai.prompt()` supports tiered model selection and direct provider routing:

| Tier | Input | Output |
|---|---|---|
| `basic` | 0.2 cr/1K | 0.4 cr/1K |
| `pro` | 0.5 cr/1K | 1.0 cr/1K |
| `ultra` | 1.0 cr/1K | 2.5 cr/1K |

1 credit = $0.01. Pass `tier` for curated model selection. Custom `model` + `provider` require BYOK — without it, the API returns 400. BYOK billing: 10 credits base + 10/extra minute (Pro/Enterprise plans).

**Supported BYOK providers:** `openai`, `anthropic`, `google`, `deepseek`, `xai`, `openrouter`, **`bedrock`**.

For Bedrock IAM deployments (BYOC), set `provider: 'bedrock'` and omit `llm_api_key` — the deployment's IAM role handles auth. Returns HTTP 400 `bedrock_not_enabled` if Bedrock is not available in the deployment.
