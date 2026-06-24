# Personize API Endpoint Reference

## Canonical API Structure (v1.1)

### Memory
| Method | Path | Description |
|--------|------|-------------|
| POST | `/memory/save` | AI-powered memory write (extract + store) |
| POST | `/memory/save/batch` | Batch memory import |
| POST | `/memory/retrieve` | AI-powered memory retrieval (modes: fast/deep/auto) |
| POST | `/memory/retrieve/digest` | Compiled context bundle for an entity |
| POST | `/memory/manage/search` | Search records by property conditions |
| POST | `/memory/manage/update` | Update memory properties |
| POST | `/memory/manage/delete` | Soft-delete memories |
| POST | `/memory/manage/properties` | Get property definitions |

### Context
| Method | Path | Description |
|--------|------|-------------|
| POST | `/context/retrieve` | AI-powered doc routing (type-filtered) |
| POST | `/context/save` | AI-powered doc evolution (SmartUpdate) |
| GET | `/context/manage` | List context docs |
| POST | `/context/manage` | Create context doc |
| PATCH | `/context/manage/:id` | Update context doc |
| DELETE | `/context/manage/:id` | Delete context doc |

> Old endpoints (`/memorize`, `/recall`, `/smart-recall-unified`, `/ai/smart-docs`, `/smart-update`, etc.) remain as stable aliases. `/agentdocs/*` paths also remain as stable aliases for all `/context/*` routes.

---



| Category | Count | Base Path |
|----------|-------|-----------|
| Memory (store/recall/search) | 14 | /api/v1/ |
| Memory CRUD (update/delete/keys) | 12 | /api/v1/memory/ |
| Governance (guidelines/attachments) | 12 | /api/v1/guidelines/ |
| Collections | 5 | /api/v1/collections/ |
| Content (responses/chat/prompt) | 5 | /api/v1/ |
| RAG | 8 | /api/v1/rag/, /api/v1/external-rag/ |
| Platform (orgs/members/entities/mcps/destinations) | 18 | /api/v1/ |
| Analytics | 5 | /api/v1/analytics/ |
| Other (events/notifications/evaluate) | 8 | /api/v1/ |

---

## Memory Endpoints

| Method | Path | Description | Key Params |
|--------|------|-------------|------------|
| POST | /api/v1/memorize | Store with AI extraction | content, email, tier |
| POST | /api/v1/memorize_pro | Pro memorization (alias) | content, email, tier, schema |
| POST | /api/v1/batch-memorize | Batch store (async) | mapping, rows, tier, source, dryRun |
| POST | /api/v1/smart-recall | Semantic recall with reflection | query, email, mode (fast/deep), limit |
| POST | /api/v1/smart-recall-unified | Unified retrieval (one tool for all) | message, identifiers, session_id |
| POST | /api/v1/recall | Direct lookup (no reflection) | query, email, type, limit |
| POST | /api/v1/search | Filter/export records | groups, type, pageSize, returnRecords |
| POST | /api/v1/similar | Find similar records | seed, dimensions, limit |
| POST | /api/v1/segment | Segment/rank audience | seed, dimensions, tiers |
| POST | /api/v1/smart-memory-digest | Entity context digest | email, type, token_budget |
| POST | /api/v1.1/memory/upsert | Structured create/upsert (known field values, no AI extraction; single or batch). Canonical create/upsert path | records[] |
| POST | /api/v1/export | Export records (alias for search) | filters, format |
| POST | /api/v1/properties | Get record properties with schema | email, type, propertyNames |
| GET | /api/v1/test | Verify API key validity | -- |
| GET | /api/v1/me | Get user context (org, plan) | -- |

---

## Memory CRUD Endpoints

