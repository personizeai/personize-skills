# Reference: Recall

Complete guide to retrieving data from Personize memory — method signatures, query strategies, token budget tuning, scoring thresholds, context assembly patterns, export filtering, and performance optimization.

---

## Method Overview

| Method | Returns | Best For |
|---|---|---|
| `memory.smartRecall()` | Ranked semantic search + optional reflection/answer | "What do we know about X topic?" (recommended) |
| `memory.recall()` | Direct DynamoDB lookup — properties + freeform memories (`type` required) | "Give me all stored data for this record" (no AI, no vector search) |
| `memory.smartDigest()` | Compiled markdown context for one entity | "Give me everything about this person/company" |
| `memory.search()` | Filtered records with property values | "List all contacts matching criteria X" |
| `ai.smartGuidelines()` | Governance variables matching a topic | "What are our guidelines for X?" |

---

## `memory.smartRecall()` — Semantic Search (Recommended)

Searches vector embeddings to find memories matching a natural language query. Returns ranked results with relevance scores. Supports reflection loops for improved coverage, AI-generated answers, and fast mode.

### Full Signature

All identifier parameters accept both camelCase and snake_case (e.g., `recordId` or `record_id`).

```typescript
interface SmartRecallOptions {
    query: string;                     // Natural language query (required)
    limit?: number;                    // Max results (default: 10)
    minScore?: number;                 // Minimum relevance score 0-1 (default: 0)

    // Entity identifiers — pass at least one to scope to a specific entity
    email?: string;                    // Contact email
    record_id?: string;                // Direct record ID (REC#...)
    recordId?: string;                 // camelCase alias for record_id
    website_url?: string;              // Company website URL
    websiteUrl?: string;               // camelCase alias for website_url
    customKeyName?: string;            // Custom key name (e.g. 'studentNumber', 'linkedinUrl')
    customKeyValue?: string;           // Custom key value (e.g. 'S-2024-1234')

    type?: string;                     // Entity type filter (optional — inferred from identifier)

    // Search behavior
    include_property_values?: boolean; // Include structured properties alongside memories
    enable_reflection?: boolean;       // AI reflects on results for deeper insight (default: true)
    max_reflection_rounds?: number;    // Max reflection iterations (default: 2)
    generate_answer?: boolean;         // AI generates a direct answer from results
    mode?: 'fast' | 'deep';            // 'fast' skips reflection + answer gen, ~500ms; 'deep' enables full reflection (default: 'deep')
    min_score?: number;                // Server-side score filter (in fast mode, defaults to 0.3)
    minScore?: number;                 // camelCase alias for min_score

    // Collection scoping
    collectionIds?: string[];          // Scope to specific collection IDs
    collectionNames?: string[];        // Scope to collections by name (resolved server-side)

    filters?: Record<string, unknown>; // Additional metadata filters
}
```

## `memory.recall()` — Direct DynamoDB Lookup (No AI)

Returns all stored data for a record directly from DynamoDB — **no vector search, no AI**. Reads structured properties from the RecordSnapshot table AND freeform memories from the Freeform table.

Use this when you need a complete, deterministic dump of everything stored for a record.

All identifier parameters accept both camelCase and snake_case.

```typescript
interface RecallOptions {
    query: string;                     // Natural language query (required)
    type: string;                      // Entity type — REQUIRED (e.g. 'Contact', 'Company')
    email?: string;                    // Contact email
    record_id?: string;                // Direct record ID (REC#...)
    recordId?: string;                 // camelCase alias for record_id
    website_url?: string;              // Company website URL
    websiteUrl?: string;               // camelCase alias for website_url
    customKeyName?: string;            // Custom key name (e.g. 'studentNumber', 'linkedinUrl')
    customKeyValue?: string;           // Custom key value (e.g. 'S-2024-1234')
    filters?: Record<string, unknown>; // Additional filters
}
```

### Response Shape

```typescript
{
    success: true,
    data: {
        memories: [...],              // Structured properties from DynamoDB Snapshot
        freeformMemories: [...],      // AI-extracted memories from DynamoDB Freeform table
        memoryCount: number,          // Count of structured properties
        freeformMemoryCount: number,  // Count of freeform memories
        recordId: string,
        type: string,
        systemIntro: string,          // Pre-formatted context string
    }
}
```

