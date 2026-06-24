## Agent Mental Model for Personize Memory

> **Design reference for AI agents and integration authors.** This document maps every Personize memory operation to a tab (scope), an affordance (verb), and the exact tool call on each surface (MCP, SDK, HTTP, CLI). Read this when designing an agent integration or writing code that interacts with Personize memory.

---

## Contents

1. Mental Model Overview (the IDE metaphor)
2. The Tab Taxonomy (memory scopes)
3. The Affordance Grid (verbs)
4. The Full Routing Matrix (canonical call per surface: MCP / SDK / HTTP / CLI)
5. Composite Affordances (multi-call sequences)
6. Design Templates (runnable SDK snippets)
7. Cross-Links to Other References
8. Honest Gaps
- agent2_0 Collapsed Routing Reference (5-tool surface)
- Quick-Reference Cheatsheet

> For the *strategic* model (why model memory at all, the three layers, the boundary question), read `memory-as-business-model.md` first. This file is the *operational* routing layer beneath it.

---

## 1. Mental Model Overview

Memory in Personize is organized the same way a well-designed IDE organizes open files: **tabs** (scopes you can navigate to) and **affordances** (actions you can take in each tab). The mental model is interface-agnostic -- the same taxonomy works whether the agent is calling MCP tools, the TypeScript SDK, the HTTP API, or the CLI.

**The IDE metaphor, applied:**

| IDE concept | Personize concept | What it means |
|---|---|---|
| Tabs / panels | Scopes (Records, Memories, Properties, ...) | Where is this data? |
| Search bar | Find affordance | Semantic, structured, or direct lookup |
| Filter panel | Find (structured) affordance | Constrain by property value |
| Edit mode | Save / Update affordance | Write new content or mutate existing |
| File tree / pagination | List / Browse affordance | Walk through a tab's contents |
| Natural language entry | Extraction (memorize) | Free-text in, structured data out |
| Inspector / metadata panel | Describe affordance | Discover what schema and constraints exist |

This framing is important because it prevents a common agent mistake: reaching for a general-purpose search tool when a direct-lookup tool exists, or trying to "update" a memory when the platform treats memories as immutable atomic facts that should be replaced rather than mutated. Each affordance has a well-defined contract; understanding the taxonomy prevents misrouting.

---

## 2. The Tab Taxonomy

A **tab** is a named memory scope. Tabs are not physical database tables -- they are logical categories that determine which key you pass to tools and which tools respond.

| Tab | What it holds | Agent-facing key | Notes |
|---|---|---|---|
| **Records** | Entities (people, companies, accounts, deals) | `email`, `website_url`, `recordId` | The primary entity store. Records have Properties and attached Memories. |
| **Memories** | Atomic facts attached to a record | `memoryId`, `recordId` | Extracted by the platform from free text. Immutable once written. |
| **Properties** | Structured columns on records | `propertyName`, `recordId` | Typed fields (string, number, boolean, date). Schema-governed. |
| **Collections** | Typed record sets | `collectionType` / `entityType` | Grouping mechanism: `contact`, `company`, `deal`, `location`, custom. |
| **Workspaces / Projects / Campaigns** | Org-shared collaborative scopes | `workspaceId`, `type` | One tab because they share one tool (`memory_save(type=...)`). Distinct values, identical affordances. |
| **Self** | User-private memories | `userId`, `about='self'` | Only the calling user sees these. Survives session boundaries. |
| **Context** | Guidelines, playbooks, references, templates | `contextId`, `type` | Governs agent and human behavior. Retrieved by semantic relevance. |
| **Attachments** | Raw docs and files associated with a context doc | `attachmentId`, `parentContextId` | Uploaded to a parent guideline or playbook. Binary + metadata. |
| **Graph** | Entity relationships (bi-temporal edges in PostgreSQL) | `fromEntity`, `toEntity`, `edgeType` | Traversal is **live**: `sources.graph:true` on `retrieve_unified` (agent2_0) or `POST /api/v1.1/memory/retrieve`. Edges are inferred automatically at memorize time; no manual edge-write API by design. See `graph-relations.md`. |

### What is NOT a tab

User identity, plan tier, available credits, billing history, MCP profile name, and organization metadata are **not tabs**. They are session context and account context respectively. They appear in the `personize_md` preamble but agents do not navigate to them -- there is no "Credits tab" to browse or filter.

An agent asking "how many credits do we have left?" is reading session state, not memory. An agent asking "who are our contacts at Acme?" is reading Records. Keep this distinction crisp.

### Why Workspaces, Projects, and Campaigns are one tab

All three share the `memory_save` tool with a `type` discriminator (`type='workspace'`, `type='project'`, `type='campaign'`, `type='task'`). From the agent's perspective, the affordances are identical -- save a scope-named block of content, retrieve it, browse it. The `type` value is what differentiates the business meaning.

---

## 3. The Affordance Grid

An **affordance** is a verb that acts on a tab. Not every affordance is available on every tab -- the grid below lists the seven affordances and their intent.