| Method | Path | Description | Key Params |
|--------|------|-------------|------------|
| POST | /api/v1/memory/update | Update single property or freeform memory | recordId, propertyName, propertyValue |
| POST | /api/v1/memory/bulk-update | Update multiple properties on a record | recordId, updates[], expectedVersion |
| POST | /api/v1/memory/delete | Soft-delete memories (30-day recovery) | ids[], crmKeys, olderThan |
| POST | /api/v1/memory/delete-record | Soft-delete all memories for a record | recordId, type, reason |
| POST | /api/v1/memory/cancel-deletion | Cancel pending soft-delete | recordId, type |
| POST | /api/v1/memory/property-history | Query property change history | recordId, propertyName, from, to, limit |
| POST | /api/v1/memory/query-properties | LLM-powered search across property values | propertyName, query, type, limit |
| POST | /api/v1/memory/filter-by-property | Deterministic property filter (no LLM) | conditions[], logic (AND/OR), limit |
| POST | /api/v1/memory/update-keys | Add keys (standard or custom) to a record | recordId, type, keys |
| POST | /api/v1/memory/update-keys-batch | Add keys across multiple records (max 100) | records[] |
| POST | /api/v1/memory/list-keys | List all keys on a record | recordId, type |
| POST | /api/v1/memory/delete-keys | Delete specific key aliases from a record | recordId, type, keys[] |

---

## Governance Endpoints

| Method | Path | Description | Key Params |
|--------|------|-------------|------------|
| GET | /api/v1/guidelines | List guidelines (paginated) | limit, nextToken, tags, summary |
| POST | /api/v1/guidelines | Create a new guideline | name, value, description, tags |
| PATCH | /api/v1/guidelines/:id | Update a guideline | name, value, updateMode, sectionHeader |
| DELETE | /api/v1/guidelines/:id | Delete a guideline | -- |
| GET | /api/v1/guidelines/:id/structure | Get guideline headings/TOC | -- |
| GET | /api/v1/guidelines/:id/section | Get a section by header | header |
| GET | /api/v1/actions/:id/history | Get guideline version history | limit |
| POST | /api/v1/smart-update | AI-powered governance evolution | type, instruction, material, strategy |
| GET | /api/v1/guidelines/:gid/attachments | List attachments | -- |
| GET | /api/v1/guidelines/:gid/attachments/:aid | Get attachment + download URL | -- |
| PATCH | /api/v1/guidelines/:gid/attachments/:aid | Update attachment metadata | description, usage, type |
| DELETE | /api/v1/guidelines/:gid/attachments/:aid | Delete an attachment | -- |

### Context Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/context` | List context docs (filter by ?type=guideline/playbook/reference/template/brief) |
| POST | `/api/v1/context` | Create context doc (set type in body) |
| PATCH | `/api/v1/context/:id` | Update context doc |
| DELETE | `/api/v1/context/:id` | Delete context doc |
| GET | `/api/v1/context/:id/structure` | Get heading tree |
| GET | `/api/v1/context/:id/section` | Get section content |
| POST | `/api/v1/context/:id/clone` | Clone context doc |
| GET | `/api/v1/context/:id/history` | Version history |
| GET | `/api/v1/context/download` | Download ZIP |
| POST | `/api/v1/ai/smart-docs` | Smart routing (type-filtered) |

> Guidelines endpoints (`/api/v1/guidelines/*`) remain available as stable aliases. `/api/v1/agentdocs/*` paths also remain as stable aliases for all `/api/v1/context/*` routes.

### Async Bulk Context Save (v1.1 only)

