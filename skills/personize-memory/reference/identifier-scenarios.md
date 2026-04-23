# Identifier Scenarios — Personize Memory API

How each memory endpoint behaves when you pass different combinations of `email`, `websiteUrl`, `recordId`, `type`, or nothing.

---

## Quick Reference

| Scenario | Input | memorize | recall | smartRecall | smartDigest |
|----------|-------|----------|--------|-------------|-------------|
| A | `email` | Stores, derives recordId | Fetches record | Filters by email | Fetches record |
| B | `websiteUrl` | Stores, derives recordId | Fetches record | Filters by websiteUrl | Fetches record |
| C | `recordId` | Stores directly | Fetches record | Exact filter | Fetches record |
| D | `type + email` | Stores, derives recordId for type | Fetches record | email + recordId filter | Fetches record |
| E | `type + websiteUrl` | Stores, derives recordId for type | Fetches record | websiteUrl + recordId filter | Fetches record |
| F | `type` only | **Error** — missing identifier | **Empty** — no CRM key | No filter (org-wide) | **Error** — cannot resolve |
| G | Nothing | **Error** — missing identifier | **400** — type required | No filter (org-wide) | **Error** — cannot resolve |

---

## Endpoint Overview

| Endpoint | Route | Mechanism | Required |
|----------|-------|-----------|----------|
| `memorize` | `POST /api/v1/memorize` | AI extraction → Lambda → vector store + database write | `content` + at least one CRM key |
| `recall` | `POST /api/v1/recall` | DynamoDB Snapshot exact key lookup | `type` + at least one CRM key |
| `smartRecall` | `POST /api/v1/smart-recall` | vector similarity search + reranking + reflection | `query` only |
| `smartDigest` | `POST /api/v1/smart-memory-digest` | DynamoDB Snapshot + Freeform memories, token-budgeted | at least one CRM key |

---

## memorize — `POST /api/v1/memorize`

**What it does:** Runs AI extraction on `content`, writes structured property values to the vector store + database, and stores free-form memories.

**Required:** `content` + at least one of `email`, `websiteUrl`, or `recordId`.

### Scenario A — email only
```json
{ "content": "...", "email": "john@acme.com" }
```
- Generates `recordId = HMAC(orgId | type | email)` internally
- Stores entry with `metadata.email = "john@acme.com"` + derived `recordId`
- Type inferred as `Contact`
- **Result:** Stored successfully, linked to that email

### Scenario B — websiteUrl only
```json
{ "content": "...", "websiteUrl": "acme.com" }
```
- Domain is extracted from URL (`extractDomain`)
- Generates `recordId = HMAC(orgId | type | domain)`
- Stores with `metadata.websiteUrl = "acme.com"`
- Type inferred as `Company`
- **Result:** Stored successfully, linked to that domain

### Scenario C — recordId only
```json
{ "content": "...", "recordId": "REC#abc123..." }
```
- Used directly, no derivation needed
- **Result:** Stored linked to that record; type defaults to whatever `type` field says

### Scenario D — type + email
```json
{ "content": "...", "type": "Contact", "email": "john@acme.com" }
```
- Type is explicit; `recordId` derived via `generateRecordId(orgId, "Contact", email)`
- Both email and recordId stored in metadata
- **Result:** Stored correctly, cleanly typed as Contact

### Scenario E — type + websiteUrl
```json
{ "content": "...", "type": "Company", "websiteUrl": "acme.com" }
```
- Same as D but for Company
- **Result:** Stored correctly, cleanly typed as Company

### Scenario F — type only (no CRM key)
```json
{ "content": "...", "type": "Contact" }
```
- `resolveTypeIdentifier()` finds no email, websiteUrl, or recordId
- Returns `{ isRequired: true, value: undefined }`
- **Result:** **Error** — `"Missing required identifier for type 'Contact': identifier"`

### Scenario G — nothing (no CRM keys)
```json
{ "content": "..." }
```
- Same validation failure as F
- **Result:** **Error** — missing identifier

---

## recall — `POST /api/v1/recall`

