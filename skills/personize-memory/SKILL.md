---
name: personize-memory
description: "Stores and retrieves persistent memory about records — contacts, companies, employees, members, and more. Handles memorization (single and batch with per-property AI extraction), semantic recall, entity digests, and data export. Use this skill whenever the user wants to store data, sync records from a CRM or database, query or search memory, recall what's known about a person or company, assemble context for personalization, import CSV or spreadsheet data, or do anything involving the Personize SDK's memory methods (memorize, recall, smartRecall, smartDigest, search, memorizeBatch). Also use when the user mentions contacts, leads, accounts, customer data, or entity properties."
license: Apache-2.0
compatibility: "Requires @personize/sdk or Personize MCP server and a Personize API key (sk_live_...)"
metadata: {"author": "personize-ai", "version": "1.0", "homepage": "https://personize.ai", "openclaw": {"emoji": "\U0001F9E0", "requires": {"env": ["PERSONIZE_SECRET_KEY"]}}}
---

# Skill: Personize Memory

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

## When NOT to Use This Skill

- For CRM sync with deploy templates → see the **CRM / Database Sync** section below
- Need no-code visual workflows → use **no-code-pipelines**
- Need durable scheduled pipelines with retries → use **code-pipelines**
- Need to manage organizational rules, not entity data → use **governance**
- Need multi-agent coordination state → use **collaboration**

---

## Works With Both SDK and MCP — One Skill, Two Interfaces

This skill works identically whether the LLM accesses memory via the **SDK** (code, scripts, IDE agents) or via **MCP** (Claude Desktop, ChatGPT, Cursor MCP connection).

| Interface | How it works | Best for |
|---|---|---|
| **SDK** (`@personize/sdk`) | `client.memory.memorize()`, `client.memory.recall()`, etc. | Scripts, CI/CD, IDE agents, recipes |
| **MCP** (Model Context Protocol) | `memory_store_pro`, `memory_recall_pro`, `ai_smart_guidelines` tools | Claude Desktop, ChatGPT, Cursor, any MCP-compatible client |

**MCP tools map to SDK methods:**

| SDK Method | MCP Tool | Purpose |
|---|---|---|
| `client.memory.memorize(opts)` | `memory_store_pro(content, email, ...)` | Store data with AI extraction |
| `client.memory.smartRecall(opts)` | `memory_recall_pro(query, email, ...)` | Semantic search (recommended) |
| `client.memory.recall(opts)` | *(SDK only)* | Direct DynamoDB lookup — properties + freeform memories (`type` required, no AI) |
| `client.memory.smartDigest(opts)` | `memory_digest(email, ...)` | Compiled entity context (properties + memories) |
| `client.memory.search(opts)` | *(SDK only)* | Filter and export records |
| `client.memory.memorizeBatch(opts)` | *(SDK only)* | Batch sync with per-property control |
| `client.memory.update(opts)` | `memory_update_property(email, ...)` | Update property or freeform memory (supports conditional writes + array ops) |
| `client.memory.bulkUpdate(opts)` | *(SDK only)* | Update multiple properties at once |
| `client.memory.delete(opts)` | *(SDK only)* | Soft-delete memories (30-day recovery) |
| `client.memory.deleteRecord(opts)` | *(SDK only)* | Soft-delete all memories for a record |
| `client.memory.cancelDeletion(opts)` | *(SDK only)* | Cancel pending soft-delete |
| `client.memory.propertyHistory(opts)` | *(SDK only)* | Query property change history |
| `client.memory.queryProperties(opts)` | *(SDK only)* | LLM-powered structured property search |
| `client.memory.filterByProperty(opts)` | *(SDK only)* | Deterministic property filter (no LLM) |
| `client.ai.smartGuidelines(opts)` | `ai_smart_guidelines(message)` | Fetch guidelines by topic |
| `client.memory.similar()` | `memory_find_similar` | Find records similar to a seed record |
| `client.memory.segment()` | `memory_segment` | Bucket records into similarity tiers |

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

You have 5 actions. Use whichever matches what the developer needs.

