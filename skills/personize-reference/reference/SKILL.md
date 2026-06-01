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
| Step-driven orchestration | -- | client.responses.create() | POST /api/v1/responses |
| Chat completions (OpenAI-compat) | -- | client.chat.completions.create() | POST /api/v1/chat/completions |
| Prompt with tools | -- | client.ai.prompt() | POST /api/v1/prompt |
| Prompt with evaluation | -- | client.ai.prompt() | POST /api/v1/prompt | evaluate: { criteria, serverSide: true } |
| Prompt with auto-memorize | -- | client.ai.prompt() | POST /api/v1/prompt | memorize: true |
| Prompt streaming (SSE) | -- | client.ai.promptStream() | POST /api/v1/prompt | stream: true, yields text/output/done events |
| List agents | -- | client.agents.list() | GET /api/v1/agents |
| Get agent | -- | client.agents.get() | GET /api/v1/agents/:id |
| Run agent | -- | client.agents.run() | POST /api/v1/agents/:id/run |

**Tool execution loop:** `responses.create` with client tools auto-loops up to 20 rounds: server returns `requires_action` -> SDK executes tools locally -> sends results -> repeats until `completed`. Max 20 rounds.

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
