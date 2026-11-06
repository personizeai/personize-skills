---
name: personize-reference
description: "Complete lookup layer for every Personize API endpoint, SDK method, CLI command, and MCP tool. Exhaustive cross-interface operation tables, error handling, authentication, response schemas, and FAQ files for instant answers. Use whenever looking up how to call a specific operation, what parameters it takes, what errors to expect, or how interfaces map to each other."
license: Apache-2.0
compatibility: "Requires @personize/sdk or Personize MCP server and a Personize API key (sk_live_...)"
metadata: {"author": "personize-ai", "version": "2.0", "homepage": "https://personize.ai"}
---

# personize-reference

**Description:** Complete lookup layer for every Personize API endpoint, SDK method, CLI command, and MCP tool. Exhaustive cross-interface operation tables, error handling, authentication, response schemas, and FAQ files. Use whenever looking up how to call a specific operation, what parameters it takes, or how interfaces map to each other.

**Tags:** `personize:skill`, `personize:skill:reference`, `personize:skill:api`, `personize:skill:sdk`, `personize:skill:cli`, `personize:skill:mcp`

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
| Store with AI extraction | memory_save (shape=text) | client.memory.save({ shape: 'text', content, record }) | save --shape text | POST /api/v1.1/memory/save |
| Structured save (no AI extraction) | memory_save (shape=property) | client.memory.save({ shape: 'property', record, properties }) | save --shape property | POST /api/v1.1/memory/save |
| Batch store | memory_save (items[]) | client.memory.save({ shape: 'shortform', items: [...] }) | save --items-file <f> | POST /api/v1.1/memory/save |
| Brief / digest of one record | memory_retrieve (mode=brief) | client.memory.retrieve({ mode: 'brief', record, message }) | retrieve brief | POST /api/v1.1/memory/retrieve |
| Scout (multi-source recall) | memory_retrieve (mode=scout) | client.memory.retrieve({ mode: 'scout', record }) | retrieve scout | POST /api/v1.1/memory/retrieve |
| Filter / export | memory_retrieve (mode=filter) | client.memory.retrieve({ mode: 'filter', filters }) | retrieve filter | POST /api/v1.1/memory/retrieve |
| Find similar | -- (REST/SDK only) | client.memory.retrieve({ mode: 'similar', seed: { record } }) | retrieve similar | POST /api/v1.1/memory/retrieve |
| Fetch properties | memory_retrieve (mode=fetch) | client.memory.retrieve({ mode: 'fetch', fetch: { recordIds, propertyNames } }) | retrieve fetch --fetch-file <f> | POST /api/v1.1/memory/retrieve |
| Segment audience | memory_segment | client.memory.segment() | memory segment | POST /api/v1/segment |
| Export | -- | -- | -- | POST /api/v1/export |

**Cost optimization:** `mode=filter` is free (no LLM, no credits) for structured queries. Prefer it over `mode=brief` when conditions map to known property names and values.

## Memory CRUD and Key Management Reference

