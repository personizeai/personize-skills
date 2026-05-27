# Batch Processing Guide

| Scenario | Method | Max Items | Async? | Per-Item Control |
|----------|--------|-----------|--------|-----------------|
| <10 items | memorize() in loop | -- | No | Per-call |
| 10-100 items | memorizeBatch() | 100 | Yes | Per-item: tier, schema, max_properties |
| 100-10K items | memorizeBatch() chunked | 100/call | Yes | Same per-item control |
| 10K+ items | Pipeline (Trigger.dev) | Unlimited | Yes | Same, with durable retry |

Returns eventId for async tracking: GET /api/v1/events/{eventId}
MUST NOT mix entity types in one batch (all emails OR all website_urls).
Per-item extraction: each item can have its own tier, schema, max_properties.

---

## memorizeBatch() Parameters

```ts
interface BatchMemorizeOptions {
  // -- Batch metadata --
  source?: string;              // Source system label (e.g. 'Hubspot', 'Salesforce')
  tier?: 'basic' | 'pro' | 'pro_fast' | 'ultra';  // Default extraction tier
  extractionPrompt?: string;    // Focus instructions for all items (max 500 chars)
  dryRun?: boolean;             // Validate without writing (default: false)
  chunkSize?: number;           // Rows per chunk (default: 1)

  // -- Records shorthand (recommended) --
  records?: BatchMemorizeRecord[];

  // -- Advanced: raw mapping mode --
  mapping?: BatchMemorizeMapping;
  rows?: Record<string, unknown>[];
}
```

---

## Records Shorthand (Recommended)

The SDK provides a `records` shorthand that handles mapping automatically:

```ts
await client.memory.memorizeBatch({
  tier: 'pro',
  source: 'CRM Sync',
  records: [
    {
      email: 'john@acme.com',
      content: 'Met with John. He mentioned $50k budget for Q2...',
      speaker: 'John Smith',
      timestamp: '2026-03-15T10:00:00Z',
      tags: ['sales_call'],
      collectionName: 'Contact Properties',
    },
    {
      email: 'sarah@globex.com',
      content: 'Sarah is evaluating our enterprise tier...',
      tier: 'ultra',          // per-item tier override
    },
    {
      website_url: 'acme.com',
      content: 'Acme Corp: Series B SaaS, 150 employees, Austin HQ...',
      type: 'Company',
    },
  ],
});
```

### BatchMemorizeRecord fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| content | string | conditional | Text to memorize (or use properties) |
| email | string | conditional | Contact email (identifies the record) |
| website_url | string | conditional | Company website (alternative identifier) |
| record_id | string | no | Pre-resolved record ID |
| type | string | no | Entity type (Contact, Company, etc.) |
| customKeyName | string | no | Custom key field name |
| customKeyValue | string | no | Custom key value |
| collectionId | string | no | Target collection ID |
| collectionName | string | no | Target collection name (resolved by SDK) |
| properties | object | no | Structured property values |
| tags | string[] | no | Tags for property selection |
| timestamp | string | no | Content timestamp (ISO) |
| speaker | string | no | Speaker name for coreference resolution |

---

## Per-Item Extraction Control

Each record in a batch can have its own extraction settings:

```ts
records: [
  {
    email: 'vip@enterprise.com',
    content: 'Complex enterprise deal...',
    tier: 'ultra',            // highest quality extraction
    collectionName: 'Enterprise Contacts',
  },
  {
    email: 'lead@startup.com',
    content: 'Quick follow-up note',
    tier: 'basic',            // fastest, cheapest
  },
]
```

---

## Structured Properties (No AI Extraction)

Pass structured data directly without AI extraction:

```ts
records: [
  {
    email: 'john@acme.com',
    properties: {
      deal_stage: 'qualified',
      revenue: 50000,
      next_meeting: '2026-04-15',
    },
    collectionName: 'Deal Tracker',
  },
]
```

### Per-Property Extraction Control

Mix structured data with AI extraction on specific fields:

```ts
records: [
  {
    email: 'john@acme.com',
    properties: {
      deal_stage: 'qualified',                    // stored as-is
      revenue: 50000,                              // stored as-is
      meeting_notes: {                             // AI extraction enabled
        value: 'Long transcript from sales call...',
        extractMemories: true,
        collectionName: 'Contact Properties',
      },
    },
  },
]
```

---

## Advanced: Raw Mapping Mode

For bulk data ingestion from external systems (CSV, database exports):

```ts
await client.memory.memorizeBatch({
  source: 'Hubspot Export',
  tier: 'pro',
  mapping: {
    entityType: 'Contact',
    email: 'contact_email',           // source field name
    properties: {
      'Job Title': {
        sourceField: 'title',
        collectionId: 'col_abc',
        collectionName: 'Contact Properties',
        extractMemories: false,
      },
      'Meeting Notes': {
        sourceField: 'notes',
        collectionId: 'col_abc',
        collectionName: 'Contact Properties',
        extractMemories: true,         // AI extraction for this field
      },
    },
  },
  rows: [
    { contact_email: 'john@acme.com', title: 'VP Sales', notes: 'Met at conference...' },
    { contact_email: 'sarah@globex.com', title: 'CTO', notes: 'Technical evaluation...' },
  ],
});
```