```typescript
// By custom key — works for any custom entity type
const student = await client.memory.recall({
    query: 'Academic record and enrolled courses',
    type: 'Student',
    customKeyName: 'studentNumber',
    customKeyValue: 'S-2024-1234',
});

// By custom key — LinkedIn URL as identifier
const person = await client.memory.recall({
    query: 'Professional background',
    type: 'Person',
    customKeyName: 'linkedinUrl',
    customKeyValue: 'https://linkedin.com/in/johndoe',
});
```

> **`type` is required** for `recall()`. Omitting it returns a 400 error. If you don't want to specify type, use `smartRecall()` instead — it infers type from email/website_url.
>
> **Key difference from `smartRecall()`**: `recall()` reads directly from DynamoDB (deterministic, fast). `smartRecall()` runs vector similarity search with optional AI reflection (semantic, slower). Use `recall()` for "show me everything about this record". Use `smartRecall()` for "find memories matching this question".

---

### Recency Bias

Use `prefer_recent` to boost recent memories with exponential decay:

```typescript
const result = await client.memory.smartRecall({
  query: "what changed on this contact recently?",
  email: "john@acme.com",
  mode: "deep",
  prefer_recent: true,
  recency_half_life_days: 30, // 30-day half-life
});
```

Default half-life is 90 days. Lower values = more aggressive recency bias:
- 7 days: "what happened this week?"
- 30 days: "what happened this month?"
- 90 days (default): general retrieval with mild recency preference

---

### Entity Scoping: With vs. Without CRM Keys

Every recall method accepts optional CRM keys (`email`, `website_url`, `record_id`) to scope results to a specific entity. Understanding when to use them — and what happens when you don't — is important.

**With CRM keys** (scoped to one entity):
```typescript
// "What pain points did Sarah mention?"
await client.memory.smartRecall({
    query: 'pain points and challenges',
    email: 'sarah.chen@initech.com',
    limit: 10,
});

// Custom entity — scope to a specific Student, Product, Webpage, etc.
await client.memory.smartRecall({
    query: 'What courses is this student taking?',
    type: 'Student',
    customKeyName: 'studentNumber',
    customKeyValue: 'S-2024-1234',
    mode: 'fast',
});
```
- Results come from one record only
- Fast, precise, low noise
- **Recommended for**: personalization, context assembly, entity-specific questions

**Without CRM keys** (org-wide search across all records of a type):
```typescript
// "Which contacts mentioned Kubernetes?"
await client.memory.smartRecall({
    query: 'Kubernetes container orchestration',
    type: 'Contact',
    limit: 20,
    minScore: 0.5,
});

// Search across ALL records of a custom type
await client.memory.smartRecall({
    query: 'Dean\'s List academic achievements',
    type: 'Student',
    limit: 50,
    minScore: 0.4,
});
```
- Searches across ALL memories in the organization
- Each result includes a `record_id` field so you can identify which entity it belongs to
- Results are ranked by semantic similarity, not grouped by entity — you may get multiple results from the same record
- **Use cases**: cross-entity research, segmentation signals, finding patterns across your data

**Benefits of org-wide search:**
- Discover which contacts/companies match a topic
- Find patterns across your entire customer base
- Power search features in your product

**Risks to be aware of:**
- Results are capped by `limit` / `topK` (default 10, fast mode default 100, max 5,000) — you get the best matches, not an exhaustive list
- If 1,000 records mention "Kubernetes", you'll get the top N most relevant chunks, not all 1,000
- For an exhaustive list of all records matching criteria, use `memory.search()` with filter conditions instead — it's designed for that
- Higher `limit` values increase response size but have negligible cost impact (vector search, no LLM calls)

**The same applies to `memorize()`:** storing data without a CRM key (`email`, `website_url`, or `record_id`) creates an orphan memory that isn't tied to any entity. It still exists in the org's memory and is searchable via org-wide recall, but it won't appear in `smartDigest()` or entity-scoped queries. Always provide at least one identifier when memorizing.

---

### Query Writing Strategies

The quality of recall results depends heavily on how you phrase the query:

| Goal | Bad Query | Good Query |
|---|---|---|
| Find pain points | `pain points` | `what pain points or challenges did this contact mention?` |
| Find budget info | `budget` | `budget amount, approval status, or financial constraints mentioned` |
| Find competitors | `competitors` | `competitor products or alternatives this contact is evaluating` |
| Find technical needs | `technical` | `technical requirements, integrations, or infrastructure mentioned` |

