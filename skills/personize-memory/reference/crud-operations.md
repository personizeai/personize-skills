# Memory CRUD Operations Reference

All CRUD methods are available on `client.memory.*` in the SDK (`@personize/sdk`).

```typescript
import { Personize } from '@personize/sdk';
const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
```

## Get Record Properties

**SDK:** `client.memory.properties(opts)` | **API:** `POST /api/v1/properties`

Fetches property values for a record, joined with collection schema descriptions and the `update` flag.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | no* | Contact email |
| websiteUrl | string | no* | Company website URL |
| recordId | string | no* | Direct record ID |
| customKeyName | string | no | Custom CRM key field name |
| customKeyValue | string | no | Custom CRM key field value |
| type | string | no | Entity type (contact, company, user) |
| propertyNames | string[] | no | Filter to specific properties (recommended) |
| includeDescriptions | boolean | no | Join with collection schema (default: true) |
| nonEmpty | boolean | no | Exclude null/empty values (default: false) |

*At least one identifier required (email, websiteUrl, recordId, or customKeyName+customKeyValue).

Supported identifiers: `email`, `websiteUrl`, `recordId`, `customKeyName`+`customKeyValue`, `phoneNumber`, `postalCode`, `deviceId`, `contentId`.

Each returned property includes:
- `value` — current value
- `description` — from collection schema (tells AI how to interpret/update)
- `update` — `true` = replaceable, `false` = append-only
- `type` — property type (text, number, boolean, array, date, options)
- `collectionName` — which collection the property belongs to

```typescript
const result = await client.memory.properties({
  email: 'john@acme.com',
  propertyNames: ['Tasks', 'Lifecycle Stage'],
  nonEmpty: true,
});

for (const prop of result.data.properties) {
  console.log(`${prop.name}: ${prop.value} (update: ${prop.update})`);
}
```

## Update Property

**SDK:** `client.memory.update(opts)` | **API:** `POST /api/v1/memory/update`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| recordId | string | yes | Target record |
| type | string | no | Entity type (default: contact) |
| propertyName | string | yes* | Property to update |
| propertyValue | any | yes* | New value (mutually exclusive with array ops) |
| collectionId | string | no | Collection ID |
| confidence | number | no | Confidence score |
| updatedBy | string | no | Who made the change |
| reason | string | no | Change reason |
| expectedVersion | number | no | Optimistic concurrency guard — 409 if mismatch |
| arrayPush | object | no | `{ items: any[], unique?: boolean }` — append to array |
| arrayRemove | object | no | `{ items?: any[], indices?: number[] }` — remove from array |
| arrayPatch | object | no | `{ match: Record, set: Record }` — update matching objects |

*Required for property update. For freeform memory update, use `memoryId` + `text` instead.
**Array operations** are mutually exclusive with `propertyValue`.

```typescript
// SDK example — update property
await client.memory.update({
  recordId: 'rec-123',
  propertyName: 'deal_stage',
  propertyValue: 'negotiation',
  expectedVersion: 12,  // optional — 409 if mismatch
});

// SDK example — array push with dedup
await client.memory.update({
  recordId: 'rec-123',
  propertyName: 'tags',
  arrayPush: { items: ['vip', 'enterprise'], unique: true },
});
```

> **Change history is automatic.** Every property update writes a searchable change summary to LanceDB. Use `client.memory.smartRecall({ query: "what changed recently?", prefer_recent: true, recency_half_life_days: 7 })` to find recent changes.

## Update Freeform Memory

**SDK:** `client.memory.update(opts)` (with `memoryId` + `text`) | **API:** `POST /api/v1/memory/update`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| recordId | string | yes | Target record |
| memoryId | string | yes | Memory UUID to edit |
| text | string | yes | New memory text |

```typescript
// SDK example — edit freeform memory text
await client.memory.update({
  recordId: 'rec-123',
  memoryId: 'mem-uuid-456',
  text: 'Updated memory content here',
});
```

## Bulk Update

**SDK:** `client.memory.bulkUpdate(opts)` | **API:** `POST /api/v1/memory/bulk-update`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| recordId | string | yes | Target record |
| type | string | no | Entity type (default: contact) |
| updates | array | yes | Array of { propertyName, propertyValue, collectionId?, confidence? } |
| updatedBy | string | no | Who made the changes |

