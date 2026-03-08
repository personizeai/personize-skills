# Personize SDK Reference for GTM Pipelines

Quick reference for the `@personize/sdk` methods used in GTM pipelines.

## Complete Method Reference

| Namespace | Method | HTTP Endpoint | Description |
|-----------|--------|---------------|-------------|
| *(root)* | `test()` | `GET /api/v1/test` | Verify API key is valid. No credits consumed. |
| *(root)* | `me()` | `GET /api/v1/me` | Get current org, user, and plan details. |
| `guidelines` | `list()`, `create()`, `update()`, `delete()` | `GET/POST/PATCH/DELETE /api/v1/guidelines` | CRUD for governance guidelines. |
| `guidelines` | `getStructure()`, `getSection()` | `GET /api/v1/guidelines/:id/structure\|section` | Read guideline headings or a specific section. |
| `guidelines` | `history()` | `GET /api/v1/actions/:id/history` | Version history for a guideline. |
| `collections` | `list()`, `create()`, `update()`, `delete()` | `GET/POST/PATCH/DELETE /api/v1/collections` | CRUD for property collections. |
| `collections` | `history()` | `GET /api/v1/collections/:id/history` | Version history for a collection. |
| `ai` | `smartGuidelines()` | `POST /api/v1/ai/smart-guidelines` | Semantic routing to org guidelines. |
| `ai` | `prompt()` | `POST /api/v1/prompt` | AI generation with MCP tools, outputs, evaluation. |
| `agents` | `list()` | `GET /api/v1/agents` | List all agents (paginated). |
| `agents` | `get(id)` | `GET /api/v1/agents/:id` | Get agent config + expected `{{input}}` variables. |
| `agents` | `run(id)` | `POST /api/v1/agents/:id/run` | Execute an agent. |
| `memory` | `memorize()` | `POST /api/v1/memorize` | AI extraction + vector storage. |
| `memory` | `smartRecall()` | `POST /api/v1/smart-recall` | Semantic search with reflection + answer gen (recommended). |
| `memory` | `recall()` | `POST /api/v1/recall` | Direct lookup from DynamoDB (`type` required, no AI). |
| `memory` | `smartDigest()` | `POST /api/v1/smart-memory-digest` | Compiled entity context bundle. |
| `memory` | `memorizeBatch()` | `POST /api/v1/batch-memorize` | Bulk sync with per-property AI control (`extractMemories` flag). |
| `memory` | `search()` | `POST /api/v1/search` | Filter and export records. |
| `memory` | `search()` | `POST /api/v1/search` | Filter and export records. |
| `evaluate` | `memorizationAccuracy()` | `POST /api/v1/evaluate/memorization-accuracy` | Three-phase collection schema evaluation. |

---

## Client Setup

```typescript
import { Personize } from "@personize/sdk";

const personize = new Personize({
  secretKey: process.env.PERSONIZE_SECRET_KEY!,
  maxRetries: 3,
  retryDelay: 1000,
});
```

---

## Memory

### memorize — Store + AI Extract

```typescript
// Tip: prepend extraction hints for identity fields to ensure they're captured
await personize.memory.memorize({
  email: "lead@company.com",           // entity identifier
  content: "Also extract First Name, Last Name, Company Name, and Job Title if mentioned.\n\nMeeting notes: discussed pricing...",
  speaker: "sales-call",               // source label
  enhanced: true,                      // enable AI extraction
  tags: ["meeting", "pricing"],        // property selection tags
});
```

### recall — Direct Lookup

Returns structured properties and free-form memories from DynamoDB for a specific record. No AI processing — fast, deterministic.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `query` | Yes | Natural-language query |
| `type` | Yes | Entity type: `'Contact'`, `'Company'`, etc. |
| `email` | No* | Contact email (identifier) |
| `websiteUrl` / `website_url` | No* | Company website URL (identifier) |
| `recordId` / `record_id` | No* | Direct record ID (`REC#...`) |
| `collectionIds` | No | Scope to specific collections |
| `propertyIds` | No | Return only specific properties |

