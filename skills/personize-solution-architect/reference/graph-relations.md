# Graph Relations — Design & Modeling Guide

Personize records can be connected as a graph. Edges are bi-temporal (valid_from / valid_to) and live in a PostgreSQL `edges` table. Traversal is exposed via `POST /api/v1.1/memory/retrieve` with `sources.graph: true` (and via `retrieve_unified(mode='scout', sources={graph:true})` on the agent2_0 MCP profile — graph is a *source*, not a mode).

**The key insight:** for the common cases, **you don't seed edges manually.** The edge-inference registry watches incoming memorize calls and writes edges automatically when it sees identity-bearing properties (`company`, `linkedin_url`, `attendees`, `assigned_to_email`, etc.). Custom relations require either extending the registry or — in the future — direct edge API calls.

This guide covers: how edges actually get created, the built-in relation types, when to model as graph vs. nested property, and how to query the graph.

## How edges get created (today)

Edge writes are **opt-in per memorize/save call** via three independent channels. All three default OFF; combine freely.

| Channel | Request flag | When it fires | Sync/async | Billed |
|---|---|---|---|---|
| **A — Declared** | `relations: [...]` | You hand the platform the edge directly: `{relationType, toRecordId \| toIdentity, toEntityType?, confidence?}` | Synchronous (edge persisted before response returns) | Free |
| **B — Property-inferred** | `collectionGraph: true` | Extracted structured properties point at another entity (e.g. `company: 'acme.com'` on a Contact) → registry resolves target by alias, writes edge with the matching `relation_type` | Async (2-10 s after response) | Deterministic, ~free at typical sizes (3 credits/M processed tokens) |
| **C — LLM-inferred** | `smartGraph: true` | Free-text memories mention identity-bearing entities (emails, domains, phones) → Bedrock Nova Micro proposes edges grounded in strong identifiers | Async (2-10 s after response) | Per LLM input token at the memorize tier |

Channel B is the workhorse for CRM-shaped data. Save a contact with `properties.company = 'acme.com'` and `collectionGraph: true`, and you implicitly get a `works_at` edge from that contact to the Acme company record — even if the company record didn't exist yet (it gets stubbed, then promoted when memorized against).

Channel A is for cases where you already know the edges (a CRM sync, an enrichment vendor, your own classifier). Channels B/C never invent edges of types not in your org's `relation_types` registry; A drops items whose `relationType` isn't registered.

**Per-request example** (all three on):

```ts
await client.memory.save({
  content: 'Maya joined Orbit Climb as Director of Eng. Reports to Aria.',
  email: 'maya@orbitclimb.io',
  type: 'Contact',
  collectionGraph: true,
  smartGraph: true,
  relations: [
    { relationType: 'works_at',
      toIdentity: { kind: 'websiteUrl', value: 'orbitclimb.io' },
      toEntityType: 'company' },
  ],
});
```

Full channel semantics, stub rules, confidence thresholds, and pricing: `Docs/memorize-graph-guide.md`.

### Built-in inference rules (Channel B registry)

These rules run automatically when `collectionGraph: true` is set on the save/memorize call — no configuration needed:

| Property name(s) on source record | Target type | Default relation | Notes |
|---|---|---|---|
| `linkedin_url`, `company_linkedin`, `linkedin` | Company | `works_at` | Normalized via `linkedinHandle` (strip scheme, strip linkedin.com/{company,in}/) |
| `company`, `company_name`, `organization` | Company | `works_at` | Looked up by name alias — lower confidence, no stub creation |
| `website_url` on Contact / Ticket / etc. | Company | `works_at` (Contact), `about` (Ticket) | Per-source override; same property → different relation depending on source type |
| `assigned_to_email`, `assignee_email`, `assigned_email` | Contact | `assigned_to` | Used by tickets, tasks |
| `mentioned_emails`, `mentionedemails` | Contact | `mentioned_in` | Multi-valued: writes one edge per email |
| `attendees`, `attendee_emails`, `participant_emails` | Contact | `participated_in` | Used by Meeting records |
| `salesforce_id`, `salesforceid` | Deal | `relates_to` | CRM linkage |
| `crm_deal_id`, `crmdealid` | Deal | `relates_to` | CRM linkage |