For seeding many context docs at once. Returns an `eventId` immediately; upserts run in a background state machine. v1-only equivalent does NOT exist — these endpoints are v1.1-exclusive.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1.1/context/save/batch` | Submit async bulk save. Body: `{ defaults?: Partial<ContextSaveBatchDocument>, documents: ContextSaveBatchDocument[] }`. Returns `{ eventId, trackingId, status, estimatedCompletionWindow, itemCount }` |
| POST | `/api/v1.1/context/save/batch/validate` | Dry-run validation of a save-batch payload — same body, no side effects |
| GET | `/api/v1.1/context/save/batch/:eventId/status` | Poll batch status: `received` → `processing` → `completed` \| `partial` \| `failed` |

**`ContextSaveBatchDocument` shape:** `{ id?, name?, externalId?, value, type?, aiExtraction?, tags?, categories?, recordIds? }`. The top-level `defaults` field applies to every document unless that document overrides the field — useful for bulk imports where all docs share a `type` (`playbook`, `guideline`, etc.) or tag set.

**When to use:** seeding 10+ docs in one shot — initial corpus import, GitOps sync of `.md` files into context, knowledge-base migration. For 1–9 docs, the synchronous `POST /api/v1/context` is simpler — no eventId polling.

---

## Collection Endpoints

| Method | Path | Description | Key Params |
|--------|------|-------------|------------|
| GET | /api/v1/collections | List property collections (paginated) | limit, nextToken, tags |
| POST | /api/v1/collections | Create a collection | collectionName, definition, entityType, properties[] |
| PATCH | /api/v1/collections/:id | Update a collection (incremental) | properties[], historyNote |
| DELETE | /api/v1/collections/:id | Delete a collection | -- |
| GET | /api/v1/collections/:id/history | Collection version history | limit, mode (full/diff) |

---

## Content Generation Endpoints

| Method | Path | Description | Key Params |
|--------|------|-------------|------------|
| POST | /api/v1/prompt | Execute a prompt with tools/outputs | prompt, instructions[], outputs[], tier |
| POST | /api/v1/prompt (stream:true) | Stream prompt as SSE | prompt, stream:true, streamTimeout |
| POST | /api/v1/responses | Step-driven orchestration | steps[], tools[], model, personize |
| POST | /api/v1/chat/completions | OpenAI-compatible chat | messages[], model, tools[], tier |
| POST | /api/v1/ai/smart-guidelines | Smart guideline routing | message, mode (fast/deep/auto), maxContentTokens |

---

## RAG Endpoints

| Method | Path | Description | Key Params |
|--------|------|-------------|------------|
| POST | /api/v1/rag/ingest | Ingest documents into a project | projectId, documents[] |
| POST | /api/v1/rag/search | Search a project | projectId, query, limit |
| GET | /api/v1/rag/projects | List projects for org | -- |
| POST | /api/v1/rag/delete | Delete documents from a project | projectId, documentIds[] |
| POST | /api/v1/rag/delete-project | Delete an entire project | projectId |
| POST | /api/v1/external-rag/config | Configure external RAG source | provider, apiKey, indexName |
| POST | /api/v1/external-rag/search | Search external RAG | query, limit |
| POST | /api/v1/external-rag/test | Test external RAG connectivity | -- |

---

## Platform Admin Endpoints

### Organizations

| Method | Path | Description | Key Params |
|--------|------|-------------|------------|
| GET | /api/v1/organizations | Get current organization | -- |
| POST | /api/v1/organizations | Create a new organization | name |
| PATCH | /api/v1/organizations | Update organization | name |

### Members

| Method | Path | Description | Key Params |
|--------|------|-------------|------------|
| POST | /api/v1/members/invite | Invite members | emails[], role |
| GET | /api/v1/members | List all members | limit, nextToken |
| GET | /api/v1/members/invitations | List pending invitations | -- |
| DELETE | /api/v1/members/:userId | Remove a member | -- |
| PATCH | /api/v1/members/:userId/role | Update member role | role |

### Entity Types

| Method | Path | Description | Key Params |
|--------|------|-------------|------------|
| GET | /api/v1/entity-types | List all entity types | -- |
| GET | /api/v1/entity-types/:id | Get entity type by ID | -- |
| PATCH | /api/v1/entity-types/:id | Update entity type | displayName, icon |
| POST | /api/v1/entity-types/:id/archive | Archive entity type | -- |

### MCP Servers

| Method | Path | Description | Key Params |
|--------|------|-------------|------------|
| POST | /api/v1/mcps/test | Test MCP connection | url, transport |
| GET | /api/v1/mcps | List all MCP servers | -- |
| POST | /api/v1/mcps | Create MCP server | name, url, transport |
| GET | /api/v1/mcps/:id | Get MCP server | -- |
| PATCH | /api/v1/mcps/:id | Update MCP server | name, url |
| DELETE | /api/v1/mcps/:id | Delete MCP server | -- |
| POST | /api/v1/mcps/:id/refresh-tools | Refresh tool list | -- |
| PATCH | /api/v1/mcps/:id/tools | Update enabled/disabled tools | enabledTools[], disabledTools[] |

### Destinations (Webhooks)

| Method | Path | Description | Key Params |
|--------|------|-------------|------------|
| POST | /api/v1/destinations | Create destination | name, url, events[] |
| GET | /api/v1/destinations | List destinations | -- |
| GET | /api/v1/destinations/:id | Get destination | -- |
| PATCH | /api/v1/destinations/:id | Update destination | name, url, events[] |
| DELETE | /api/v1/destinations/:id | Delete destination | -- |
| POST | /api/v1/destinations/:id/test | Send test event | -- |
| GET | /api/v1/destinations/:id/logs | Get delivery logs | -- |

### Kits

Provision an empty org's schema + governance from a declarative kit manifest. New orgs start empty — install a kit to seed collections, entity types, and guidelines in one shot. Built-in kits: `personize-starter`, `engineering-memory`.

| Method | Path | Description | Key Params |
|--------|------|-------------|------------|
| GET | /api/v1/kits | List available kits | -- |
| POST | /api/v1/kits | Install a kit (async, returns 202 + installId) | kitId \| manifest |
| GET | /api/v1/kits/:installId | Poll install status | -- |

---

## Analytics Endpoints

| Method | Path | Description | Key Params |
|--------|------|-------------|------------|
| GET | /api/v1/analytics/overview | High-level org stats | -- |
| GET | /api/v1/analytics/memory | Memory operation metrics | period |
| GET | /api/v1/analytics/memory/history | Historical memory metrics | period, granularity |
| GET | /api/v1/analytics/credits | Credit balance and usage | -- |
| GET | /api/v1/analytics/operations | Operations and token usage | period |

---

## Notification Endpoints

| Method | Path | Description | Key Params |
|--------|------|-------------|------------|
| POST | /api/v1/notifications/send | Send to specific recipients | recipients[], title, body |
| POST | /api/v1/notifications/broadcast | Broadcast to a group | recipientGroup, title, body |
| GET | /api/v1/notifications | List notifications for user | limit, nextToken |
| GET | /api/v1/notifications/unread-count | Get unread count | -- |
| PATCH | /api/v1/notifications/:id/read | Mark as read | -- |
| PATCH | /api/v1/notifications/:id/dismiss | Dismiss notification | -- |
| POST | /api/v1/notifications/:id/actions/:actionId | Execute notification action | -- |

---

## Other Endpoints

| Method | Path | Description | Key Params |
|--------|------|-------------|------------|
| GET | /api/v1/events/:eventId | Track async event status | -- |
| POST | /api/v1/evaluate/memorization-accuracy | Run memorization eval | collectionId, input, stream |
| POST | /api/v1/multimodal/memorize | Memorize image/media | attachments[], email |
| POST | /api/v1/multimodal/search | Search multimodal content | query, limit |
| GET | /api/v1/multimodal/status | Check multimodal status | -- |
| GET | /api/v1/agents | List available agents | limit, nextToken |
| GET | /api/v1/agents/:id | Get agent details | -- |
| POST | /api/v1/agents/:id/run | Run an agent | inputs, email, attachments[] |

## Schedules Endpoints (v1 only)

Schedules are not yet exposed on v1.1; the v1 paths below are the canonical surface and the v1 deprecation sunset (2026-07-15) does NOT apply to them.

| Method | Path | Description | Key Params |
|--------|------|-------------|------------|
| POST | /api/v1/schedules | Create schedule | name, taskType (`run_prompt`\|`send_notification`), taskPayload, recurring, pattern \| runAt, timezone |
| GET | /api/v1/schedules | List schedules | recordId, email, websiteUrl, taskType, limit, nextToken |
| GET | /api/v1/schedules/:idOrName | Get one schedule | -- |
| PATCH | /api/v1/schedules/:idOrName | Partial update (taskPayload is full-replace) | enabled, pattern, runAt, taskPayload |
| DELETE | /api/v1/schedules/:idOrName | Soft delete (90-day retention) | -- |
| GET | /api/v1/schedules/:idOrName/executions | List execution history | limit, nextToken |

**Recurrence patterns:** `rate(N minutes|hours|days|weeks)`, `cron(MIN HOUR DOM MON DOW YEAR)` (6-field AWS), shorthand `1D`/`2H`/`30M`. One-time fires set `runAt` (ISO8601 UTC) instead of `pattern`. Recurring schedules with no user-supplied `startDate` get ±60s auto-jitter.

**Server errors:** `SCHEDULE_CAP_EXCEEDED` (429), `RECORD_CAP_EXCEEDED` (429), `INSUFFICIENT_CREDITS` (402), `DUPLICATE_NAME` (409).

## CRM Passthrough Endpoints (HubSpot + Salesforce, v1 only)

Direct REST calls into HubSpot or Salesforce via the org's Personize-managed OAuth connection. SDK key (`sk_live_...`) is all you need; provider tokens never leave the backend.

| Method | Path | Description | Body |
|--------|------|-------------|------|
| POST | /api/v1/crm/hubspot/passthrough | Call any allowlisted HubSpot REST endpoint | `{ method, path, query?, body?, timeoutMs? }` |
| POST | /api/v1/crm/salesforce/passthrough | Call any allowlisted Salesforce REST endpoint | `{ method, path, query?, body?, timeoutMs? }` |

**Path allowlists (SSRF protection):**
- HubSpot: `/crm/`, `/marketing/`, `/cms/`, `/automation/`, `/files/`, `/communication-preferences/`, `/properties/`, `/owners/`, `/oauth/`
- Salesforce: `/services/data/`, `/services/apexrest/`

**Response envelope:** `{ status, headers, body, meta: { provider, upstreamRequestId, durationMs, rateLimit? } }`. Personize returns HTTP 200 whenever the upstream call completes — `status` is the *upstream* HTTP code; inspect that for the provider's outcome.

**Error codes:** `connection_not_found`, `connection_disconnected`, `invalid_path`, `invalid_method`, `upstream_timeout` (default 30s, max `timeoutMs: 60_000`), `rate_limited`.

---

## Authentication

All endpoints require `Authorization: Bearer <API_KEY>` header. The API key determines the organization context.

## Rate Limits

- Per-minute and per-month limits based on plan tier.
- 429 responses include `retryAfterSeconds`.
- SDK auto-retries with exponential backoff (max 3 retries).

## Common Response Envelope

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "message": null
}
```