| Affordance | Intent | What the agent wants to do |
|---|---|---|
| **Find** | Locate one or more entities | "I have a key, a name, or a description -- give me the matching data." |
| **View** | Open a focused entity and see all its content | "I have the entity -- give me everything attached to it: memories, properties, files." |
| **List / Browse** | Paginate through a tab | "Show me everything of type X in this org, page by page." |
| **Save / Create** | Write new content | "I have new information -- store it so it persists for future agents and users." |
| **Update / Mutate** | Modify existing content | "I have a correction or an incremental change -- apply it to what's already stored." |
| **Delete** | Remove content | "This data should no longer exist." |
| **Describe** | Discover schema or constraints | "I don't know what fields exist -- tell me the shape of this tab so I can interact correctly." |

**Important:** several affordances have **no single tool today** -- they require composing multiple tools (composite affordances). The routing matrix in section 4 marks these explicitly as **(composite)**. An agent that reaches for a missing single-call shortcut will either fail or hallucinate a tool name. The gap list in section 8 catalogs every composite-only affordance.

---

## 4. The Full Routing Matrix

This is the primary reference. One row per (tab, affordance) pair. Each row maps to the canonical call on each surface. Cells marked **(composite)** require multiple calls -- see section 5 for the exact sequences.

**Reading the table:**
- MCP column: tool name as called by an AI agent via the MCP protocol.
- SDK column: TypeScript SDK method using `@personize/sdk` `client` instance.
- HTTP column: REST endpoint on `agent.personize.ai`.
- CLI column: `@personize/cli` command. `n/a` means the CLI has no direct command for this operation.

---

### Records

| Affordance | MCP | SDK | HTTP | CLI |
|---|---|---|---|---|
| Find (semantic) | `memory_search` | `client.memory.search({ query, limit? })` | `POST /api/v1/memory/search` | `personize memory search "<query>"` |
| Find (structured) | `memory_filter_by_property` | `client.memory.filterByProperty({ filters })` | `POST /api/v1/memory/filter` | `personize memory filter --property=<name> --value=<val>` |
| Find (direct) | `memory_retrieve` | `client.memory.retrieve({ email })` | `GET /api/v1/memory/:key` | `personize memory get --email=<email>` |
| View | **(composite)** `memory_retrieve` + `memory_get_properties` + `context_attachment_list` | (composite -- see section 5) | (composite) | (composite) |
| Save | `memory_save` | `client.memory.save({ email, content })` | `POST /api/v1/memorize` | `personize memorize --email=<email> --content=<text>` |
| List / Browse | `memory_search` with broad query or empty filter | `client.memory.filterByProperty({ filters: [] })` | `POST /api/v1/memory/filter` | `personize memory filter` |
| Delete | `memory_retrieve` to get memoryIds, then targeted call | (composite) | `DELETE /api/v1/memory/:key` | n/a |
| Describe | **(composite)** `collection_list` + `memory_get_properties` | (composite -- see section 5) | (composite) | (composite) |

**Key selector rules:**
- Pass `email` when you have an email address (the primary key for `contact` records).
- Pass `website_url` when you have a domain (the primary key for `company` records).
- Pass `recordId` (a deterministic HMAC derived from the org + key type + key value) when you have a stable identifier from a prior retrieval response.
- Never pass a raw name string as the key -- use `memory_search` first to find the record, then `memory_retrieve` with the resolved key.

---

### Memories

| Affordance | MCP | SDK | HTTP | CLI |
|---|---|---|---|---|
| Find / List | `memory_retrieve` (returns memories in response) | `client.memory.retrieve({ email })` | `GET /api/v1/memory/:key` | `personize memory get --email=<email>` |
| Split | `memory_segment` | `client.memory.segment({ memoryId })` | `POST /api/v1/memory/segment` | n/a |
| Update | **(composite gap)** delete + re-save today | (composite gap -- see section 5) | (composite gap) | (composite gap) |
| Delete | Targeted delete via memory API | `client.memory.delete({ memoryId })` | `DELETE /api/v1/memory/:key` | n/a |

**Immutability note:** Memories are atomic facts written once by the extraction pipeline. There is no `memory_update_memory` or `memory_patch_fact` tool. If a fact changes, the correct workflow is: identify the old memoryId, delete it, then write a new memory via `memory_save` with the corrected content. The platform reconciles contradictions at recall time but the canonical resolution is to let the LLM score relevance -- do not accumulate contradictory facts indefinitely.

---

### Properties

| Affordance | MCP | SDK | HTTP | CLI |
|---|---|---|---|---|
| Find / List | `memory_get_properties` | `client.memory.getProperties({ key })` | `GET /api/v1/memory/:key/properties` | `personize memory properties <key>` |
| Update (single) | `memory_update_property` | `client.memory.updateProperty({ key, name, value })` | `POST /api/v1/memory/:key/properties/:name` | `personize memory set-property <key> <name> <value>` |
| Update (bulk) | `memory_update_properties` | `client.memory.updateProperties({ key, properties })` | `POST /api/v1/memory/:key/properties` | n/a |
| Delete (single) | `memory_update_property` with `null` value | `client.memory.updateProperty({ key, name, value: null })` | `POST /api/v1/memory/:key/properties/:name` with null | n/a |

