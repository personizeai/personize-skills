# Tool Selection Quick Reference

Three verbs: save, retrieve, delete. Name the target with the `record` block (for example `record:{email}`).

| Task | Tool | Key Params |
|------|------|-----------|
| Store rich text/notes/transcripts | memory_save | content, record:{email}, tier:"pro" (default shortform shape; no `shape` needed) |
| Store structured data (direct write, known field values) | memory_save | shape:"property", record:{email}, operations:[{op:'set', property, value}] |
| Batch store content needing AI extraction | memory_save | shape:"shortform", items[] (do not put `identifiers` inside `items[]`) |
| Any retrieval (default, fast) | memory_retrieve | mode:'scout', record:{email}, message |
| Full entity picture | memory_retrieve | mode:'brief', record:{email} |
| Specific question (deep, synthesized) | memory_retrieve | mode:'brief', record:{email}, message |
| Read specific properties | memory_retrieve | mode:'fetch', fetch:{recordIds:[id]} (resolve the id first) |
| Search/filter records | memory_retrieve | mode:'filter', filters, limit |
| Update single property | memory_save | shape:"property", record:{email}, operations:[{op:'set', property, value}] |
| Add workspace task | memory_save | shape:"property", record:{email}, operations:[{op:'push', property:'Tasks', value}] |
| Delete a record, memory or property | memory_delete | type, record:{id, entityType} (record) or record:{id} + propertyNames (type:'property') or ids:[...] (memory); resolve the id first, record:{email} is rejected |
| Find similar records | REST/SDK only | retrieve mode:'similar' with a seed (not available on MCP) |
| Create or evolve a guideline/doc | memory_save (shape:'document') | type, content, name |
| Check governance rules / doc search | memory_retrieve (mode='scout', sources.documents) | message, intent.perSource.documents.types |
| Platform skill guidance | personize_md | topic='bulk' with message, or detail |
| Multi-step research/scoring/enrichment of one record (may take minutes) | agent_run, then agent_run_get | input, record:{email}, outputs[], idempotencyKey |
| Same agent task over many records | sweep_preview → sweep_launch → sweep_status → sweep_continue | query or filter, entityType; previewId, template |
| Bootstrap session | personize_md | (no params) |
| Check usage/credits | analytics_overview | (no params) |

## One-shot prompt vs agent run vs sweep

Managed cloud only; Personize Private has none of the three tools below. Agent runs and sweeps need the org's own model key (BYOK), else `byok_required`.

| Need | Use | Why |
|------|-----|-----|
| One answer in one request, seconds | `/api/v1.1/prompt` (or `/api/v1.1/agent`) | Synchronous; nothing to poll |
| One record, tools or web search, may take minutes, must survive a dropped connection | `agent_run` (REST `POST /api/v1.1/agent/runs`) | Durable: returns a `runId`, keeps running server-side, typed `outputs` can save to the record |
| The same task for a filtered group of records (up to 10,000) | `sweep_preview` then `sweep_launch` | Count + cost estimate first, a pilot batch, then stops for review |
| The same task on a timer | a schedule with `taskPayload.agentRun` (`POST /api/v1.1/schedules`) | Sweeps are not recurring |

Rules:
- `agent_run` returns `queued`/`running` with a `next` hint: call `agent_run_get` with the `runId`. Never start a second run to "retry" a run that is still going.
- Pass `idempotencyKey` whenever you might retry; a repeat with the same key returns the existing run instead of starting (and billing) another.
- Show the user the `sweep_preview` filter, count and estimate before `sweep_launch`, and the pilot results plus `pilot.projection` (from `sweep_status`) before `sweep_continue`.
- Saving or reading memory you can do yourself: use `memory_save` / `memory_retrieve`, not a run.
