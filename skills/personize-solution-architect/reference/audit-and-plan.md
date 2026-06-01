# Audit & Plan — Onboarding an Existing Corpus

Use this when a user already has data and is asking "how do I get this into Personize?" The four phases below answer it concretely: inventory what they have, decide what becomes records vs. context vs. workspace, sequence the import, and verify it landed.

This is the architect's first-week playbook. Don't skip to coding — getting the inventory wrong leads to schema redesign in week 4.

## Phase 1 — Audit the corpus

Ask three concrete numbers before anything else. **Without these, you can't size the import, estimate the cost, or pick the right batch size.**

| Question | Where to find the answer | What it unlocks |
|---|---|---|
| **How many records?** | HubSpot contacts count; SF `SELECT COUNT() FROM Account`; Postgres `SELECT COUNT(*) FROM customers`; CSV line count | Decides single vs. batch vs. async-batch; estimates initial memorize cost |
| **How many entity types?** | List CRM object types (Contact, Company, Deal, Ticket); product DB tables; auxiliary stores | Decides how many collections to create; reveals whether multi-tenant patterns are needed |
| **How much unstructured content per record?** | Per-contact: # call notes, # emails, # support tickets, avg word count of each | Decides extraction tier (basic / pro / pro_fast / ultra) and whether `extractMemories: true` is needed |

### Quick inventory snippets

```ts
// HubSpot inventory via passthrough
const counts = await Promise.all([
  client.hubspot.contacts.list({ limit: 1 }),
  client.hubspot.companies.list({ limit: 1 }),
  client.hubspot.deals.list({ limit: 1 }),
]);
// HubSpot returns `total` in the page response — use it
console.log({ contacts: counts[0].body.total, companies: counts[1].body.total, deals: counts[2].body.total });

// Salesforce inventory via SOQL
const inventory = await Promise.all([
  client.salesforce.query("SELECT COUNT() FROM Account"),
  client.salesforce.query("SELECT COUNT() FROM Contact"),
  client.salesforce.query("SELECT COUNT() FROM Opportunity"),
]);

// Existing Personize footprint (what's already memorized for this org)
const orgUsage = await client.analytics.overview();
// orgUsage.data — records, memories, attachments
```

### Per-record content audit

For each entity type, ask the user:

1. **What free-text fields exist?** (call notes, ticket descriptions, email bodies, meeting transcripts)
2. **What structured fields exist?** (industry, ARR, stage, tags) — these become properties with `extractMemories: false`
3. **What external content references exist?** (linked docs, recordings, PDFs) — decide attachment vs. transcribe-then-memorize

Output a one-line summary per type:
```
Contact: 12,000 records. Avg 4 call notes + 8 emails. Has Apollo enrichment data. → pro tier, extractMemories: true
Company: 2,400 records. Mostly structured (industry, ARR, headcount). → basic tier, extractMemories: false
Deal:     800 records. Heavy text (objections, next steps). → pro tier, extractMemories: true
```

## Phase 2 — Decide what becomes what

Three destinations for incoming data; pick one per data type before importing:

| Destination | What goes here | Tool |
|---|---|---|
| **Collection record** | Anything with an identity key (email, domain, external_id) — entities you'll recall *by key* | `client.memory.memorize()` / `memory_batch_store` |
| **Context doc** | Behavioral rules, ICP criteria, brand voice, playbooks, account briefs that aren't entity-shaped | `client.context.create()` / `context_save` MCP tool — or `client.v1_1.context.saveBatch()` for 10+ at once |
| **Workspace property on existing record** | Coordination state (tasks, issues, notes) that lives alongside an entity | `client.memory.update()` with `operation: 'push'` |

**The most common mistake:** importing "Sales Playbook" as a contact record. It has no identity, can't be filtered by, and won't reach agents via SmartContext. It belongs in `context` with `type: 'playbook'`. The reverse mistake — modeling a deal as a context doc — loses recall and segmentation. **Test:** if you would ever say "show me all the X", it's a collection. If you would say "remind agents of X when relevant", it's a context doc.

## Phase 3 — Sequence the import

Order matters because Personize extracts properties from content, and properties are scoped to collections. Sequence wrong and you backfill twice.

### Recommended ordering

1. **Entity types first.** `client.entityTypes.update(...)` — set display names matching domain language ("Candidate" vs. "Contact" for recruiting). Cheaper to fix names now than to migrate records later.
2. **Collections second.** `client.collections.create({ entityType, properties })` — define property schemas BEFORE memorize. Otherwise extraction lands in a generic bucket and you re-extract on re-import.
3. **Context docs third.** Org-level rules (ICP, brand voice, playbooks) get seeded via async `client.v1_1.context.saveBatch()` for bulk imports (10+) or `client.context.create()` for one-offs. This populates SmartContext so subsequent memorize calls benefit from governance from day one.
4. **Companies before contacts.** Contact records reference companies via `websiteUrl`. Importing companies first means `extractMemories` on contact text can correlate against existing company records.
5. **Contacts before deals.** Deals reference contact emails. Same reasoning.
6. **Interaction content last.** Call notes, support tickets, emails — these are the longest tail and the highest-volume. Run as async batch after the entity scaffolding is in place.