| Operation | MCP Tool | SDK Method | CLI | API |
|-----------|----------|------------|-----|-----|
| Update property | memory_save (shape=property) | client.memory.save({ shape: 'property', record, properties }) | save --shape property | POST /api/v1.1/memory/save |
| Bulk update | memory_save (shape=property), one call per record | client.memory.save({ shape: 'property', record, properties }), one call per record | save --shape property | POST /api/v1.1/memory/save |
| Delete memories | memory_delete | client.memory.delete({ type, ids?, record?, hard? }) | personize delete <type> --yes (record: add `--record-id <id> --entity-type <type>`) | `delete` (v1.1) |
| Delete record | memory_delete (type=record) | client.memory.delete({ type: 'record', record }) | personize delete record --record-id <id> --entity-type <type> --yes | `delete type=record` |
| Cancel deletion | -- | client.memory.cancelDeletion() | -- | POST /api/v1/memory/cancel-deletion |
| Property history | memory_retrieve (mode=fetch, fetch.propertyHistory) | client.memory.retrieve({ mode: 'fetch', fetch: { propertyHistory: [{ recordId, propertyName }] } }) | retrieve fetch --fetch-file <f> | POST /api/v1.1/memory/retrieve |
| Query properties | memory_retrieve (mode=scout, with filters) | client.memory.retrieve({ mode: 'scout', filters }) | retrieve scout | POST /api/v1.1/memory/retrieve |
| Filter by property | memory_retrieve (mode=filter) | client.memory.retrieve({ mode: 'filter', filters }) | retrieve filter | POST /api/v1.1/memory/retrieve |
| Update CRM keys | memory_save (shape=identifiers) | client.memory.save({ shape: 'identifiers', record, add: [{ name, value }] }) | save --shape identifiers | POST /api/v1.1/memory/save |
| Batch update keys | memory_save (shape=identifiers), one call per record | client.memory.save({ shape: 'identifiers', record, add }), one call per record | save --shape identifiers | POST /api/v1.1/memory/save |
| List keys | memory_retrieve (mode=fetch, fetch.identifiers) | client.memory.retrieve({ mode: 'fetch', record, fetch: { identifiers: true } }) | retrieve fetch --record-id <id> --entity-type <type> --fetch-identifiers | POST /api/v1.1/memory/retrieve |
| Delete keys | memory_delete (type=identifier) | client.memory.delete({ type: 'identifier', record, propertyNames }) | personize delete identifier --record-id <id> --entity-type <type> --property-names <a,b> --yes | `delete type=identifier` |

Legacy (still works): the old per-operation methods and endpoints (`deleteRecord`, `propertyHistory`, `queryProperties`, `filterByProperty`, `listKeys`, `deleteKeys` and their `/api/v1/memory/*` routes) translate to the canonical forms above. Full list: `Docs/generated/migration-table.json`. `queryProperties` was LLM-ranked; the canonical filter form is exact match.

**Concurrency:** Optimistic concurrency (`expectedVersion`, 409 on mismatch) exists on the legacy `memory_update_properties` tool, which is still translated. Canonical `memory_save shape=property` takes the version per operation as `operations[].ifMatch` (sent to the server as `expectedVersion`; 409 on mismatch). The legacy `memory_update_properties` tool takes `expectedVersion` directly. See the migration table (`Docs/generated/migration-table.json`, above).

**Recovery:** `delete type=record` is a soft delete with 30-day recovery. Use `cancelDeletion` to restore within the window.

## Governance Operations Reference

| Operation | MCP Tool | SDK Method | CLI | API |
|-----------|----------|------------|-----|-----|
| List guidelines | context_manage_list | client.guidelines.list() | guidelines list | GET /api/v1/guidelines |
| Create guideline | context_save | client.guidelines.create() | guidelines create | POST /api/v1/guidelines |
| Read guideline structure | context_manage_read | client.guidelines.getStructure() | -- | GET /api/v1/guidelines/:id/structure |
| Read guideline section | context_manage_read | client.guidelines.getSection() | -- | GET /api/v1/guidelines/:id/section |
| Update guideline | context_manage_update | client.guidelines.update() | guidelines update | PATCH /api/v1/guidelines/:id |
| Delete guideline | context_manage_delete | client.guidelines.delete() | guidelines delete | DELETE /api/v1/guidelines/:id |
| Smart update (AI merge) | -- | client.guidelines.smartUpdate() | -- | POST /api/v1/smart-update |
| Guideline query | context_retrieve | client.memory.retrieve({ mode: 'scout', message: '<task>', sources: { documents: true, memories: false } }) | retrieve "<task>" | POST /api/v1.1/memory/retrieve (message + sources.documents) |
| List attachments | context_attachment_list | client.guidelines.listAttachments() | guidelines attachments list | GET /api/v1/guidelines/:id/attachments |
| Read attachment | context_attachment_read | client.guidelines.getAttachment() | -- | GET /api/v1/guidelines/:id/attachments/:attId |
| Upload attachment | context_attachment_upload | -- | -- | POST /api/v1/guidelines/:id/attachments |
| Delete attachment | context_attachment_delete | client.guidelines.deleteAttachment() | -- | DELETE /api/v1/guidelines/:id/attachments/:attId |