\* At least one identifier is needed to scope to an entity. Without one, returns org-wide results.

Both camelCase and snake_case are accepted for all identifier parameters.

```typescript
// By email
const results = await personize.memory.recall({
  query: "what do we know about this contact",
  email: "lead@company.com",
  type: "Contact",
});

// By website URL
const results = await personize.memory.recall({
  query: "company overview",
  websiteUrl: "https://acme.com",
  type: "Company",
});

// By recordId (if you already have it)
const results = await personize.memory.recall({
  query: "everything",
  recordId: "REC#abc123...",
  type: "Contact",
});

// results.data.memories — structured properties from DynamoDB
// results.data.freeformMemories — AI-extracted memories
// results.data.systemIntro — pre-formatted context string
```

### smartRecall — Semantic Search with Reflection

AI-powered semantic search across LanceDB vector store. Supports reflection loops for deeper recall, answer generation, and entity scoping.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `query` | Yes | Natural-language query |
| `email` | No | Contact email (identifier) |
| `websiteUrl` / `website_url` | No | Company website URL (identifier) |
| `recordId` / `record_id` | No | Direct record ID (identifier) |
| `phoneNumber` / `phone_number` | No | Phone number (identifier) |
| `postalCode` / `postal_code` | No | Postal code (identifier) |
| `deviceId` / `device_id` | No | Device ID (identifier) |
| `contentId` / `content_id` | No | Content ID (identifier) |
| `type` | No | Entity type filter |
| `limit` | No | Max results (default: 10) |
| `min_score` | No | Min similarity score 0-1 |
| `include_property_values` | No | Include DynamoDB properties in response |
| `enable_reflection` | No | Reflection loop for better coverage (default: true) |
| `max_reflection_rounds` | No | Max reflection iterations (default: 2) |
| `generate_answer` | No | AI-synthesized answer from results |
| `fast_mode` | No | Skip reflection/answer, minScore 0.3, ~700ms (default: false) |
| `enable_planning` | No | Query decomposition for multi-hop questions |
| `collectionIds` | No | Scope to specific collection IDs |
| `collectionNames` | No | Scope to collections by name (resolved server-side) |
| `prefer_recent` | No | Apply recency decay to scores |
| `recency_half_life_days` | No | Half-life in days for recency decay (default: 90) |
| `filters` | No | Metadata filters `Record<string, unknown>` |

Both camelCase and snake_case accepted for all identifier parameters.

```typescript
// Full search with reflection + answer
const results = await personize.memory.smartRecall({
  email: "lead@company.com",
  query: "what pricing concerns did they raise",
  include_property_values: true,
  fast_mode: false,
  generate_answer: true,
});

// Fast mode — ~700ms, no reflection
const fast = await personize.memory.smartRecall({
  recordId: "REC#abc123...",
  query: "latest interaction",
  fast_mode: true,
});

// results.data.answer.text — synthesized answer (if generate_answer: true)
// results.data.results — array of memory matches with scores
// results.data.property_values — structured properties (if include_property_values: true)
```

### smartDigest — Compiled Entity Context

Assembles a complete entity context bundle: DynamoDB properties + LanceDB free-form memories, compiled into a token-budgeted markdown string ready for LLM injection.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `email` | No* | Contact email (identifier) |
| `websiteUrl` / `website_url` | No* | Company website URL (identifier) |
| `recordId` / `record_id` | No* | Direct record ID (identifier) |
| `type` | No | Entity type. Auto-inferred from identifier if omitted. |
| `token_budget` / `tokenBudget` | No | Max tokens for compiled context (default: 1000) |
| `max_memories` / `maxMemories` | No | Max free-form memories to include (default: 20) |
| `include_properties` / `includeProperties` | No | Include DynamoDB properties (default: true) |
| `include_memories` / `includeMemories` | No | Include LanceDB free-form memories (default: true) |

\* At least one identifier is required to scope to an entity.