**What it does:** Direct DynamoDB Snapshot key lookup. Constructs composite key `{type}#{recordId}` and does an exact `GetItem`. No vector search. Also fetches from Freeform memories table.

**Required:** `type` (always) + at least one of `email`, `websiteUrl`, or `recordId`.

### Scenario A — type + email
```json
{ "type": "Contact", "email": "john@acme.com" }
```
- `getCrmKeyForRecordId("Contact", "john@acme.com", undefined)` → `"john@acme.com"`
- `generateRecordId(orgId, "Contact", "john@acme.com")` → `"REC#abc..."`
- Builds key `contact#REC#abc...`, runs `GetItem`
- Falls back to legacy userId-based recordId if not found
- **Result:** Returns structured properties + freeform memories for that contact

### Scenario B — type + websiteUrl
```json
{ "type": "Company", "websiteUrl": "acme.com" }
```
- Same derivation path using websiteUrl
- **Result:** Returns data for that company record

### Scenario C — type + recordId
```json
{ "type": "Contact", "recordId": "REC#abc123..." }
```
- Used directly, builds key `contact#REC#abc123...`
- No derivation needed; most reliable option
- **Result:** Direct fetch, fastest path

### Scenario F — type only (no CRM key)
```json
{ "type": "Contact" }
```
- `getCrmKeyForRecordId("Contact", undefined, undefined)` → `null`
- `primaryRecordId = null`
- **Result:** **Returns empty** — `{ memories: [], freeformMemories: [], memoryCount: 0 }` with 200 OK. No error. Silent empty.

### Scenario G — nothing (no type)
```json
{ "email": "john@acme.com" }
```
- Controller validates: `type` is required
- **Result:** **400 Bad Request** — `"type is required (e.g. Contact, Company)"`

> **Note:** `recall` is NOT a search. It is a direct lookup. It will always return empty if the exact record doesn't exist in the database, even if memories were written to the vector store only.

---

## smartRecall — `POST /api/v1/smart-recall`

**What it does:** Embeds `query`, runs vector similarity search, applies filters, reranks, optionally runs reflection loops. CRM keys scope the search; without them it searches all org data.

**Required:** `query` only. All CRM keys are optional filters.

### Scenario A — email only
```json
{ "query": "...", "email": "john@acme.com" }
```
- Sets `filter.email = "john@acme.com"` in the vector search query
- Searches all entries where `metadata.email` matches
- **Result:** Semantic search scoped to that contact's entries

### Scenario B — websiteUrl only
```json
{ "query": "...", "websiteUrl": "acme.com" }
```
- Sets `filter.websiteUrl = "acme.com"`
- **Result:** Semantic search scoped to that company

### Scenario C — recordId only
```json
{ "query": "...", "recordId": "REC#abc123..." }
```
- Sets `filter.recordId = "REC#abc123..."`
- Most restrictive — narrows to a single entity's entries
- **Result:** Semantic search on that exact record

### Scenario D — type + email
```json
{ "query": "...", "type": "Contact", "email": "john@acme.com" }
```
- Sets `filter.email = "john@acme.com"`
- Also derives and sets `filter.recordId = generateRecordId(orgId, "Contact", email)`
- Both filters active (AND logic)
- **Result:** Scoped to that contact; functionally same as email-only but with recordId constraint

### Scenario E — type + websiteUrl
```json
{ "query": "...", "type": "Company", "websiteUrl": "acme.com" }
```
- Same as D but for Company
- **Result:** Scoped to that company record

### Scenario F — type only (no CRM key)
```json
{ "query": "...", "type": "Contact" }
```
- `getCrmKeyForRecordId("Contact", undefined, undefined)` → `null`
- No recordId generated, **no filter added**
- `type` field in the vector store stores entry kind (`"property_value"`, `"memory"`), NOT entity type
- **Result:** Full org-wide search — NOT scoped to contacts only. Behaves exactly like Scenario G.

### Scenario G — nothing (query only)
```json
{ "query": "Who did we meet at SaaStr?" }
```
- Empty filter
- Searches all entries for the entire organization
- **Result:** Org-wide semantic search — discovers relevant memories across all entities