| Action | When to Use | Reference |
|---|---|---|
| **MEMORIZE** | Developer needs to store data — single items, batch sync, CRM import, webhook data, generated outputs | `reference/memorize.md` |
| **RECALL** | Developer needs to retrieve data — semantic search, entity context, filtered exports, context assembly | `reference/recall.md` |
| **CRUD** | Developer needs to directly modify, delete, query history, or filter by property value — no AI extraction | `reference/crud-operations.md` |
| **FIND SIMILAR** | Developer wants lookalikes, related records, "find more like this", or records connected through shared properties/memories | `reference/similar.md` |
| **SEGMENT** | Developer wants to bucket, tier, or segment records relative to a seed record or text description | `reference/segment.md` |

**Before each action:** Read the reference file for full method signatures, decision trees, code examples, and common mistakes.

---

## Action: MEMORIZE

Store data into Personize memory. The right method depends on what you're storing and how much of it.

### Which Method to Use

| Scenario | Method | Why |
|---|---|---|
| **One item, with AI extraction** | `memory.memorize()` | Rich text (notes, transcripts, emails) → AI extracts facts and creates vectors |
| **Batch sync from CRM/DB** | `memory.memorizeBatch()` | Multiple records with per-property `extractMemories` control |
| **Structured data, no AI needed** | `memory.memorizeBatch()` with `extractMemories: false` | Store exact key-value pairs (email, plan_tier, login_count) without AI overhead |

### The `extractMemories` Decision

`extractMemories` defaults to **`false`**. You **must** set `extractMemories: true` on rich text fields to enable AI extraction and semantic search. Without it, batch-synced data is stored as structured properties only — no memories, no vector embeddings, no semantic recall.

| Data Type | `extractMemories` | Reasoning |
|---|---|---|
| **Rich text** (notes, transcripts, emails, descriptions) | **`true`** (must set explicitly) | AI extracts facts, creates vector embeddings for semantic search |
| **Generated content** (AI outputs you want to remember) | **`true`** (must set explicitly) | Enables the feedback loop — AI knows what it already said |
| **ML outputs with explanations** (churn reason, lead score rationale) | **`true`** (must set explicitly) | The explanation text benefits from extraction |
| **Structured facts** (email, name, plan, dates, counts) | `false` (default) | Already structured — AI extraction wastes tokens and adds latency |
| **Binary flags, IDs, URLs** | `false` (default) | No semantic content to extract |

> **Rule of thumb:** Always set `extractMemories: true` on any field containing free-form text. If you skip it, those fields get stored as properties but produce zero memories — `smartRecall()` and `smartDigest()` won't find them.

### Quick Example

```typescript
// Single item — AI extraction with identity hints
await client.memory.memorize({
    content: 'Also extract First Name, Last Name, Company Name, and Job Title if mentioned.\n\nCall with Sarah Chen (VP Eng, Initech). She mentioned they are evaluating SOC2 compliance tools. Main pain point: manual audit prep taking 2 weeks per quarter. Budget approved for Q2.',
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
// ⚠️ memorizeBatch() is async — records land in ~1-2 minutes (EventBridge → Lambda).
// Verify with search() or smartDigest() after processing completes.
```

### Intelligence Tiers (memorize + batch-memorize)

`memorize()` and `memorizeBatch()` accept a `tier` param that selects the LLM pipeline and credit rate. Defaults to `pro` — no breaking change for existing callers.