**Stub creation gate:** if the target alias lookup misses and the source has ≥ 1 identity at confidence ≥ 0.95 (e.g. a real email or domain — not just a name), the engine creates a stub target record AND writes the edge. This means importing a CSV of contacts with `company` columns can auto-create the company records on the fly.

## The relation_types registry

Edges reference a `relation_type` row in PG. There are two tiers:

1. **System built-ins** (`org_id = '00000000-0000-0000-0000-000000000000'`) — `works_at`, `assigned_to`, `mentioned_in`, `participated_in`, `relates_to`, `about`, etc. Always available.
2. **Per-org overrides** — your org can extend or override. Per-org row wins if both exist.

Each `RelationType` row carries:

| Field | Meaning |
|---|---|
| `type_name` | Canonical name (`works_at`) |
| `display_label` | Human-readable label |
| `category` | Grouping for UI/filtering |
| `is_single_valued` | If true, writing a new edge of this type auto-ends the previous one (e.g. a contact `works_at` one company at a time) |
| `is_symmetric` | If true, edge is bidirectional |
| `inverse_type` | For asymmetric edges: the reverse type (e.g. `manages` ↔ `reports_to`) |
| `default_weight` | Used by traversal ranking |
| `allowed_from_types` / `allowed_to_types` | Schema constraint — edges with wrong source/target types get rejected |
| `is_active` | Soft delete |

The `relation_types` registry is manageable end-to-end via the v1.1 API:

- **SDK:** `client.v1_1.memory.relationTypes.{list,get,create,update,delete,createBatch}`
- **MCP:** the same surface via the `agent2_0` profile
- **CLI:** `personize v1.1 memory relation-types {list,get,create,update,delete}`

Per-org rows override system built-ins of the same `typeName`. Custom Channel-B property inference still requires registry-side work (file a request), but creating the relation type itself (so Channel A `relations[]` calls can use it) no longer does.

## When to model as graph vs. nested property

The most common architect question: should `manager_email` on a contact be a *property* or a *graph edge*?

| Use as... | When |
|---|---|
| **Nested property** | You only need it for display ("show me the manager") — single value, never traversed, never queried "who reports to X?" |
| **Graph edge** | You need bidirectional traversal (find all reports of a manager), multi-hop queries ("everyone in this org's reporting chain"), or temporal history (who was the manager 6 months ago?), or you'll filter by relation type |

Decision shortcut:

```
Does this connect TWO entities that BOTH live as records in Personize?
  No  → Nested property. Just store the value.
  Yes → Will you ever query "all X connected to Y" in reverse?
    No  → Still a property. Edges are overkill for one-way display.
    Yes → Graph edge. Use the registry mapping.
```

Examples:

| Scenario | Modeling |
|---|---|
| Contact's job title | Property |
| Contact's company (you want "find all contacts at Acme") | Graph edge (`works_at`) — auto-inferred if `company` property is set |
| Contact's manager email (display only) | Property |
| Contact's manager (you'll query "find all reports of jane@acme.com") | Graph edge — needs registry support |
| Deal's primary contact | Graph edge — auto-inferred from contact-email property |
| Deal's stage | Property — stage is a status, not a connected entity |
| Meeting's attendees | Graph edge (`participated_in`) — auto-inferred from `attendees` |
| Ticket's customer | Graph edge — auto-inferred from `email` property |

## Querying the graph

Graph traversal is a *source* in the unified retrieve API. Two pieces to wire:

```ts
const result = await client.retrieve({
  mode: 'scout',
  record: { id: 'contact_jane@acme.com' },     // anchor node
  sources: { graph: true },                     // turn graph fan-out on
  filters: {
    graph: {
      relationTypes: ['works_at', 'reports_to'],  // restrict to specific relations (optional)
      hops: 2,                                    // 1 = direct neighbors, 2-3 = walk further (max 3)
      limit: 50,                                  // total cap across all hops
      offset: 0,                                  // pagination
    },
  },
});
```