**Tips:**
- Write queries as if you're asking a knowledgeable colleague
- Include synonyms: "pain points, challenges, frustrations, complaints"
- Be specific about what you want: "budget amount" not just "budget"
- Scope to an entity whenever possible (email, website_url, record_id)

### Scoring Thresholds

| `minScore` | Use Case | Notes |
|---|---|---|
| `0.0` | Debugging / "show me everything" | Returns all matches, including noise |
| `0.3` | Broad context gathering | Good default for generation pipelines |
| `0.4` | Balanced precision/recall | Recommended starting point |
| `0.5` | Higher precision | Use when quality matters more than coverage |
| `0.7+` | Exact topic match | Very strict — may miss relevant results |

**Start with 0.3-0.4 and tighten if results are noisy.**

### Examples

```typescript
// Basic semantic search scoped to a contact
const results = await client.memory.smartRecall({
    query: 'what pain points did this contact mention?',
    email: 'sarah.chen@initech.com',
    limit: 10,
    minScore: 0.4,
});

// With structured properties included
const results = await client.memory.smartRecall({
    query: 'recent interactions and engagement',
    email: 'sarah.chen@initech.com',
    limit: 15,
    minScore: 0.3,
    include_property_values: true,
});

// AI-generated answer from results
const answer = await client.memory.smartRecall({
    query: 'summarize the key concerns this contact has raised',
    email: 'sarah.chen@initech.com',
    limit: 20,
    minScore: 0.3,
    generate_answer: true,
});

// With reflection for deeper analysis
const reflected = await client.memory.smartRecall({
    query: 'what is the relationship history with this company?',
    website_url: 'https://initech.com',
    limit: 20,
    minScore: 0.3,
    enable_reflection: true,
});

// Unscoped search across all records
const allResults = await client.memory.smartRecall({
    query: 'contacts interested in SOC2 compliance',
    type: 'Contact',
    limit: 20,
    minScore: 0.5,
});

// Fast mode — skip reflection, ~700ms response
const fast = await client.memory.smartRecall({
    query: 'what do we know about this contact?',
    email: 'sarah.chen@initech.com',
    mode: 'fast',
});

// Fast mode with custom score threshold
const fastStrict = await client.memory.smartRecall({
    query: 'budget and pricing discussions',
    email: 'sarah.chen@initech.com',
    mode: 'fast',
    min_score: 0.5,     // Stricter than default 0.3
});
```

### Fast Mode

Use `mode: 'fast'` when latency matters more than depth. It skips the reflection loop and answer generation, returning results in ~500-700ms instead of ~10-20 seconds.

| Aspect | Deep Mode (`mode: 'deep'`) | Fast Mode (`mode: 'fast'`) |
|---|---|---|
| **Latency** | ~10-20s | ~500-700ms |
| **Reflection** | 2 rounds (LLM calls) | Skipped |
| **Answer generation** | Optional | Skipped |
| **Min score** | None (or caller-specified) | 0.3 default (override via `min_score`) |
| **Result limit** | `limit` value (default 10) | Up to 100 results above score threshold (override via `limit`) |
| **Max results** | Up to 5,000 | Up to 5,000 |

**When to use fast mode:**
- Real-time UIs (autocomplete, preview panels)
- Context injection in hot paths (prompt assembly)
- Batch processing where per-call latency matters
- Any scenario where ~10+ second waits are unacceptable

**When NOT to use fast mode:**
- Deep research queries ("summarize everything about this relationship")
- When you need `generate_answer: true` (AI-synthesized answer)
- When you need the reflection loop to find related but non-obvious memories

---

## `memory.smartDigest()` — Entity Context

Compiles a complete context bundle for one entity: structured properties + semantic memories, formatted as a token-budgeted markdown block ready for prompt injection.

### Full Signature

All parameters accept both camelCase and snake_case.