Error responses set `success: false` with `error` and `message` fields.

---

## API Limits

### Context Docs (Context Docs / Guidelines)

| Limit | Value |
|---|---|
| Max content length | 100,000 chars (500,000 enterprise) |
| Max name length | 500 chars |
| Max description length | 5,000 chars |
| Max tags | 50 per doc |
| Max tag length | 200 chars |
| System guideline max | 8,000 chars (~2,000 tokens), max 1 per org |

### Attachments

| Limit | Value |
|---|---|
| Max file size | 5 MB per file |
| Max per context doc | 25 attachments |
| Max org storage | 500 MB total |
| Max filename length | 255 chars |
| Auto-inline threshold | 2 KB (smaller files auto-inlined in SmartContext) |
| Preview lines | 10 lines |

### Memory (Memorize)

| Limit | Value |
|---|---|
| Max content length | 500,000 chars (2,000,000 enterprise) (not yet enforced) |
| Max result size | 1,000,000 chars (5,000,000 enterprise) |
| Max tag length | 200 chars |
| Max memory name | 500 chars |
| Batch max rows | 500 (5,000 enterprise) |
| Batch max per-row content | 100,000 chars |
| Batch max total payload | 10 MB (50 MB enterprise) |

### SmartUpdate (context/save)

| Limit | Value |
|---|---|
| Max material | 50,000 chars |
| Max instruction | No explicit limit (material + instruction go to LLM) |