**Property vs Memory distinction:** Properties are typed schema columns (like database fields). Memories are unstructured atomic facts. When you want to store `{ seniority: 'executive' }`, use `memory_update_property`. When you want to store "Sarah mentioned she prefers async communication and dislikes demos", use `memory_save`. The extraction pipeline automatically fills properties during memorize; `memory_update_property` is for manual corrections and enrichment.

---

### Collections

| Affordance | MCP | SDK | HTTP | CLI |
|---|---|---|---|---|
| List | `collection_list` | `client.collections.list()` | `GET /api/v1/collections` | `personize collections list` |
| Create | `collection_create` | `client.collections.create({ name, entityType })` | `POST /api/v1/collections` | `personize collections create --name=<n>` |
| Update | `collection_update` | `client.collections.update({ id, ...fields })` | `PUT /api/v1/collections/:id` | n/a |
| Delete | `collection_delete` | `client.collections.delete({ id })` | `DELETE /api/v1/collections/:id` | n/a |
| History | `collection_history` | `client.collections.history(id, { mode: 'diff' })` | `GET /api/v1/collections/:id/history` | n/a |
| Describe | **(composite)** `collection_list` + `memory_get_properties` | (composite -- see section 5) | (composite) | (composite) |

**Standard vs custom collections:** The platform pre-creates `contact` and `company` collections in every org. `deal`, `location`, and any domain-specific collection (e.g., `listing`, `ticket`, `course`) are custom and must be created by the integration author. `collection_list` returns both standard and custom collections with their property schemas -- always call it at session start when designing against an unknown org.

**Entity types do NOT have an explicit `create` tool.** This is a common point of confusion. Entity types (`contact`, `company`, `deal`, `location`, your custom types) are provisioned as a side effect of `collection_create({ name, entityType })`. There is no `entity_type_create`. The available entity-type tools (`entity_type_get`, `entity_type_update`, `entity_type_archive`) operate on entity types that already exist via their owning collection. To "create an entity type," create the collection that holds it.

---

### Context (Guidelines, Playbooks, References)

| Affordance | MCP | SDK | HTTP | CLI |
|---|---|---|---|---|
| Find (semantic) | `context_retrieve` | `client.context.retrieve({ message, types?, tags? })` | `POST /api/v1/context/retrieve` | `personize context retrieve "<msg>"` |
| List | `context_manage_list` | `client.context.list({ type? })` | `GET /api/v1/context/manage` | `personize context list` |
| Save | `context_save` | `client.context.save({ name, value, type })` | `POST /api/v1/context/manage` | `personize context save --name=<n> --type=<t>` |
| Read (by id) | `context_manage_read` | `client.context.read({ id })` | `GET /api/v1/context/manage/:id` | n/a |
| Update | `context_manage_update` | `client.context.update({ id, ...fields })` | `PUT /api/v1/context/manage/:id` | n/a |
| Delete | `context_manage_delete` | `client.context.delete({ id })` | `DELETE /api/v1/context/manage/:id` | n/a |
| History | `context_manage_history` | `client.context.history({ id })` | `GET /api/v1/context/manage/:id/history` | n/a |
| Download | `context_manage_download` | `client.context.download({ id })` | `GET /api/v1/context/manage/:id/download` | n/a |

**Context types:** `guideline` (governance rules), `playbook` (step-by-step procedures), `reference` (factual reference material), `template` (reusable output structures), `brief` (short situational context). The `type` field governs how the governance layer prioritizes and formats retrieval results. Pass `type` in `context_retrieve` to narrow to a specific kind.

**Context tags:** context docs also carry tags from the org's curated `org_tag_vocabulary`. The LLM section-selector reads each tag's description (format: `Use for: X. Not for: Y.`) to include or exclude docs per query. Agents may apply existing tags during a save but never invent new canonicals -- unmatched candidates are dropped on purpose. Manage via `personize v1.1 context tags ...` (CLI) or `client.v1_1.context.{listTags, createTag, ...}` (SDK). See SKILL.md "Curated Taxonomies" for the full lifecycle.

**Usage pattern:** `context_retrieve` is the runtime path -- pass the current user message or task description; the platform semantically matches the best-fit guidelines. `context_manage_*` tools are the management path -- CRUD for guideline lifecycle. In agentic workflows, you almost always want `context_retrieve`, not `context_manage_list`, at task time.

---

### Attachments

| Affordance | MCP | SDK | HTTP | CLI |
|---|---|---|---|---|
| List | `context_attachment_list` | `client.attachments.list({ guidelineId })` | `GET /api/v1/context/manage/:gid/attachments` | n/a |
| Upload | `context_attachment_upload` | `client.attachments.upload({ guidelineId, file, metadata })` | `POST /api/v1/context/manage/:gid/attachments` (multipart) | n/a |
| Read | `context_attachment_read` | `client.attachments.read({ guidelineId, attachmentId })` | `GET /api/v1/context/manage/:gid/attachments/:aid` | n/a |
| Delete | `context_attachment_delete` | `client.attachments.delete({ guidelineId, attachmentId })` | `DELETE /api/v1/context/manage/:gid/attachments/:aid` | n/a |