```typescript
// SDK example — bulk update
await client.memory.bulkUpdate({
  recordId: 'rec-123',
  updates: [
    { propertyName: 'company_name', propertyValue: 'Acme Corp' },
    { propertyName: 'deal_stage', propertyValue: 'closed_won' },
  ],
  expectedVersion: 5,
});
```

## Property History

**SDK:** `client.memory.propertyHistory(opts)` | **API:** `POST /api/v1/memory/property-history`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| recordId | string | yes | Target record |
| propertyName | string | no | Filter to specific property |
| from | string | no | ISO date lower bound |
| to | string | no | ISO date upper bound |
| limit | number | no | Max entries (default 50, max 200) |
| nextToken | string | no | Pagination cursor |

```typescript
// SDK example — property history
const history = await client.memory.propertyHistory({
  recordId: 'rec-123',
  propertyName: 'deal_stage',
  limit: 20,
});
// history.data.entries → [{ entryId, propertyName, propertyValue, updatedBy, createdAt }]
```

## Query Properties (LLM-powered)

**SDK:** `client.memory.queryProperties(opts)` | **API:** `POST /api/v1/memory/query-properties`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| propertyName | string | yes | Property to search across |
| query | string | yes | Natural language query |
| recordId | string | no | Limit to single record |
| type | string | no | Entity type filter |
| limit | number | no | Max results (default 100, max 200) |

```typescript
// SDK example — query properties with LLM
const matches = await client.memory.queryProperties({
  propertyName: 'pain_points',
  query: 'concerns about compliance or security',
  type: 'Contact',
});
// matches.data.matches → [{ recordId, propertyValue, matchReason }]
```

## Delete (Soft-Delete)

**SDK:** `client.memory.delete(opts)` / `client.memory.deleteRecord(opts)` | **API:** `POST /api/v1/memory/delete` / `POST /api/v1/memory/delete-record`

30-day recovery window. Items marked with `pendingDeletion: true`.

```typescript
// SDK example — soft-delete a record
await client.memory.deleteRecord({ recordId: 'rec-123', type: 'contact' });

// SDK example — delete specific memories
await client.memory.delete({ ids: ['mem-uuid-1', 'mem-uuid-2'] });
```

## Cancel Deletion

**SDK:** `client.memory.cancelDeletion(opts)` | **API:** `POST /api/v1/memory/cancel-deletion`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| recordId | string | yes | Record to restore |
| type | string | no | Entity type (default: contact) |

Returns 409 if 30-day window has expired and data is permanently deleted.

```typescript
// SDK example — cancel deletion
await client.memory.cancelDeletion({ recordId: 'rec-123', type: 'contact' });
```

## Filter By Property (No LLM)

**SDK:** `client.memory.filterByProperty(opts)` | **API:** `POST /api/v1/memory/filter-by-property`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | no | Entity type (default: contact) |
| conditions | array | yes | Array of `{ propertyName, operator, value? }` |
| logic | string | no | `'AND'` (default) or `'OR'` |
| limit | number | no | Max results (default 50, max 200) |
| nextToken | string | no | Pagination cursor |

**Operators:** `equals`, `notEquals`, `contains`, `gt`, `lt`, `gte`, `lte`, `exists`, `isEmpty`

**Response:** `{ records: [{ recordId, type, matchedProperties, lastUpdatedAt }], totalMatched, nextToken? }`

```typescript
// SDK example — filter by property
const result = await client.memory.filterByProperty({
  conditions: [
    { propertyName: 'status', operator: 'equals', value: 'active' },
    { propertyName: 'score', operator: 'gt', value: 50 },
  ],
  logic: 'AND',
  type: 'Contact',
  limit: 100,
});
// result.data.records → [{ recordId, type, matchedProperties, lastUpdatedAt }]
```

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| MISSING_PARAMS | 400 | Required field missing |
| INVALID_PARAMS | 400 | Bad field combination (e.g. propertyValue + array op) |
| INVALID_CONDITION | 400 | Invalid operator or missing propertyName |
| RECORD_NOT_FOUND | 404 | Record doesn't exist |
| MEMORY_NOT_FOUND | 404 | Memory ID doesn't exist |
| VERSION_CONFLICT | 409 | expectedVersion mismatch (includes currentVersion) |
| DELETION_FINALIZED | 409 | Past recovery window |