### SmartContext (context/retrieve)

| Limit | Value |
|---|---|
| Default token budget | 10,000 tokens |
| Per-item token cap | 10,000 tokens |
| Max critical results | 7-12 (scales with candidate count) |
| Max supplementary results | 5-8 |

### General API

| Limit | Value |
|---|---|
| Max body size | 10 MB |
| Max header size | 8,192 bytes |
| IP rate limit | 100 requests (burst) |
| Concurrent requests per org | 5 (20 enterprise) |

### Prompt / Chat

| Limit | Value |
|---|---|
| Max prompt length | 100,000 chars (500,000 enterprise) |
| Max instructions | 20 steps |
| Max attachments | 10 |
| Max message length | 100,000 chars (500,000 enterprise) (not yet enforced) |
| Max messages | 200 (1,000 enterprise) (not yet enforced) |

### RAG

| Limit | Value |
|---|---|
| Max documents | 100 (1,000 enterprise) (not yet enforced) |
| Max doc text | 500,000 chars (2,000,000 enterprise) (not yet enforced) |
| Max query length | 10,000 chars |

---

## Legacy Endpoints (Deprecated)

These endpoints remain functional for backward compatibility but are **deprecated** and will be removed in a future major release. Use the canonical endpoints above instead.

### Memory (use /memory/save, /memory/retrieve, /memory/manage/*)
| Old path | Canonical replacement |
|---|---|
| `POST /memorize` | `POST /memory/save` |
| `POST /memorize_pro` | `POST /memory/save` |
| `POST /recall` | `POST /memory/retrieve` |
| `POST /recall_pro` | `POST /memory/retrieve` |
| `POST /smart-recall` | `POST /memory/retrieve` |
| `POST /smart-recall-unified` | `POST /memory/retrieve` |
| `POST /smart-memory-digest` | `POST /memory/retrieve/digest` |
| `POST /search` | `POST /memory/manage/search` |
| `POST /export` | `POST /memory/manage/export` |
| `POST /similar` | `POST /memory/manage/similar` |
| `POST /segment` | `POST /memory/manage/segment` |

### Context docs (use /context/save, /context/retrieve, /context/manage/*)
| Old path | Canonical replacement |
|---|---|
| `GET /guidelines` | `GET /context/manage` |
| `POST /guidelines` | `POST /context/manage` |
| `PATCH /guidelines/:id` | `PATCH /context/manage/:id` |
| `DELETE /guidelines/:id` | `DELETE /context/manage/:id` |
| `GET /guidelines/:id/structure` | `GET /context/manage/:id/structure` |
| `GET /guidelines/:id/section` | `GET /context/manage/:id/section` |
| `GET /guidelines/download` | `GET /context/manage/download` |
| `POST /ai/smart-guidelines` | `POST /context/retrieve` (types: ['guideline']) |
| `POST /ai/smart-docs` | `POST /context/retrieve` |
| `POST /smart-update` | `POST /context/save` |
| `GET /agentdocs` | `GET /context/manage` |
| `POST /agentdocs` | `POST /context/manage` |
| `POST /agentdocs/retrieve` | `POST /context/retrieve` |
| `POST /agentdocs/save` | `POST /context/save` |
