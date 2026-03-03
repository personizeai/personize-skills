---
name: code-pipelines
description: "Builds production-ready GTM workflow pipelines using Trigger.dev and the Personize SDK. Generates TypeScript tasks for outbound sequences, inbound lead processing, conversational reply handlers, enrichment pipelines, and account signal monitoring — all backed by Personize memory, AI context, and governance. Use when a developer wants to build GTM automation with durable execution, real code, and the Personize SDK."
license: Apache-2.0
compatibility: "Requires Node.js 20+, a Trigger.dev account (cloud or self-hosted), and a Personize API key (sk_live_...)"
metadata: {"author": "personize-ai", "version": "1.0", "homepage": "https://personize.ai", "openclaw": {"emoji": "\u26A1", "requires": {"env": ["PERSONIZE_SECRET_KEY", "TRIGGER_SECRET_KEY"]}}}
---

# Skill: Code Pipelines

Build production-ready Go-To-Market automation pipelines using **Trigger.dev** for durable task execution and the **Personize SDK** for AI-powered memory, context, and personalization.

Every pipeline is TypeScript. Every pipeline is testable. Every pipeline uses the Personize SDK as the core intelligence layer.

---

## When to Use This Skill

- Developer wants to build GTM automation (outbound, inbound, enrichment, reply handling)
- Developer asks for "durable workflows", "background tasks", or "scheduled pipelines"
- Developer wants AI-powered email sequences that learn from every interaction
- Developer wants to combine CRM data + web research + Personize memory for personalization
- Developer needs self-scheduling follow-ups that survive server restarts

## When NOT to Use This Skill

- User wants no-code/visual workflows → use the **no-code-pipelines** skill instead
- User only needs a one-time data import → use the **entity-memory** skill with `batch-memorize`
- User wants a simple prompt/response → use the **personalization** skill

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
// are available by default — NO mcpTools parameter needed.
const result = await personize.ai.prompt({
  prompt: `Research ${email} and write a personalized cold email.`,
  outputs: [{ name: "email_subject" }, { name: "email_body" }],
  memorize: { email, captureToolResults: true },
});

// result.data.text — cleaned response (output markers stripped)
// result.data.outputs.email_subject — extracted structured output
// result.data.outputs.email_body — extracted structured output
// result.data.metadata.toolResults — tool return values (always present)
```

> **`outputs`**: The server instructs the LLM to wrap each named deliverable in `<output name="...">` XML markers, then extracts and JSON-parses them server-side. The `text` field contains the cleaned response; structured data goes in `outputs`.

> **`captureToolResults: true`**: Memorizes tool return values (e.g. web search results, enrichment data) alongside extracted outputs. Does NOT change the response body — only affects what gets memorized. Meta tools (`smart_guidelines`, `recall_pro`, etc.) are excluded from capture.

> **Optional:** If you've connected external MCP servers (Tavily, HubSpot, Zapier, etc.) via the [Personize dashboard](https://app.personize.ai), you can pass them via `mcpTools` to give the AI additional capabilities. See `reference/personize-sdk-reference.md` for details.

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

## Reference Documentation

| Doc | File | Content |
|---|---|---|
| Trigger.dev Patterns | `reference/trigger-dev-patterns.md` | Tasks, waits, schedules, retries, batch operations |
| Personize SDK Reference | `reference/personize-sdk-reference.md` | All SDK methods, MCP tools, auto-memorize patterns |
| Enrichment APIs | `reference/enrichment-apis.md` | Apollo.io + Tavily API patterns, rate limits, costs |
| Channel Setup | `reference/channel-setup.md` | Gmail, HubSpot, Salesforce, Slack, Twilio setup |

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