**Attachment tiers:** The platform tiers attachment delivery by size -- instant (<=2KB, inlined), preview (<=20KB, excerpt), on-demand (>20KB, fetched only when `context_attachment_read` is called explicitly). Design large reference documents (competitor matrix, pricing sheet, compliance guide) as on-demand attachments and only fetch them when the task explicitly requires that depth.

---

### Self (User-Private Memories)

| Affordance | MCP | SDK | HTTP | CLI |
|---|---|---|---|---|
| Save | `memory_save(about='self')` | `client.memory.save({ about: 'self', content })` | `POST /api/v1/memorize` with `about=self` | `personize memorize --about=self` |
| Find / Retrieve | `memory_retrieve` filtered by `about=self` | `client.memory.retrieve({ about: 'self' })` | `GET /api/v1/memory/:key` with self scope | n/a |

**Scope discipline:** Self-scoped memories are private to the calling user. Use `about='self'` only for user preferences, working style notes, personal reminders, and session handoffs from a previous conversation. Do NOT save business-critical information (a contact's deal stage, a company's funding round, a team decision) under `about='self'` -- it will be invisible to teammates and other agents. Use org-scoped `memory_save` with `email` or `website_url` for shared business data.

**Self vs Records discrimination:** If the user says "remember that I prefer async communication", that is `about='self'`. If the user says "Sarah prefers async communication", that is `memory_save({ email: 'sarah@...', content: '...' })`.

---

### Workspaces / Projects / Campaigns

| Affordance | MCP | SDK | HTTP | CLI |
|---|---|---|---|---|
| Save | `memory_save(type='workspace'\|'project'\|'campaign'\|'task')` | `client.memory.save({ type, name, content })` | `POST /api/v1/memorize` | `personize memorize --type=workspace --name=<n>` |
| Find | `memory_retrieve` with workspace name or id | `client.memory.retrieve({ workspaceId })` | `GET /api/v1/memory/:key` | n/a |

**When to use:** Workspaces, projects, and campaigns are the shared coordination layer for multi-agent systems and team collaboration. An orchestrator agent writes handoff state to a workspace; specialist agents read it. Each contribution is a new memory entry under the workspace name -- the platform accumulates these as the workspace timeline. Use `type='task'` for discrete action items within a workspace.

---

### Scale and Cookbook

| Affordance | MCP | SDK | HTTP | CLI |
|---|---|---|---|---|
| Recipe lookup | `personize_cookbook` | n/a (call via MCP) | n/a | n/a |
| Batch upsert (structured, known field values) | `memory_upsert` | `client.memory.upsert({ records })` | `POST /api/v1.1/memory/upsert` | `personize memory upsert --file=records.json` |
| Batch store (content → AI extraction) | n/a -- no MCP batch tool; use `personize_cookbook` | `client.memory.saveBatch({ records })` (legacy `memorizeBatch`, deprecated) | `POST /api/v1/memorize/batch` | `personize memorize --batch --file=records.json` |
| Batch validate (dry run) | n/a | `client.memory.validateBatch({ records })` | `POST /api/v1/memorize/batch/validate` | n/a |

**Rule:** For any operation involving 5 or more records -- import, sync, dedup, backfill -- call `personize_cookbook` first. It returns a proven recipe with rate limiting, error handling, and cursor-based pagination already solved. Do not hand-loop 50+ records with individual `memory_save` calls.

---

### Graph

| Affordance | MCP (legacy profiles) | MCP (agent2_0) | SDK | HTTP | CLI |
|---|---|---|---|---|---|
| Traverse / Neighbors | n/a *(no tool on legacy profiles)* | `retrieve_unified(mode='scout', record={id:...}, sources={graph:true})` | `client.retrieve({record, sources:{graph:true}})` | `POST /api/v1.1/memory/retrieve` (sources.graph) | n/a |
| Add edge | n/a | n/a *(edges written automatically by extraction pipeline)* | n/a | n/a | n/a |

**agent2_0:** Graph traversal is available by setting `sources.graph: true` on any `retrieve_unified` call (typically `mode='scout'`). Pass `record={id: '...'}` (or `{email}`/`{websiteUrl}`) as the anchor node. The platform returns connected entities and edge types derived from the extraction pipeline. If no edges are seeded for a record, the result is empty — state that explicitly rather than hallucinating connections. There is **no** `mode='graph'`; graph is a source, not a mode.

**Legacy profiles (agent, developer):** No graph tool exists. Do not simulate traversal by chaining `memory_retrieve` calls — use `personize_cookbook` to ask for the appropriate pattern if graph data is needed.

---

## 5. Composite Affordances Explained

Several high-value affordances have no single tool today. Each requires composing two or more tool calls. This section gives the exact sequence for each composite.

### View a Record

**Goal:** Open a record and see everything attached to it -- raw memories, structured properties, and linked documents.

**Sequence:**

