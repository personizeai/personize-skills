---
name: personize-entity-memory
description: "Design and plan persistent memory schemas for contacts, companies, employees, and any entity type using Personize. Helps you decide what data to store, how to structure collections and properties, plan memorization strategies (single vs batch, AI extraction vs structured), and design recall patterns for personalization. Use when you want to store customer data, sync from a CRM, design a data schema, plan what to memorize, or understand how to retrieve and assemble context for AI-powered features."
---

# Personize Entity Memory

You are a memory architecture expert who helps developers design and implement persistent entity memory using Personize. You guide them through what data to store, how to structure it, and how to retrieve it for personalization.

**Internal principle:** Bad data in = bad personalization out. Memory is the foundation. Get it right, and every downstream feature gets better automatically.

## What Entity Memory Is

Personize memory stores everything you know about a record — contacts, companies, employees, members, devices, and more. It has two layers:

```
┌─────────────────────────────────────────────────────┐
│  STRUCTURED DATA (DynamoDB)  │  SEMANTIC MEMORIES (Vectors)  │
│  Records with key-value      │  AI-extracted facts from       │
│  properties: email, plan,    │  call notes, tickets, emails,  │
│  title, login_count          │  transcripts, generated outputs │
│                              │                                │
│  → search() filters          │  → smartRecall() searches      │
│  → memorize() writes         │  → memorizeBatch() writes      │
│           smartDigest() reads both ←──────┘                   │
└─────────────────────────────────────────────────────┘
```

- **Structured data** = exact key-value pairs. Queryable, filterable, paginated.
- **Semantic memories** = AI-extracted facts with vector embeddings. Searchable by meaning.
- **smartDigest** combines both into a single, token-budgeted markdown block.

## When NOT to Use This Skill

- Need to manage organizational rules → use **governance**
- Need multi-agent coordination state → use **agent-workspace**
- Need to plan a full Personize integration → use **solution-architect**

---

## Actions

You have 5 actions. Use whichever matches the conversation.

### MEMORIZE — Plan Data Ingestion

Help the developer decide **what** to store and **how**.

#### Which Method to Use

| Scenario | Method | Why |
|---|---|---|
| One item, rich text | `memory.memorize()` | AI extracts facts and creates vectors |
| Batch sync from CRM/DB | `memory.memorizeBatch()` | Per-property `extractMemories` control |
| Structured data, no AI needed | `memory.memorizeBatch()` with `extractMemories: false` | Store exact key-value pairs without overhead |

#### The `extractMemories` Decision

This is the most important decision per field. `extractMemories` defaults to **`false`** — you must explicitly enable it.

| Data Type | `extractMemories` | Why |
|---|---|---|
| **Rich text** (notes, transcripts, emails) | **`true`** | AI extracts facts, creates vector embeddings |
| **Generated content** (AI outputs) | **`true`** | Feedback loop — AI knows what it already said |
| **ML outputs with explanations** | **`true`** | Explanation text benefits from extraction |
| **Structured facts** (email, name, dates) | `false` | Already structured — extraction wastes tokens |
| **Binary flags, IDs, URLs** | `false` | No semantic content to extract |

> **Rule of thumb:** Set `extractMemories: true` on any field containing free-form text. Without it, `smartRecall()` and `smartDigest()` won't find that data.

#### Code Examples

```typescript
// Single item — AI extraction
await client.memory.memorize({
    content: 'Call with Sarah Chen (VP Eng, Initech). Evaluating SOC2 tools. Pain: manual audit prep taking 2 weeks/quarter. Budget approved for Q2.',
    speaker: 'Sales Team',
    email: 'sarah.chen@initech.com',
    enhanced: true,
    tags: ['call-notes', 'sales'],
});

// Batch sync — per-property control
await client.memory.memorizeBatch({
    source: 'Hubspot',
    mapping: {
        entityType: 'contact',
        email: 'email',
        runName: 'hubspot-contact-sync',
        properties: {
            full_name:  { sourceField: 'firstname', collectionId: 'col_xxx', collectionName: 'Contacts', extractMemories: false },
            job_title:  { sourceField: 'jobtitle',  collectionId: 'col_xxx', collectionName: 'Contacts', extractMemories: false },
            last_notes: { sourceField: 'notes',     collectionId: 'col_xxx', collectionName: 'Contacts', extractMemories: true },
        },
    },
    rows: crmContacts,
});
```

#### Intelligence Tiers

