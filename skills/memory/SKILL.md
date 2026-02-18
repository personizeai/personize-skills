---
name: memory
description: "Stores and retrieves persistent memory about records — contacts, companies, employees, members, and more. Handles memorization (single and batch with per-property AI extraction), semantic recall, entity digests, and data export. Use when storing data, syncing records, querying memory, or assembling context for personalization."
license: Apache-2.0
compatibility: "Requires @personize/sdk or Personize MCP server and a Personize API key (sk_live_...)"
metadata: {"author": "personize-ai", "version": "1.0", "homepage": "https://personize.ai", "openclaw": {"emoji": "\U0001F9E0", "requires": {"env": ["PERSONIZE_SECRET_KEY"]}}}
---

# Skill: Memory

This is your persistent memory for everything you know about a record — contacts, companies, employees, members, locations, devices, and more. Store and retrieve: customer data, interaction history, inputs, actions you've taken, reports, notes, and observations. **Always consult Memory before acting on a record. Always update Memory after meaningful interactions.**

> **Internal principle:** Bad data in = bad personalization out. Memory is the foundation. Get it right, and every downstream feature (emails, notifications, dashboards, agents) gets better automatically.

---

## When This Skill is Activated

This skill gives you the ability to store and retrieve data using the Personize SDK's memory system.

**If the developer hasn't given a specific instruction yet**, introduce yourself:

> "I have access to the Memory skill. I can help you store data into Personize memory (memorize) and retrieve it (recall) — including batch syncs, semantic search, entity digests, and data export. What data are you working with?"

**If the developer says something about storing, syncing, importing, or ingesting data**, jump to **MEMORIZE**.

**If the developer says something about retrieving, querying, searching, or assembling context**, jump to **RECALL**.

---

## Works With Both SDK and MCP — One Skill, Two Interfaces

This skill works identically whether the LLM accesses memory via the **SDK** (code, scripts, IDE agents) or via **MCP** (Claude Desktop, ChatGPT, Cursor MCP connection).

| Interface | How it works | Best for |
|---|---|---|
| **SDK** (`@personize/sdk`) | `client.memory.memorize()`, `client.memory.recall()`, etc. | Scripts, CI/CD, IDE agents, recipes |
| **MCP** (Model Context Protocol) | `memory_store_pro`, `memory_recall_pro`, `ai_smart_context` tools | Claude Desktop, ChatGPT, Cursor, any MCP-compatible client |

**MCP tools map to SDK methods:**

| SDK Method | MCP Tool | Purpose |
|---|---|---|
| `client.memory.memorize(opts)` | `memory_store_pro(content, email, ...)` | Store data with AI extraction |
| `client.memory.recall(opts)` | `memory_recall_pro(query, email, ...)` | Semantic search across memories |
| `client.memory.smartDigest(opts)` | *(SDK only)* | Compiled entity context (properties + memories) |
| `client.memory.export(opts)` | *(SDK only)* | Filter and export records |
| `client.memory.upsert(opts)` | *(SDK only)* | Structured upsert (no AI) |
| `client.memory.memorizeBatch(opts)` | *(SDK only)* | Batch sync with per-property control |
| `client.ai.smartContext(opts)` | `ai_smart_context(message)` | Fetch guidelines by topic |

### MCP-Only Feature: Self-Memory (`about='self'`)

MCP tools support an `about` parameter that the SDK does not expose directly:

- `about='lead'` (default) — store/recall about a contact or company. **Requires** `email`, `website_url`, or `record_id`.
- `about='self'` — store/recall about the current user (preferences, working style, goals). No identifier needed — identity is resolved automatically.

```
// MCP: Store user preferences
memory_store_pro(content="I prefer formal communication. My timezone is PST.", about="self")

// MCP: Recall user preferences
memory_recall_pro(query="What are my preferences and working style?", about="self", generate_answer=true)
```

**When reading this skill document:**
- If you're connected via **MCP**, use the MCP tool names (`memory_store_pro`, `memory_recall_pro`, etc.)
- If you're running via **SDK**, use the `client.memory.*` methods
- All workflows, rules, and best practices apply equally to both interfaces

---

## Actions

You have 2 actions. Use whichever matches what the developer needs.

| Action | When to Use | Reference |
|---|---|---|
| **MEMORIZE** | Developer needs to store data — single items, batch sync, CRM import, webhook data, generated outputs | `reference/memorize.md` |
| **RECALL** | Developer needs to retrieve data — semantic search, entity context, filtered exports, context assembly | `reference/recall.md` |

**Before each action:** Read the reference file for full method signatures, decision trees, code examples, and common mistakes.

---

## Action: MEMORIZE