### Batch sizing decision table

| Record count | Tool | Why |
|---|---|---|
| 1–9 records | Per-record `client.memory.memorize()` — synchronous | Latency fine, no event polling needed |
| 10–500 records | `client.memory.memorizeBatch()` — synchronous | Shared extraction context, lower per-call overhead, ~1 credit/record |
| 500–10,000 records | `client.v1_1.memory.saveBatch()` — async with eventId polling | State machine handles partial failures; doesn't block your script |
| 10,000+ records | Chunked async batches of 5,000 with backoff | Avoid `SCHEDULE_CAP_EXCEEDED`-style guardrails; respect plan rate limits |

For **context docs** specifically: use `client.v1_1.context.saveBatch()` for any GitOps-style import (10+ docs from a folder of `.md` files). Single-doc `context_save` is fine for 1–9.

### Credit budget estimate

Rule of thumb (for sizing — not exact billing):

```
Initial memorize cost ≈ records × avg_content_pages × 1 credit/page × tier_multiplier
                      ÷ batch_discount (0.5x when using batch APIs)
```

Where `tier_multiplier` ≈ 1× (basic), 2× (pro), 3× (ultra). For example, 10,000 contacts × 4 pages avg × pro tier × batch discount:
```
10,000 × 4 × 2 × 0.5 = 40,000 credits for the initial corpus
```

For exact numbers, use [cost-simulator.md](./cost-simulator.md) (records × pages × LLM rate × tier × discounts).

### Rate-limit headroom

Plan `maxApiCallsPerMinute` typically 60–1000. Async batches don't count against per-call limits the same way — they count once at submission. Burn the synchronous budget on small/medium imports; switch to async for the long tail.

```ts
// Read your actual limits
const me = await client.me();
const { maxApiCallsPerMinute, maxApiCallsPerMonth } = me.data;
```

## Phase 4 — Verify after import

Run these three checks before declaring an import complete:

```ts
// 1. Record count matches (per entity type)
const overview = await client.analytics.overview();
// Compare overview.data.recordCount to your source-system count

// 2. Properties extracted (spot-check 5 random records)
const sample = await client.memory.search({ query: '*', limit: 5 });
for (const rec of sample.data.results) {
  console.log(rec.email, rec.properties);  // Should show populated structured fields
}

// 3. Recall works (run a question you know the answer to)
const recall = await client.memory.smartRecall({
  query: 'who works at acme corp?',
  mode: 'fast',
});
// Should return the expected contacts
```

**If extraction is sparse:** the property descriptions are too generic. Re-author them with extraction-guiding language ("Annual deal budget in USD, extracted from pricing discussions") and re-run on a small sample — don't re-import 10k records.

**If recall is empty:** check that `extractMemories: true` was set on text-heavy fields. The structured-only path skips semantic memory creation, so you can recall by property but not by intent.

**If properties are wrong:** check `extraction-quality` evaluation: `client.evaluate.memorizationAccuracy({ collectionId, input: '<sample>' })` — three-phase eval that flags extraction-vs-schema mismatches.

## Decision shortcut — when in doubt

| Situation | Default |
|---|---|
| Source is a CRM with structured + unstructured fields | Collections per entity type; `extractMemories: true` on text fields |
| Source is a folder of `.md` files (playbooks, runbooks) | `client.v1_1.context.saveBatch()` with `type: 'playbook'` |
| Source is a single ICP doc | `client.context.create({ type: 'guideline' })` |
| Source is an Apollo/LinkedIn export | `memorizeBatch` with field mapping; tag `source:apollo` |
| Source is a transcript / call recording | `memorize({ content, email, tags: ['type:transcript'] })` per call; extraction tier `pro` |
| 10,000+ records, mixed structured + text | Run entity-types + collections + context first, then async `saveBatch` per entity type, sequenced (companies → contacts → deals → interactions) |

## See also

- [cost-simulator.md](./cost-simulator.md) — Estimate the cost of the import you just planned
- [schema-design-guide.md](./schema-design-guide.md) — How to define collection properties that extract well
- [governance-authoring.md](./governance-authoring.md) — Writing context docs that agents will actually use
- [cheat-data-ingestion.md](../../agent-core/reference/cheat-data-ingestion.md) (agent-core persona) — Decision matrix for "user pastes X into chat, what do I do?"