```typescript
interface SmartDigestOptions {
    // Entity identifiers — at least one is required
    email?: string;                    // Contact email
    record_id?: string;                // Direct record ID (REC#...)
    recordId?: string;                 // camelCase alias
    website_url?: string;              // Company website URL
    websiteUrl?: string;               // camelCase alias

    type?: string;                     // Entity type ('Contact', 'Company'). Auto-inferred if omitted.
    token_budget?: number;             // Max tokens for output (default: 1000)
    tokenBudget?: number;              // camelCase alias
    max_memories?: number;             // Max memories to include (default: 20)
    maxMemories?: number;              // camelCase alias
    include_properties?: boolean;      // Include structured properties (default: true)
    includeProperties?: boolean;       // camelCase alias
    include_memories?: boolean;        // Include free-form memories (default: true)
    includeMemories?: boolean;         // camelCase alias
}

interface SmartDigestResponse {
    success: boolean;
    recordId?: string;
    type?: string;
    properties: Record<string, string>;
    memories: Array<{ text: string; createdAt?: string }>;
    compiledContext: string;            // Ready-to-inject markdown
    tokenEstimate: number;
    tokenBudget: number;
}
```

### Token Budget Tuning

| `token_budget` | Use Case |
|---|---|
| `500` | Quick lookup — just need basics (name, title, recent activity) |
| `1000` | Default — good for simple personalization |
| `2000` | Deep personalization — enough for most generation tasks |
| `3000-4000` | Comprehensive context — long emails, proposals, detailed reports |
| `5000+` | Maximum context — use sparingly, cost-intensive |

**Rule:** Start at 2000. Increase if the output feels generic. Decrease if you're hitting token limits or latency is too high.

### Examples

```typescript
// Standard contact digest
const digest = await client.memory.smartDigest({
    email: 'sarah.chen@initech.com',
    type: 'Contact',
    token_budget: 2000,
    include_properties: true,
    include_memories: true,
});
// digest.data.compiledContext → ready-to-inject markdown

// Company digest
const companyDigest = await client.memory.smartDigest({
    website_url: 'https://initech.com',
    type: 'Company',
    token_budget: 3000,
});

// Properties only (fast, no memories)
const propsOnly = await client.memory.smartDigest({
    email: 'sarah.chen@initech.com',
    type: 'Contact',
    token_budget: 500,
    include_properties: true,
    include_memories: false,
});

// By record ID (most reliable)
const byId = await client.memory.smartDigest({
    record_id: 'rec_abc123',
    token_budget: 2000,
});
```

---

## `memory.search()` — Filtered Record Export

Query and filter records by property values. Returns structured data, supports pagination. Use for segmentation, reporting, and batch operations.

### Full Signature

```typescript
interface ExportOptions {
    groups?: Array<{
        id: string;
        logic: 'AND' | 'OR';
        conditions: Array<{
            field: string;
            operator: string;
            value?: PropertyValue;
            collectionId?: string;
        }>;
    }>;
    type?: string;                 // Entity type filter (optional — omit for cross-type search)
    email?: string;                // Scope by email (works as primary or secondary key)
    websiteUrl?: string;           // Scope by website URL
    recordId?: string;             // Scope by record ID
    customKeyName?: string;        // Custom key name (e.g. 'studentNumber', 'linkedinUrl')
    customKeyValue?: string;       // Custom key value (e.g. 'S-2024-1234')
    collectionIds?: string[];      // Filter by collections
    page?: number;                 // Pagination (1-based)
    pageSize?: number;             // Records per page (default: 50)
    countOnly?: boolean;           // Only return count
    returnRecords?: boolean;       // Include full property values
    includeMemories?: boolean;     // Include semantic memories
}

interface ExportResponse {
    recordIds: string[];
    totalMatched: number;
    page: number;
    pageSize: number;
    totalPages: number;
    records?: Record<string, Record<string, { value: PropertyValue; collectionId: string; collectionName?: string }>>;
    memories?: Record<string, MemoryItem[]>;
}
```

### Filter Operators

