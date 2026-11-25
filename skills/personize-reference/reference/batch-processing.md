# Batch Processing Guide

> **Canonical paths (read first):** for records you already have **structured field values** for, use `client.memory.save({ shape:'property', record, properties })` (one call per record) or MCP `memory_save shape=property` -- no AI extraction. For **content that needs AI extraction** across many records, use `client.memory.save({ shape:'shortform', items, options })`, which is also the form that returns an async `jobId`. The examples below use an `items` array with per-item control. The older `saveBatch` and `memory_upsert` names are legacy, replaced by these forms. Pre-v1.1 batch-store tool names are **not** live MCP tools.

| Scenario | Method | Max Items | Async? | Per-Item Control |
|----------|--------|-----------|--------|-----------------|
| Structured records (known field values) | `client.memory.save({ shape:'property', record, properties })` (one call per record) | -- | No | Properties set directly, no extraction |
| <10 items, content → extraction | `memory.save()` in loop | -- | No | Per-call |
| 10-25 items, content → extraction | `client.memory.save({ shape:'shortform', items })` | 25 | No (sync loop) | Per-item: `record` (sync only; async/bulk use top-level `email`/`websiteUrl`/`recordId`), `properties`, `extractionPrompt`; `tier` is set in the batch-level `options` (see the `dryRun` caveat in Best Practices). `save({ shape:'shortform', items, options:{ mode:'async' } })`: async/bulk item batches depend on the at-scale rollout and may return `NOT_AVAILABLE` |
| 26+ items (up to 10K), content → extraction | `client.memory.save({ shape:'shortform', items })` chunked | 25/call | No (sync loop) | Same per-item control. Sending a larger batch in one call needs the at-scale path, which may be off (400 `NOT_AVAILABLE`) |
| 10K+ items | Pipeline (Trigger.dev) | Unlimited | Yes | Same, with durable retry |

In sync mode, `client.memory.save({ shape:'shortform', items })` returns per-item results and totals (`res.items`, `res.totals`). A `jobId` comes only with async/bulk (`options: { mode: 'async' }` or `'bulk'`), which are rollout-dependent and may return 400 `NOT_AVAILABLE`.
MUST NOT mix entity types in one batch (all emails OR all websiteUrls).
Per-item extraction: each item can have its own `extractionPrompt` and `properties`; set `tier` once in the batch-level `options`.

> **Note:** `tier` and `dryRun` live in the batch-level `options`; per-item `options` are overwritten by the batch options. `dryRun` never prevents content writes on either path (it only skips the caller `properties` write).

---

## save({ items }) parameters

Call `client.memory.save({ shape:'shortform', items, options })`. Set `tier` in the batch-level `options`. `dryRun` does NOT stop content writes; it only skips the `properties` write.

```ts
// sdk/src/types.ts
interface SaveItemsResponse {
  batch: true;
  mode: 'sync' | 'async' | 'bulk';
  destination: 'loop' | 'fast-sf' | 'bulk-sf' | 'context-save-batch';
  // Sync (HTTP 200 when all items succeed, 207 when some fail): per-item outcomes
  items?: Array<{ index: number; status: 'ok' | 'error'; httpStatus: number; data?: unknown; error?: unknown }>;
  totals?: { succeeded: number; failed: number };
  // Async/bulk (HTTP 202): poll handle
  jobId?: string;
  rowsEnqueued?: number;
  webhook?: string;
  warnings?: string[];
  error?: { code: string; message: string; details?: unknown };
}
```

`mode` and `destination` are always present. Sync calls return 200 (all items succeeded) or 207 (some failed) with `items[]` and `totals`. Async or bulk calls (`options: { mode: 'async' | 'bulk' }`) return 202 with `jobId` and `rowsEnqueued`, but they depend on the at-scale rollout and may return 400 `NOT_AVAILABLE`. 202 `jobId` responses have no `items`/`totals`.
---

## Items (Recommended)