Both camelCase and snake_case accepted for all parameters.

```typescript
// By email
const digest = await personize.memory.smartDigest({
  email: "lead@company.com",
  include_properties: true,
  include_memories: true,
  token_budget: 3000,
});

// By recordId
const digest = await personize.memory.smartDigest({
  recordId: "REC#abc123...",
  type: "Contact",
  tokenBudget: 2000,
  maxMemories: 10,
});

// By website URL
const digest = await personize.memory.smartDigest({
  websiteUrl: "https://acme.com",
  type: "Company",
});

// digest.data.compiledContext — ready-to-use markdown for LLM injection
// digest.data.properties — structured key-value pairs
// digest.data.memories — list of memories included
```

### Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Missing `type` in `recall()` | 400 error: "type is required" | Add `type: 'Contact'` or `type: 'Company'` |
| Using `recordId` with `smartDigest` (snake_case only) | Empty results — parameter silently ignored | Use `recordId` (camelCase) or `record_id` (snake_case) — both work now |
| No identifier provided | Returns nothing or org-wide noise | Pass at least one of: `email`, `websiteUrl`, `recordId` |
| Wrong entity type | No matching record in DynamoDB | Check the type used during memorize. Common: `'Contact'` for emails, `'Company'` for websites |
| Mixing up `recall` vs `smartRecall` | `recall` is DynamoDB lookup; `smartRecall` is vector search | Use `smartRecall` for semantic queries, `recall` for structured data |

### memorizeBatch — Bulk Sync from CRM

Unified batch sync with per-property control over AI extraction. Each property mapping has an `extractMemories` flag:
- `extractMemories: true` — AI extraction + vector embeddings (costs AI tokens, enables semantic recall)
- `extractMemories: false` or omitted — structured DynamoDB storage only (fast, no AI cost)

You can mix both modes in the same batch call.

```typescript
await personize.memory.memorizeBatch({
  source: "HubSpot",
  mapping: {
    entityType: "contact",
    email: "email",                    // source field name for email
    runName: "hubspot-sync-" + Date.now(),
    properties: {
      // Structured fields — stored directly, no AI processing
      email:     { sourceField: "email",     collectionId: "col_xxx", collectionName: "Standard" },
      name:      { sourceField: "name",      collectionId: "col_xxx", collectionName: "Standard" },
      company:   { sourceField: "company",   collectionId: "col_xxx", collectionName: "Standard" },
      // Unstructured field — AI extraction + vector embeddings
      notes:     { sourceField: "notes",     collectionId: "col_yyy", collectionName: "Notes",
                   extractMemories: true },
    },
  },
  rows: arrayOfRecords,
  dryRun: false,                       // true = validate without writing
  chunkSize: 1,                        // rows per processing chunk (default: 1)
});
```

### search — Query Records by Filter

```typescript
const results = await personize.memory.search({
  groups: [{
    conditions: [
      { property: "lifecycle_stage", operator: "EQ", value: "opportunity" },
      { property: "last_contacted", operator: "IS_SET" },
    ],
  }],
  type: "Contact",
  returnRecords: true,
  includeMemories: true,
  pageSize: 50,
});
```

---

## AI — Smart Context & Prompts

### smartGuidelines — Get Org Guidelines

```typescript
const ctx = await personize.ai.smartGuidelines({
  message: "cold outbound email for VP of Sales at a SaaS company",
  tags: ["outbound", "email"],         // filter to relevant guidelines
  excludeTags: ["internal"],           // exclude variables with these tags
  mode: "auto",                        // "fast" (~200ms) | "full" (~3s) | "auto"
  minScore: 0.4,                       // minimum cosine similarity (0-1)
  sessionId: "conv-123",              // optional: conversation continuity
});

// ctx.data.compiledContext — matching guidelines as markdown
// ctx.data.selection — which variables matched and their scores
// ctx.data.mode — which routing mode was actually used ("fast" | "full")
// ctx.data.usage.durationMs — how long routing took
```