Available tiers: `basic`, `pro` (default), `pro_fast`, `ultra`. For current rates, see [personize.ai](https://personize.ai).

Tiers also control `maxProperties` (15–50), `chunkMaxWords` (2000–4000), and `minPropertyScore` (0.2–0.4). Model fallback is automatic — if the primary model fails, the system routes to the fallback.

```typescript
await client.memory.memorize({
    content: '...',
    email: 'user@co.com',
    enhanced: true,
    tier: 'basic',       // or 'pro' (default), 'pro_fast', 'ultra'
});

await client.memory.memorizeBatch({
    source: 'HubSpot',
    mapping: { ... },
    rows: contacts,
    tier: 'pro_fast',    // fast LLMs, lower latency
});
```

> **Note:** These are **memorize intelligence tiers** — they control the extraction pipeline. For content **generation** via `client.ai.prompt()`, see the separate generate tiers below.

### Generate Tiers (`prompt`)

`client.ai.prompt()` has its own tier system for content generation, separate from memorize tiers. Available tiers: `basic`, `pro` (default), `ultra`. For current rates, see [personize.ai](https://personize.ai).

Pass `tier` to select a curated model (default). Custom `model` and `provider` require BYOK (`openrouterApiKey`) — without it, the API returns 400.

---

### Constraints

> Keywords follow [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119): **MUST** = non-negotiable, **SHOULD** = strong default (override with stated reasoning), **MAY** = agent discretion.

1. **MUST** include at least one tag on every `memorize()` call (e.g. `tags: ['source:hubspot', 'type:interaction', 'team:sales']`) -- because tags serve two purposes: (a) filtering, attribution, and workspace scoping, and (b) **property selection boosting** — tags that match a property definition's own `tags` array give that property a +15% score boost during extraction, making extraction context-aware. For example, `tags: ["qualification"]` boosts properties tagged `["qualification"]` like Decision Maker or Budget.
2. **SHOULD** include a timestamp in the `content` or use the `timestamp` parameter -- because temporal ordering lets recall distinguish recent facts from stale ones.
3. **MUST NOT** pre-process content with an LLM before calling `memorize()` with `enhanced: true` -- because double-processing wastes tokens and the extraction pipeline is optimized for raw input.
4. **MUST NOT** manually deduplicate before memorizing -- because the platform deduplicates at cosine 0.92 similarity and runs background consolidation; client-side dedup adds complexity with no benefit.
5. **SHOULD** memorize generated outputs (emails, notifications, reports) after delivery -- because the feedback loop lets future recalls see what was already sent, preventing repetition.
6. **SHOULD** use `client.collections.create/update/delete()` or the web app for schema changes -- because collections define the extraction schema and ad-hoc creation risks inconsistency.
7. **MUST** call `client.me()` before batch operations to read plan rate limits -- because exceeding limits causes 429 errors and partial syncs with no automatic resume.
8. **SHOULD** prepend extraction hints for identity/demographic fields (name, company, title, location) when those fields may be empty for the record -- because the property selector uses embedding similarity, and generic identity fields score low against specific content; hints ensure they are selected alongside the content-relevant properties without limiting the selector. See `reference/memorize.md` → "Extraction Hints" for the full pattern.

> **Full guide:** Read `reference/memorize.md` for complete method signatures, data mapping patterns, all source-specific recipes (CRM, database, webhook, CSV), batch strategies, error handling, and the feedback loop.

### CRM / Database Sync

For production-grade data sync from CRMs and databases (Salesforce, HubSpot, Postgres), this skill includes source-specific connector templates and deployment configs:

- **Source templates:** `templates/salesforce.md`, `templates/hubspot.md`, `templates/postgres.md` — fetch patterns, auth setup, field mapping for each source
- **Deployment:** `deploy/Dockerfile`, `deploy/render.yaml`, `deploy/github-action.yml` — scheduled sync on Render, GitHub Actions, or any container platform
- **Advanced patterns:** `reference/sync-advanced-patterns.md` — incremental sync with state tracking, multi-source architecture, batch export with pagination, complete end-to-end example

The integration pattern: initialize project → `client.me()` for auth + limits → fetch rows from source → `client.collections.list()` for collection IDs → build property mapping → `memorizeBatch()` in chunks with 429 retry → verify with `search()` or `smartDigest()`. See `recipes/data-sync.ts` for a runnable example.

---

## Action: RECALL

Retrieve data from Personize memory. The right method depends on what kind of answer you need.

### Which Method to Use

| Need | Method | Returns |
|---|---|---|
| **"What do we know about X topic?"** | `memory.smartRecall()` | Semantic search results with optional reflection/answers (recommended) |
| **"Quick deterministic lookup, no AI"** | `memory.recall()` | Direct DynamoDB lookup (`type` required, no vector search, no reflection) |
| **"Give me everything about this person/company"** | `memory.smartDigest()` | Compiled markdown context — all properties + memories for one entity |
| **"List all contacts matching criteria X"** | `memory.search()` | Filtered records with property values |
| **"What are our guidelines for X?"** | `ai.smartGuidelines()` | Governance variables matching a topic |

> **`smartRecall()` vs `recall()`**: Use `smartRecall()` for most use cases — it supports reflection, answer generation, `mode`, and infers `type` from email/website_url. Use `recall()` only for simple direct lookups — `type` is **required** (e.g. `type: 'Contact'`).

> **Identifier behavior** — how `email`, `websiteUrl`, `recordId`, `type`-only, and no identifier affect each endpoint (error vs empty vs org-wide search) → read `reference/identifier-scenarios.md`.

### When to Use What

```
Need specific facts about a topic?         → smartRecall()
Need full context about ONE entity?         → smartDigest()
Need to filter/segment a list of records?   → search()
Need organizational rules/guidelines?       → smartGuidelines()

Building a generation prompt?               → smartGuidelines() + smartDigest() + smartRecall()
                                              (governance + entity + task-specific facts)
```

### Quick Example

```typescript
// Semantic search — find specific facts (recommended)
const results = await client.memory.smartRecall({
    query: 'what pain points did this contact mention?',
    email: 'sarah.chen@initech.com',
    type: 'Contact',
    limit: 10,
    minScore: 0.4,
    include_property_values: true,
});

// Fast recall — skip reflection, ~500ms response
const fast = await client.memory.smartRecall({
    query: 'what do we know about this contact?',
    email: 'sarah.chen@initech.com',
    type: 'Contact',
    mode: 'fast',
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
const exported = await client.memory.search({
    type: 'Contact',
    returnRecords: true,
    pageSize: 50,
    groups: [{
        conditions: [
            { property: 'plan_tier', operator: 'EQ', value: 'enterprise' },
            { property: 'email', operator: 'IS_SET' },
        ],
    }],
});

// --- Advanced search patterns ---

// Key-only lookup: find by CRM key without property conditions
const byEmail = await client.memory.search({
    email: 'sarah@acme.com',
    returnRecords: true,
});

// Custom key lookup
const student = await client.memory.search({
    type: 'Student',
    customKeyName: 'studentNumber',
    customKeyValue: 'S-2024-1234',
    returnRecords: true,
});

// Secondary key: find Students by email (even though primary key is studentNumber)
const studentByEmail = await client.memory.search({
    type: 'Student',
    email: 'alice@university.edu',
    returnRecords: true,
});

// Cross-type: find ALL records with this email across ALL entity types
const allTypes = await client.memory.search({
    email: 'john@acme.com',
    returnRecords: true,
});
// Returns Contacts, Students, Employees — whatever has this email
```

### Advanced Search: Key-Only, Secondary Key, and Cross-Type

`search()` supports three advanced patterns beyond property filtering:

| Pattern | Description | Example |
|---|---|---|
| **Key-only lookup** | Pass `email`, `websiteUrl`, `recordId`, or `customKeyName`/`customKeyValue` without `groups` | `search({ email: '...' })` |
| **Secondary key** | Search by a CRM key that isn't the record's primary key | `search({ type: 'Student', email: '...' })` where primary key is `studentNumber` |
| **Cross-type** | Omit `type` to search across all entity types | `search({ email: '...' })` → returns Contact + Student + Employee |

**When you don't have the primary key** but have a stored property value (like a LinkedIn URL), use a property condition filter instead:
```typescript
const byLinkedIn = await client.memory.search({
    type: 'Contact',
    returnRecords: true,
    groups: [{ conditions: [{ property: 'linkedin_url', operator: 'EQ', value: 'https://linkedin.com/in/johndoe' }] }],
});
```

> **Full reference:** See `reference/recall.md` → "Advanced Search Patterns" for all patterns, trade-offs, and when-to-use guidance.

### The Three-Layer Agent Operating Model

Memory is one of three layers every agent should assemble before acting: **Guidelines** (organizational rules via `smartGuidelines()`), **Memory** (entity knowledge via `smartDigest()`/`recall()`), and **Workspace** (coordination state via workspace-tagged `recall()`/`memorize()`). All three together: the agent acts within governance, with full context, in coordination with others.

> **Full architecture guide:** See the `collaboration` skill's `reference/architecture.md` for the complete three-layer model, composition patterns, and adoption path.

### Cross-Entity Context

Memory gives you everything about ONE entity. But agents often need context from related entities — the company a contact works at, other contacts at the same account, related deals or projects.

**Pattern: Multi-entity context assembly**

```typescript
// When working on a contact, also pull their company context
const [contactDigest, companyDigest] = await Promise.all([
    client.memory.smartDigest({ email: 'sarah@acme.com', type: 'Contact', token_budget: 1500 }),
    client.memory.smartDigest({ website_url: 'https://acme.com', type: 'Company', token_budget: 1000 }),
]);
// Now you know Sarah AND you know Acme — funding stage, tech stack, team size, etc.
```

**When to pull cross-entity context:**
- Working on a contact → also pull their company
- Working on a deal → also pull the contact AND the company
- Generating account-level content → pull all contacts at that company
- Detecting patterns → export across entity types and cross-reference

### The Context Assembly Pattern

Most generation pipelines combine multiple recall methods:

```typescript
async function assembleContext(email: string, task: string): Promise<string> {
    const sections: string[] = [];

    // 1. Governance — rules and guidelines
    // Use mode: 'fast' for real-time agents (~200ms), 'full' for deep analysis (~3s)
    const governance = await client.ai.smartGuidelines({
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
    const recalled = await client.memory.smartRecall({
        query: task,
        email,
        type: 'Contact',
        mode: 'fast',
        limit: 10,
        minScore: 0.3,
    });
    if (recalled.data?.results && Array.isArray(recalled.data.results) && recalled.data.results.length > 0) {
        sections.push('## Relevant Facts\n' + recalled.data.results.map((m: any) =>
            `- ${m.text || m.content || JSON.stringify(m)}`
        ).join('\n'));
    }

    return sections.join('\n\n---\n\n');
}
```

**New:** Add `groupByRecord: true` to group results by record instead of a flat list. Returns `recordGroups` array with `topScore`, `matchCount`, and top 3 matches per record. No extra cost.

### Recall Pricing

All read operations charge a flat per-call rate regardless of mode (`'fast'`, `'deep'`, etc.). Mode choice affects latency and depth, not cost. For current rates, see [personize.ai](https://personize.ai).

Use `mode: 'fast'` in loops and batch pipelines to minimize latency.

---

### Constraints

> Keywords follow [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119): **MUST** = non-negotiable, **SHOULD** = strong default (override with stated reasoning), **MAY** = agent discretion.

1. **MUST** set an explicit `token_budget` on every `smartDigest()` call -- because the default (1000) may truncate critical context for deep personalization or waste tokens for simple lookups.
2. **SHOULD** set `minScore` on `smartRecall()` (0.3 for broad context, 0.5+ for precision) -- because omitting it returns low-relevance noise that dilutes the context window.
3. **SHOULD** use `mode: 'fast'` for context injection, real-time UIs, and batch processing -- because it cuts recall latency from ~10-20s to ~500ms; override for exploratory queries where reflection adds value.
4. **SHOULD** assemble context from all three layers (`smartGuidelines` + `smartDigest` + `smartRecall`) before generating -- because single-source context produces governance-blind, entity-ignorant, or task-irrelevant output. Use `mode: 'fast'` for real-time agent flows (~200ms), `mode: 'deep'` for first-call or complex planning tasks (~3s). (Note: `'full'` was renamed to `'deep'` in SDK types and API.)
5. **MAY** set `include_property_values: true` on `smartRecall()` -- because it returns structured properties alongside semantic results, useful when the caller needs both.
6. **MUST** paginate `export()` calls using `page` and `pageSize` -- because unbounded exports can time out or exceed memory limits on large datasets. Default pageSize is 50.
7. **MAY** cache `smartDigest()` results within a single pipeline run when the same entity is referenced multiple times -- because redundant API calls waste tokens and add latency.

> **Full guide:** Read `reference/recall.md` for complete method signatures, query writing strategies, token budget tuning, scoring thresholds, all context assembly patterns, export filtering, and performance optimization.

---

## Action: CRUD Operations (Update, Delete, History)

Use these operations when the developer needs to directly modify, delete, or query history for memory data — as opposed to AI-powered memorization.

### When to use CRUD vs Memorize

| Need | Use |
|------|-----|
| Store new data from text/conversations | `memorize` (AI extraction) |
| Directly set a property value | `update` (CRUD) |
| Change multiple properties at once | `bulk-update` (CRUD) |
| Edit a freeform memory's text | `update` with `memoryId` + `text` |
| See how a property changed over time | `property-history` |
| Find records matching a condition | `query-properties` (LLM-powered) |
| Delete with recovery option | `delete` / `delete-record` (soft-delete, 30-day recovery) |
| Undo a deletion | `cancel-deletion` |

### Public API Endpoints (`/api/v1/memory/...`)

All require `sk_live_` API key.

| Endpoint | Description |
|----------|-------------|
| `POST /memory/update` | Update single property or freeform memory |
| `POST /memory/bulk-update` | Update multiple properties |
| `POST /memory/delete` | Soft-delete memories |
| `POST /memory/delete-record` | Soft-delete all memories for a record |
| `POST /memory/cancel-deletion` | Cancel pending deletion (30-day window) |
| `POST /memory/property-history` | Query property change history |
| `POST /memory/query-properties` | LLM-powered structured search |
| `POST /memory/filter-by-property` | Deterministic property filter (no LLM, no token cost) |

### Conditional Writes (Optimistic Concurrency)

Pass `expectedVersion` on update/bulk-update to prevent concurrent overwrites:

```typescript
await client.memory.update({
  recordId: 'rec-123',
  propertyName: 'deal_stage',
  propertyValue: 'negotiation',
  expectedVersion: 12,  // 409 if another write happened since you last read
});
```

### Array Operations

Mutate array-typed properties without read-modify-write races:

```typescript
// Push items (with dedup)
await client.memory.update({
  recordId, propertyName: 'tags',
  arrayPush: { items: ['vip'], unique: true },
});

// Remove items by value
await client.memory.update({
  recordId, propertyName: 'tags',
  arrayRemove: { items: ['trial'] },
});

// Patch matching objects in-place
await client.memory.update({
  recordId, propertyName: 'tasks',
  arrayPatch: { match: { taskId: 'abc' }, set: { status: 'done' } },
});
```

### Filter By Property (No LLM)

Deterministic structured filter — no tokens, no latency:

```typescript
const result = await client.memory.filterByProperty({
  conditions: [
    { propertyName: 'status', operator: 'equals', value: 'active' },
    { propertyName: 'score', operator: 'gt', value: 50 },
  ],
  logic: 'AND',
  limit: 100,
});
// result.data.records → [{ recordId, type, matchedProperties, lastUpdatedAt }]
// result.data.totalMatched, result.data.nextToken
```

Operators: `equals`, `notEquals`, `contains`, `gt`, `lt`, `gte`, `lte`, `exists`, `isEmpty`

### Update Example

```typescript
// Update a single property
const result = await client.memory.update({
  recordId: 'rec-123',
  type: 'contact',
  propertyName: 'company_name',
  propertyValue: 'Acme Corp',
});
// result.data → { previousValue, newValue, version, stores }
```

### Bulk Update

```typescript
const result = await client.memory.bulkUpdate({
  recordId: 'rec-123',
  type: 'contact',
  updates: [
    { propertyName: 'company_name', propertyValue: 'Acme Corp' },
    { propertyName: 'deal_stage', propertyValue: 'closed_won' },
  ],
  expectedVersion: 5,  // optional concurrency guard
});
// result.data.results → [{ propertyName, previousValue, newValue, status }]
```

### Property History

```typescript
const history = await client.memory.propertyHistory({
  recordId: 'rec-123',
  propertyName: 'deal_stage',  // optional — omit for all properties
  limit: 20,
});
// history.data.entries → [{ entryId, propertyName, propertyValue, updatedBy, createdAt, source }]
```

### Query Properties (LLM-powered)

```typescript
const matches = await client.memory.queryProperties({
  propertyName: 'pain_points',
  query: 'concerns about compliance or security',
  type: 'Contact',
  limit: 50,
});
// matches.data.matches → [{ recordId, propertyValue, matchReason }]
```

### Delete with Recovery

All deletes are soft-deletes with a 30-day recovery window. During this window, `cancelDeletion` restores the data.

```typescript
// Soft-delete a record
await client.memory.deleteRecord({
  recordId: 'rec-123',
  type: 'contact',
});

// Undo within 30 days
await client.memory.cancelDeletion({
  recordId: 'rec-123',
  type: 'contact',
});
```

### Webhook Events

All mutations fire webhook events: `memory.property.updated`, `memory.properties.bulk_updated`, `memory.updated`, `memory.deleted`, `memory.record.deleted`, `memory.record.deletion_cancelled`.

---

## Action: FIND SIMILAR RECORDS

**When to use:** User wants to find lookalikes, related records, "find more like this", or records connected through shared properties/memories.

**SDK:** `client.memory.similar({ seed: { email }, dimensions, topK })`
**MCP:** `memory_find_similar`
**CLI:** `personize memory similar --email <email>`

**Key parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| seed | object | required | Record identifier: { email?, recordId?, websiteUrl? } |
| dimensions | string | "hybrid" | properties, memories, hybrid, or connections |
| topK | number | 25 | Max results (max 500) |
| minScore | number | 0.3 | Min similarity threshold |
| returnAllIds | boolean | false | Batch mode: flat list for downstream processing |
| rankingMode | string | "balanced" | balanced (+0.08 bonus for multi-dim) or weighted |

**Tiers:** very_similar (>=0.75), similar (>=0.5), somewhat_similar (>=0.3)

**Example:**
```typescript
// Find 10 records most similar to john@acme.com
const result = await client.memory.similar({
    seed: { email: 'john@acme.com' },
    topK: 10,
    dimensions: 'hybrid',
});
// result.data.results[0].recordId, .score, .tier, .matchBreakdown
// result.data.tiers.very_similar = ['REC#...', ...]
```

**Cost:** 1 credit per request.

See `reference/similar.md` for full parameter and response reference.

---

## Action: SEGMENT AUDIENCE

**When to use:** User wants to bucket, tier, or segment records relative to a seed record or text description.

**SDK:** `client.memory.segment({ seed: { email } | { text }, maxPerTier })`
**MCP:** `memory_segment`
**CLI:** `personize memory segment --email <email>` or `--text "description"`

**Key parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| seed | object | required | Record identifier OR { text: "description" } |
| dimensions | string | "hybrid" | properties, memories, or hybrid |
| maxPerTier | number | 50 | RecordIds per tier page (max 500) |
| returnTier | string | - | Fetch single tier only |
| tierOffset | number | 0 | Pagination within tiers |

**Example:**
```typescript
// Segment all records relative to an ICP description
const result = await client.memory.segment({
    seed: { text: 'Enterprise SaaS CTO interested in AI automation' },
    maxPerTier: 20,
});
// result.data.tiers.very_similar.recordIds = ['REC#...', ...]
// result.data.tiers.very_similar.count = 12
// result.data.tiers.not_similar.approximate = true
```

**Cost:** 2 credits per request.

See `reference/segment.md` for full parameter and response reference.

---

## SDK Method Reference

```typescript
import { Personize } from '@personize/sdk';
const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
```

### Memorize Methods

| Method | Endpoint | Purpose |
|---|---|---|
| `memory.memorize(opts)` | `POST /api/v1/memorize` | Store single item with AI extraction |
| `memory.memorizeBatch(opts)` | `POST /api/v1/batch-memorize` | Batch sync with per-property `extractMemories` control |

### Recall Methods

| Method | Endpoint | Purpose |
|---|---|---|
| `memory.smartRecall(opts)` | `POST /api/v1/smart-recall` | Semantic search with reflection + answer gen (recommended) |
| `memory.recall(opts)` | `POST /api/v1/recall` | Direct DynamoDB lookup — properties + freeform memories (`type` required, no AI) |
| `memory.smartDigest(opts)` | `POST /api/v1/smart-memory-digest` | Compiled entity context (properties + memories) |
| `memory.search(opts)` | `POST /api/v1/search` | Filter and export records |
| `ai.smartGuidelines(opts)` | `POST /api/v1/ai/smart-guidelines` | Fetch governance variables by topic |

### Similarity Methods

| Method | Endpoint | Purpose |
|---|---|---|
| `memory.similar(opts)` | `POST /api/v1/similar` | Find records similar to a seed record |
| `memory.segment(opts)` | `POST /api/v1/segment` | Bucket all records into similarity tiers |

### CRUD Methods

| Method | Endpoint | Purpose |
|---|---|---|
| `memory.update(opts)` | `POST /api/v1/memory/update` | Update single property or freeform memory. Supports `expectedVersion` + array ops |
| `memory.bulkUpdate(opts)` | `POST /api/v1/memory/bulk-update` | Update multiple properties on a record |
| `memory.delete(opts)` | `POST /api/v1/memory/delete` | Soft-delete memories (30-day recovery) |
| `memory.deleteRecord(opts)` | `POST /api/v1/memory/delete-record` | Soft-delete all memories for a record |
| `memory.cancelDeletion(opts)` | `POST /api/v1/memory/cancel-deletion` | Cancel pending deletion within 30-day window |
| `memory.propertyHistory(opts)` | `POST /api/v1/memory/property-history` | Query property change history |
| `memory.queryProperties(opts)` | `POST /api/v1/memory/query-properties` | LLM-powered structured search across property values |
| `memory.filterByProperty(opts)` | `POST /api/v1/memory/filter-by-property` | Deterministic property filter (no LLM, no token cost) |

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

// smartRecall() — semantic search (recommended)
interface SmartRecallOptions {
    query: string;             // Natural language query
    limit?: number;            // Max results (default: 10)
    minScore?: number;         // Minimum relevance score (0-1)
    email?: string;            // Scope to one contact
    website_url?: string;      // Scope to one company
    record_id?: string;        // Scope to one record
    type?: string;             // Entity type filter (optional — inferred from email/website_url)
    include_property_values?: boolean; // Include structured properties
    enable_reflection?: boolean;       // AI reflects on results
    generate_answer?: boolean;         // AI generates a direct answer
    mode?: 'fast' | 'deep';    // 'fast' skips reflection + answer gen, ~500ms; 'deep' enables full reflection (default: 'deep')
    min_score?: number;        // Server-side score filter (in fast mode, defaults to 0.3)
}

// recall() — direct lookup (simpler, type required)
interface RecallOptions {
    query: string;             // Natural language query
    type: string;              // Entity type — REQUIRED (e.g. 'Contact', 'Company')
    record_id?: string;        // Scope to one record
    email?: string;            // Scope to one contact
    website_url?: string;      // Scope to one company
    filters?: Record<string, unknown>; // Additional filters
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
│     search() filters           smartRecall() searches        │
│     memorize() writes          memorizeBatch() writes       │
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
| `reference/crud-operations.md` | CRUD operations: update, bulk-update, delete, cancel-deletion, property-history, query-properties, filter-by-property — request/response shapes, error codes |
| `reference/identifier-scenarios.md` | How each endpoint (memorize, recall, smartRecall, smartDigest) behaves with email, websiteUrl, recordId, type-only, or no identifier — scenarios A–G with error vs empty vs success table |
| `reference/similar.md` | Find Similar Records: full parameter reference, response shapes, tiers, cross-type similarity, billing |
| `reference/segment.md` | Segment Audience: full parameter reference, text-based seeds, tier response shapes, pagination, billing |
| `recipes/data-sync.ts` | Batch sync from CRM/database with validation and error handling |
| `recipes/context-assembly.ts` | Complete context assembly pattern combining all recall methods |

---

## Signal Memorization Patterns

**[@personize/signal](../../signal/)** uses entity memory for its feedback loop and deferred notification pipeline. Understanding these patterns helps when debugging Signal behavior or building custom integrations.

### Tag Conventions

| Tag | Written by | Purpose |
|---|---|---|
| `signal:sent` | Engine (step 8) | Tracks delivered notifications — recalled during context assembly to prevent repetition |
| `signal:deferred` | Engine (step 5) | Marks notifications scored 40-60 for later digest compilation |
| `signal:pending-digest` | Engine (step 5) | Paired with `signal:deferred` — digest builder queries these |
| `signal:digest` | DigestBuilder | Marks compiled digest notifications |
| `workspace:updates` | Engine (step 7) | Workspace entries created on SEND |
| `workspace:tasks` | Engine (step 7) | Workspace entries created on DEFER |

### Feedback Loop

After every SEND decision, Signal memorizes what was sent:

```typescript
await client.memory.memorize({
    content: `[SIGNAL] Sent "${subject}" via ${channel} (score: ${score}). ${reasoning}`,
    email,
    enhanced: true,
    tags: ['signal:sent', `signal:channel:${channel}`, `signal:type:${eventType}`],
});
```

On the **next evaluation** for the same entity, the engine recalls recent `signal:sent` memories (step 3, 4th parallel call). The AI sees what was recently sent and can SKIP to avoid repetition — even if the pre-check dedup window has expired.

### Deferred → Digest Pipeline

1. **Defer** (score 40-60): `memorize()` with tags `['signal:deferred', 'signal:pending-digest', eventType]`
2. **Digest build**: `smartRecall({ query: 'deferred notifications', tags: ['signal:deferred'] })` retrieves pending items
3. **Compile**: `prompt()` generates a personalized digest from all deferred items + entity context
4. **Deliver**: Channel sends the compiled digest
5. **Mark processed**: `memorize()` with tag `signal:digest` — future digest builds skip already-compiled items

### Querying Signal History

```typescript
// What notifications has Signal sent to this contact?
const sent = await client.memory.smartRecall({
    query: 'notifications sent by signal',
    email: 'jane@acme.com',
    type: 'Contact',
    mode: 'fast',
    limit: 10,
});

// What's pending in the digest queue?
const pending = await client.memory.smartRecall({
    query: 'deferred notifications pending digest',
    email: 'jane@acme.com',
    type: 'Contact',
    mode: 'fast',
    limit: 20,
});
```
