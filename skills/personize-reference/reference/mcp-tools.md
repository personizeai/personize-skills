# Personize MCP Tool Reference

## Canonical Tool Names (v1.1)

| Tool | Description |
|------|-------------|
| `memory_save` | Save memories with AI extraction |
| `memory_retrieve` | The only read. Modes (what you're doing): `scout`, `brief`, `expand`, `filter`, `fetch`. Sources (where to look - toggle each): `properties`, `memories`, `documents`, `graph`, `external`. |
| `memory_feedback` | Rates a past retrieve (by `retrievalId`) |
| `context_retrieve` | Find relevant docs by type/message (superseded a since-renamed pre-v1.1 governance-retrieval tool) |
| `context_save` | Evolve docs with AI |
| `context_manage_create` | Create context doc |
| `context_manage_list` | List context docs (superseded a since-renamed pre-v1.1 guideline-listing tool) |

---

## Core tools

Five tools make up the core list. Tiers come from the tool catalog (`tool-catalog.ts`): `read` tools only read, `agent` tools also write or delete.

| Tool | Tier | Role |
|------|------|------|
| `personize_md` | read | Orientation README: org identity, collections, doc index, routing rules |
| `memory_retrieve` | read | The only read |
| `memory_feedback` | read | Rates a past retrieve (by `retrievalId`) |
| `memory_save` | agent | The only write: `text`, `property`, `document`, `identifiers`; `items[]` only for shortform/freeform/document batches |
| `memory_delete` | agent | The only destructive call |

Older tool names still work; see `Docs/generated/migration-table.json` (and the legacy-translation table under Memory CRUD).

---

| Category | Tools | Profile |
|----------|-------|---------|
| Memory Core | memory_save, memory_retrieve, memory_delete, memory_feedback | agent, developer |
| Governance | context_retrieve, context_manage_list, context_manage_read, context_save, context_manage_update, context_manage_delete | governance, developer |
| Attachments | context_attachment_list, context_attachment_read, context_attachment_upload, context_attachment_delete | governance, developer |
| Collections | collection_list, collection_create, collection_update, collection_delete, collection_history | developer |
| Platform | organization_get, organization_create, members_list, members_invite, entity_type_get, entity_type_update | developer |
| MCPs + Destinations | mcp_list, mcp_create, destination_list, destination_create | developer |
| Analytics | analytics_overview | developer |
| Notifications | notification_send, notification_list | developer |
| Context | personize_md, personize_cookbook | developer |

---

## MCP Profiles

| Profile | Description |
|---------|-------------|
| **agent2_0** | Consolidated surface for agentic workflows, built on the canonical tools `memory_retrieve`, `memory_feedback` and `memory_save` plus `personize_cookbook` and `personize_md`. |
| agent | Memory read/write + SmartContext (read-only). Legacy full-surface profile. |
| agent-readonly | Memory read + SmartContext. Zero mutations. |
| governance | Governance CRUD + SmartContext. No memory tools. |
| developer | Everything. Full platform access for IDE/chat. |

---

## Unified Retrieval

### `memory_retrieve`
**Tier:** read (the only read). The old names `retrieve_unified` and `retrieve_feedback` are legacy translations to `memory_retrieve` and `memory_feedback` (`tool-catalog.ts:95,105`).
**Endpoint:** `POST /api/v1.1/memory/retrieve` (API-key) / `POST /api/v1/retrieve` (gateway). Server-gated by `FEATURE_UNIFIED_RETRIEVE_V1`; older servers return 404.

Single retrieval tool covering filter, scout, brief, expand and fetch (including documents, property history and `fetch.identifiers`).

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
| intent | object | no | `{ raw, bucket, perSource: { memories:{limit,offset}, documents:{limit,offset,types[],tags[]}, graph:{limit,offset}, external:{connectionNames[],topK} } }`. `intent.raw` drives `suggestedNext`. `perSource` caps each source independently - e.g. `documents.types: ['guideline','playbook']` narrows to specific doc types; `external.connectionNames: ['pinecone-prod']` targets specific external RAGs. |
| budget | object | no | `{ totalTokens (≤50K), allocation: {source: weight 0-1} }`. Token cap for brief synthesis. Defaults: properties=0.1, memories=0.35, documents=0.3, graph=0.05, external=0.2. Empty sources auto-redistribute. |
| chatHistory | array | no | Last 6 turns passed to brief synthesizer for multi-turn context. Caller redacts PII. |
| sessionId | uuid | no | Reuse an existing session. Most callers don't set this - scout/brief auto-create sessions. |
| resetEvery | int | no | After this many `expand` calls, session offsets reset to 0 (default 10). 0 = never. |
| synthesize | bool \| `'deferred'` | no | Brief mode only. `'deferred'` returns scout immediately (202); poll `GET /api/v1.1/memory/retrieve/:retrievalId/synthesis` for the answer. |
| qualityTier | enum | no | Brief mode only: `basic`, `pro`, `ultra`. |

**Modes** (what you're doing):

| Mode | Use when |
|------|----------|
| `scout` (default) | Cheap multi-source aggregation. "What do we know about sarah@acme-corp.io?" |
| `brief` | LLM-synthesized natural-language answer over retrieved context. "What's John's budget? Give me the answer." |
| `expand` | Paginate a prior scout/brief session via `continueFrom`. "Tell me more from where I left off." |
| `filter` | Deterministic SQL-like queries (17 operators, AND/OR groups, pagination). "All CTOs in healthcare > 100." |
| `fetch` | When you already have IDs (memory/doc/edge/attachment) or specific property names on a record. |

There is no `mode: "similar"` on MCP retrieve. Lookalike search is REST/SDK `retrieve` with `mode=similar`.

**Sources** (where to look - independent on/off toggles):

| Source | Default behavior | What it returns |
|---|---|---|
| `sources.properties` | on for scout/filter | Structured fields on matching records (with schema descriptions) |
| `sources.memories` | on for scout/brief | Freeform semantic memories |
| `sources.documents` | on for scout/brief | Context docs (guideline / playbook / reference / template / brief) |
| `sources.graph` | on for scout | Relation edges (works_at, reports_to, participated_in, ...) |
| `sources.external` | off (opt-in) | Customer's external RAG (Pinecone / Weaviate / Qdrant). Use `intent.perSource.external.connectionNames` to target specific connections. |

**Defaults per mode:** scout = all sources on. brief = all on except graph. filter = properties only. fetch = nothing automatically (you specify in `fetch`).

**RGAS loop - call `memory_retrieve` TWICE per turn when both memory and governance are needed.** Same tool, same mode, different `sources` toggles:

1. **Recall (memory):**
   ```
   memory_retrieve(mode='scout', record={email: '...'})
   ```
2. **Govern (documents only):**
   ```
   memory_retrieve(
       mode='scout',
       message='<task description>',
       sources={documents: true, memories: false},
       intent={perSource: {documents: {types: ['guideline', 'playbook']}}}
   )
   ```

**Common patterns:**

| You want… | Call |
|---|---|
| "What do we know about John?" | `memory_retrieve(mode='scout', record={email: 'john@acme.com'})` |
| LLM-synthesized answer | `memory_retrieve(mode='brief', message='What's his budget?', record={email: 'john@acme.com'})` |
| Governance for a task | `memory_retrieve(mode='scout', message='<task>', sources={documents: true, memories: false}, intent={perSource: {documents: {types: ['guideline','playbook']}}})` |
| Graph traversal | `memory_retrieve(mode='scout', record={id: '...'}, sources={graph: true})` |
| Property values on a record | `memory_retrieve(mode='fetch', fetch={propertyNames: [{recordId: '...', names: ['Status','Budget']}]})` |
| Deterministic filter | `memory_retrieve(mode='filter', filters={groups: [{conditions: [{property: 'title', operator: 'CONTAINS', value: 'CTO'}]}]})` |
| Paginate prior session | `memory_retrieve(mode='expand', continueFrom=<state.sessionId>)` |
| Multi-source incl. external RAG | `memory_retrieve(mode='brief', message=..., record={email:...}, sources={memories:true, documents:true, external:true}, intent={perSource:{external:{connectionNames:['pinecone-prod']}}})` |

**Pagination loop:**
1. Call `mode='scout'` or `'brief'` → response includes `state.sessionId`.
2. Call `mode='expand', continueFrom=<state.sessionId>` → auto-advances offset, returns next page.
3. Repeat until `state.exhausted.memories=true` (or whichever source you care about).
4. After `resetEvery` calls (default 10), session auto-resets and the next call starts from the beginning.

When to paginate (don't paginate reflexively - adds cost and latency):
- Task says "all / everything / full history / comprehensive" AND `state.exhausted.memories=false` → expand once more.
- Simple lookups ("what's John's title?") → 25 items is enough, don't expand.

---

### `memory_feedback`
**Tier:** read

Rates a past `memory_retrieve` call (by `retrievalId`). Legacy name `retrieve_feedback` translates to `memory_feedback`.

---

## Memory Core

### `memory_save`
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

For structured writes with no AI extraction (known field values), use `memory_save` with `shape=property`, one call per record. `items[]` carries only shortform, freeform and document batches.

### `memory_retrieve(mode='brief')`
See the `memory_retrieve` section above for the full parameter set. Gets an LLM-synthesized, token-budgeted digest for an entity.

---

## Memory CRUD

Single-property updates go through `memory_save` (`shape=property`, one call per record). Content batches over many records use the SDK `client.memory.save({ shape: 'shortform', items: [...] })` or `personize_cookbook`.

Key management and property reads use the canonical tools. The old tool names are legacy translations (`tool-catalog.ts`):

| Legacy name (still works) | Canonical |
|---|---|
| `update_keys` | `memory_save shape=identifiers` (`record`, `add: [{name, value}]`), one call per record |
| `list_keys` | `memory_retrieve mode=fetch fetch.identifiers` |
| `delete_keys` | `memory_delete` (`type=identifier`); blocks if it would leave zero aliases |
| `memory_get_properties` | `memory_retrieve mode=fetch` (`fetch.propertyNames`) |
| `retrieve_unified` | `memory_retrieve` |
| `retrieve_feedback` | `memory_feedback` |

---

## Governance

### `context_retrieve`
**Profile:** all profiles

Smart guideline/context-doc routing. Selects relevant guidelines (and, with `types`, other Context Doc types) for a task.

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

### `context_manage_list`
List all organizational guidelines/context docs. Returns name, id, tags, content, governanceScope.

> Also accepts a `contextDocType` / `agentDocType` parameter to filter by doc type: guideline, playbook, reference, template, brief.

### `context_manage_read`
Read guideline structure (headings) or a specific section.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| guideline_id | string | yes | Guideline ID |
| header | string | no | Section header (omit for TOC) |

### `context_save`
Create a new guideline or context doc.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | yes | Guideline name |
| value | string | yes | Markdown content |
| description | string | no | Short description |
| tags | string[] | no | Tags for routing |
| contextDocType | string | no | Doc type: guideline (default), playbook, reference, template, brief |

### `context_manage_update`
Update a guideline. Supports replace, append, section, appendToSection modes.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| guideline_id | string | yes | Guideline to update |
| value | string | no | New content |
| update_mode | string | no | replace, append, section, appendToSection |
| section_header | string | no | Target section (for section modes) |

### `context_manage_delete`
Delete a guideline by ID.

---

## Attachments

### `context_attachment_list` -- List attachments for a guideline
### `context_attachment_read` -- Get attachment metadata + download URL
### `context_attachment_upload` -- Upload a new attachment (multipart)
### `context_attachment_delete` -- Delete an attachment

---

## Collections

### `collection_list` -- List property collections (paginated)
### `collection_create` -- Create with properties, entityType, definition
### `collection_update` -- Incremental property update
### `collection_delete` -- Delete a collection
### `collection_history` -- Version history (full or diff mode)

---

## Platform

### `organization_get` -- Get current organization
### `organization_create` -- Create new organization
### `members_list` -- List all members
### `members_invite` -- Invite members by email
### `entity_type_get` -- Get one entity type by ID (no MCP tool lists all entity types)
### `entity_type_update` -- Update entity type display name/icon
### `mcp_list` -- List MCP servers
### `mcp_create` -- Create MCP server
### `destination_list` -- List webhook destinations
### `destination_create` -- Create webhook destination

---

## Context & Skills

### `personize_md`
Bootstrap context. Returns org identity, collections, guidelines index, routing rules, session phase, and handoffs.

### `personize_cookbook`
Score platform guidance against the current task and return relevant sections + attachment previews.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| message | string | yes | Task/question description |
| focus | string | no | Narrow to a specific guideline or topic |

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

---

## Kits

Provision an empty org's schema + governance from a declarative manifest. New orgs start empty - install a kit to seed collections, entity types, and guidelines in one shot. Built-in kits: `personize-starter`, `engineering-memory`.

### `kits_list`
List available kits (built-in + custom). Returns kit id, name, description, and what it provisions.

### `kits_install`
Install a kit into the current org. Async - returns an `installId` to poll.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| kitId | string | conditional | Built-in kit id (`personize-starter`, `engineering-memory`) |
| manifest | object | conditional | Inline kit manifest (alternative to `kitId`) |

### `kits_get_status`
Poll install progress by `installId`. Returns terminal status when provisioning completes.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| installId | string | yes | Install ID returned by `kits_install` |