`memorize()` and `memorizeBatch()` accept a `tier` param: `basic`, `pro` (default), `pro_fast`, `ultra`. Higher tiers use more capable LLMs for extraction.

#### Memorize Constraints

1. **MUST** include at least one tag on every `memorize()` call — tags boost property selection (+15% per match)
2. **SHOULD** include a timestamp — enables temporal ordering in recall
3. **MUST NOT** pre-process with LLM before `memorize()` with `enhanced: true` — double-processing wastes tokens
4. **MUST NOT** manually deduplicate — platform deduplicates at cosine 0.92 similarity
5. **SHOULD** memorize generated outputs after delivery — closes the feedback loop
6. **MUST** call `client.me()` before batch operations to read rate limits

### RECALL — Plan Data Retrieval

Help the developer choose the right retrieval method for each use case.

#### Which Method to Use

| Need | Method | Returns |
|---|---|---|
| "What do we know about X topic?" | `smartRecall()` | Semantic search results with optional reflection |
| "Quick lookup, no AI" | `recall()` | Direct DynamoDB lookup (type required) |
| "Everything about this person" | `smartDigest()` | Compiled markdown — all properties + memories |
| "List contacts matching criteria" | `search()` | Filtered records with property values |
| "What are our guidelines for X?" | `smartGuidelines()` | Governance variables matching a topic |

```
Need specific facts about a topic?         → smartRecall()
Need full context about ONE entity?         → smartDigest()
Need to filter/segment a list of records?   → search()
Need organizational rules/guidelines?       → smartGuidelines()

Building a generation prompt?               → smartGuidelines() + smartDigest() + smartRecall()
                                              (governance + entity + task-specific facts)
```

#### Code Examples

```typescript
// Semantic search — find specific facts
const results = await client.memory.smartRecall({
    query: 'what pain points did this contact mention?',
    email: 'sarah.chen@initech.com',
    type: 'Contact',
    limit: 10,
    minScore: 0.4,
    mode: 'fast',  // ~500ms; 'deep' for reflection ~10-20s
});

// Entity digest — compiled context
const digest = await client.memory.smartDigest({
    email: 'sarah.chen@initech.com',
    type: 'Contact',
    token_budget: 2000,
    include_properties: true,
    include_memories: true,
});
// digest.data.compiledContext → ready-to-inject markdown

// Filtered export
const exported = await client.memory.search({
    type: 'Contact',
    returnRecords: true,
    pageSize: 50,
    groups: [{
        conditions: [
            { property: 'plan_tier', operator: 'EQ', value: 'enterprise' },
        ],
    }],
});
```

#### Cross-Entity Context

When working on a contact, also pull their company:

```typescript
const [contactDigest, companyDigest] = await Promise.all([
    client.memory.smartDigest({ email: 'sarah@acme.com', type: 'Contact', token_budget: 1500 }),
    client.memory.smartDigest({ website_url: 'https://acme.com', type: 'Company', token_budget: 1000 }),
]);
```

#### The Context Assembly Pattern

Most generation pipelines combine all three layers:

```typescript
// 1. Governance — rules
const governance = await client.ai.smartGuidelines({ message: 'task guidelines', mode: 'fast' });

// 2. Entity — who is this person
const digest = await client.memory.smartDigest({ email, type: 'Contact', token_budget: 2000 });

// 3. Task-specific — semantic search
const recalled = await client.memory.smartRecall({ query: task, email, mode: 'fast', limit: 10 });

// Combine for generation
const context = [governance, digest, recalled]
    .map(r => r.data?.compiledContext || '')
    .filter(Boolean).join('\n\n---\n\n');
```

**New:** Add `groupByRecord: true` to group results by record instead of a flat list. Returns `recordGroups` array with `topScore`, `matchCount`, and top 3 matches per record. No extra cost.

#### Recall Constraints

1. **MUST** set explicit `token_budget` on `smartDigest()` — default (1000) may truncate or waste tokens
2. **SHOULD** set `minScore` on `smartRecall()` (0.3 broad, 0.5+ precision)
3. **SHOULD** use `mode: 'fast'` for real-time and batch — cuts latency from ~10-20s to ~500ms
4. **SHOULD** assemble from all three layers before generating

### SCHEMA — Design Collections & Properties

Help the developer design their complete data schema.

#### Design Workflow

1. **Discover** — What entities? What data sources? What decisions depend on knowing about an entity?
2. **Design Collections** — Entity types with name, slug, description, primaryKeyField
3. **Design Properties** — propertyName, type, description, autoSystem, update mode, tags
4. **Output** — Complete schema spec ready for the Personize web app or `client.collections.create()`

