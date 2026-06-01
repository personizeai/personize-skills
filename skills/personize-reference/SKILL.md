---
name: personize-reference
description: "Complete lookup layer for every Personize API endpoint, SDK method, CLI command, and MCP tool — including schedules (recurring/one-time `run_prompt` and `send_notification`) and CRM passthrough (HubSpot/Salesforce direct API access via the org's managed OAuth connection). Exhaustive cross-interface operation tables, error handling, authentication, response schemas, and FAQ files for instant answers. Use whenever looking up how to call a specific operation, what parameters it takes, what errors to expect, how interfaces map to each other, how to schedule a recurring prompt, or how to call HubSpot/Salesforce REST APIs without managing OAuth credentials."
license: Apache-2.0
compatibility: "Requires @personize/sdk or Personize MCP server and a Personize API key (sk_live_...)"
metadata: {"author": "personize-ai", "version": "2.0", "homepage": "https://personize.ai"}
---

# personize-reference

**Description:** Complete lookup layer for every Personize API endpoint, SDK method, CLI command, and MCP tool — including schedules (recurring/one-time `run_prompt` and `send_notification`) and CRM passthrough (HubSpot/Salesforce direct REST API via the org's managed OAuth connection). Exhaustive cross-interface operation tables, error handling, authentication, response schemas, and FAQ files. Use whenever looking up how to call a specific operation, what parameters it takes, what errors to expect, how interfaces map to each other, how to schedule a recurring prompt, or how to call HubSpot/Salesforce REST APIs without managing OAuth credentials.

**Tags:** `personize:skill`, `personize:skill:reference`, `personize:skill:api`, `personize:skill:sdk`, `personize:skill:cli`, `personize:skill:mcp`, `personize:skill:schedules`, `personize:skill:crm`

---

## Four Interfaces -- When to Use Which

| Interface | Best For | Auth |
|-----------|----------|------|
| MCP | Agent-to-agent, any AI platform (Claude, ChatGPT, Cursor) | API key via MCP config |
| SDK (@personize/sdk) | TypeScript scripts, CI/CD, pipelines, programmatic access | `new Personize({ secretKey })` |
| CLI (@personize/cli) | Terminal, quick ops, shell scripting, automation | `npx @personize/cli auth` |
| REST API | Any language, curl, webhooks, non-TypeScript apps | `Authorization: Bearer sk_live_...` |

## Memory Operations Reference

| Operation | MCP Tool | SDK Method | CLI | API |
|-----------|----------|------------|-----|-----|
| Store with AI extraction | memory_store_pro | client.memory.memorize() | memory memorize | POST /api/v1/memorize |
| Batch store | memory_batch_store | client.memory.memorizeBatch() | memory batch | POST /api/v1/batch-memorize |
| Smart recall (recommended) | smartRecall | client.memory.smartRecall() | memory smart-recall | POST /api/v1/smart-recall |
| Smart recall unified | smartRecall | client.smartRecallUnified() | -- | POST /api/v1/smart-recall-unified |
| Entity digest | memory_digest | client.memory.smartDigest() | memory digest | POST /api/v1/smart-memory-digest |
| Direct recall | memory_recall_pro | client.memory.recall() | memory recall | POST /api/v1/recall |
| Search/export | memory_search | client.memory.search() | memory search | POST /api/v1/search |
| Find similar | memory_find_similar | client.memory.similar() | memory similar | POST /api/v1/similar |
| Segment audience | memory_segment | client.memory.segment() | memory segment | POST /api/v1/segment |
| Get properties | memory_get_properties | client.memory.properties() | -- | POST /api/v1/properties |
| Upsert | -- | -- | -- | POST /api/v1/upsert |
| Export | -- | -- | -- | POST /api/v1/export |

**Cost optimization:** `filterByProperty` is free (no LLM, no credits) for structured queries. Prefer over `smartRecall` when conditions map to known property names and values.

## Memory CRUD and Key Management Reference

| Operation | MCP Tool | SDK Method | CLI | API |
|-----------|----------|------------|-----|-----|
| Update property | memory_update_property | client.memory.update() | memory update | POST /api/v1/memory/update |
| Bulk update | -- | client.memory.bulkUpdate() | -- | POST /api/v1/memory/bulk-update |
| Delete memories | -- | client.memory.delete() | memory delete | POST /api/v1/memory/delete |
| Delete record | -- | client.memory.deleteRecord() | -- | POST /api/v1/memory/delete-record |
| Cancel deletion | -- | client.memory.cancelDeletion() | -- | POST /api/v1/memory/cancel-deletion |
| Property history | -- | client.memory.propertyHistory() | -- | POST /api/v1/memory/property-history |
| Query properties (LLM) | -- | client.memory.queryProperties() | -- | POST /api/v1/memory/query-properties |
| Filter by property | -- | client.memory.filterByProperty() | -- | POST /api/v1/memory/filter-by-property |
| Update CRM keys | memory_update_keys | client.memory.updateKeys() | -- | POST /api/v1/memory/update-keys |
| Batch update keys | -- | client.memory.updateKeysBatch() | -- | POST /api/v1/memory/update-keys-batch |
| List keys | memory_list_keys | client.memory.listKeys() | -- | POST /api/v1/memory/list-keys |
| Delete keys | memory_delete_keys | client.memory.deleteKeys() | -- | POST /api/v1/memory/delete-keys |

**Concurrency:** `bulkUpdate` supports `expectedVersion` for optimistic concurrency. Returns 409 on version mismatch -- re-read and retry with fresh data. Use when multiple agents may update the same record.

**Recovery:** `delete` and `deleteRecord` are soft deletes with 30-day recovery. Use `cancelDeletion` to restore within the window.

## Governance Operations Reference

| Operation | MCP Tool | SDK Method | CLI | API |
|-----------|----------|------------|-----|-----|
| List guidelines | guideline_list | client.guidelines.list() | guidelines list | GET /api/v1/guidelines |
| Create guideline | guideline_create | client.guidelines.create() | guidelines create | POST /api/v1/guidelines |
| Read guideline structure | guideline_read | client.guidelines.getStructure() | -- | GET /api/v1/guidelines/:id/structure |
| Read guideline section | guideline_read | client.guidelines.getSection() | -- | GET /api/v1/guidelines/:id/section |
| Update guideline | guideline_update | client.guidelines.update() | guidelines update | PATCH /api/v1/guidelines/:id |
| Delete guideline | guideline_delete | client.guidelines.delete() | guidelines delete | DELETE /api/v1/guidelines/:id |
| Smart update (AI merge) | -- | client.guidelines.smartUpdate() | -- | POST /api/v1/smart-update |
| Smart guidelines query | ai_smart_guidelines | client.ai.smartGuidelines() | context guidelines | POST /api/v1/ai/smart-guidelines |
| List attachments | guideline_attachment_list | client.guidelines.listAttachments() | guidelines attachments list | GET /api/v1/guidelines/:id/attachments |
| Read attachment | guideline_attachment_read | client.guidelines.getAttachment() | -- | GET /api/v1/guidelines/:id/attachments/:attId |
| Upload attachment | guideline_attachment_upload | -- | -- | POST /api/v1/guidelines/:id/attachments |
| Delete attachment | guideline_attachment_delete | client.guidelines.deleteAttachment() | -- | DELETE /api/v1/guidelines/:id/attachments/:attId |

### Async Bulk Context Save (v1.1)

For seeding many context docs at once (initial corpus import, GitOps sync), use the async batch surface. Returns an `eventId` to poll — actual upserts happen in a background state machine.

| Operation | MCP Tool | SDK Method | API |
|-----------|----------|------------|-----|
| Bulk save (async) | -- | client.v1_1.context.saveBatch({ documents, defaults? }) | POST /api/v1.1/context/save/batch |
| Validate batch (dry-run) | -- | client.v1_1.context.validateSaveBatch({ documents, defaults? }) | POST /api/v1.1/context/save/batch/validate |
| Poll batch status | -- | client.v1_1.context.getSaveBatchStatus(eventId) | GET /api/v1.1/context/save/batch/:eventId/status |

**Request shape:** `{ defaults?: Partial<ContextSaveBatchDocument>, documents: ContextSaveBatchDocument[] }`. Each `ContextSaveBatchDocument` = `{ id?, name?, externalId?, value, type?, aiExtraction?, tags?, categories?, recordIds? }`. Top-level `defaults` apply to every doc unless overridden — useful for bulk imports where all docs share a `type` or `tags`.

**Response shape:** `{ success, data: { eventId, trackingId, status: 'received'|'processing'|'completed'|'partial'|'failed', receivedAt, organizationId, stateMachineStarted, estimatedCompletionWindow, itemCount } }`. Poll the status endpoint until `status` is terminal.

**Gaps to be aware of:** No MCP tool yet (`context_save_batch` is not exposed); no CLI command yet (only `personize memory save-batch` exists for the memory equivalent). For now, use the SDK method or call the REST endpoint directly. The single-doc `context_save` MCP tool + `client.context.create()` SDK method are still the right path for one-off saves.

**When to use:** seeding 10+ context docs (org policies, playbooks, brand-voice rules); GitOps-style sync where a CI pipeline pushes a folder of `.md` files into context; initial import of an existing knowledge base. For 1-9 docs, use the synchronous `context.create()` / `context_save` — the per-doc latency is fine and you avoid the polling round-trip.

## Workspace Operations Reference

| Operation | MCP Tool | SDK | Notes |
|-----------|----------|-----|-------|
| Contribute update | memory_update_property | client.memory.update() | operation: "set", "push", "remove", "increment", "patch" |
| Add task | memory_update_property | client.memory.update() | propertyName: "[Tasks]", operation: "push" |
| Add issue | memory_update_property | client.memory.update() | propertyName: "[Issues]", operation: "push" |
| Add note | memory_store_pro | client.memory.memorize() | Store with workspace collection actionId |
| Read workspace | memory_digest | client.memory.smartDigest() | Returns workspace properties in digest |

## Content Generation Reference

| Operation | MCP Tool | SDK Method | API |
|-----------|----------|------------|-----|
| Single prompt | -- | client.ai.prompt({ prompt }) | POST /api/v1/prompt |
| Multi-step prompt (server-side) | -- | client.ai.prompt({ instructions: [string \| { prompt, maxSteps? }] }) | POST /api/v1/prompt |
| Step-driven orchestration with client tools | -- | client.responses.create() | POST /api/v1/responses |
| Chat completions (OpenAI-compat) | -- | client.chat.completions.create() | POST /api/v1/chat/completions |
| Prompt with evaluation | -- | client.ai.prompt() | POST /api/v1/prompt with evaluate: { criteria, serverSide: true } |
| Prompt with auto-memorize | -- | client.ai.prompt() | POST /api/v1/prompt with memorize: { email \| websiteUrl \| recordId } |
| Prompt streaming (SSE) | -- | client.ai.promptStream() | POST /api/v1/prompt with stream: true, yields text/output/done events |
| List agents | -- | client.agents.list() | GET /api/v1/agents |
| Get agent | -- | client.agents.get() | GET /api/v1/agents/:id |
| Run agent | -- | client.agents.run() | POST /api/v1/agents/:id/run |

**`ai.prompt` is dual-mode.** `prompt` and `instructions` are mutually exclusive. Use `instructions` for plan→act→qa→fix in one round-trip without client tools. Use `responses.create` only when client-side `execute()` callbacks are needed.

**Tool execution loop:** `responses.create` with client tools auto-loops up to 20 rounds: server returns `requires_action` -> SDK executes tools locally -> sends results -> repeats until `completed`. Max 20 rounds.

**Full request schema:** see `prompt-options-schema.md` attachment for the literal `PromptOptions`, `ResponsesCreateOptions`, and `ChatCompletionsOptions` interfaces.

## Collections and Schema Reference

| Operation | MCP Tool | SDK Method | CLI | API |
|-----------|----------|------------|-----|-----|
| List collections | collection_list | client.collections.list() | collections list | GET /api/v1/collections |
| Create collection | collection_create | client.collections.create() | collections create | POST /api/v1/collections |
| Update collection | collection_update | client.collections.update() | -- | PATCH /api/v1/collections/:id |
| Delete collection | collection_delete | client.collections.delete() | -- | DELETE /api/v1/collections/:id |
| Collection history | collection_history | client.collections.history() | -- | GET /api/v1/collections/:id/history |
| List entity types | entity_type_list | client.entityTypes.list() | entities list | GET /api/v1/entities |
| Update entity type | -- | client.entityTypes.update() | -- | PATCH /api/v1/entity-types/:id |

## RAG and Knowledge Base Reference

| Operation | SDK Method | API |
|-----------|------------|-----|
| Configure external RAG | client.rag.configure() | POST /api/v1/external-rag/config |
| Search external RAG | client.rag.search() | POST /api/v1/external-rag/search |
| Test external RAG | client.rag.test() | POST /api/v1/external-rag/test |
| Ingest documents | client.rag.ingest() | POST /api/v1/rag/ingest |
| Search project docs | client.rag.searchProject() | POST /api/v1/rag/search |
| List RAG projects | client.rag.listProjects() | GET /api/v1/rag/projects |
| Delete documents | client.rag.deleteDocuments() | POST /api/v1/rag/delete |
| Delete project | client.rag.deleteProject() | POST /api/v1/rag/delete-project |
| Multimodal memorize | client.multimodal.memorize() | POST /api/v1/multimodal/memorize |
| Multimodal search | client.multimodal.search() | POST /api/v1/multimodal/search |
| Multimodal status | client.multimodal.status() | GET /api/v1/multimodal/status |

## Platform Administration Reference

| Operation | MCP Tool | SDK Method | API |
|-----------|----------|------------|-----|
| Get org | organization_list | client.organizations.get() | GET /api/v1/organizations |
| Create org | organization_create | client.organizations.create() | POST /api/v1/organizations |
| List members | member_list | client.members.list() | GET /api/v1/members |
| Invite member | member_invite | client.members.invite() | POST /api/v1/members/invite |
| Update role | -- | client.members.updateRole() | PATCH /api/v1/members/:id/role |
| List MCPs | mcp_list | client.mcps.list() | GET /api/v1/mcps |
| Create MCP | -- | client.mcps.create() | POST /api/v1/mcps |
| Update MCP | -- | client.mcps.update() | PATCH /api/v1/mcps/:id |
| Delete MCP | -- | client.mcps.delete() | DELETE /api/v1/mcps/:id |
| Test MCP | -- | client.mcps.test() | POST /api/v1/mcps/test-ssrf |
| Refresh MCP tools | -- | client.mcps.refreshTools() | POST /api/v1/mcps/:id/refresh-tools |
| Update MCP tools | -- | client.mcps.updateTools() | PATCH /api/v1/mcps/:id/tools |
| List destinations | destination_list | client.destinations.list() | GET /api/v1/destinations |
| Create destination | -- | client.destinations.create() | POST /api/v1/destinations |
| Update destination | -- | client.destinations.update() | PATCH /api/v1/destinations/:id |
| Delete destination | -- | client.destinations.delete() | DELETE /api/v1/destinations/:id |
| Delivery logs | -- | client.destinations.deliveryLogs() | GET /api/v1/destinations/:id/delivery-logs |
| Test destination | -- | client.destinations.test() | POST /api/v1/destinations/:id/test |
| Destination logs | -- | client.destinations.getLogs() | GET /api/v1/destinations/:id/logs |
| Execute notification action | -- | client.notifications.executeAction() | POST /api/v1/notifications/:id/actions/:actionId |
| Archive entity type | -- | client.entityTypes.archive() | POST /api/v1/entity-types/:id/archive |

## Analytics and Usage Reference

| Operation | MCP Tool | SDK Method | API |
|-----------|----------|------------|-----|
| Analytics overview | analytics_overview | client.analytics.overview() | POST /api/v1/analytics/overview |
| Memory analytics | -- | client.analytics.memory() | POST /api/v1/analytics/memory |
| Credit usage | -- | client.analytics.credits() | POST /api/v1/analytics/credits |
| Operation history | -- | client.analytics.operations() | POST /api/v1/analytics/operations |
| Usage history | -- | client.analytics.history() | POST /api/v1/analytics/history |
| Current usage | -- | -- | GET /api/v1/usage/current |

## Notifications Reference

| Operation | MCP Tool | SDK Method | API |
|-----------|----------|------------|-----|
| Send notification | notification_send | client.notifications.send() | POST /api/v1/notifications/send |
| Broadcast | -- | client.notifications.broadcast() | POST /api/v1/notifications/broadcast |
| List notifications | notification_list | client.notifications.list() | GET /api/v1/notifications |
| Unread count | -- | client.notifications.getUnreadCount() | GET /api/v1/notifications/unread-count |

## Events and Async Tracking Reference

Events track async operations (batch memorize, etc.):

| Operation | SDK Method | API |
|-----------|------------|-----|
| List events | -- | GET /api/v1/events |
| Get event | -- | GET /api/v1/events/:id |
| Get event details | -- | GET /api/v1/events/:id/details |

Critical for batch tracking: `memory_batch_store` returns `eventId`. Poll `GET /api/v1/events/{eventId}` for status updates.

## Schedules Reference

Schedule recurring or one-time tasks against Personize. The most common `taskType` is `run_prompt` (executes `/api/v1/prompt` at the scheduled time, grounded on a record via `memorize.recordId`/`email`/`websiteUrl`); the other is `send_notification` (in-app or email). Results flow out via wired destinations on the `prompt.completed` event — schedules do not return results synchronously. Schedules live on the v1 surface only (v1.1 does not yet expose them; the `/api/v1/*` deprecation sunset 2026-07-15 does not apply).

| Operation | MCP Tool | SDK Method | API |
|-----------|----------|------------|-----|
| Create schedule | schedule_create | client.schedules.create() | POST /api/v1/schedules |
| List schedules | schedule_list | client.schedules.list({ recordId?, email?, websiteUrl?, taskType? }) | GET /api/v1/schedules |
| Get schedule | schedule_get | client.schedules.get(idOrName) | GET /api/v1/schedules/:id |
| Update / pause schedule | schedule_update | client.schedules.update(idOrName, patch) | PATCH /api/v1/schedules/:id |
| Delete schedule | schedule_delete | client.schedules.delete(idOrName) | DELETE /api/v1/schedules/:id |
| List executions | schedule_executions | client.schedules.executions(idOrName) | GET /api/v1/schedules/:id/executions |

**Recurrence syntax:** `rate(N minutes|hours|days|weeks)`, `cron(MIN HOUR DOM MON DOW YEAR)` (6-field AWS-flavored), shorthand `1D` / `2H` / `30M`. One-time fires set `runAt` (ISO8601 UTC) instead of `pattern`.

**Filters** on `schedule_list` match across `taskPayload.recordId`, `taskPayload.memorize.recordId`, and `taskPayload.metadata.recordId` — use these to answer "what's running for this contact?" in one call.

**Server-enforced guardrails:**
- `SCHEDULE_CAP_EXCEEDED` (429) — plan limit `plan.limits.maxActiveSchedules` reached
- `RECORD_CAP_EXCEEDED` (429) — too many schedules already target this `recordId`
- `INSUFFICIENT_CREDITS` (402) — recurring schedule cannot be funded for the next 7 days (~5 credits/fire)
- `DUPLICATE_NAME` (409) — schedule names are unique per-org (kebab-case only)

**Jitter:** recurring `rate(...)` schedules with no user-supplied `startDate` get ±60s auto-jitter so many "every hour" schedules don't all fire at the same second.

**Common gotchas:** No raw BYOK keys in `taskPayload` (uses the org's vault key); recurring needs `pattern`, one-time needs `runAt`, never both; `PATCH taskPayload` is a full replacement.

## CRM Direct Access (HubSpot & Salesforce)

Call HubSpot and Salesforce REST APIs directly via the org's Personize-managed OAuth connection — your scripts never see provider tokens. One Personize key, both CRMs. Connect once at personize.ai → Integrations. Like schedules, CRM passthrough is v1-only.

| Operation | SDK Method | API |
|-----------|------------|-----|
| Raw HubSpot REST | client.hubspot.request({ method, path, body }) | POST /api/v1/crm/hubspot/passthrough |
| List/get/search/create/update HubSpot contacts | client.hubspot.contacts.list/get/searchByEmail/create/update() | (same passthrough) |
| List/get/create/update HubSpot companies | client.hubspot.companies.list/get/create/update() | (same passthrough) |
| List/get/create/update HubSpot deals | client.hubspot.deals.list/get/create/update() | (same passthrough) |
| Create HubSpot task / note | client.hubspot.tasks.create() / client.hubspot.notes.create() | (same passthrough) |
| Raw Salesforce REST | client.salesforce.request({ method, path, body }) | POST /api/v1/crm/salesforce/passthrough |
| SOQL query (single page) | client.salesforce.query<T>(soql) | (same passthrough) |
| SOQL query (auto-paginate) | client.salesforce.queryAll<T>(soql) — async iterable | (same passthrough) |
| SObject CRUD | client.salesforce.sobject('Lead').create/get/update/upsert/delete() | (same passthrough) |

**Response shape** (every typed wrapper returns this directly): `{ status, headers, body, meta: { provider, upstreamRequestId, durationMs, rateLimit? } }`. Personize returns HTTP 200 when the upstream call completes — inspect `result.status` for the provider's outcome.

**Path allowlists (SSRF protection):**
- HubSpot: `/crm/`, `/marketing/`, `/cms/`, `/automation/`, `/files/`, `/communication-preferences/`, `/properties/`, `/owners/`, `/oauth/`
- Salesforce: `/services/data/`, `/services/apexrest/`

**Error codes:** `connection_not_found` (no active connection), `connection_disconnected` (OAuth refresh failed), `invalid_path` (rejected by allowlist), `invalid_method`, `upstream_timeout`, `rate_limited`.

## Authentication and Keys

API key format: `sk_live_...` (production) or `sk_test_...` (test). Header: `Authorization: Bearer sk_live_...`. Internal: `X-Internal-API-Key` header. MCP: key provided via MCP config. Plan limits from `GET /api/v1/me` (maxApiCallsPerMinute, maxApiCallsPerMonth). `GET /api/v1/usage/current` for current usage.

## Error Handling and Recovery

Response format: `{ success: boolean, error?: string, message?: string }`.

| Error Code | Cause | Recovery |
|------------|-------|----------|
| rate_limit_error | Too many requests | Back off, retry after retryAfterSeconds |
| authentication_error | Invalid/expired key | Check key format, refresh |
| permission_error | Insufficient permissions | Check plan tier, member role |
| not_found_error | Entity/resource missing | Verify ID, check identity key type |
| validation_error | Invalid parameters | Check param types and required fields |
| server_error | Internal issue | Retry once, then report |

GOOD: Check `retryAfterSeconds` in rate_limit_error response, wait that duration, retry.
BAD: Retry immediately in a tight loop on 429 -- causes escalating rate limits.

## Response Schemas

Key return shapes:

- **Memorize:** `{ success, data: { creditsCharged, properties: [...] } }`
- **SmartRecall:** `{ results: [{ content, score, recordId, properties }], answer?, confidence? }`
- **Digest:** `{ digest: string, properties: [...], memories: [...] }`
- **Responses:** `{ status: "completed", steps: [...], outputs: [...] }` or `{ status: "requires_action", required_action: { tool_calls } }`
- **Batch:** `{ eventId }` (async, poll events endpoint)
- **Error:** `{ success: false, error: string, message: string }`

## Go Deeper

Need operational patterns? Ask about `personize-agent-core`. Need to design a system? Ask about `personize-solution-architect`. Need a ready-to-run script? Ask about `personize-enabler`.