| Operator | Description | Example |
|---|---|---|
| `EQ` | Exact match | `{ property: 'plan_tier', operator: 'EQ', value: 'enterprise' }` |
| `NEQ` | Not equal | `{ property: 'status', operator: 'NEQ', value: 'churned' }` |
| `CONTAINS` | Substring match | `{ property: 'job_title', operator: 'CONTAINS', value: 'VP' }` |
| `NOT_CONTAINS` | Substring exclusion | `{ property: 'notes', operator: 'NOT_CONTAINS', value: 'unsubscribed' }` |
| `STARTS_WITH` | Prefix match | `{ property: 'email', operator: 'STARTS_WITH', value: 'admin' }` |
| `IS_SET` | Property exists and is not null | `{ property: 'email', operator: 'IS_SET' }` |
| `IS_NOT_SET` | Property is null or missing | `{ property: 'phone', operator: 'IS_NOT_SET' }` |
| `GT` | Greater than (numeric) | `{ property: 'login_count', operator: 'GT', value: 10 }` |
| `GTE` | Greater than or equal | `{ property: 'score', operator: 'GTE', value: 80 }` |
| `LT` | Less than (numeric) | `{ property: 'days_since_login', operator: 'LT', value: 30 }` |
| `LTE` | Less than or equal | `{ property: 'age', operator: 'LTE', value: 65 }` |

### Examples

```typescript
// Custom entity type — search works with any type value
const deansList = await client.memory.search({
    type: 'Student',
    returnRecords: true,
    groups: [{
        id: 'high-gpa', logic: 'AND',
        conditions: [
            { property: 'gpa', operator: 'GTE', value: 3.5 },
        ],
    }],
});

// Webpage type — find all pages flagged with a certain tag
const authPages = await client.memory.search({
    type: 'Webpage',
    returnRecords: true,
    groups: [{
        id: 'auth', logic: 'AND',
        conditions: [
            { property: 'section', operator: 'EQ', value: 'authentication' },
        ],
    }],
});

// Enterprise contacts with email
const enterprise = await client.memory.search({
    type: 'Contact',
    returnRecords: true,
    pageSize: 50,
    groups: [{
        id: 'enterprise', logic: 'AND',
        conditions: [
            { property: 'plan_tier', operator: 'EQ', value: 'enterprise' },
            { property: 'email', operator: 'IS_SET' },
        ],
    }],
});

// Active contacts who are VPs
const vps = await client.memory.search({
    type: 'Contact',
    returnRecords: true,
    groups: [{
        id: 'active-vps', logic: 'AND',
        conditions: [
            { property: 'job_title', operator: 'CONTAINS', value: 'VP' },
            { property: 'status', operator: 'NEQ', value: 'churned' },
        ],
    }],
});

// Count only (fast)
const count = await client.memory.search({
    type: 'Contact',
    countOnly: true,
    groups: [{
        id: 'count', logic: 'AND',
        conditions: [
            { property: 'plan_tier', operator: 'EQ', value: 'enterprise' },
        ],
    }],
});
console.log(`Enterprise contacts: ${count.data?.totalMatched}`);

// Paginated export
let page = 1;
let allRecords: any[] = [];
while (true) {
    const result = await client.memory.search({
        type: 'Contact',
        returnRecords: true,
        page,
        pageSize: 50,
    });
    if (!result.data) break;
    allRecords.push(...result.data.recordIds);
    if (page >= result.data.totalPages) break;
    page++;
}

// Single record by email (quick lookup)
const single = await client.memory.search({
    email: 'sarah.chen@initech.com',
    returnRecords: true,
    includeMemories: true,
});

// --- How to read property values from search() results ---
// With returnRecords: true, the response includes:
//   records[recordId][propertyName].value  → plain string value
//
// The property name must match what you used in your collection definition (e.g. 'email', 'job_title')
// Example: iterate all returned records and extract specific fields
for (const [recordId, props] of Object.entries(enterprise.data?.records ?? {})) {
    const email = props['email']?.value;        // plain string
    const jobTitle = props['job_title']?.value;
    const planTier = props['plan_tier']?.value;
    console.log(`${recordId}: ${email} — ${jobTitle} (${planTier})`);
}

// Collect all emails from a search result:
const emails = Object.values(found.data?.records ?? {})
    .map(props => props['email']?.value)
    .filter(Boolean) as string[];
```

---

### Raw HTTP Request Payloads — All Patterns

These are the exact JSON bodies to send to `POST /api/v1/search`. Use these when calling the API directly (not via the SDK).

---

#### 1. List all records (no filter)

```json
{ "type": "Contact" }
```
Omit `type` to get all entity types. Returns up to `pageSize` records (default 50).

---

#### 2. Key-only lookup — by email

```json
{
  "email": "john@acme.com",
  "returnRecords": true
}
```

---

#### 3. Key-only lookup — by websiteUrl (cross-entity)

```json
{
  "websiteUrl": "acme.com",
  "returnRecords": true
}
```