```typescript
// Step 1: retrieve the record and its memories
const record = await client.memory.retrieve({ email: 'sarah@acme-corp.io' });
// record.data contains: memories[], recordId, collectionType

// Step 2: retrieve the structured properties
const properties = await client.memory.getProperties({ key: 'sarah@acme-corp.io' });
// properties.data contains: { firstName, lastName, seniority, dealStage, ... }

// Step 3 (optional): retrieve attachments from the parent guideline
// Only needed if the record has a linked context doc (e.g., an onboarding playbook)
const attachments = await client.attachments.list({ guidelineId: '<parentGuidelineId>' });
```

**Combine:** merge `record.data.memories` + `properties.data` + `attachments.data` into one "open record" view. This is the equivalent of clicking a record in the Personize web app.

**MCP sequence:** `memory_retrieve` → `memory_get_properties` → `context_attachment_list` (optional).

---

### Describe a Collection (Discover Schema)

**Goal:** Find out what property fields exist on records of a given type before writing code against them.

**Sequence:**

```typescript
// Step 1: list all collections to find the collection type and its property definitions
const collections = await client.collections.list();
// Each collection has a properties[] array with { name, type, description }

// Step 2 (optional): read actual property values from a sample record to confirm types and populated fields
const sample = await client.memory.getProperties({ key: 'sample@acme-corp.io' });
```

**Why step 2?** The collection schema defines what fields CAN exist. `memory_get_properties` on a real record shows what fields ARE populated and what the values look like -- critical when writing extraction prompts or filter expressions.

**MCP sequence:** `collection_list` → `memory_get_properties`.

---

### Update a Memory (No Direct Tool)

**Goal:** Correct or replace an atomic fact that was previously extracted and stored.

**Today's workaround sequence:**

```typescript
// Step 1: retrieve the record to find the memoryId to replace
const record = await client.memory.retrieve({ email: 'sarah@acme-corp.io' });
const staleMemory = record.data.memories.find(m => m.content.includes('the stale fact'));

// Step 2: delete the stale memory
await client.memory.delete({ memoryId: staleMemory.memoryId });

// Step 3: save the corrected content
await client.memory.save({
    email: 'sarah@acme-corp.io',
    content: 'Corrected fact: Sarah is now VP of Engineering, promoted Q1 2026.'
});
```

**Note:** This is a composite gap -- there is no `memory_update_memory` or `memory_patch` tool. For structured fields (seniority, title, deal stage), use `memory_update_property` instead, which IS a single call and is idempotent. Reserve the delete+re-save pattern for unstructured memory facts only.

---

### Locate Anything (No Single Tool)

**Goal:** Find a specific entity when you know its name or description but not its exact key type.

**Resolution sequence:**

```typescript
// Try 1: direct lookup by email (fastest)
let result = await client.memory.retrieve({ email: 'sarah@acme-corp.io' });
if (result.data) return result;

// Try 2: semantic search by name or description
const hits = await client.memory.search({ query: 'Sarah at Acme Corp', limit: 5 });
if (hits.data.length > 0) {
    // resolve the top hit to a key, then retrieve
    return await client.memory.retrieve({ email: hits.data[0].email });
}

// Try 3: if it might be a guideline or playbook
const ctx = await client.context.retrieve({ message: 'Sarah at Acme Corp', types: ['reference'] });
if (ctx.data) return ctx;

// If none resolve: report to the user that no entity was found
```

**Why this matters:** A common agent error is calling `memory_search` for everything, including entities that have a known exact key. Always try `memory_retrieve` first when you have an email or domain. `memory_search` is for discovery when the key is unknown.

---

### Bulk Update (No Direct Tool)

**Goal:** Update a property across many records at once (e.g., mark all deals at Acme as "at-risk" when a key contact leaves).

**Today's approach:**

1. For small batches (<5 records): `memory_filter_by_property` to get the record keys, then loop `memory_update_property` per key.
2. For larger batches: call `personize_cookbook` -- it will return a proven batch pattern with rate limiting and cursor-based pagination already wired.

**Never hand-loop 50+ individual update calls.** The platform has rate limits (160 calls/min on Free, 1000/min on Enterprise) and the cookbook recipes respect these limits. Custom loops typically don't.

---

### Cross-Tab Join (Records + Context)

**Goal:** Retrieve records relevant to a task AND the governance rules that apply to that task in a single logical operation.

**Pattern:**

```typescript
// Run in parallel -- these are independent reads
const [records, guidelines] = await Promise.all([
    client.memory.search({ query: 'CTOs at fintech companies', limit: 10 }),
    client.context.retrieve({ message: 'cold outreach to technical executives', types: ['guideline', 'playbook'] }),
]);
// Combine: records become the personalization data, guidelines become the instructions
```

The platform does not have a single "recall everything I need for this task" tool. The two-call parallel pattern above is the canonical approach and runs in ~300-500ms total.

---

## 6. Design Templates

Short, runnable SDK code snippets for the most common patterns. Each is a complete operation, not pseudocode.

### Pattern 1: RAG Over Org Records (Recall-Then-Generate)

The core loop for personalized generation: retrieve context, retrieve governance, generate.

