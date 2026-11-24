# Data Ingestion Patterns

When data arrives from any external source, Personize is the destination. The agent's job is to map, store, verify, and deduplicate -- regardless of where the data comes from.

## Route by Data Shape

Pick the method by what the data looks like, not just where it came from:

- **Structured (you already have known field values)** -> `memory_save` with `shape:"property"`, `record:{email}` and `operations:[{op:'set', property, value}]`. No AI extraction. One call per record.
- **Messy / needs parsing first** -> script to map/clean rows, then `memory_save` with `shape:"property"` and `operations`.
- **Content / freeform text needing AI extraction** -> `memory_save` with `shape:"shortform"` and `items[]` for batches (SDK: `client.memory.save({ shape: 'shortform', items: [...] })`); a default shortform `memory_save` (`content`, `record`) for one. Do not put `identifiers` inside `items[]`: the code rejects it.

## Source to Method

| Data arrives as... | Personize method | Notes |
|---|---|---|
| I already have structured field values (cleaned columns/JSON) | `memory_save` shape:"property" with operations | Known fields -> direct write, no AI extraction. One call per record. |
| User pastes text/table in chat | Parse inline, then `memory_save` shape:"property" with operations (structured) or shape:"shortform" (freeform) | No script needed. Map fields. |
| CSV/spreadsheet file (clean columns) | `memory_save` shape:"property" with operations and field mapping | Map columns to identity keys + properties. Use `--dry-run` first. |
| CSV/CRM export that's messy | script to parse/clean, then `memory_save` shape:"property" with operations | Normalize rows before writing. |
| CRM export (HubSpot, Salesforce, Pipedrive) | `memory_save` shape:"property" with operations and field mapping | Same as CSV. Tag with `source:crm` via a separate shortform `memory_save`. |
| Apollo/LinkedIn export | `memory_save` shape:"property" with operations and field mapping | Map Apollo columns (email, title, company, employee count). |
| Live CRM sync (ongoing) | Webhook → `memory_save` per event | Set up `destination_create` to receive events. |
| API response from external MCP | `memory_save` shape:"property" with operations (structured) or default shortform `memory_save` (freeform) | External MCP fetches, Personize stores. |
| Single record (conversation) | `memory_save` | Inline in conversation. |
| Content batch needing AI extraction | `memory_save` shape:"shortform" with `items[]` | Freeform text -> extraction. |
| Event attendee list | `memory_save` shape:"property" with operations | Structured rows. Tag with `source:event:{event-name}` via a separate shortform `memory_save`. |

## The Ingestion Loop (any source)

1. **Map fields**: identify which source field is the identity key (email, website_url) and which are properties
2. **Deduplicate**: run a similar-records lookup (REST/SDK `retrieve` with `mode:'similar'`; not available on MCP) on a sample before bulk import -- catch duplicates early
3. **Dry run**: show 3-5 sample records to user before committing
4. **Batch write**: structured rows -> `memory_save` shape:"property" with `operations`; content needing extraction -> `memory_save` shape:"shortform" with `items[]` and `tier:"pro"`
5. **Tag the import**: send a shortform `memory_save` that carries `tags:["source:X"]`.
   On the core MCP, the property, text and identifiers shapes do not carry `tags` or `tier`; only the default shortform save does
6. **Verify**: `memory_retrieve` (mode:'scout') on 2-3 records to confirm extraction quality
7. **Report**: X imported, Y skipped (duplicates), Z failed

## Field Mapping Rules

- MUST identify the identity key first (email for contacts, website_url/domain for companies)
- MUST NOT import without an identity key -- records without keys become orphans
- SHOULD map source fields to existing collection properties where possible
- SHOULD tag every import with source: `source:apollo`, `source:hubspot`, `source:manual`, `source:event` (applied through a shortform `memory_save`, not the property write)
- MUST check opt-out list before importing contacts (skip opted-out emails)

## Handling Duplicates

| Scenario | Detection | Resolution |
|---|---|---|
| Same email, different source | Automatic (same identity key) | Personize merges memories on same record |
| Similar name, different email | similar-records lookup (REST/SDK) | Surface to user -- may be same person with alias |
| Same company, different domain | similar-records lookup on company | Use `memory_save` shape:"identifiers" to add alias |
| CRM ID mapping | Source has `hubspot_id` or `salesforce_id` | `memory_save` shape:"identifiers" to add as custom key |

## Credit Estimation

| Operation | Cost |
|---|---|
| `memory_save` shape:"property" with operations (structured, no extraction) | 1 credit per item |
| `memory_save` shape:"shortform" (content, basic) | 1 credit per item |
| `memory_save` shape:"shortform" (content, pro) | 1 credit per item |
| similar-records lookup (dedup check) | 1 credit per call for API-key callers, 0 in the UI and MCP |
| `memory_retrieve` (verification) | 1 credit |

Estimate before large imports: items * 1 credit + verification overhead.
MUST check `analytics_credits` before imports > 100 items.