### prompt — AI Generation with Built-in Tools

**This is the core pattern for GTM pipelines.** The AI agent has access to all built-in Personize tools by default (memory_recall_pro, memory_store_pro, ai_smart_guidelines, guideline_*, etc.) and can autonomously recall, research, and memorize during generation.

```typescript
// Built-in Personize tools are available by default — no mcpTools needed.
const result = await personize.ai.prompt({
  prompt: "Research this lead and write a personalized outreach email.",

  // Extract structured outputs
  outputs: [
    { name: "email_subject" },
    { name: "email_body" },
    { name: "follow_up_days" },
  ],

  // Auto-memorize the interaction
  memorize: {
    email: "lead@company.com",
    captureToolResults: true,          // also memorize what the AI discovered
  },

  model: "claude-sonnet-4-6",
});

// result.data.text — cleaned response (output markers stripped)
// result.data.outputs.email_subject — extracted subject line
// result.data.outputs.email_body — extracted email body
// result.data.outputs.follow_up_days — extracted follow-up timing
// result.data.metadata.toolCalls — tools the AI called (name + args)
// result.data.metadata.toolResults — tool return values (name + result)
```

#### Structured Outputs — How It Works

When you pass `outputs`, the server instructs the LLM to wrap each deliverable in `<output name="...">` XML markers. After execution:

1. The server extracts all markers from the raw response text
2. Each value is JSON-parsed (falls back to raw string if not valid JSON)
3. The `text` field is the **cleaned** response (markers stripped); structured data goes in `outputs`

In multi-step mode, if a later step produces an output with the **same name** as an earlier step, the later value **overwrites** (last-write-wins). This allows steps to revise previous outputs.

#### captureToolResults — What It Does

`captureToolResults` controls whether tool return values are **memorized** alongside your extracted outputs. It does **NOT** change the API response body.

| `captureToolResults` | Response body | What gets memorized |
|---------------------|---------------|---------------------|
| `false` (default) | Same | Only extracted `<output>` values |
| `true` | Same | Extracted outputs **+ tool results** from research tools |

**Excluded tools** (never captured): `smart_guidelines`, `recall_pro`, `memorize_pro`, `store_evaluation_log`. These are infrastructure tools whose results should not be stored as entity data.

Tool results are **always** available in `metadata.toolResults` in the response regardless of this setting.

### prompt — with External MCP Tools (Optional)

If you've connected external MCP servers via the [Personize dashboard](https://app.personize.ai) (e.g. Tavily for web search, HubSpot for CRM access), you can pass them via `mcpTools` to extend the AI's capabilities beyond the built-in tools:

```typescript
const result = await personize.ai.prompt({
  prompt: "Research this lead on the web and write a personalized outreach email.",

  // Optional: external MCP servers configured in the Personize dashboard.
  // Built-in tools are always available regardless.
  mcpTools: [
    { mcpId: "tavily", enabledTools: ["search"] },
  ],

  outputs: [{ name: "email_subject" }, { name: "email_body" }],
  memorize: { email: "lead@company.com", captureToolResults: true },
});
```

> **Note:** External MCP servers must be added via the Personize dashboard before they can be referenced here. The `mcpId` and available tool names come from your dashboard configuration.

### Multi-Step Instructions

```typescript
// Built-in tools are available by default in each instruction step.
const result = await personize.ai.prompt({
  instructions: [
    {
      prompt: 'Recall everything about lead@company.com and summarize their engagement history.',
      maxSteps: 5,
    },
    {
      prompt: 'Get our outbound email guidelines using smart_guidelines.',
      maxSteps: 3,
    },
    {
      prompt: 'Write a personalized follow-up email based on the engagement history and guidelines.',
      maxSteps: 3,
    },
  ],
  // No mcpTools needed — built-in tools (recall, memorize, smart_guidelines, etc.)
  // are available by default in every instruction step.
  memorize: { email: "lead@company.com", captureToolResults: true },
});
```