```typescript
import { PersonizeClient } from '@personize/sdk';

const client = new PersonizeClient({ apiKey: process.env.PERSONIZE_API_KEY });

async function generatePersonalizedOutreach(email: string): Promise<string> {
    // Recall + Govern in parallel
    const [record, guidelines] = await Promise.all([
        client.memory.retrieve({ email }),
        client.context.retrieve({ message: 'cold outreach to executives', types: ['guideline'] }),
    ]);

    // Assemble context for generation
    const personContext = record.data?.memories
        ?.map(m => m.content)
        .join('\n') ?? 'No prior context found.';

    const govContext = guidelines.data?.value ?? '';

    // Act: generate
    const result = await client.ai.prompt({
        context: `${govContext}\n\n---\n\nWhat we know about this person:\n${personContext}`,
        instructions: [
            { prompt: 'Analyze this person\'s role, interests, and pain points.', maxSteps: 2 },
            { prompt: 'Write a personalized cold outreach email. Output: SUBJECT: ... BODY: ...', maxSteps: 3 },
        ],
    });

    // Store: save the generated output as a memory
    await client.memory.save({
        email,
        content: `Outreach sent on ${new Date().toISOString()}: ${result.data?.output?.slice(0, 200)}`,
    });

    return result.data?.output ?? '';
}
```

---

### Pattern 2: Dedup-Before-Save

Check whether a record already exists before writing. This prevents duplicate records when ingesting from an external source.

```typescript
async function upsertLead(lead: { email: string; firstName: string; company: string; title: string }) {
    const existing = await client.memory.retrieve({ email: lead.email });

    if (existing.data) {
        // Record exists -- update properties, don't re-memorize free text
        await client.memory.updateProperties({
            key: lead.email,
            properties: {
                firstName: lead.firstName,
                company: lead.company,
                title: lead.title,
                lastSeenAt: new Date().toISOString(),
            },
        });
    } else {
        // New record -- memorize as free text (platform extracts properties automatically)
        await client.memory.save({
            email: lead.email,
            content: `New lead: ${lead.firstName}, ${lead.title} at ${lead.company}.`,
        });
    }
}
```

---

### Pattern 3: Semantic Search + Structured Filter

Find candidates semantically, then narrow with a structured filter. Useful when the semantic search scope is broad.

```typescript
async function findExecutivesAtFintechCompanies(): Promise<string[]> {
    // Semantic search: broad intent signal
    const candidates = await client.memory.search({
        query: 'technical decision maker fintech',
        limit: 50,
    });

    // Structured filter: narrow by property value
    // (client-side post-filter when server-side AND is not available in one call)
    const executives = candidates.data.filter(
        r => r.properties?.seniority === 'executive' || r.properties?.seniority === 'vp'
    );

    return executives.map(r => r.email).filter(Boolean);
}

// Alternative: use memory_filter_by_property for pure structured search
async function findByProperty(): Promise<string[]> {
    const result = await client.memory.filterByProperty({
        filters: [
            { property: 'seniority', operator: 'equals', value: 'executive' },
            { property: 'industry', operator: 'equals', value: 'fintech' },
        ],
        limit: 50,
    });
    return result.data.map(r => r.email).filter(Boolean);
}
```

---

### Pattern 4: Bulk Operation via Cookbook Recipe

For any operation touching 5 or more records, route to `personize_cookbook` rather than hand-looping.

```typescript
// In an MCP session:
// Call: personize_cookbook with query = "import 500 leads from CSV with dedup"
// The cookbook returns a complete, rate-limit-aware script.
// Follow the recipe rather than writing your own loop.

// If you must write a batch loop for content extraction, use saveBatch (memorizeBatch is deprecated):
async function batchIngestLeads(leads: Array<{ email: string; name: string }>) {
    const BATCH_SIZE = 25; // platform-safe batch size
    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
        const batch = leads.slice(i, i + BATCH_SIZE);
        await client.memory.saveBatch({
            records: batch.map(lead => ({
                email: lead.email,
                content: `Lead: ${lead.name}`,
            })),
        });
        // Respect rate limits: pause between batches
        if (i + BATCH_SIZE < leads.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}
```

---

### Pattern 5: Workspace Handoff Between Agents

An orchestrator writes task state to a workspace; a specialist agent reads it.

```typescript
// Orchestrator agent: write handoff state
await client.memory.save({
    type: 'workspace',
    name: 'acme-q3-pipeline',
    content: `Handoff from research agent. Sarah (sarah@acme-corp.io) is ready for outreach.
    Key signals: promoted to VP Engineering last month, recently evaluated competitor tools,
    attended DevConf 2026. Recommended next action: warm intro via mutual connection James at Stripe.`,
});

// Specialist (outreach) agent: read the workspace before acting
const workspace = await client.memory.retrieve({ workspaceId: 'acme-q3-pipeline' });
const handoff = workspace.data?.memories?.at(-1)?.content ?? '';
// Act on handoff state
```

---

### Pattern 6: Self-Scoped Memory for User Preferences

Storing and recalling a user's personal working style across sessions.

