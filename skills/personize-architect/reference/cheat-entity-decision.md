# Entity Decision Tree

## First Question: Data or Rule?

| Question | Answer | Go To |
|----------|--------|-------|
| **Does it describe how to behave?** (rules, policies, criteria, standards, playbooks, tone) | Yes → **Guideline** (`guideline_create`) | STOP -- do not continue to the collection tree |
| **Does it describe a thing with identity?** (person, company, deal, ticket) | Yes → Continue below | ↓ |

## Collection Decision Tree (only for data entities)

| Question | If Yes | If No |
|----------|--------|-------|
| Does it have a unique identity (email, URL, ID)? | -> Collection record | -> Property or freeform memory |
| Will multiple agents read/write to it? | -> Collection + Workspace | -> Collection without workspace |
| Is it a sub-attribute of an existing entity? | -> Property on parent record | -> New collection |
| Is it temporary/ephemeral observation? | -> Freeform memory | -> Structured property |
| Does it have a status or metrics you need to track/filter? | -> Collection (not a local file or self-memory) | -> May not need a collection |
| Does it need search/filter/export? | -> Property (structured) | -> Freeform memory is fine |
| Will its values change over time? | -> Property (with history) | -> Freeform memory for snapshots |

## Property Type Selection

| Property values are... | Use type | Why |
|---|---|---|
| Open-ended text | `text` or `string` | Free extraction |
| One of a known set (Active/Paused/Archived) | `select` with `options` | Constrains extraction, enables `filterByProperty` |
| Multiple from a known set (tags, skills) | `multi-select` with `options` | Same benefits, allows multiple values |
| A number (score, count, revenue) | `number` | Enables numeric filtering |
| Yes/No | `boolean` | Clean binary state |
| A date | `date` | Temporal queries |

MUST use `select`/`multi-select` when values are enumerable -- storing "Active" as a `string` means `filterByProperty` can't reliably match it, and extraction may produce inconsistent variants ("active", "Active", "ACTIVE").

## Type Reference

**Guidelines:** ICP criteria, email standards, sales playbooks, compliance policies, brand voice, send limits, opt-out rules -- anything that governs agent behavior. Created via `guideline_create`. Delivered to agents via `ai_smart_guidelines`.
**Collections:** Contacts, Companies, Products, Tickets, Projects, Campaigns -- anything with identity. Created via `collection_create`.
**Properties:** Structured fields on a collection (name, email, deal_stage, budget)
**Workspace:** Coordination layer on a record (tasks, issues, notes, context)
**Freeform memory:** Unstructured observations, notes, temporal context

## Common Mistakes

| Item | Wrong | Right |
|------|-------|-------|
| ICP qualification criteria | Collection | Guideline |
| Email writing standards | Collection | Guideline |
| Daily send limits | Collection | Guideline |
| Brand voice rules | Collection | Guideline |
| Campaign record (status, metrics) | Guideline | Collection |
| Contact record (email, title) | Guideline | Collection |
