# Personize MCP Tool Reference

## Canonical Tool Names (v1.1)

| Tool | Description |
|------|-------------|
| `memory_save` | Save memories (was memory_store_pro) |
| `memory_retrieve` | Retrieve memories (was memory_recall_pro / smartRecall) |
| `retrieve_unified` | **agent2_0 only** — unified retrieval replacing 6 legacy tools. Modes (what you're doing): `scout`, `brief`, `expand`, `filter`, `fetch`. Sources (where to look — toggle each): `properties`, `memories`, `documents`, `graph`, `external`. |
| `retrieve_feedback` | **agent2_0 only** — retrieve user-private feedback and preferences |
| `context_retrieve` | Find relevant docs (was ai_smart_docs / agentdocs_retrieve) |
| `context_save` | Evolve docs with AI (was governance_smart_update / agentdocs_save) |
| `context_manage_create` | Create context doc (was guideline_create / agentdocs_manage_create) |
| `context_manage_list` | List context docs (was guideline_list / agentdocs_manage_list) |

---



| Category | Tools | Profile |
|----------|-------|---------|
| Unified Recall | smartRecall | agent, agent-readonly, developer |
| Memory Core | memory_store_pro, memory_recall_pro, memory_digest | agent, developer |
| Memory Search | memory_search | agent, agent-readonly, developer |
| Memory Similarity | memory_similarity, memory_batch | agent, developer |
| Memory CRUD | memory_update_property, memory_update_keys, memory_list_keys, memory_delete_keys | agent, developer |
| Memory Properties | memory_get_properties | agent, agent-readonly, developer |
| Governance | ai_smart_guidelines, ai_smart_docs, guideline_list, guideline_read, guideline_create, guideline_update, guideline_delete | governance, developer |
| Attachments | guideline_attachment_list, guideline_attachment_read, guideline_attachment_upload, guideline_attachment_delete | governance, developer |
| Collections | collection_list, collection_create, collection_update, collection_delete, collection_history | developer |
| Platform | organization_list, organization_create, member_list, member_invite, entity_type_list, entity_type_update | developer |
| MCPs + Destinations | mcp_list, mcp_create, destination_list, destination_create | developer |
| Analytics | analytics_overview | developer |
| Notifications | notification_send, notification_list | developer |
| Context | personize_context, personize_skill | developer |

---

## MCP Profiles

| Profile | Description |
|---------|-------------|
| **agent2_0** | **5-tool surface: `retrieve_unified`, `retrieve_feedback`, `memory_save`, `personize_cookbook`, `personize_md`. Consolidated for agentic workflows. Use this for new integrations.** |
| agent | Memory read/write + SmartContext (read-only). Legacy full-surface profile. |
| agent-readonly | Memory read + SmartContext. Zero mutations. |
| governance | Governance CRUD + SmartContext. No memory tools. |
| developer | Everything. Full platform access for IDE/chat. |

---

## agent2_0 — Unified Retrieval

### `retrieve_unified`
**Profile:** agent2_0 only
**Endpoint:** `POST /api/v1.1/memory/retrieve` (API-key) / `POST /api/v1/retrieve` (gateway). Server-gated by `FEATURE_UNIFIED_RETRIEVE_V1`; older servers return 404.

Single retrieval tool replacing `memory_search`, `memory_filter_by_property`, `memory_retrieve`, `memory_find_similar`, `memory_get_properties`, `context_retrieve`, and `memory_segment`.

**Mental model: `mode` × `sources`.** `mode` is *what you're doing*; `sources` is *where to look*. They compose independently.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| mode | enum | no (default `scout`) | One of `scout`, `brief`, `expand`, `filter`, `fetch`. See mode table. |
| record | object | conditional | Target record. One of: `{id}`, `{ids[]}` (max 50), `{email}`, `{websiteUrl}`, `{name, parent?}`, `{phone}`, `{customKey:{name,value}}`. Used by scout/brief/expand. |
| message | string | conditional | The user's question. Required for `mode='brief'`. Also used by external-RAG search and intent classification. |
| continueFrom | uuid | conditional | Required for `mode='expand'`. Session ID from `response.state.sessionId` of a prior scout/brief/expand call. |
| filters | object | conditional | For `mode='filter'`. Shape: `{ groups: [{ logic: 'AND'|'OR', conditions: [{property, operator, value}] }], page, pageSize, sortOrder, countOnly, listAll, crmFilter }`. 17 operators: `EQ`, `NEQ`, `CONTAINS`, `NOT_CONTAINS`, `STARTS_WITH`, `ENDS_WITH`, `GT`, `GTE`, `LT`, `LTE`, `BETWEEN`, `NOT_BETWEEN`, `IN`, `NOT_IN`, `IS_SET`, `IS_NOT_SET`, `IS_EMPTY`, `EXISTS`, `NOT_EXISTS`. |
| fetch | object | conditional | For `mode='fetch'`. Sub-keys: `memoryIds[]` (max 100), `documentIds[]`, `edgeIds[]`, `attachmentIds[]`, `propertyNames: [{recordId, names[]}]` (max 20), `propertyHistory: [{recordId, propertyName, limit?, since?, until?}]`. Combine any sub-types in one call. |
| sources | object | no | Toggle each source on/off: `{ properties, memories, documents, graph, external }`. Defaults vary per mode (see below). |
| intent | object | no | `{ raw, bucket, perSource: { memories:{limit,offset}, documents:{limit,offset,types[],tags[]}, graph:{limit,offset}, external:{connectionNames[],topK} } }`. `intent.raw` drives `suggestedNext`. `perSource` caps each source independently — e.g. `documents.types: ['guideline','playbook']` narrows to specific doc types; `external.connectionNames: ['pinecone-prod']` targets specific external RAGs. |
| budget | object | no | `{ totalTokens (≤50K), allocation: {source: weight 0-1} }`. Token cap for brief synthesis. Defaults: properties=0.1, memories=0.35, documents=0.3, graph=0.05, external=0.2. Empty sources auto-redistribute. |
| chatHistory | array | no | Last 6 turns passed to brief synthesizer for multi-turn context. Caller redacts PII. |
| sessionId | uuid | no | Reuse an existing session. Most callers don't set this — scout/brief auto-create sessions. |
| resetEvery | int | no | After this many `expand` calls, session offsets reset to 0 (default 10). 0 = never. |
| synthesize | bool \| `'deferred'` | no | Brief mode only. `'deferred'` returns scout immediately (202); poll `GET /api/v1.1/memory/retrieve/:retrievalId/synthesis` for the answer. |
| qualityTier | enum | no | Brief mode only: `basic`, `pro`, `ultra`. |

**Modes** (what you're doing):

| Mode | Replaces | Use when |
|------|----------|----------|
| `scout` (default) | `memory_retrieve` + `memory_search` + `memory_find_similar` | Cheap multi-source aggregation. "What do we know about sarah@acme-corp.io?" |
| `brief` | *(new)* | LLM-synthesized natural-language answer over retrieved context. "What's John's budget? Give me the answer." |
| `expand` | *(new)* | Paginate a prior scout/brief session via `continueFrom`. "Tell me more from where I left off." |
| `filter` | `memory_filter_by_property` + `memory_segment` | Deterministic SQL-like queries (17 operators, AND/OR groups, pagination). "All CTOs in healthcare > 100." |
| `fetch` | `memory_get_properties` + direct ID lookups | When you already have IDs (memory/doc/edge/attachment) or specific property names on a record. |

**Sources** (where to look — independent on/off toggles):

| Source | Default behavior | What it returns |
|---|---|---|
| `sources.properties` | on for scout/filter | Structured fields on matching records (with schema descriptions) |
| `sources.memories` | on for scout/brief | Freeform semantic memories |
| `sources.documents` | on for scout/brief | Context docs (guideline / playbook / reference / template / brief) |
| `sources.graph` | on for scout | Relation edges (works_at, reports_to, participated_in, ...) |
| `sources.external` | off (opt-in) | Customer's external RAG (Pinecone / Weaviate / Qdrant). Use `intent.perSource.external.connectionNames` to target specific connections. |

**Defaults per mode:** scout = all sources on. brief = all on except graph. filter = properties only. fetch = nothing automatically (you specify in `fetch`).

**RGAS loop for agent2_0 — call `retrieve_unified` TWICE per turn when both memory and governance are needed.** Same tool, same mode, different `sources` toggles:

1. **Recall (memory):**
   ```
   retrieve_unified(mode='scout', record={email: '...'})
   ```
2. **Govern (documents only):**
   ```
   retrieve_unified(
       mode='scout',
       message='<task description>',
       sources={documents: true, memories: false},
       intent={perSource: {documents: {types: ['guideline', 'playbook']}}}
   )
   ```

**Common patterns:**

| You want… | Call |
|---|---|
| "What do we know about John?" | `retrieve_unified(mode='scout', record={email: 'john@acme.com'})` |
| LLM-synthesized answer | `retrieve_unified(mode='brief', message='What's his budget?', record={email: 'john@acme.com'})` |
| Governance for a task | `retrieve_unified(mode='scout', message='<task>', sources={documents: true, memories: false}, intent={perSource: {documents: {types: ['guideline','playbook']}}})` |
| Graph traversal | `retrieve_unified(mode='scout', record={id: '...'}, sources={graph: true})` |
| Property values on a record | `retrieve_unified(mode='fetch', fetch={propertyNames: [{recordId: '...', names: ['Status','Budget']}]})` |
| Deterministic filter | `retrieve_unified(mode='filter', filters={groups: [{conditions: [{property: 'title', operator: 'CONTAINS', value: 'CTO'}]}]})` |
| Paginate prior session | `retrieve_unified(mode='expand', continueFrom=<state.sessionId>)` |
| Multi-source incl. external RAG | `retrieve_unified(mode='brief', message=..., record={email:...}, sources={memories:true, documents:true, external:true}, intent={perSource:{external:{connectionNames:['pinecone-prod']}}})` |

**Pagination loop:**
1. Call `mode='scout'` or `'brief'` → response includes `state.sessionId`.
2. Call `mode='expand', continueFrom=<state.sessionId>` → auto-advances offset, returns next page.
3. Repeat until `state.exhausted.memories=true` (or whichever source you care about).
4. After `resetEvery` calls (default 10), session auto-resets and the next call starts from the beginning.

When to paginate (don't paginate reflexively — adds cost and latency):
- Task says "all / everything / full history / comprehensive" AND `state.exhausted.memories=false` → expand once more.
- Simple lookups ("what's John's title?") → 25 items is enough, don't expand.

---

### `retrieve_feedback`
**Profile:** agent2_0 only

Retrieve user-private feedback and preference memories (self-scoped). Equivalent to `memory_retrieve(about='self')` on the legacy surface.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | no | Natural language query to narrow feedback |

---

## Unified Recall

### `smartRecall`
**Profile:** agent, agent-readonly, developer

ONE tool that replaces 9 individual memory tools. Describe what you need in natural language -- the server classifies intent, builds an execution plan, queries all data sources, and returns structured results.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| message | string | yes | Natural language query describing what you need |
| identifiers | object | no | `{ emails?: string[], websites?: string[], record_ids?: string[] }` |
| type | string | no | Entity type filter (Contact, Company, etc.) |
| session_id | string | no | Session ID for follow-up queries (pronouns resolve) |
| output_format | string | no | 'structured' or 'narrative' |
| limit | number | no | Max results |

**Supported intents:** filter, recall, count, similar, segment, compare, analyze, browse, aggregate.

---

## Memory Core

### `memory_store_pro`
**Profile:** agent, developer

Save memories with AI-powered extraction. Extracts structured properties and semantic memories.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| content | string | yes | Content to memorize |
| about | string | no | 'lead' (default) or 'self' |
| email | string | conditional | Required when about='lead' (or website_url) |
| website_url | string | conditional | Company website (alternative to email) |
| record_id | string | no | Pre-resolved record ID |
| speaker | string | no | Speaker name (for transcript coreference resolution) |
| tier | string | no | Extraction tier: basic, pro, pro_fast, ultra |
| tags | string[] | no | Tags for property selection |
| extraction_prompt | string | no | Focus instructions (max 500 chars) |
| collection_names | string[] | no | Target collections by name |
| max_properties | number | no | Max properties to extract |
| timestamp | string | no | Content timestamp (ISO) |
| custom_key_name | string | no | Custom key field name |
| custom_key_value | string | no | Custom key value |

### `memory_recall_pro`
**Profile:** agent, developer

Semantic recall with optional reflection and answer generation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | yes | Natural language query |
| email | string | no | Scope to contact |
| website_url | string | no | Scope to company |
| mode | string | no | 'fast' (~500ms) or 'deep' (~10-20s) |
| limit | number | no | Max results (default: 10) |
| type | string | no | Entity type |
| generate_answer | boolean | no | Generate synthesized answer |
| group_by_record | boolean | no | Group results by record |

### `memory_digest`
**Profile:** agent, developer

Get compiled context digest for an entity. Token-budgeted markdown.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| email | string | conditional | Contact email (or website_url) |
| website_url | string | conditional | Company website |
| token_budget | number | no | Max tokens (default: 1000) |
| type | string | no | Entity type |
| include_properties | boolean | no | Include structured properties (default: true) |
| include_memories | boolean | no | Include freeform memories (default: true) |

---

## Memory Search

### `memory_search`
**Profile:** agent, agent-readonly, developer

Filter and search records by property conditions.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | no | Entity type |
| groups | array | no | Filter groups with conditions |
| query | string | no | Semantic search (routes to smartRecall) |
| page_size | number | no | Results per page (max: 200) |
| return_records | boolean | no | Include property values |
| include_memories | boolean | no | Include freeform memories |

---

## Memory Similarity

### `memory_similarity`
**Profile:** agent, developer

Find records similar to a seed record.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| seed_email | string | conditional | Seed record email |
| seed_record_id | string | conditional | Seed record ID |
| dimensions | string[] | no | Comparison dimensions |
| limit | number | no | Max results |

### `memory_batch`
**Profile:** agent, developer

Batch memorize multiple records.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| records | array | yes | Array of records to memorize |
| tier | string | no | Extraction tier |
| source | string | no | Source system label |

---

## Memory CRUD

### `memory_update_property`
Update a single property on a record. Supports set, array push/remove/patch.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| record_id | string | yes | Target record |
| property_name | string | yes | Property to update |
| property_value | any | conditional | New value (or use array ops) |
| array_push | object | no | `{ items: any[], unique?: boolean }` |
| array_remove | object | no | `{ items?: any[], indices?: number[] }` |

### `memory_update_keys`
Add keys (standard or custom) to a record.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| record_id | string | conditional | Target record (or email/websiteUrl) |
| type | string | yes | Entity type |
| keys | object | yes | Key:value pairs to register |

### `memory_list_keys`
List all keys on a record.

### `memory_delete_keys`
Delete specific key aliases. Blocks if it would leave zero aliases.

### `memory_get_properties`
Get record properties with collection schema descriptions.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| email | string | conditional | Contact email |
| record_id | string | conditional | Record ID |
| type | string | no | Entity type |
| non_empty | boolean | no | Only return non-empty properties |

---

## Governance

### `ai_smart_guidelines`
**Profile:** all profiles

Smart guideline routing. Selects relevant guidelines for a task.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| message | string | yes | Task/context description |
| mode | string | no | 'fast' (~200ms), 'deep' (~3s), 'auto' |
| tags | string[] | no | Filter by tags |
| max_content_tokens | number | no | Token budget (default: 10000) |

### `ai_smart_docs`
**Profile:** all profiles

Retrieve type-filtered Context Docs (guidelines, playbooks, references, templates, briefs). Use this instead of `ai_smart_guidelines` when you need non-guideline doc types.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| message | string | yes | Task/context description |
| types | string[] | no | Filter by Context Doc type: guideline, playbook, reference, template, brief |
| mode | string | no | 'fast' (~200ms), 'deep' (~3s), 'auto' |
| match | string | no | 'broad' (top-K, no floor, hierarchical), 'balanced' (default, score floor + 10K budget), 'strict' (score >= 0.7, may be empty) |
| topK | number | no | Sections to return; only used with match='broad' (default 20, max 100) |
| tags | string[] | no | Filter by tags |
| max_content_tokens | number | no | Token budget (default: 10000) |

When retrieving guidelines you'll act on, use `match='strict'` -- it returns only high-confidence matches. When surfacing related content broadly across attached docs, use `match='broad'` with a `topK`.

---

### `guideline_list`
List all organizational guidelines. Returns name, id, tags, content, governanceScope.

> Also accepts an `contextDocType` parameter to filter by doc type: guideline, playbook, reference, template, brief.

### `guideline_read`
Read guideline structure (headings) or a specific section.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| guideline_id | string | yes | Guideline ID |
| header | string | no | Section header (omit for TOC) |

### `guideline_create`
Create a new guideline or context doc.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | yes | Guideline name |
| value | string | yes | Markdown content |
| description | string | no | Short description |
| tags | string[] | no | Tags for routing |
| contextDocType | string | no | Doc type: guideline (default), playbook, reference, template, brief |

### `guideline_update`
Update a guideline. Supports replace, append, section, appendToSection modes.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| guideline_id | string | yes | Guideline to update |
| value | string | no | New content |
| update_mode | string | no | replace, append, section, appendToSection |
| section_header | string | no | Target section (for section modes) |

### `guideline_delete`
Delete a guideline by ID.

---

## Attachments

### `guideline_attachment_list` -- List attachments for a guideline
### `guideline_attachment_read` -- Get attachment metadata + download URL
### `guideline_attachment_upload` -- Upload a new attachment (multipart)
### `guideline_attachment_delete` -- Delete an attachment

---

## Collections

### `collection_list` -- List property collections (paginated)
### `collection_create` -- Create with properties, entityType, definition
### `collection_update` -- Incremental property update
### `collection_delete` -- Delete a collection
### `collection_history` -- Version history (full or diff mode)

---

## Platform

### `organization_list` -- Get current organization
### `organization_create` -- Create new organization
### `member_list` -- List all members
### `member_invite` -- Invite members by email
### `entity_type_list` -- List all entity types
### `entity_type_update` -- Update entity type display name/icon
### `mcp_list` -- List MCP servers
### `mcp_create` -- Create MCP server
### `destination_list` -- List webhook destinations
### `destination_create` -- Create webhook destination

---

## Context & Skills

### `personize_context`
Bootstrap context. Returns registered tools, org info, and usage guidance.

### `personize_skill`
Execute a skill by name. Skills provide specialized domain capabilities.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| skill_name | string | yes | Skill to execute |
| args | object | no | Skill arguments |

---

## Analytics & Notifications

### `analytics_overview` -- High-level org stats (records, memories, credits)
### `notification_send` -- Send notification to specific recipients
### `notification_list` -- List notifications for the current user

---

## Schedules

Schedule recurring or one-time tasks. Mirrors REST `/api/v1/schedules`. The most common `taskType` is `run_prompt` (executes `/api/v1/prompt` at the scheduled time, grounded on a record via `memorize.recordId`/`email`/`websiteUrl`); the other is `send_notification` (in-app or email). Results dispatch via wired destinations on `prompt.completed`.

### `schedule_create`
Create a recurring or one-time schedule.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | yes | Kebab-case, unique per org |
| taskType | enum | yes | `run_prompt` or `send_notification` |
| taskPayload | object | yes | For `run_prompt`: full `/api/v1/prompt` body. For `send_notification`: `{ contentMode, title, body, recipientUserId, channels, priority }` |
| recurring | boolean | yes | True for cron/rate, false for one-time |
| pattern | string | conditional | Required when `recurring: true`. Format: `rate(N units)` or `cron(MIN HOUR DOM MON DOW YEAR)` |
| runAt | string (ISO8601 UTC) | conditional | Required when `recurring: false` |
| timezone | string | no | IANA tz (default: UTC) |
| description | string | no | Free-text |

### `schedule_list`
List schedules with filters. Returns `{ success, data: ScheduleRecord[], nextToken?, filtered?, rawCount? }`.

| Parameter | Type | Description |
|-----------|------|-------------|
| recordId | string | Matches `taskPayload.recordId`, `taskPayload.memorize.recordId`, `taskPayload.metadata.recordId` |
| email | string | Matches `taskPayload.email`, `taskPayload.memorize.email` |
| websiteUrl | string | Matches `taskPayload.websiteUrl`, `taskPayload.memorize.websiteUrl` |
| taskType | enum | `run_prompt` or `send_notification` |
| limit | number | Page size |
| nextToken | string | Pagination cursor |

### `schedule_get`
Get one schedule by ULID id or kebab-case name.

### `schedule_update`
Partial update. **`taskPayload` is a full replacement of that field** when provided, validated against the existing taskType. Patch fewer fields if you only want to change one. Common use: `{ enabled: false }` to pause, `{ enabled: true }` to resume.

### `schedule_delete`
Soft delete with 90-day retention.

### `schedule_executions`
List execution history for one schedule (paginated). Use when you don't have destinations wired and want to poll the latest run's status.

**Server errors:** `SCHEDULE_CAP_EXCEEDED` (429), `RECORD_CAP_EXCEEDED` (429), `INSUFFICIENT_CREDITS` (402), `DUPLICATE_NAME` (409).