> **Key insight:** `type` alone has zero filtering effect in `smartRecall`. You must pair it with `email`, `websiteUrl`, or `recordId` to scope results to a specific entity. `type`-only and nothing both produce a full org-wide search.

---

## smartDigest — `POST /api/v1/smart-memory-digest`

**What it does:** Fetches the DynamoDB Snapshot (structured properties) + Freeform memories table entries for an entity, compiles them into a token-budgeted markdown block ready for prompt injection.

**Required:** At least one of `recordId`, `email`, or `websiteUrl`.

### Scenario A — email only
```json
{ "email": "john@acme.com" }
```
- Resolves CRM key from email
- Derives `recordId = generateRecordId(orgId, "contact", email)`
- Fetches snapshot + freeform memories
- **Result:** Full entity context bundle for that contact

### Scenario B — websiteUrl only
```json
{ "websiteUrl": "acme.com" }
```
- Same resolution path using websiteUrl
- **Result:** Full entity context bundle for that company

### Scenario C — recordId only
```json
{ "recordId": "REC#abc123..." }
```
- Used directly; resolution block skipped
- **Result:** Fetches snapshot and memories by exact recordId. Fastest path, most reliable.

### Scenario D — type + email
```json
{ "type": "Contact", "email": "john@acme.com" }
```
- Type is passed to both resolution and `fetchRecordSnapshotByIdentifiers`
- Resolves recordId as Contact
- **Result:** Same as A but with explicit type; safer when entity type matters

### Scenario E — type + websiteUrl
```json
{ "type": "Company", "websiteUrl": "acme.com" }
```
- Same as D for Company
- **Result:** Entity context for that company

### Scenario F — type only (no CRM key)
```json
{ "type": "Contact" }
```
- No identifier resolves
- **Result:** **400 error** — `"Could not resolve recordId — provide recordId, email, or websiteUrl"`

### Scenario G — nothing
```json
{}
```
- Same as F — no identifiers to resolve from
- **Result:** **400 error** — `"Could not resolve recordId — provide recordId, email, or websiteUrl"`

---

## How recordId is Generated (Shared Logic)

All four endpoints share the same deterministic formula when deriving a recordId from a CRM key:

```
recordId = "REC#" + HMAC-SHA256(orgId + "|" + type + "|" + normalizedCrmKey)
```

This means:
- Same `orgId` + `type` + `email` always produces the same `recordId`
- Writing with `email: "john@acme.com"` and reading with `email: "john@acme.com"` will always find the same record
- The raw `REC#...` value returned by `search` can be passed directly to `recall`, `smartRecall`, or `smartDigest` as `recordId`

---

## Recommended Patterns

### Contact lookup
```typescript
// Discover: find relevant memories about any contact
await client.memory.smartRecall({
    query: "background on John Charter",
    email: "john@acme.com",   // scopes to this contact
});

// Fetch full context before outreach
await client.memory.smartDigest({
    email: "john@acme.com",
    type: "Contact",
    token_budget: 2000,
});

// Direct structured property lookup (when you know the contact)
await client.memory.recall({
    type: "Contact",
    email: "john@acme.com",
});
```

### Org-wide discovery
```typescript
// Find anything across all contacts/companies
await client.memory.smartRecall({
    query: "people we met at SaaStr 2025",
    // no CRM keys = full org search
});
```

### Store a memory
```typescript
// Always provide at least one CRM key
await client.memory.memorize({
    content: "John Charter is the VP of Sales at TechFlow. Met at SaaStr.",
    email: "john@acme.com",
    type: "Contact",
});
```

---

## Error vs Empty vs Success

| Endpoint | No CRM key | Wrong CRM key (no matching record) |
|----------|------------|-------------------------------------|
| `memorize` | **Error** (400) | Writes new record with that key |
| `recall` | **Empty** 200 (type only) or **400** (no type) | **Empty** 200 — silent, not an error |
| `smartRecall` | **Success** — org-wide search | **Success** — returns `[]` if nothing matches |
| `smartDigest` | **Error** (400) | **Success** — returns empty `properties: {}`, `memories: []` |