> **Important:** This matches **all entity types** (Contact, Company, Employee, etc.) that were memorized with `websiteUrl: "acme.com"` as a secondary key — not just Company records. A Contact memorized with email + websiteUrl will be returned here.

---

#### 4. Key-only lookup — websiteUrl scoped to one type

```json
{
  "websiteUrl": "acme.com",
  "type": "Contact",
  "returnRecords": true
}
```

Only returns Contact records where `websiteUrl = acme.com`. Useful when you want all contacts at a company (who were memorized with the company's URL as a secondary key).

---

#### 5. Key-only lookup — by recordId

```json
{
  "recordId": "REC#abc123",
  "returnRecords": true
}
```

---

#### 6. Key-only lookup — custom key

```json
{
  "customKeyName": "hubspot_id",
  "customKeyValue": "12345",
  "returnRecords": true
}
```

---

#### 7. Property condition filter — single condition

```json
{
  "type": "Contact",
  "groups": [
    {
      "id": "g1",
      "logic": "AND",
      "conditions": [
        { "field": "industry", "operator": "EQ", "value": "SaaS" }
      ]
    }
  ],
  "returnRecords": true
}
```

---

#### 8. Property condition filter — AND within a group

Multiple conditions in one group are **AND'd** — record must satisfy all.

```json
{
  "type": "Contact",
  "groups": [
    {
      "id": "g1",
      "logic": "AND",
      "conditions": [
        { "field": "industry", "operator": "EQ", "value": "SaaS" },
        { "field": "location", "operator": "CONTAINS", "value": "Vancouver" }
      ]
    }
  ]
}
```

---

#### 9. Property condition filter — OR across groups

Multiple groups are **OR'd** — record matches if it satisfies any group.

```json
{
  "type": "Contact",
  "groups": [
    {
      "id": "g1",
      "logic": "AND",
      "conditions": [
        { "field": "industry", "operator": "EQ", "value": "SaaS" }
      ]
    },
    {
      "id": "g2",
      "logic": "AND",
      "conditions": [
        { "field": "deal_value", "operator": "GT", "value": 50000 }
      ]
    }
  ]
}
```

---

#### 10. Property filter + CRM key scope

Combine `websiteUrl` (or `email`/`recordId`) with `groups` to filter properties within a specific CRM key scope.

```json
{
  "websiteUrl": "acme.com",
  "groups": [
    {
      "id": "g1",
      "logic": "AND",
      "conditions": [
        { "field": "job_title", "operator": "CONTAINS", "value": "Engineer" }
      ]
    }
  ],
  "returnRecords": true
}
```

Returns all records at acme.com whose `job_title` contains "Engineer" — across all entity types unless `type` is also specified.

---

#### 11. Count only (fast, no record data)

```json
{
  "type": "Contact",
  "countOnly": true,
  "groups": [
    {
      "id": "g1",
      "logic": "AND",
      "conditions": [
        { "field": "plan_tier", "operator": "EQ", "value": "enterprise" }
      ]
    }
  ]
}
```

Response: `{ "data": { "totalMatched": 42 } }` — no record IDs or properties returned.

---

#### 12. With memories included

```json
{
  "email": "john@acme.com",
  "returnRecords": true,
  "includeMemories": true
}
```

---

#### 13. Paginated

```json
{
  "type": "Contact",
  "returnRecords": true,
  "page": 2,
  "pageSize": 100
}
```

Max `pageSize` is 200.

---

#### 14. Scoped to specific collections

```json
{
  "type": "Contact",
  "collectionIds": ["col_abc123", "col_def456"],
  "groups": [
    {
      "id": "g1",
      "logic": "AND",
      "conditions": [
        { "field": "plan_tier", "operator": "EQ", "value": "enterprise", "collectionId": "col_abc123" }
      ]
    }
  ],
  "returnRecords": true
}
```

`collectionId` per condition takes priority over the top-level `collectionIds`.

---

#### All supported operators

| Operator | Meaning | Value required |
|---|---|---|
| `EQ` / `EQUALS` | Exact match | Yes |
| `NEQ` / `NOT_EQUALS` | Not equal | Yes |
| `CONTAINS` | Substring match | Yes |
| `NOT_CONTAINS` | Does not contain | Yes |
| `STARTS_WITH` | Prefix match | Yes |
| `GT` | Greater than (numeric) | Yes |
| `GTE` | Greater than or equal (numeric) | Yes |
| `LT` | Less than (numeric) | Yes |
| `LTE` | Less than or equal (numeric) | Yes |
| `IS_SET` | Value exists and non-empty | No |
| `IS_NOT_SET` | Value is null or empty | No |

---

#### Response shape

```json
{
  "success": true,
  "data": {
    "recordIds": ["REC#abc", "REC#def"],
    "totalMatched": 2,
    "page": 1,
    "pageSize": 50,
    "totalPages": 1,
    "records": {
      "REC#abc": {
        "email": { "value": "john@acme.com", "collectionId": "col_xxx" },
        "job_title": { "value": "Engineer", "collectionId": "col_xxx" }
      }
    },
    "memories": {
      "REC#abc": [{ "text": "...", "topic": "...", "createdAt": "..." }]
    }
  }
}
```

`records` and `memories` are only present when `returnRecords: true` and `includeMemories: true` respectively.

---

### Advanced Search Patterns

#### Key-Only Lookup (No Groups Needed)

Pass CRM keys (`email`, `websiteUrl`, `recordId`, `customKeyName`/`customKeyValue`) directly — no `groups` or property conditions required. The system queries vector store key columns and returns matching records.

```typescript
// Find a record by email — no groups needed
const byEmail = await client.memory.search({
    email: 'sarah@acme.com',
    returnRecords: true,
});

// Find a record by custom key
const student = await client.memory.search({
    type: 'Student',
    customKeyName: 'studentNumber',
    customKeyValue: 'S-2024-1234',
    returnRecords: true,
});
```

#### Secondary Key Search

When a record's primary key is one identifier (e.g. `studentNumber`) but you know a different key (e.g. `email`), you can search by the secondary key. This works because memorize stores **all** provided CRM keys on every row, not just the primary.

```typescript
// A Student whose primary key is studentNumber, but you only know their email
const studentByEmail = await client.memory.search({
    type: 'Student',
    email: 'alice@university.edu',
    returnRecords: true,
});

// A Contact whose primary key is email, but you want to find by company URL
// Note: may return multiple contacts at the same company
const contactsByCompany = await client.memory.search({
    type: 'Contact',
    websiteUrl: 'https://acme.com',
    returnRecords: true,
});
```

**Prerequisite**: the secondary key must have been provided during memorize. If a Student was memorized with only `customKeyName: 'studentNumber'` and no `email`, searching by email won't find it.

#### Cross-Type Search

Omit the `type` parameter to search across **all entity types**. Returns Contacts, Students, Companies, Employees — any record that matches the key.

```typescript
// Find everything linked to this email — regardless of entity type
const allRecords = await client.memory.search({
    email: 'john@acme.com',
    returnRecords: true,
});
// May return: Contact (john@acme.com), Employee (john@acme.com), Student (john@acme.com)
// Each result includes its type in the response

// Cross-type property search — find all records with a specific LinkedIn URL
const byLinkedIn = await client.memory.search({
    returnRecords: true,
    groups: [{
        conditions: [{ property: 'linkedin_url', operator: 'EQ', value: 'https://linkedin.com/in/johndoe' }],
    }],
});
```

#### Property-Value Lookup (When You Don't Have the Primary Key)

When the identifier you have is stored as a **property value** (not a CRM key), use `groups` with a filter condition. This is useful for attributes like LinkedIn URLs, phone numbers, or any custom field stored in a collection.

```typescript
// Find contacts by LinkedIn URL stored as a property
const byLinkedIn = await client.memory.search({
    type: 'Contact',
    returnRecords: true,
    groups: [{
        conditions: [{ property: 'linkedin_url', operator: 'EQ', value: 'https://linkedin.com/in/johndoe' }],
    }],
});

// Find all contacts at a company domain (stored as company_url property)
// Deliberately returns multiple — one per contact at that company
const companyContacts = await client.memory.search({
    type: 'Contact',
    returnRecords: true,
    groups: [{
        conditions: [{ property: 'company_url', operator: 'EQ', value: 'https://acme.com' }],
    }],
});

// Use the returned recordId(s) for further targeted recall
const recordId = byLinkedIn.data?.recordIds[0];
if (recordId) {
    const details = await client.memory.smartRecall({
        query: 'What do we know about this person?',
        record_id: recordId,
        mode: 'fast',
    });
}
```

**When to use which pattern:**

| You have... | Pattern | Example |
|---|---|---|
| Primary CRM key (email for Contact) | Key-only lookup | `search({ email: '...' })` |
| Secondary CRM key (email for Student) | Secondary key search | `search({ type: 'Student', email: '...' })` |
| Custom entity key | Key-only + custom key | `search({ customKeyName: '...', customKeyValue: '...' })` |
| A stored property value (LinkedIn URL) | Property-value lookup | `search({ groups: [{ conditions: [...] }] })` |
| Any key, want all types | Cross-type search | `search({ email: '...' })` (no `type`) |

---

## `ai.smartGuidelines()` — Governance Variables

Retrieves organizational guidelines, policies, and best practices relevant to a topic. This is NOT entity-level memory — it's org-level governance. Use it to get rules and constraints for generation.

### Full Signature

```typescript
interface SmartGuidelinesOptions {
    message: string;           // Topic/query (required)
    guidelineIds?: string[];   // Only search these guidelines by ID
    guidelineNames?: string[]; // Resolve guidelines by name (case-insensitive)
    tags?: string[];           // Only search guidelines with these tags
    excludeTags?: string[];    // Exclude guidelines with these tags
    model?: string;            // Model for relevance scoring
    mode?: 'fast' | 'full' | 'auto'; // Routing mode (default: 'auto')
    minScore?: number;         // Min cosine similarity for fast mode (default: 0.4)
}
```

### Examples

```typescript
// Get cold email guidelines
const guidelines = await client.ai.smartGuidelines({
    message: 'cold outreach email best practices and tone guidelines',
});

// Scoped to sales-related variables
const salesGuidelines = await client.ai.smartGuidelines({
    message: 'how to handle pricing objections',
    tags: ['sales'],
});

// The compiledContext is ready to inject into a prompt
const context = guidelines.data?.compiledContext;
```

---

## The Context Assembly Pattern

Most generation pipelines need three layers of context. Combine them for optimal results:

```
Layer 1: smartGuidelines()   → Rules (what should the AI do?)
Layer 2: smartDigest()    → Entity (who is this about?)
Layer 3: smartRecall()    → Task-specific facts (what's relevant to THIS task?)
```

### Full Example

```typescript
async function assembleContext(email: string, task: string): Promise<string> {
    const sections: string[] = [];

    // 1. Governance — rules and guidelines
    const governance = await client.ai.smartGuidelines({
        message: `${task} — guidelines, tone, constraints`,
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

### When to Skip Layers

| Scenario | Layers Needed |
|---|---|
| Cold email to a known contact | All three (rules + who + topic facts) |
| Internal report / summary | Layer 2 + 3 (entity + facts) |
| General content generation | Layer 1 only (rules) |
| Quick data lookup | Layer 2 only (entity digest) |
| Topic research across all records | Layer 3 only (recall) |

---

## Performance Optimization

### Caching

```typescript
// Cache smartDigest results in hot paths
const digestCache = new Map<string, SmartDigestResponse>();

async function getCachedDigest(email: string): Promise<SmartDigestResponse | undefined> {
    if (digestCache.has(email)) return digestCache.get(email);

    const result = await client.memory.smartDigest({
        email,
        type: 'Contact',
        token_budget: 2000,
    });

    if (result.data) {
        digestCache.set(email, result.data);
    }
    return result.data;
}
```

### Parallel Fetching

When assembling context, fetch independent layers in parallel:

```typescript
const [governance, digest, recalled] = await Promise.all([
    client.ai.smartGuidelines({ message: `${task} — guidelines` }),
    client.memory.smartDigest({ email, type: 'Contact', token_budget: 2000 }),
    client.memory.smartRecall({ query: task, email, mode: 'fast' }),  // fast mode for hot paths
]);
```

### Token Budget Awareness

Monitor `tokenEstimate` in smartDigest responses to avoid exceeding your LLM's context window:

```typescript
const digest = await client.memory.smartDigest({
    email,
    type: 'Contact',
    token_budget: 2000,
});

console.log(`Token estimate: ${digest.data?.tokenEstimate} / ${digest.data?.tokenBudget}`);
// If tokenEstimate is close to budget, the output was truncated
```