Each returned neighbor carries its shortest `hop` distance — so even at `hops: 3`, you can filter to "only direct contacts" downstream.

Via the **agent2_0 MCP profile**, it's simpler:

```
retrieve_unified(
    mode='scout',
    record={id: 'contact_jane@acme.com'},
    sources={graph: true}
)
```

Graph is a *source* (independent on/off toggle), not a mode. Combine with other sources (`memories`, `documents`) on the same call for one-shot multi-source recall. The MCP tool fills in reasonable defaults; cap traversal via `intent.perSource.graph.limit` / `.offset`.

### Common queries

| Question | How |
|---|---|
| "Who works at Acme?" | `retrieve({ record: { website_url: 'acme.com' }, sources: { graph: true }, filters: { graph: { relationTypes: ['works_at'], hops: 1 } } })` |
| "Who's in Jane's reporting chain (up to 3 levels)?" | `filters.graph: { relationTypes: ['reports_to'], hops: 3 }` |
| "All entities connected to this deal (any relation)" | `filters.graph: { hops: 1 }` (no `relationTypes` = any) |
| "All meetings Jane participated in" | `retrieve({ record: { email: 'jane@acme.com' }, sources: { graph: true }, filters: { graph: { relationTypes: ['participated_in'] } } })` — meetings are the *source* of the edge, so this needs the inverse direction handled by the registry |

### Bi-temporal edges (current state vs. point-in-time)

The `edges` table tracks `valid_from` / `valid_to` per edge. Today, graph queries return current-state only. Point-in-time traversal (`asOf`) is in the schema as a future field but not wired — for "as of last quarter" queries, use `mode='filter'` with property-level `updatedAfter` / `BETWEEN` conditions instead, which ARE wired.

## When graph turns up empty

Common reasons agents see no graph results:

1. **No edges seeded yet.** The org just started memorizing; inference rules haven't fired enough. Check with a direct PG query or wait for ingestion to flow.
2. **Property names don't match the registry.** Memorize used `employer` instead of `company`, so `works_at` inference skipped. Either rename the property at ingest time or extend the registry to recognize `employer`.
3. **Confidence too low for stub.** Source record only had a `name` (not email/domain), so the company stub didn't get created — no target, no edge.
4. **`sources.graph: true` not set.** The default `retrieve` call doesn't fan out to graph; you must opt in.
5. **`relationTypes` filter too narrow.** You asked for `['mentors']` but the registry doesn't have that type and no edges of that type exist.

State this explicitly in agent outputs — never hallucinate connections. The agent2_0 mental model is firm on this: "If no edges are seeded for a record, the result is empty — state that explicitly rather than hallucinating connections."

## Design checklist before you commit to the graph model

- [ ] Have you confirmed there's a built-in `relation_type` for the connection you need? (Check `works_at`, `assigned_to`, `mentioned_in`, `participated_in`, `relates_to`, `about` first.)
- [ ] If not built-in, can the connection be inferred from an existing property name in the [registry](../../../src/modules/internal/memory/edges/edge-inference-registry.ts)?
- [ ] If neither, have you scoped what platform-side support is needed? (Custom relation_type + custom inference rule.)
- [ ] Do you actually need traversal — or would a nested property and a property-filter query be simpler and faster?
- [ ] If you'll have > 100K edges, have you considered the `hops` budget? Hops 2-3 with no `relationTypes` filter can return large result sets.

## See also

- [audit-and-plan.md](./audit-and-plan.md) — How graph-modeled data fits into the import sequence (companies before contacts so `works_at` edges land correctly)
- [schema-design-guide.md](./schema-design-guide.md) — Property design that *feeds* the edge inference engine
- [relation-types-examples.json](../../personize-enabler/presets/relation-types-examples.json) — Concrete example relation-type definitions per use case (now in the `personize-enabler` skill's presets)
- Reference persona's [mcp-tools.md](../../personize-reference/reference/mcp-tools.md) `retrieve_unified` section — agent2_0 graph mode invocation