Store data into Personize memory. The right method depends on what you're storing and how much of it.

### Which Method to Use

| Scenario | Method | Why |
|---|---|---|
| **One item, with AI extraction** | `memory.memorize()` | Rich text (notes, transcripts, emails) → AI extracts facts and creates vectors |
| **Batch sync from CRM/DB** | `memory.memorizeBatch()` | Multiple records with per-property `extractMemories` control |
| **Structured data, no AI needed** | `memory.upsert()` | Store exact key-value pairs (email, plan_tier, login_count) |
| **Batch structured storage** | `memory.upsertBatch()` | Multiple structured items at once |

### The `extractMemories` Decision

This is the most important decision for every property:

| Data Type | `extractMemories` | Reasoning |
|---|---|---|
| **Structured facts** (email, name, plan, dates, counts) | `false` | Already structured — AI extraction wastes tokens and adds latency |
| **Rich text** (notes, transcripts, emails, descriptions) | `true` | AI extracts facts, creates vector embeddings for semantic search |
| **Generated content** (AI outputs you want to remember) | `true` | Enables the feedback loop — AI knows what it already said |
| **ML outputs with explanations** (churn reason, lead score rationale) | `true` | The explanation text benefits from extraction |
| **Binary flags, IDs, URLs** | `false` | No semantic content to extract |

> **Rule of thumb:** If a human would need to *read and interpret* the value to understand it → `extractMemories: true`. If it's a fact that stands on its own → `false`.

### Quick Example

```typescript
// Single item — AI extraction
await client.memory.memorize({
    content: 'Call with Sarah Chen (VP Eng, Initech). She mentioned they are evaluating SOC2 compliance tools. Main pain point: manual audit prep taking 2 weeks per quarter. Budget approved for Q2.',
    speaker: 'Sales Team',
    email: 'sarah.chen@initech.com',
    enhanced: true,
    tags: ['call-notes', 'sales', 'source:manual'],
});

// Batch sync — per-property control
await client.memory.memorizeBatch({
    source: 'Hubspot',
    mapping: {
        entityType: 'contact',
        email: 'email',
        runName: 'hubspot-contact-sync',
        properties: {
            full_name:    { sourceField: 'firstname', collectionId: 'col_xxx', collectionName: 'Contacts', extractMemories: false },
            job_title:    { sourceField: 'jobtitle',  collectionId: 'col_xxx', collectionName: 'Contacts', extractMemories: false },
            last_notes:   { sourceField: 'notes',     collectionId: 'col_xxx', collectionName: 'Contacts', extractMemories: true },
        },
    },
    rows: crmContacts,  // array of objects from your CRM
});
```

### Critical Rules

1. **Tag everything.** `tags: ['source:hubspot', 'type:interaction', 'team:sales']` — tags enable filtering later.
2. **Include timestamps.** So the AI knows what's recent vs. stale.
3. **Don't pre-process with LLM.** Pass raw data with `enhanced: true`. Memorize handles extraction.
4. **Don't deduplicate yourself.** Personize deduplicates at cosine 0.92 and runs background consolidation.
5. **Store your own outputs.** After generating an email/notification, memorize it — this is the feedback loop.
6. **Manage collections via SDK or web app.** Use `client.collections.create()`, `.update()`, `.delete()`, `.history()` for programmatic schema management, or design schema in the Personize web app.
7. **Validate with `client.me()` first.** Check plan limits before running large batch syncs.

> **Full guide:** Read `reference/memorize.md` for complete method signatures, data mapping patterns, all source-specific recipes (CRM, database, webhook, CSV), batch strategies, error handling, and the feedback loop.

---

## Action: RECALL

Retrieve data from Personize memory. The right method depends on what kind of answer you need.

### Which Method to Use

| Need | Method | Returns |
|---|---|---|
| **"What do we know about X topic?"** | `memory.recall()` | Semantic search results — ranked memories matching a query |
| **"Give me everything about this person/company"** | `memory.smartDigest()` | Compiled markdown context — all properties + memories for one entity |
| **"List all contacts matching criteria X"** | `memory.export()` | Filtered records with property values |
| **"What are our guidelines for X?"** | `ai.smartContext()` | Governance variables matching a topic |

### When to Use What

```
Need specific facts about a topic?         → recall()
Need full context about ONE entity?         → smartDigest()
Need to filter/segment a list of records?   → export()
Need organizational rules/guidelines?       → smartContext()

Building a generation prompt?               → smartContext() + smartDigest() + recall()
                                              (governance + entity + task-specific facts)
```

### Quick Example