---

## Chunking Strategy

The SDK automatically handles chunking for the `records` shorthand. For raw mapping mode, use `chunkSize`:

```ts
// Process 1000 rows, 50 at a time
await client.memory.memorizeBatch({
  mapping: { ... },
  rows: thousandRows,
  chunkSize: 50,
});
```

### Manual Chunking (for very large batches)

```ts
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

const allRecords = /* 5000 records */;
const batches = chunk(allRecords, 100);

for (const batch of batches) {
  await client.memory.memorizeBatch({
    records: batch,
    tier: 'pro',
    source: 'Migration',
  });
  // Optional: rate limit pause
  await new Promise(r => setTimeout(r, 1000));
}
```

---

## Async Tracking with eventId

Batch operations return an `eventId` for async status tracking:

```ts
const result = await client.memory.memorizeBatch({ records: [...] });
const eventId = result.data?.eventId;

// Poll for completion
const status = await fetch(`https://agent.personize.ai/api/v1/events/${eventId}`, {
  headers: { 'Authorization': 'Bearer pz_...' },
});
```

Event status values:
- `pending` -- queued for processing
- `processing` -- currently being processed
- `completed` -- all items processed successfully
- `partial_failure` -- some items failed
- `failed` -- batch failed entirely

---

## Error Handling

### Partial Failures

Batch memorize processes items independently. Some may fail while others succeed:

```ts
const result = await client.memory.memorizeBatch({ records: [...] });

if (result.data?.errors?.length) {
  // Retry failed items individually
  for (const error of result.data.errors) {
    console.error(`Failed: ${error.email} - ${error.message}`);
    // Retry with single memorize
    await client.memory.memorize({
      content: error.content,
      email: error.email,
    });
  }
}
```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `ENTITY_TYPE_MISMATCH` | Mixed emails and website_urls | Separate into Contact and Company batches |
| `MISSING_IDENTIFIER` | Record has no email/website_url/recordId | Add an identifier to each record |
| `COLLECTION_NOT_FOUND` | collectionName doesn't exist | Create the collection first or use collectionId |
| `RATE_LIMIT_EXCEEDED` | Too many concurrent calls | Add delay between chunks, reduce chunk size |
| `CONTENT_TOO_LARGE` | Content exceeds 100K chars | Split large content into smaller pieces |

---

## Rate Limit Patterns

### Sequential with Backoff

```ts
for (const batch of batches) {
  try {
    await client.memory.memorizeBatch({ records: batch });
  } catch (err) {
    if (err.status === 429) {
      const waitMs = (err.retryAfterSeconds || 60) * 1000;
      await new Promise(r => setTimeout(r, waitMs));
      // Retry this batch
      await client.memory.memorizeBatch({ records: batch });
    }
  }
}
```

### Concurrent with Limit

```ts
async function processWithConcurrency<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency: number
) {
  const executing = new Set<Promise<void>>();
  for (const item of items) {
    const p = fn(item).then(() => executing.delete(p));
    executing.add(p);
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
}

await processWithConcurrency(batches, async (batch) => {
  await client.memory.memorizeBatch({ records: batch, tier: 'pro' });
}, 3);  // max 3 concurrent batches
```

---

## Pipeline Pattern (Trigger.dev)

For 10K+ items, use a durable pipeline with retries:

```ts
// trigger.dev pipeline (simplified)
export const batchSync = task({
  id: 'batch-sync',
  run: async (payload: { records: BatchMemorizeRecord[] }) => {
    const chunks = chunk(payload.records, 50);

    for (const [i, batch] of chunks.entries()) {
      await client.memory.memorizeBatch({
        records: batch,
        tier: 'pro',
        source: 'Pipeline Sync',
      });
      logger.info(`Processed chunk ${i + 1}/${chunks.length}`);
    }
  },
  retry: { maxAttempts: 3, factor: 2, minTimeout: 5000 },
});
```

See the `code-pipelines` skill for full pipeline patterns with error handling, progress tracking, and webhook notifications.

---

## Best Practices

1. **Separate entity types**: Never mix Contact (email) and Company (website_url) records in the same batch.
2. **Use records shorthand**: It handles mapping, collection resolution, and entity type inference automatically.
3. **Set a source label**: Helps track where data came from in analytics.
4. **Use dryRun first**: Validate large batches before committing.
5. **Chunk at 50-100**: Optimal balance between throughput and error granularity.
6. **Include speaker for transcripts**: Enables coreference resolution (pronouns to names).
7. **Use extractionPrompt for focus**: Guides the AI on what to prioritize during extraction.
8. **Monitor credits**: Each memorize operation costs credits based on tier (basic=1, pro=2, ultra=5).