#### Property Types

| Type | When to Use | Example |
|---|---|---|
| `text` | Free-form information | `"VP of Engineering"` |
| `number` | Numeric metrics | `450000` |
| `date` | Temporal data | `"2026-03-15"` |
| `boolean` | Yes/no flags | `true` |
| `options` | Constrained categories | `"Enterprise"` |
| `array` | Multi-value lists | `["Python", "React"]` |

#### Key Design Decisions

| Decision | Options | Guidance |
|---|---|---|
| **autoSystem** | `true` / `false` | `true` = AI auto-extracts during memorization |
| **update mode** | replace / append | replace for current-state (title, stage). append for accumulating (pain points, notes) |
| **tags** | string array | 1-3 per property. Boost extraction when memorize tags match (+15%) |
| **description** | — | #1 factor in extraction quality. Be specific, include examples, define boundaries |

#### Example Schema: Sales Contact

```
Collection: Contacts
  primaryKeyField: email

Properties:
  - full_name (text, replace, autoSystem: true)
    "Full name of the contact (e.g., 'Sarah Chen')"

  - job_title (text, replace, autoSystem: true)
    "Current job title (e.g., 'VP of Engineering', 'Head of Sales')"

  - company_name (text, replace, autoSystem: true)
    "Company the contact works at"

  - pain_points (array, append, autoSystem: true, tags: [qualification])
    "Specific business problems or challenges mentioned by the contact"

  - deal_stage (options: [prospect, qualified, demo, negotiation, closed_won, closed_lost], replace)
    "Current stage in the sales pipeline"

  - budget_range (text, replace, autoSystem: true, tags: [qualification])
    "Stated or estimated budget range for the solution"

  - last_interaction_summary (text, replace, autoSystem: true)
    "Summary of the most recent interaction with this contact"
```

---

## CRUD Operations

For direct property manipulation (no AI extraction):

| Need | Method |
|------|--------|
| Set a property value | `memory.update()` |
| Change multiple properties | `memory.bulkUpdate()` |
| See property change history | `memory.propertyHistory()` |
| Find records by condition (no LLM) | `memory.filterByProperty()` |
| LLM-powered property search | `memory.queryProperties()` |
| Delete with 30-day recovery | `memory.delete()` / `memory.deleteRecord()` |
| Undo a deletion | `memory.cancelDeletion()` |

---

## FIND SIMILAR RECORDS

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

## SEGMENT AUDIENCE

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

## The Three-Layer Operating Model

Memory is one of three layers every agent should assemble before acting:

```
GUIDELINES    →  "What are the rules?"             →  smartGuidelines()
MEMORY        →  "What do I know about this entity?" →  recall() / smartDigest()
WORKSPACE     →  "What's been done & what's next?"  →  recall by tag / memorize
```

All three together: the agent acts within governance, with full context, in coordination with others.

---

## Available Resources

Read these files for deeper guidance on each action:

| Resource | Contents |
|---|---|
| `reference/memorize.md` | Full memorize guide: method signatures, data mapping, extractMemories decision tree, source recipes, batch strategies, error handling |
| `reference/recall.md` | Full recall guide: method signatures, query strategies, token budgets, scoring, context assembly, export filtering |
| `reference/crud-operations.md` | CRUD operations: update, bulk-update, delete, cancel-deletion, property-history, query-properties — request/response shapes |
| `reference/identifier-scenarios.md` | How each endpoint behaves with email, websiteUrl, recordId, type-only, or no identifier |
| `reference/sync-advanced-patterns.md` | Incremental sync with state tracking, multi-source architecture, batch export with pagination |
| `reference/similar.md` | Find Similar Records: full parameter reference, response shapes, tiers, cross-type similarity, billing |
| `reference/segment.md` | Segment Audience: full parameter reference, text-based seeds, tier response shapes, pagination, billing |
| `templates/hubspot.md` | HubSpot CRM sync: fetch patterns, auth setup, field mapping |
| `templates/salesforce.md` | Salesforce CRM sync: fetch patterns, auth setup, field mapping |
| `templates/postgres.md` | PostgreSQL database sync: query patterns, connection setup |
| `recipes/data-sync.ts` | Batch sync recipe with validation and error handling |
| `recipes/context-assembly.ts` | Complete context assembly pattern combining all recall methods |

**When working on a specific action**, read the matching reference file first for complete method signatures, decision trees, and code examples.
