# Find Similar Records

## Endpoint
`POST /api/v1/similar`

## SDK
`client.memory.similar(options)`

## MCP Tool
`memory_find_similar`

## CLI
`personize memory similar [options]`

## Purpose
Find records similar to a seed record across structured properties, unstructured memories, or shared connections. Returns ranked results with similarity tiers, optimized for downstream processing.

## Use Cases
- **Lookalike prospecting:** Find companies similar to your best customer
- **Context transfer:** Find past deals similar to a new lead
- **Relationship mapping:** Discover records connected through shared people or topics

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| seed | object | Yes | - | Record identifier: { email?, recordId?, websiteUrl?, customKeyName?, customKeyValue? } |
| type | string | No | inferred | Entity type. email -> "contact", websiteUrl -> "company" |
| dimensions | string | No | "hybrid" | What drives similarity: "properties", "memories", "hybrid", "connections" |
| rankingMode | string | No | "balanced" | "balanced" (top score + 0.08 bonus for multi-dim) or "weighted" |
| weights | object | No | {0.6, 0.4} | { properties, memories }. Only with rankingMode: "weighted" |
| candidatePool | object | No | - | Scope: { recordIds?, type?, collectionIds? } |
| topK | number | No | 25 | Results per page (max 500) |
| offset | number | No | 0 | Pagination offset |
| minScore | number | No | 0.3 | Min similarity threshold |
| tierThresholds | object | No | {0.75, 0.5} | { very_similar, similar } |
| returnAllIds | boolean | No | false | Batch mode: flat list up to 2000 records |
| maxSnippetsPerResult | number | No | 3 | Max matched snippets per result (max 5) |

## Response

### Default Mode
Returns paginated results with match breakdowns and tier arrays.

### returnAllIds Mode
Returns flat `allIds[]` array with `{ recordId, score, tier }` for all matches. No breakdowns. Designed for piping into bulk-recall or batch operations.

## Tiers
- **very_similar:** score >= 0.75
- **similar:** score >= 0.5
- **somewhat_similar:** score >= minScore (default 0.3)

## Cross-Type Similarity
Set `candidatePool.type` differently from the seed type to find, e.g., companies similar to a contact's profile.

## Billing
1 credit per request.