```typescript
// At the end of a session: save user preferences discovered during the conversation
await client.memory.save({
    about: 'self',
    content: 'User prefers bullet-point summaries over prose. Dislikes jargon. Wants confidence levels explicit.',
});

// At the start of the next session: recall self preferences before responding
const selfContext = await client.memory.retrieve({ about: 'self' });
const preferences = selfContext.data?.memories?.map(m => m.content).join('\n') ?? '';
// Inject preferences into the system prompt or generation instructions
```

---

## 7. Cross-Links to Existing References

This document covers the tool routing layer. The following reference files cover adjacent concerns:

| Reference | When to use it |
|---|---|
| `reference/memory-as-business-model.md` | The mental model behind all of this -- why model memory, the three retrieval layers, the boundary question. Read first when the question is "how should I think about this?" |
| `reference/integration-modes.md` | Choosing between SDK, MCP, API, CLI, multi-agent, and no-code per integration archetype. Start here for "how should my system connect to Personize?" |
| `reference/schema-design-guide.md` | Designing the record + property schema for a new domain: property types, extraction-quality descriptions, and worked example schemas. |
| `reference/graph-relations.md` | When to model connections as graph edges vs. properties, the relation-type registry, and how to query the graph (`sources.graph`). |
| `reference/governance-authoring.md` | Authoring guidelines: naming for routing, constraint levels (MUST/SHOULD/MAY), token budget, anti-patterns. |
| `reference/design-patterns.md` + `reference/production-patterns.md` | Architectural patterns (event-driven, CQRS, workspace) and operational patterns (coordinated program, ledger, fleet dispatch, escalation). |
| `reference/instruction-patterns.md` | Authoring multi-step `instructions[]` prompts: the 9-pattern catalog, error-handling tiers, context-wiring. |
| `reference/cost-simulator.md` | The compaction cost model: Personize compact recall vs. raw-LLM vs. RAG, with savings math. |
| `reference/audit-and-plan.md` | Onboarding an existing corpus: audit → destination per data type → sequence the import → verify. |

---

## 8. Honest Gaps

The following affordances do NOT have a single-tool implementation today. Each requires composing multiple tool calls (composite affordances) or is not yet supported at all (placeholder).

| Affordance | Status | Why It Matters |
|---|---|---|
| **Records.View** | Composite: `memory_retrieve` + `memory_get_properties` + `context_attachment_list` | Agents designing a "record detail" view must compose three calls. Each returns a different slice: memories, properties, linked files. |
| **Records.Describe** | Composite: `collection_list` + `memory_get_properties` | No single tool returns "the full schema for this record type." |
| **Memories.Update** | Composite gap: delete + re-save | The platform treats memories as immutable. Mutation requires two-step delete + re-write. For structured fields, use `memory_update_property` instead -- that IS idempotent. |
| **Locate-anything** | No single tool: chain `memory_retrieve` → `memory_search` → `context_retrieve` | When the agent has a name or description but no exact key, it must resolve the key through a lookup cascade. |
| **Bulk-update** | No single tool: `memory_filter_by_property` + loop, or `personize_cookbook` | Updating a property across many records requires either a cookbook recipe or a hand-written batch loop with manual rate limiting. |
| **Cross-tab join** | Composite: parallel `memory_search` + `context_retrieve` | No single call retrieves both record data and applicable governance rules. The two-call parallel pattern is the canonical workaround. |
| **Graph.Neighbors / Traverse** | Live -- not a gap | `retrieve_unified(mode='scout', record={id}, sources={graph:true})` on agent2_0, or `POST /api/v1.1/memory/retrieve` with `sources.graph`. See `graph-relations.md`. |
| **Graph.AddEdge** | No manual API, by design | Edges are inferred automatically from foreign-key-shaped properties (`company`, `assigned_to_email`, ...) at memorize time; manual seeding is rarely needed. |

### Why surface gaps explicitly?

An agent that doesn't know a gap exists will either:
1. Hallucinate a tool name (e.g., call `memory_view`, `memory_locate`, `memory_describe`, `memory_bulk_update` -- none of which exist).
2. Call `personize_cookbook` with a vague query and get confused by the recipe's multi-step nature.
3. Ask the user "how do I do this?" when it should just compose the tools.

Naming the gap turns it from a failure mode into a design decision: the agent knows it must compose, so it composes deliberately rather than guessing.

### Roadmap context

These gaps are tracked in the spec `Docs/superpowers/specs/2026-05-14-agent-memory-mental-model-design.md` under "Out of scope (deferred)." The team's intentional choice was to surface the gaps in documentation rather than add wrapper tools that obscure complexity. Graph *traversal* (read) has since landed -- `sources.graph` on v1.1 retrieve and agent2_0 `retrieve_unified`; section 4's Graph rows reflect it. A manual edge-*write* API remains intentionally deferred in favor of automatic inference at memorize time.

---

## agent2_0 — Collapsed Routing Reference

For agents on the `agent2_0` profile (5-tool surface). All legacy retrieval tools collapse into `retrieve_unified` modes.

