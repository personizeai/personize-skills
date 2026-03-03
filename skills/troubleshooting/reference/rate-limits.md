# RATE-LIMITS — Getting 429 Errors or Partial Batch Syncs

## Symptoms

- HTTP 429 "Too Many Requests" errors
- `memorizeBatch()` processes some records but fails on others
- Pipeline runs partially and stops
- Intermittent failures during high-throughput operations

## Diagnostic Steps

### Step 1: Check Current Rate Limits

```typescript
const me = await client.me();
console.log('Plan:', me.data.plan.name);
console.log('Rate limits:', JSON.stringify(me.data.rateLimits, null, 2));
console.log('Usage:', JSON.stringify(me.data.usage, null, 2));
```

### Step 2: Check Error Response

```typescript
try {
  await client.memory.memorize({ /* ... */ });
} catch (e) {
  if (e.status === 429) {
    console.log('Rate limited');
    console.log('Retry-After:', e.headers?.['retry-after'] || 'not specified');
    console.log('Message:', e.message);
  }
}
```

### Step 3: Count Operations Per Minute

```typescript
// If running a batch, count how many API calls you're making
// Each memorizeBatch() call counts as 1 API call regardless of record count
// Each memorize() call counts as 1 API call
// Each recall() call counts as 1 API call
```

## Common Root Causes (ranked by likelihood)

1. **Too many individual memorize() calls** — calling `memorize()` in a loop instead of using `memorizeBatch()`
2. **Batch size too large** — `memorizeBatch()` has a max records-per-call limit
3. **Concurrent pipelines** — multiple pipelines hitting the API simultaneously
4. **Plan limits reached** — exceeded monthly quota
5. **No backoff/retry logic** — retrying immediately after a 429 makes it worse

## Fixes

| Root Cause | Fix |
|---|---|
| Individual calls | Switch to `memorizeBatch()` — one call for many records |
| Batch too large | Split into chunks of 50-100 records per call |
| Concurrent pipelines | Stagger pipeline schedules; add random jitter to cron times |
| Plan limits | Check `client.me()` for usage; upgrade plan or reduce volume |
| No retry logic | Add exponential backoff with jitter |

### Retry Pattern

```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      if (e.status === 429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.log(`Rate limited. Retrying in ${Math.round(delay)}ms...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw e;
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Batch Chunking Pattern

```typescript
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

const records = [/* ... your records ... */];
const chunks = chunk(records, 50);

for (const batch of chunks) {
  await withRetry(() => client.memory.memorizeBatch({ records: batch }));
  await new Promise(r => setTimeout(r, 500)); // pace between chunks
}
```

## Prevention

- Always use `memorizeBatch()` for multiple records
- Add retry logic to all production pipelines
- Monitor usage via `client.me()` in health checks
- Stagger scheduled pipelines to avoid thundering herd