---

## Identity & Test

### test — Verify API Key

Lightweight check that the API key is valid. No credits consumed. Useful at pipeline startup.

```typescript
const check = await personize.test();
// check.data.organizationId — resolved org
// check.data.userId — resolved user
// check.data.timestamp — server time
// check.data.ip — request IP
// check.data.userAgent — request user-agent
```

### me — Current Context (Org, User, Plan)

```typescript
const me = await personize.me();
// me.data.organization.id — org ID
// me.data.user.id — user ID
// me.data.plan.name — plan name
// me.data.plan.limits.maxApiCallsPerMonth — monthly limit
// me.data.plan.limits.maxApiCallsPerMinute — per-minute limit
```

---

## Agents

### list — List Available Agents

Returns all agents (prompt actions) for the organization. Supports pagination and tag filtering.

```typescript
const agents = await personize.agents.list({
  limit: 25,                           // page size (default: 25, max: 100)
  tags: ["outbound"],                  // filter by tags
  summary: true,                       // lighter payload (strips full instruction text)
});

// agents.data.actions — array of agent objects
// agents.data.count — total count
// agents.data.nextToken — cursor for next page (pass to next call)
```

### get — Get Agent Details & Expected Inputs

Fetches a single agent's configuration and extracts the `{{placeholder}}` variable names from its instructions. Use this to discover which `inputs` to pass to `agents.run()`. No credits consumed.

```typescript
const agent = await personize.agents.get("act_agent123");

// agent.data.id — agent ID
// agent.data.payload.name — agent name (e.g. "Cold Outreach Agent")
// agent.data.payload.instructions — ordered instruction steps with raw prompt templates
// agent.data.payload.actions — tools/actions available to the agent
// agent.data.payload.aiConfig — model and AI configuration
// agent.data.expectedInputs — e.g. ["companyName", "industry", "targetPersona"]
```

**Common pattern — discover inputs then run:**

```typescript
const agent = await personize.agents.get("act_agent123");
console.log("This agent expects:", agent.data.expectedInputs);
// → ["recipientEmail", "company", "objective"]

const result = await personize.agents.run("act_agent123", {
  inputs: {
    recipientEmail: "lead@company.com",
    company: "Acme Corp",
    objective: "Book a discovery call",
  },
});
```

### run — Run a Pre-configured Agent

Executes an agent by ID. The agent's instructions are executed in sequence. Any `{{placeholder}}` tokens in instructions are replaced with matching keys from `inputs`.

```typescript
// Built-in tools are available by default.
const result = await personize.agents.run("cold-outreach-agent", {
  inputs: {                            // substituted into {{placeholder}} tokens in instructions
    recipientEmail: "lead@company.com",
    company: "Acme Corp",
    objective: "Book a discovery call",
  },
  email: "lead@company.com",          // resolves entity from memory for CRM context
  websiteUrl: "https://acme.com",     // resolves company from memory (optional)
  recordId: "rec_abc",                // resolves CRM record (optional)
});

// result.data.text — full agent response
// result.data.metadata.model — model used
// result.data.metadata.usage — token usage
// result.data.metadata.toolCalls — tools the agent called
// result.data.metadata.stepsExecuted — number of LLM round-trips
```

**Key distinction for `inputs` vs `email`/`websiteUrl`/`recordId`:**
- `inputs` — simple text substitution into `{{placeholder}}` tokens in agent instructions
- `email`, `websiteUrl`, `recordId` — also merged into inputs, but additionally resolve entity context from Personize memory (properties, memories). Top-level values take priority over same keys inside `inputs`.

---

## MCP Tool Reference

### Built-in Tools (Available by Default)

These tools are available automatically in `ai.prompt()` and `agents.run()` — **no `mcpTools` parameter needed**:

| Tool Name | What It Does |
|---|---|
| `memory_recall_pro` | Semantic search across all entity memories |
| `memory_store_pro` | Store + AI extract information about an entity |
| `ai_smart_guidelines` | Retrieve org guidelines relevant to the current task |
| `guideline_list` | List available governance variables |
| `guideline_read` | Read a specific governance variable |
| `guideline_create` | Create a new governance variable |
| `guideline_update` | Update an existing governance variable |
| `guideline_delete` | Delete a governance variable |

### External MCP Tools (Optional — via `mcpTools` parameter)

You can extend the AI's capabilities by connecting external MCP servers in the [Personize dashboard](https://app.personize.ai). Once configured, reference them via the `mcpTools` parameter in `ai.prompt()` or `agents.run()`.

The `mcpId` and available tool names come from your dashboard configuration. Common examples:

| MCP Server | Use Case |
|---|---|
| Tavily | Web research, news, company info |
| Zapier | 6,000+ app integrations |
| HubSpot | Direct CRM access from within AI generation |

```typescript
// Optional: pass external MCPs configured in your Personize dashboard.
await personize.ai.prompt({
  prompt: "Research this lead on the web and write an email.",
  mcpTools: [
    { mcpId: "your-mcp-id", enabledTools: ["tool-name"] },
  ],
});
```

**When to use built-in MCP tools vs. direct SDK calls:**
- **Built-in MCP tools** (in `ai.prompt()` / `agents.run()`): Let the AI decide what to recall/check autonomously during content generation. Preferred for creative tasks.
- **Direct SDK calls** (in task code): When you need deterministic, structured operations — batch sync, export, specific queries. Preferred for data operations.

---

## Bring Your Own LLM — Personize as Memory + Governance Layer

You don't have to use Personize's AI. Use **any LLM** (OpenAI, Anthropic, Gemini, local models) and use Personize purely for **memory** and **governance**.

### Pattern 1: Context Injection (No Tool Calling Needed)

Fetch context from Personize, inject it into your LLM prompt. Works with any LLM.

```typescript
import OpenAI from "openai";
import { personize } from "./lib/personize";

const openai = new OpenAI();

// 1. Get everything we know about this contact
const digest = await personize.memory.smartDigest({
  email: "lead@company.com",
  include_properties: true,
  include_memories: true,
  token_budget: 2000,
});

// 2. Get org guidelines for the task
const guidelines = await personize.ai.smartGuidelines({
  message: "cold outbound email guidelines",
  tags: ["outbound"],
});

// 3. Call YOUR LLM with Personize context injected
const completion = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: `Follow these guidelines:\n${guidelines.data.compiledContext}` },
    { role: "user", content: `Write an email to lead@company.com.\n\nContext:\n${digest.data.compiledContext}` },
  ],
});

// 4. Memorize what we sent
await personize.memory.memorize({
  email: "lead@company.com",
  content: `[EMAIL SENT] ${completion.choices[0].message.content}`,
  speaker: "outbound",
  tags: ["outbound"],
});
```

### Pattern 2: Personize as LLM Function Tools

Give your LLM the ability to call `recall`, `memorize`, `smart_guidelines`, and `smart_digest` as function tools. The LLM decides when to use them.

```typescript
import OpenAI from "openai";
import { OPENAI_TOOLS, executePersonizeTool } from "./lib/personize-tools";

const openai = new OpenAI();

// LLM gets Personize tools — it can autonomously recall, memorize, check guidelines
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: "You have access to Personize memory. Always recall context before writing." },
    { role: "user", content: "Write a follow-up email for john@acme.com" },
  ],
  tools: OPENAI_TOOLS,  // personize_recall, personize_memorize, personize_smart_guidelines, personize_smart_digest
});

// Execute tool calls from the LLM
for (const toolCall of response.choices[0].message.tool_calls || []) {
  const result = await executePersonizeTool(
    toolCall.function.name,
    JSON.parse(toolCall.function.arguments)
  );
  // Feed result back to LLM for next round...
}
```

**Same pattern works with Anthropic Claude:**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_TOOLS, executePersonizeTool } from "./lib/personize-tools";

const anthropic = new Anthropic();

