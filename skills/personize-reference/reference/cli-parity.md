# MCP <-> CLI Parity Audit

**Date:** 2026-05-16
**Plan:** K (roadmap)

Every MCP tool below maps to a CLI command. When the CLI lags, the row is marked `GAP`. Operators debugging an autonomous workflow should be able to reproduce any MCP tool call from the CLI.

## Memory

| MCP tool | CLI command | Status |
|---|---|---|
| `memory_save` | `personize memory save` / `memorize` | OK |
| `memory_retrieve` | `personize memory retrieve` | OK |
| `memory_search` | `personize memory search` | OK |
| `memory_segment` | `personize memory segment` | OK |
| `memory_find_similar` | `personize memory similar` | OK |
| `memory_filter_by_property` | `personize memory filter-by-property` | OK |
| `memory_get_properties` | `personize memory properties` | OK |
| `memory_update_property` | `personize memory update` | OK |
| `memory_update_properties` | `personize memory bulk-update` | OK |
| `memory_digest` | `personize memory digest` | OK |
| `memory_upsert` (structured create/upsert) | `personize memory upsert` | OK |
| `memory_batch_store` — *not a live MCP tool* | content batch via SDK `client.memory.saveBatch()`; structured via `memory_upsert` / `personize memory upsert` | N/A (no MCP tool) |
| `update_keys` | `personize memory update-keys` | OK |
| `update_keys_batch` | `personize memory update-keys-batch` | OK |
| `list_keys` | `personize memory list-keys` | OK |
| `delete_keys` | `personize memory delete-keys` | OK |
| `smartRecall` | `personize memory smart-recall-unified` | OK |
| *(no MCP)* — record deletion | `personize memory delete` / `delete-record` / `cancel-deletion` | CLI-only (admin) |

## Context / Governance

| MCP tool | CLI command | Status |
|---|---|---|
| `context_retrieve` | `personize guidelines fetch <topic>` | OK (different name) |
| `context_save` | `personize guidelines learn` / `generate` | OK (different name) |
| `context_manage_list` | `personize guidelines list` | OK |
| `context_manage_read` | `personize guidelines get <id>` | OK |
| `context_manage_create` | `personize guidelines create` | OK |
| `context_manage_update` | `personize guidelines update <id>` | OK |
| `context_manage_delete` | `personize guidelines delete <id>` | OK |
| `context_manage_history` | `personize guidelines history <id>` | OK |
| `context_manage_download` | *(no CLI)* | **GAP** |
| `guideline_attachment_list` | `personize context attachment list` (if wired) | **GAP** (verify) |
| `guideline_attachment_read` | *(no CLI)* | **GAP** |
| `context_attachment_upload` | *(no CLI)* | **GAP** |
| `guideline_attachment_delete` | *(no CLI)* | **GAP** |

## Collections / Schema

| MCP tool | CLI command | Status |
|---|---|---|
| `collection_list` | `personize collections list` | OK |
| `collection_create` | `personize collections create` | OK |
| `collection_update` | `personize collections update <id>` | OK |
| `collection_delete` | `personize collections delete <id>` | OK |
| `collection_delete_property` | `personize collections delete-property <cid> <pid>` | OK |
| `collection_history` | `personize collections history <id>` | OK |
| *(no MCP)* — get one collection | `personize collections get <id>` | CLI-only |
| *(no MCP)* — add property | `personize collections add-property <id>` | CLI-only |
| *(no MCP)* — update property | `personize collections update-property <id>` | CLI-only |

## Entity Types

| MCP tool | CLI command | Status |
|---|---|---|
| `entity_type_get` | `personize entities get` (verify) | **GAP** (verify) |
| `entity_type_update` | `personize entities update` (verify) | **GAP** (verify) |
| `entity_type_archive` | `personize entities archive` (verify) | **GAP** (verify) |

## Organizations / Members

| MCP tool | CLI command | Status |
|---|---|---|
| `list_organizations` | `personize organizations list` | OK |
| `select_organization` | `personize organizations select` | OK |
| `organization_get` | `personize organizations get` | OK |
| `organization_create` | `personize organizations create` | OK |
| `organization_update` | `personize organizations update` | OK |
| `members_list` | `personize members list` | OK |
| `members_invite` | `personize members invite` | OK |
| `members_update_role` | `personize members update-role` | OK |
| `members_remove` | `personize members remove` | OK |

## Destinations / MCPs

| MCP tool | CLI command | Status |
|---|---|---|
| `destination_list/create/get/update/delete/test` | `personize destinations ...` | OK |
| `mcp_list/create/update/delete/test` | `personize mcps ...` | OK |

## Analytics / Notifications

| MCP tool | CLI command | Status |
|---|---|---|
| `analytics_overview/memory/credits/operations` | `personize analytics ...` | OK |
| `notification_send/broadcast/list/unread_count` | `personize notifications ...` | OK |

## Cookbook / Orientation

| MCP tool | CLI command | Status |
|---|---|---|
| `personize_md` | *(no CLI)* | **GAP** — adding would let operators dump orientation for an org |
| `personize_md(detail='session')` | *(no CLI)* | **GAP** — needs session ID; CLI has no MCP session concept yet |
| `personize_cookbook` | *(no CLI)* | **GAP** — useful for offline recipe browsing |

## Gaps to close (priority order)

1. **`personize cookbook <query>`** — calls the cookbook tool; same recipe surface offline. High value for ops/dev.
2. **`personize md [--detail first-visit|returning|session]`** — operator dumps the org orientation. Useful for support tickets ("paste what your agent sees").
3. **`personize context attachment ...`** — list/read/upload/delete parity. Today attachments are MCP-only; operators can't audit them.
4. **`personize guidelines download <id>`** — context_manage_download has no CLI; needed when guidelines are PDF-backed.
5. **`personize entities ...` audit** — confirm get/update/archive exist; add if missing.

## Out of scope (intentionally CLI-only)

- `personize doctor` — diagnostic command, not a memory operation
- `personize setup` / `personize config` — environment management
- `personize chat` / `responses` / `prompt` — LLM playground
- `personize evaluate` — eval harness driver
- Record hard-delete commands — destructive, intentionally not exposed via MCP

## Validation

After closing each gap, smoke against the eval org:

```bash
# Example for the cookbook gap
personize cookbook "bulk import 50 records" --org $TEST_ORG_ID
# Expected: same recipe text the MCP tool would return
```

Track parity by running this matrix against a fresh CLI install once per release.
