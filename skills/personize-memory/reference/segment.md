# Segment Audience

## Endpoint
`POST /api/v1/segment`

## SDK
`client.memory.segment(options)`

## MCP Tool
`memory_segment`

## CLI
`personize memory segment [options]`

## Purpose
Bucket all records into similarity tiers relative to a seed record or text description. Returns tiered recordId arrays for audience segmentation, list building, and prioritization.

## Use Cases
- **Audience segmentation:** Tier contacts by ICP similarity
- **List building:** Extract very_similar recordIds for outreach
- **Prioritization:** Score leads against a reference profile

## Seeds

### Record-based seed
Provide email, websiteUrl, recordId, or customKey. The system fetches the record's vectors and searches for similar records.

### Text-based seed
Provide `seed.text` with a natural language description (e.g., "Enterprise SaaS CTO interested in AI"). The text is embedded into a single vector and used for similarity search. No existing record needed.

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| seed | object | Yes | - | { email?, recordId?, websiteUrl?, customKeyName?, customKeyValue?, text? } |
| type | string | No | "contact" | Entity type |
| dimensions | string | No | "hybrid" | "properties", "memories", or "hybrid" (no "connections") |
| tierThresholds | object | No | {0.75, 0.5} | { very_similar, similar } |
| minScore | number | No | 0.3 | Min similarity threshold |
| maxPerTier | number | No | 50 | RecordIds per tier page (max 500) |
| tierOffset | number | No | 0 | Skip N recordIds per tier |
| returnTier | string | No | - | Fetch single tier: "very_similar", "similar", "somewhat_similar" |

## Response

Each tier includes:
- `count` - total records in this tier
- `recordIds` - paginated array (up to maxPerTier)
- `scoreRange` - { min, max } scores in tier
- `hasMore` - true if more records available via tierOffset

The `not_similar` tier has `approximate: true` because its count is estimated (totalRecords - matched - 1).

## Billing
2 credits per request.