| If you want to... | Old call (legacy profiles) | agent2_0 call |
|---|---|---|
| Find a contact by email | `memory_retrieve({ email })` | `retrieve_unified(mode='scout', email='...')` |
| Find a company by domain | `memory_retrieve({ website_url })` | `retrieve_unified(mode='scout', website_url='...')` |
| Search by keyword/description | `memory_search({ query })` | `retrieve_unified(mode='scout', query='...')` |
| Filter by structured property | `memory_filter_by_property({ filters })` | `retrieve_unified(mode='filter', filters=[...])` |
| See properties on a record | `memory_get_properties({ key })` | `retrieve_unified(mode='fetch', fetch={propertyNames:[{recordId:'...', names:[...]}]})` — or `mode='scout', record={email:'...'}, sources={properties:true, memories:false}` |
| Find similar records | `memory_find_similar({ seed_email })` | `retrieve_unified(mode='scout', query='similar to ...')` |
| Retrieve governance rules | `context_retrieve({ message })` | `retrieve_unified(mode='scout', message='...', sources={documents:true, memories:false}, intent={perSource:{documents:{types:['guideline','playbook']}}})` |
| Deepen a prior retrieval session | *(no tool)* | `retrieve_unified(mode='expand', continueFrom=<sessionId>)` |
| Traverse entity relationships | *(no tool)* | `retrieve_unified(mode='scout', record={id:'...'}, sources={graph:true})` |
| Save a new memory (free text) | `memory_save({ email, content })` | `memory_save({ email, content })` *(same)* |
| Save structured field update | `memory_update_property / memory_update_properties` | `memory_save({ email, properties: { field: value } })` — content optional |
| Save a narrative document | `context_save({ type: 'guideline', value })` | `memory_save({ email, shape: 'document', content: '...' })` |
| Save an org-level document | `context_save({ type: 'guideline' })` | `memory_save({ shape: 'document', type: 'guideline' })` — no record key |
| Recall self preferences | `memory_retrieve({ about: 'self' })` | `retrieve_feedback()` |
| Scale op (5+ records) | `personize_cookbook` | `personize_cookbook` *(same)* |
| Bootstrap / orient | `personize_skill` → `personize_context` | `personize_md` |

**Key behavioral rules for agent2_0:**
1. Call `retrieve_unified` TWICE per turn when both memory and governance are needed (scout/filter + contexts).
2. `memory_save` content is optional — properties-only saves are valid shortform updates.
3. Call `memory_save` TWICE on the same record key when both a shortform property update AND a narrative document are warranted.
4. Org-level writes use `memory_save` with no `email`/`website_url` key — they are readable by all agents via `retrieve_unified` with `sources={documents:true}`.
5. Full account brief = 3 retrieve_unified calls typical (company scout + contacts filter + governance contexts).

---

## Quick-Reference: Tab × Tool Cheatsheet

For fast lookup without reading the full matrix.

| If you want to... | Call this |
|---|---|
| Find a contact by email | `memory_retrieve({ email })` |
| Find a company by domain | `memory_retrieve({ website_url })` |
| Search by description or keyword | `memory_search({ query, limit })` |
| Filter by structured property | `memory_filter_by_property({ filters })` |
| See all properties on a record | `memory_get_properties({ key })` |
| Set a structured property | `memory_update_property({ key, name, value })` |
| Set multiple properties at once | `memory_update_properties({ key, properties })` |
| Save a new memory (free text) | `memory_save({ email, content })` |
| Save a workspace handoff | `memory_save({ type: 'workspace', name, content })` |
| Save a self-scoped note | `memory_save({ about: 'self', content })` |
| Split an oversized memory | `memory_segment({ memoryId })` |
| List all collections and their schemas | `collection_list()` |
| Create a new collection type | `collection_create({ name, entityType })` |
| Retrieve governance rules for a task | `context_retrieve({ message, types? })` |
| Save a new guideline | `context_save({ name, value, type: 'guideline' })` |
| List context docs | `context_manage_list({ type? })` |
| List attachments on a guideline | `context_attachment_list({ guidelineId })` |
| Upload a file to a guideline | `context_attachment_upload({ guidelineId, file, metadata })` |
| Run a scale operation (5+ records) | `personize_cookbook` -- get a recipe first |
| Batch ingest (structured, known fields) | `memory_upsert` / `client.memory.upsert({ records })` |
| Batch ingest (content → extraction) | `client.memory.saveBatch({ records })` (or `personize_cookbook` recipe) |

---

*Last updated: 2026-05-31. Corrected `retrieve_unified` schema to match the actual zod definition in `src/modules/internal/mcp-connector/tools/retrieve-unified.tools.ts`: real modes are `scout` / `brief` / `expand` / `filter` / `fetch`. Earlier drafts listed `properties` / `contexts` / `graph` as modes — those are actually `sources` toggles (independent on/off knobs), not modes. Governance retrieval = `mode='scout'` with `sources={documents:true}` + `intent.perSource.documents.types`. Graph traversal = any mode with `sources.graph:true`. Property discovery on a record = `mode='fetch'` + `fetch.propertyNames` (or `sources.properties` in scout). Legacy routing matrix (section 4) remains accurate for `agent`, `developer`, and `governance` profiles. When MCP tool names or SDK method signatures change, update section 4 AND the agent2_0 collapsed reference, then re-run `seed-platform-guidelines.ts --force` to propagate to the cookbook.*