const response = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 4096,
  messages: [{ role: "user", content: "Prep me for a call with sarah@startup.io" }],
  tools: ANTHROPIC_TOOLS,  // Same tools, Anthropic format
});

// Execute tool_use blocks from Claude
for (const block of response.content.filter(b => b.type === "tool_use")) {
  const result = await executePersonizeTool(block.name, block.input);
  // Feed back...
}
```

### Pattern 3: Simple Recall → Generate → Memorize

One helper that handles the full cycle with any LLM:

```typescript
import { recallGenerateMemorize } from "./lib/llm";

const result = await recallGenerateMemorize({
  email: "john@acme.com",
  task: "Write a personalized follow-up email",
  guidelinesQuery: "follow-up email guidelines",
  generateFn: async (enrichedPrompt) => {
    // YOUR LLM — OpenAI, Claude, Gemini, local, anything
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: enrichedPrompt }],
    });
    return res.choices[0].message.content || "";
  },
  memorizeSpeaker: "outbound",
  memorizeTags: ["follow-up"],
});
// result.generated = the email text
// Context was auto-recalled, result was auto-memorized
```

### When to Use Which Pattern

| Pattern | Complexity | Best For |
|---|---|---|
| **Context Injection** | Simple | Predictable flows, no tool calling needed |
| **LLM with Tools** | Medium | Complex tasks where the LLM should decide what to look up |
| **Recall → Generate → Memorize** | Simplest | Quick integration, one-liner |
| **Personize ai.prompt()** | Lowest (built-in) | When you want Personize to handle the LLM too |

### Available Tool Functions

See `lib/personize-tools.ts` for full definitions. These are exposed in both OpenAI and Anthropic formats:

| Tool | What It Does |
|---|---|
| `personize_recall` | Semantic search across all memories for a contact |
| `personize_smart_digest` | Compiled context summary for a contact |
| `personize_memorize` | Store new information about a contact |
| `personize_smart_guidelines` | Get org guidelines relevant to a task |

---

## Evaluation

### memorizationAccuracy — Test & Optimize Collection Schemas

Runs a three-phase evaluation on a collection: (1) extract properties from sample text, (2) analyze extraction quality, (3) suggest schema optimizations. Useful for testing collection definitions before deploying a sync pipeline.

```typescript
const evaluation = await personize.evaluate.memorizationAccuracy({
  collectionId: "col_abc",                // collection to evaluate against
  input: "John Smith is VP of Sales at Acme Corp. They use Salesforce and have 200 employees.",
  extractionModel: "x-ai/grok-4.1-fast", // optional: model for extraction phase
  analysisModel: "x-ai/grok-4.1-fast",   // optional: model for analysis phase
  optimizerModel: "x-ai/grok-4.1-fast",  // optional: model for schema optimization
  skipStorage: true,                      // true = don't persist values (dry run). Default: true
  includeFreeformMemories: false,         // include free-form memories in extraction
  crmKeys: {                              // optional: entity scope
    email: "john@acme.com",
  },
});

// evaluation.data.phases[0] — extraction phase: propertyValues with confidence scores
// evaluation.data.phases[1] — analysis phase: quality metrics
// evaluation.data.phases[2] — schema phase: optimizedCollection with change reasons
// evaluation.data.summary.totalDuration — total time in ms
// evaluation.data.summary.propertiesOptimized — how many properties were improved
// evaluation.data.summary.propertiesAttempted — how many properties were evaluated
```

---

## Error Handling

```typescript
import { RateLimitExceededError, AuthenticationError } from "@personize/sdk";

try {
  await personize.memory.memorize({ ... });
} catch (error) {
  if (error instanceof RateLimitExceededError) {
    // error.retryAfterSeconds — wait this long
    // Trigger.dev retry handles this automatically
    throw error; // let Trigger.dev retry
  }
  if (error instanceof AuthenticationError) {
    // Bad API key — don't retry
    console.error("Invalid Personize API key");
  }
}
```
