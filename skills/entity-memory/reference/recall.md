# Reference: Recall

Complete guide to retrieving data from Personize memory — method signatures, query strategies, token budget tuning, scoring thresholds, context assembly patterns, export filtering, and performance optimization.

---

## Method Overview

| Method | Returns | Best For |
|---|---|---|
| `memory.recall()` | Ranked semantic search results | "What do we know about X topic?" |
| `memory.smartDigest()` | Compiled markdown context for one entity | "Give me everything about this person/company" |
| `memory.search()` | Filtered records with property values | "List all contacts matching criteria X" |
| `ai.smartGuidelines()` | Governance variables matching a topic | "What are our guidelines for X?" |

---

## `memory.recall()` — Semantic Search

Searches vector embeddings to find memories matching a natural language query. Returns ranked results with relevance scores.

### Full Signature

```typescript
interface RecallProOptions {
    query: string;                     // Natural language query (required)
    limit?: number;                    // Max results (default: 10)
    minScore?: number;                 // Minimum relevance score 0-1 (default: 0)
    email?: string;                    // Scope to one contact
    website_url?: string;              // Scope to one company
    record_id?: string;                // Scope to one record
    type?: string;                     // Entity type filter
    include_property_values?: boolean; // Include structured properties alongside memories
    enable_reflection?: boolean;       // AI reflects on results for deeper insight
    generate_answer?: boolean;         // AI generates a direct answer from results
    fast_mode?: boolean;               // Skip reflection + answer gen, ~700ms (default: false)
    min_score?: number;                // Server-side score filter (in fast_mode, defaults to 0.3)
}
```

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
const results = await client.memory.recall({
    query: 'what pain points did this contact mention?',
    email: 'sarah.chen@initech.com',
    limit: 10,
    minScore: 0.4,
});

// With structured properties included
const results = await client.memory.recall({
    query: 'recent interactions and engagement',
    email: 'sarah.chen@initech.com',
    limit: 15,
    minScore: 0.3,
    include_property_values: true,
});

// AI-generated answer from results
const answer = await client.memory.recall({
    query: 'summarize the key concerns this contact has raised',
    email: 'sarah.chen@initech.com',
    limit: 20,
    minScore: 0.3,
    generate_answer: true,
});

// With reflection for deeper analysis
const reflected = await client.memory.recall({
    query: 'what is the relationship history with this company?',
    website_url: 'https://initech.com',
    limit: 20,
    minScore: 0.3,
    enable_reflection: true,
});

// Unscoped search across all records
const allResults = await client.memory.recall({
    query: 'contacts interested in SOC2 compliance',
    type: 'Contact',
    limit: 20,
    minScore: 0.5,
});

// Fast mode — skip reflection, ~700ms response
const fast = await client.memory.recall({
    query: 'what do we know about this contact?',
    email: 'sarah.chen@initech.com',
    fast_mode: true,
});

// Fast mode with custom score threshold
const fastStrict = await client.memory.recall({
    query: 'budget and pricing discussions',
    email: 'sarah.chen@initech.com',
    fast_mode: true,
    min_score: 0.5,     // Stricter than default 0.3
});
```

### Fast Mode

Use `fast_mode: true` when latency matters more than depth. It skips the reflection loop and answer generation, returning results in ~500-700ms instead of ~10-20 seconds.

| Aspect | Normal Mode | Fast Mode |
|---|---|---|
| **Latency** | ~10-20s | ~500-700ms |
| **Reflection** | 2 rounds (LLM calls) | Skipped |
| **Answer generation** | Optional | Skipped |
| **Min score** | None (or caller-specified) | 0.3 default (override via `min_score`) |
| **Result limit** | `limit` value | No hard limit — all results above score threshold |

**When to use fast_mode:**
- Real-time UIs (autocomplete, preview panels)
- Context injection in hot paths (prompt assembly)
- Batch processing where per-call latency matters
- Any scenario where ~10+ second waits are unacceptable

**When NOT to use fast_mode:**
- Deep research queries ("summarize everything about this relationship")
- When you need `generate_answer: true` (AI-synthesized answer)
- When you need the reflection loop to find related but non-obvious memories

---

## `memory.smartDigest()` — Entity Context

Compiles a complete context bundle for one entity: structured properties (DynamoDB) + semantic memories (LanceDB), formatted as a token-budgeted markdown block ready for prompt injection.

### Full Signature

```typescript
interface SmartDigestOptions {
    record_id?: string;                // CRM record ID
    email?: string;                    // Contact email
    website_url?: string;              // Company website
    type?: string;                     // Entity type ('Contact', 'Company')
    token_budget?: number;             // Max tokens for output (default: 1000)
    max_memories?: number;             // Max memories to include (default: 20)
    include_properties?: boolean;      // Include structured properties (default: true)
    include_memories?: boolean;        // Include free-form memories (default: true)
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
    type?: string;                 // Entity type filter
    email?: string;                // Single record by email
    websiteUrl?: string;           // Single record by website
    recordId?: string;             // Single record by ID
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
| `EQUALS` | Exact match | `{ field: 'plan_tier', operator: 'EQUALS', value: 'enterprise' }` |
| `NOT_EQUALS` | Not equal | `{ field: 'status', operator: 'NOT_EQUALS', value: 'churned' }` |
| `CONTAINS` | Substring match | `{ field: 'job_title', operator: 'CONTAINS', value: 'VP' }` |
| `IS_SET` | Property exists and is not null | `{ field: 'email', operator: 'IS_SET' }` |
| `IS_NOT_SET` | Property is null or missing | `{ field: 'phone', operator: 'IS_NOT_SET' }` |
| `GREATER_THAN` | Numeric comparison | `{ field: 'login_count', operator: 'GREATER_THAN', value: 10 }` |
| `LESS_THAN` | Numeric comparison | `{ field: 'days_since_login', operator: 'LESS_THAN', value: 30 }` |

### Examples

```typescript
// Enterprise contacts with email
const enterprise = await client.memory.search({
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

// Active contacts who are VPs
const vps = await client.memory.search({
    type: 'Contact',
    returnRecords: true,
    groups: [{
        id: 'active-vps', logic: 'AND',
        conditions: [
            { field: 'job_title', operator: 'CONTAINS', value: 'VP' },
            { field: 'status', operator: 'NOT_EQUALS', value: 'churned' },
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
            { field: 'plan_tier', operator: 'EQUALS', value: 'enterprise' },
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
```

---

## `ai.smartGuidelines()` — Governance Variables

Retrieves organizational guidelines, policies, and best practices relevant to a topic. This is NOT entity-level memory — it's org-level governance. Use it to get rules and constraints for generation.

### Full Signature

```typescript
interface SmartContextOptions {
    message: string;           // Topic/query (required)
    variableIds?: string[];    // Only search these variables
    tags?: string[];           // Only search variables with these tags
    excludeTags?: string[];    // Exclude variables with these tags
    model?: string;            // Model for relevance scoring
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
Layer 3: recall()         → Task-specific facts (what's relevant to THIS task?)
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
    client.memory.recall({ query: task, email, fast_mode: true }),  // fast_mode for hot paths
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
