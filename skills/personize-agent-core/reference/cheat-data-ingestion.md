# Data Ingestion Patterns

When data arrives from any external source, Personize is the destination. The agent's job is to map, store, verify, and deduplicate -- regardless of where the data comes from.

## Route by Data Shape

Pick the method by what the data looks like, not just where it came from:

- **Structured (you already have known field values)** -> `memory_upsert` with `records[]`. Single or batch, no AI extraction. This is the canonical create/upsert path.
- **Messy / needs parsing first** -> script to map/clean rows, then `memory_upsert`.
- **Content / freeform text needing AI extraction** -> `client.memory.saveBatch()` (or the `personize_cookbook` recipe) for batches; `memory_save` for one.

## Source to Method

| Data arrives as... | Personize method | Notes |
|---|---|---|
| I already have structured field values (cleaned columns/JSON) | `memory_upsert` with `records[]` | Known fields -> direct upsert, no AI extraction. Canonical create/upsert path. |
| User pastes text/table in chat | Parse inline, then `memory_upsert` (structured) or `saveBatch` (freeform) | No script needed. Map fields. |
| CSV/spreadsheet file (clean columns) | `memory_upsert` with field mapping | Map columns to identity keys + properties. Use `--dry-run` first. |
| CSV/CRM export that's messy | script to parse/clean, then `memory_upsert` | Normalize rows before upserting. |
| CRM export (HubSpot, Salesforce, Pipedrive) | `memory_upsert` with field mapping | Same as CSV. Tag with `source:crm`. |
| Apollo/LinkedIn export | `memory_upsert` with field mapping | Map Apollo columns (email, title, company, employee count). |
| Live CRM sync (ongoing) | Webhook → `memory_save` per event | Set up `destination_create` to receive events. |
| API response from external MCP | `memory_upsert` (structured) or `memory_save` (freeform) | External MCP fetches, Personize stores. |
| Single record (conversation) | `memory_save` | Inline in conversation. |
| Content batch needing AI extraction | `client.memory.saveBatch()` / `personize_cookbook` | Freeform text -> extraction. `memorizeBatch` is deprecated toward `memory_upsert`. |
| Event attendee list | `memory_upsert` | Structured rows. Tag with `source:event:{event-name}`. |

## The Ingestion Loop (any source)

1. **Map fields**: identify which source field is the identity key (email, website_url) and which are properties
2. **Deduplicate**: run `memory_find_similar` on a sample before bulk import -- catch duplicates early
3. **Dry run**: show 3-5 sample records to user before committing
4. **Batch write**: structured rows -> `memory_upsert` with `records[]`, `tags:["source:X"]`; content needing extraction -> `client.memory.saveBatch()` with `tier:"pro"`
5. **Verify**: `smartRecall` on 2-3 records to confirm extraction quality
6. **Report**: X imported, Y skipped (duplicates), Z failed

## Field Mapping Rules

- MUST identify the identity key first (email for contacts, website_url/domain for companies)
- MUST NOT import without an identity key -- records without keys become orphans
- SHOULD map source fields to existing collection properties where possible
- SHOULD tag every import with source: `source:apollo`, `source:hubspot`, `source:manual`, `source:event`
- MUST check opt-out list before importing contacts (skip opted-out emails)

## Handling Duplicates

| Scenario | Detection | Resolution |
|---|---|---|
| Same email, different source | Automatic (same identity key) | Personize merges memories on same record |
| Similar name, different email | `memory_find_similar` | Surface to user -- may be same person with alias |
| Same company, different domain | `memory_find_similar` on company | Use `update_keys` to add alias |
| CRM ID mapping | Source has `hubspot_id` or `salesforce_id` | `update_keys` to add as custom key |

## Credit Estimation

| Operation | Cost |
|---|---|
| `memory_upsert` (structured, no extraction) | 1 credit per item |
| `client.memory.saveBatch()` (content, basic) | 1 credit per item |
| `client.memory.saveBatch()` (content, pro) | 1 credit per item |
| `memory_find_similar` (dedup check) | 1 credit |
| `smartRecall` (verification) | 1 credit |

Estimate before large imports: items * 1 credit + verification overhead.
MUST check `analytics_credits` before imports > 100 items.