## Workspace Operations Reference

| Operation | MCP Tool | SDK | Notes |
|-----------|----------|-----|-------|
| Contribute update | memory_save (shape=property) | client.memory.save({ shape: 'property', ... }) | operation: "set", "push", "remove", "increment", "patch" |
| Add task | memory_save (shape=property) | client.memory.save({ shape: 'property', ... }) | propertyName: "[Tasks]", operation: "push" |
| Add issue | memory_save (shape=property) | client.memory.save({ shape: 'property', ... }) | propertyName: "[Issues]", operation: "push" |
| Add note | memory_save | client.memory.save({ shape: 'text', ... }) | Store with workspace collection actionId |
| Read workspace | memory_retrieve (mode=brief) | client.memory.retrieve({ mode: 'brief', record }) | Returns workspace properties in the brief |

## Content Generation Reference

| Operation | MCP Tool | SDK Method | API |
|-----------|----------|------------|-----|
| Step-driven orchestration | -- | client.responses.create() | POST /api/v1/responses |
| Chat completions (OpenAI-compat) | -- | client.chat.completions.create() | POST /api/v1/chat/completions |
| Prompt with tools | -- | client.ai.prompt() | POST /api/v1/prompt |
| Prompt with evaluation | -- | client.ai.prompt() | POST /api/v1/prompt | evaluate: { criteria, serverSide: true } |
| Prompt with auto-memorize | -- | client.ai.prompt() | POST /api/v1/prompt | memorize: true |
| Prompt streaming (SSE) | -- | client.ai.promptStream() | POST /api/v1/prompt | stream: true, yields text/output/done events |
| Multi-step prompt (agent-style run) | -- | client.ai.prompt() | POST /api/v1.1/prompt | instructions: [...] replaces the retired agents API |

**Tool execution loop:** `responses.create` with client tools auto-loops up to 20 rounds: server returns `requires_action` -> SDK executes tools locally -> sends results -> repeats until `completed`. Max 20 rounds.

## Collections and Schema Reference

| Operation | MCP Tool | SDK Method | CLI | API |
|-----------|----------|------------|-----|-----|
| List collections | collection_list | client.collections.list() | collections list | GET /api/v1/collections |
| Create collection | collection_create | client.collections.create() | collections create | POST /api/v1/collections |
| Update collection | collection_update | client.collections.update() | -- | PATCH /api/v1/collections/:id |
| Delete collection | collection_delete | client.collections.delete() | -- | DELETE /api/v1/collections/:id |
| Collection history | collection_history | client.collections.history() | -- | GET /api/v1/collections/:id/history |
| List entity types | -- (no MCP tool; see entity_type_get for single-id lookup) | client.entityTypes.list() | entities list | GET /api/v1/entities |
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
| Get org | organization_get | client.organizations.get() | GET /api/v1/organizations |
| Create org | organization_create | client.organizations.create() | POST /api/v1/organizations |
| List members | members_list | client.members.list() | GET /api/v1/members |
| Invite member | members_invite | client.members.invite() | POST /api/v1/members/invite |
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

Critical for batch tracking: a batch `client.memory.save({ items })` returns `jobId` (HTTP 202 on the async/bulk lanes, 207 with per-item results on sync). Poll with `client.memory.getJob(jobId)` / `GET /api/v1.1/memory/jobs/:jobId`.

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
- **Batch:** `{ jobId }` (poll `getJob`)
- **Error:** `{ success: false, error: string, message: string }`

## Go Deeper

Need operational patterns? Ask about `personize-agent-core`. Need to design a system? Ask about `personize-solution-architect`. Need a ready-to-run script? Ask about `personize-enabler`.