On sync batches (25 items or fewer), each entry in `items` addresses its record with a `record` block. Async/bulk batches must use flat top-level `email` / `websiteUrl` / `recordId` instead (see the Item fields table):

```ts
const res = await client.memory.save({
  shape: 'shortform',
  items: [
    {
      record: { email: 'john@acme.com' },
      content: 'Met with John. He mentioned $50k budget for Q2...',
    },
    {
      record: { email: 'sarah@globex.com' },
      content: 'Sarah is evaluating our enterprise tier...',
    },
    {
      record: { websiteUrl: 'acme.com' },
      content: 'Acme Corp: Series B SaaS, 150 employees, Austin HQ...',
    },
  ],
  options: { tier: 'pro' },
});
console.log(res.totals); // { succeeded, failed }
```

In sync mode `res.totals` holds the counts. The `record` block applies to sync batches only; for async/bulk use the flat fields. If the `items` type does not list `record`, the server still accepts it on sync batches; cast if TypeScript complains.

### Item fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| content | string | yes (shortform) | Text to save |
| record | object | conditional | Sync batches only (25 items or fewer): `{ email }`, `{ websiteUrl }`, `{ id }` or `{ customKey: { name, value } }` identifies the record. Async/bulk items (`options.mode` 'async' or 'bulk', or more than 25 items with at-scale on) must use top-level `email` / `websiteUrl` / `recordId`: the server ignores `item.record` on that route and saves to a placeholder record, and items that also set `type` get a 400 |
| email | string | conditional | Top-level contact identifier; valid on every lane, required form for async/bulk |
| websiteUrl | string | conditional | Top-level company identifier; valid on every lane, required form for async/bulk |
| recordId | string | no | Pre-resolved record ID; valid on every lane |
| properties | object | no | Structured property values |
| extractionPrompt | string | no | Per-item extraction focus (max 500 chars) |

`tier` is batch-level: `save({ shape:'shortform', items, options:{ tier:'pro' } })`. Do not set `options` on items. (`dryRun` exists but applies to the `properties` write only; see Best Practices.)

---

## Per-Item Extraction Control

Each item in a batch can carry its own extraction focus:

```ts
items: [
  {
    record: { email: 'vip@enterprise.com' },
    content: 'Complex enterprise deal...',
    extractionPrompt: 'Focus on budget, timeline and decision makers',
  },
  {
    record: { email: 'lead@startup.com' },
    content: 'Quick follow-up note',
  },
]
```

---

## Structured Properties (No AI Extraction)

Pass structured data directly without AI extraction, one `shape:'property'` call per record (shortform items require `content`, so do not use `items[]` for this):

```ts
for (const rec of records) {
  await client.memory.save({
    shape: 'property',
    record: { email: rec.email },
    properties: {
      deal_stage: 'qualified',
      revenue: 50000,
      next_meeting: '2026-04-15',
    },
  });
}
```

---

## Chunking Strategy

Send at most 25 items per call. Chunk larger inputs yourself:

```ts
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

const allItems = /* 5000 items */;
const batches = chunk(allItems, 25);

for (const batch of batches) {
  await client.memory.save({
    shape: 'shortform',
    items: batch,
    options: { tier: 'pro' },
  });
}
```

---

## Async Tracking

In sync mode, `client.memory.save({ shape:'shortform', items })` returns per-item results and totals. Read `res.items[i].status` (`'ok'` or `'error'`) and `res.totals`:

```ts
const res = await client.memory.save({ shape: 'shortform', items: [...] });
console.log(res.totals.succeeded, res.totals.failed);
for (const item of res.items) {
  console.log(item.index, item.status, item.httpStatus);
}
```

Async or bulk lanes depend on the at-scale rollout and may return 400 `NOT_AVAILABLE`. When enabled, the async response carries `jobId` (`SaveItemsResponse.jobId`) but no `items`/`totals`. Poll it with `client.memory.getJob(jobId)`. Job item statuses are `'succeeded' | 'failed'`, not the sync `'ok' | 'error'`:

```ts
// Only when the at-scale path is enabled; otherwise this returns 400 NOT_AVAILABLE
const submit = await client.memory.save({
  shape: 'shortform',
  // Async/bulk needs flat identifiers (email / websiteUrl / recordId), not a `record` block
  items: [
    { email: 'john@acme.com', content: 'Met with John. He mentioned $50k budget for Q2...' },
    { websiteUrl: 'acme.com', content: 'Acme Corp: Series B SaaS, 150 employees, Austin HQ...' },
  ],
  options: { mode: 'async' },
});
const job = await client.memory.getJob(submit.jobId);
```

`MemoryJob.state` values:
- `queued` -- waiting to be processed
- `running` -- currently being processed
- `succeeded` -- all items processed successfully
- `partial` -- some items failed (see `job.items[i].status` and `error`)
- `failed` -- job failed entirely

---

## Error Handling

### Partial Failures

Batch save processes items independently. Some may fail while others succeed:

```ts
const items = [...];
const res = await client.memory.save({ shape: 'shortform', items });

for (const failed of res.items.filter(i => i.status === 'error')) {
  const original = items[failed.index];
  console.error(`Failed item ${failed.index}:`, failed.error);
  // Retry with single save using the original input
  await client.memory.save({
    content: original.content,
    record: original.record,
  });
}
```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `ENTITY_TYPE_MISMATCH` | Mixed emails and websiteUrls | Separate into Contact and Company batches |
| `MISSING_IDENTIFIER` | Item has no email/websiteUrl/recordId | Add `record` (sync) or top-level `email`/`websiteUrl`/`recordId` (async/bulk) to each item |
| `RATE_LIMIT_EXCEEDED` | Too many concurrent calls | Add delay between chunks, reduce chunk size |
| `CONTENT_TOO_LARGE` | Content exceeds 100K chars | Split large content into smaller pieces |

---

## Rate Limit Patterns

### Sequential with Backoff

```ts
for (const batch of batches) {
  try {
    await client.memory.save({ shape: 'shortform', items: batch });
  } catch (err) {
    if (err.status === 429) {
      const waitMs = (err.retryAfterSeconds || 60) * 1000;
      await new Promise(r => setTimeout(r, waitMs));
      // Retry this batch
      await client.memory.save({ shape: 'shortform', items: batch });
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
  await client.memory.save({ shape: 'shortform', items: batch, options: { tier: 'pro' } });
}, 3);  // max 3 concurrent batches
```

---

## Pipeline Pattern (Trigger.dev)

For 10K+ items, use a durable pipeline with retries:

```ts
// trigger.dev pipeline (simplified)
export const batchSync = task({
  id: 'batch-sync',
  run: async (payload: { items: SaveRequest[] }) => {
    const chunks = chunk(payload.items, 25);

    for (const [i, batch] of chunks.entries()) {
      await client.memory.save({
        shape: 'shortform',
        items: batch,
        options: { tier: 'pro' },
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

1. **Separate entity types**: Never mix Contact (email) and Company (websiteUrl) items in the same batch.
2. **Address every item**: Use `record` (sync) or top-level `email`/`websiteUrl`/`recordId` (async/bulk) to identify the target record for each item.
3. **`dryRun` is not a trial run for content saves**: content extraction and writes always happen, and credits are charged. `dryRun` is batch-level only: `save({ shape:'shortform', items, options:{ dryRun } })` only skips the separate verbatim `properties` write. For a real trial run, use `upsert`/`import` with `options.dryRun`.
4. **Chunk at 25**: Maximum sync items per call (`saveSyncMax` default); smaller chunks give finer error granularity.
5. **Use extractionPrompt for focus**: Guides the AI on what to prioritize during extraction.
6. **Monitor credits**: Each save operation costs credits based on tier by tier and content tokens; see the pricing page (set in batch `options.tier`).