```typescript
// Semantic search — find specific facts
const results = await client.memory.recall({
    query: 'what pain points did this contact mention?',
    email: 'sarah.chen@initech.com',
    limit: 10,
    minScore: 0.4,
    include_property_values: true,
});

// Fast recall — skip reflection, ~700ms response
const fast = await client.memory.recall({
    query: 'what do we know about this contact?',
    email: 'sarah.chen@initech.com',
    fast_mode: true,
});

// Entity digest — compiled context for one person
const digest = await client.memory.smartDigest({
    email: 'sarah.chen@initech.com',
    type: 'Contact',
    token_budget: 2000,
    include_properties: true,
    include_memories: true,
});
// digest.data.compiledContext → ready-to-inject markdown

// Filtered export — find all enterprise contacts
const exported = await client.memory.export({
    type: 'Contact',
    returnRecords: true,
    pageSize: 50,
    groups: [{
        id: 'enterprise', logic: 'AND',
        conditions: [
            { field: 'plan_tier', operator: 'EQUALS', value: 'enterprise' },
            { field: 'email', operator: 'IS_SET' },
        ],
    }],
});
```

### The Context Assembly Pattern

Most generation pipelines combine multiple recall methods:

```typescript
async function assembleContext(email: string, task: string): Promise<string> {
    const sections: string[] = [];

    // 1. Governance — rules and guidelines
    // Use mode: 'fast' for real-time agents (~200ms), 'full' for deep analysis (~3s)
    const governance = await client.ai.smartContext({
        message: `${task} — guidelines, tone, constraints`,
        mode: 'fast', // embedding-only routing, no LLM overhead
    });
    if (governance.data?.compiledContext) {
        sections.push('## Guidelines\n' + governance.data.compiledContext);
    }

    // 2. Entity context — everything about this person
    const digest = await client.memory.smartDigest({
        email,
        type: 'Contact',
        token_budget: 2000,
        include_properties: true,
        include_memories: true,
    });
    if (digest.data?.compiledContext) {
        sections.push('## Recipient Context\n' + digest.data.compiledContext);
    }

    // 3. Task-specific facts — semantic search
    const recalled = await client.memory.recall({
        query: task,
        email,
        limit: 10,
        minScore: 0.3,
    });
    if (recalled.data && Array.isArray(recalled.data) && recalled.data.length > 0) {
        sections.push('## Relevant Facts\n' + recalled.data.map((m: any) =>
            `- ${m.text || m.content || JSON.stringify(m)}`
        ).join('\n'));
    }

    return sections.join('\n\n---\n\n');
}
```

### Critical Rules

1. **Always set `token_budget` on smartDigest.** Default is 1000 — increase for deep personalization, decrease for simple lookups.
2. **Use `minScore` on recall.** 0.3 for broad context, 0.5+ for precision. Don't return noise.
3. **Use `fast_mode: true` in hot paths.** Cuts recall from ~10-20s to ~700ms. Use for context injection, real-time UIs, and batch processing.
4. **Combine methods for generation.** `smartContext` (rules) + `smartDigest` (who) + `recall` (what) = complete context.
    - Use `mode: 'fast'` for real-time agent flows (embedding-only, ~200ms). Use `mode: 'full'` for first-call or complex planning tasks (LLM routing, ~3s).
5. **Use `include_property_values: true` on recall** when you need structured data alongside semantic results.
6. **Paginate exports.** Use `page` and `pageSize` for large result sets. Default pageSize is 50.
7. **Cache smartDigest in hot paths.** If the same entity is referenced multiple times in one pipeline run, cache the result.

> **Full guide:** Read `reference/recall.md` for complete method signatures, query writing strategies, token budget tuning, scoring thresholds, all context assembly patterns, export filtering, and performance optimization.

---

## SDK Method Reference

```typescript
import { Personize } from '@personize/sdk';
const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
```

### Memorize Methods

| Method | Endpoint | Purpose |
|---|---|---|
| `memory.memorize(opts)` | `POST /api/v1/memorize_pro` | Store single item with AI extraction |
| `memory.memorizeBatch(opts)` | `POST /api/v1/batch-memorize` | Batch sync with per-property `extractMemories` |
| `memory.upsert(opts)` | `POST /api/v1/upsert` | Structured upsert (no AI) |
| `memory.upsertBatch(opts)` | `POST /api/v1/upsert` | Batch structured upsert |

### Recall Methods

| Method | Endpoint | Purpose |
|---|---|---|
| `memory.recall(opts)` | `POST /api/v1/recall_pro` | Semantic search with optional reflection |
| `memory.smartDigest(opts)` | `POST /api/v1/smart-memory-digest` | Compiled entity context (properties + memories) |
| `memory.export(opts)` | `POST /api/v1/export` | Filter and export records |
| `ai.smartContext(opts)` | `POST /api/v1/ai/smart-context` | Fetch governance variables by topic |

### Key Type Signatures

```typescript
// memorize() — single item
interface MemorizeProOptions {
    content: string;           // The text to memorize
    speaker?: string;          // Who said/wrote it
    timestamp?: string;        // When it happened
    email?: string;            // Match to contact by email
    website_url?: string;      // Match to company by website
    record_id?: string;        // Match to record by ID
    enhanced?: boolean;        // Enable AI extraction (default: false)
    tags?: string[];           // Categorization tags
    max_properties?: number;   // Max properties to extract
    schema?: Record<string, unknown>; // Extraction schema hint
    actionId?: string;         // Target collection ID
}

// memorizeBatch() — batch sync
interface BatchMemorizeOptions {
    source: string;            // Source system label ('Hubspot', 'Salesforce')
    mapping: {
        entityType: string;    // 'contact', 'company'
        email?: string;        // Source field name for email
        website?: string;      // Source field name for website
        runName?: string;      // Tracking label
        properties: Record<string, {
            sourceField: string;       // Source field name in row data
            collectionId: string;      // Target collection ID
            collectionName: string;    // Target collection name
            extractMemories?: boolean; // AI extraction for this property
        }>;
    };
    rows: Record<string, unknown>[]; // Source data rows
    dryRun?: boolean;          // Validate without writing
    chunkSize?: number;        // Rows per chunk (default: 1)
}

// recall() — semantic search
interface RecallProOptions {
    query: string;             // Natural language query
    limit?: number;            // Max results (default: 10)
    minScore?: number;         // Minimum relevance score (0-1)
    email?: string;            // Scope to one contact
    website_url?: string;      // Scope to one company
    record_id?: string;        // Scope to one record
    type?: string;             // Entity type filter
    include_property_values?: boolean; // Include structured properties
    enable_reflection?: boolean;       // AI reflects on results
    generate_answer?: boolean;         // AI generates a direct answer
    fast_mode?: boolean;       // Skip reflection + answer gen, ~700ms (default: false)
    min_score?: number;        // Server-side score filter (in fast_mode, defaults to 0.3)
}

// smartDigest() — entity context
interface SmartDigestOptions {
    email?: string;            // Contact email
    website_url?: string;      // Company website
    record_id?: string;        // Record ID
    type?: string;             // Entity type ('Contact', 'Company')
    token_budget?: number;     // Max tokens for output (default: 1000)
    max_memories?: number;     // Max memories to include (default: 20)
    include_properties?: boolean; // Include structured properties (default: true)
    include_memories?: boolean;   // Include free-form memories (default: true)
}
```

---

## The Data Model

```
┌─────────────────────────────────────────────────────────────┐
│                    PERSONIZE MEMORY                          │
│                                                             │
│  ┌───────────────────┐    ┌──────────────────────────────┐  │
│  │  STRUCTURED DATA  │    │     SEMANTIC MEMORIES         │  │
│  │  (DynamoDB)       │    │     (LanceDB + Vectors)       │  │
│  │                   │    │                              │  │
│  │  Records:         │    │  AI-extracted facts from:    │  │
│  │  ├─ email: "..."  │    │  ├─ Call notes              │  │
│  │  ├─ plan: "pro"   │    │  ├─ Support tickets         │  │
│  │  ├─ title: "VP"   │    │  ├─ Email threads           │  │
│  │  └─ login_count:5 │    │  ├─ Meeting transcripts     │  │
│  │                   │    │  └─ Generated outputs        │  │
│  └───────────────────┘    └──────────────────────────────┘  │
│           │                            │                    │
│           ▼                            ▼                    │
│     export() filters           recall() searches            │
│     upsert() writes            memorize() writes            │
│     smartDigest() reads both ──────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

- **Structured data** = exact key-value pairs. Queryable by field, filterable, paginated.
- **Semantic memories** = AI-extracted facts with vector embeddings. Searchable by meaning.
- **smartDigest** combines both into a single, token-budgeted markdown block.

---

## Available Resources

| Resource | Contents |
|---|---|
| `reference/memorize.md` | Full memorize guide: method signatures, data mapping, extractMemories decision tree, source recipes, batch strategies, error handling, feedback loop |
| `reference/recall.md` | Full recall guide: method signatures, query strategies, token budgets, scoring, context assembly, export filtering, performance tips |
| `recipes/data-sync.ts` | Batch sync from CRM/database with validation and error handling |
| `recipes/context-assembly.ts` | Complete context assembly pattern combining all recall methods |
