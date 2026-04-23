# BAD-RECALL — Recall Returns Irrelevant, Empty, or Noisy Results

## Symptoms

- `recall()` returns 0 memories when data was memorized
- `smartRecall()` returns 0 results or irrelevant results
- `smartDigest()` returns empty `compiledContext`
- Top results are irrelevant to the query
- Results are noisy (mix of relevant and irrelevant)
- Same query returns different results each time

## Which Method to Use

| Method | Use When | Entity Scoping | Required Params |
|--------|----------|----------------|-----------------|
| `recall()` | You want structured DynamoDB data (properties + memories) | `email`, `websiteUrl`, `recordId` | `query`, `type` |
| `smartRecall()` | You want semantic vector search with AI | All 7 identifiers | `query` |
| `smartDigest()` | You want compiled LLM-ready context | `email`, `websiteUrl`, `recordId` | At least 1 identifier |

## Entity Identifiers (All Methods)

All identifier parameters accept both camelCase and snake_case:

| Parameter | Aliases | Type Inferred |
|-----------|---------|---------------|
| `email` | — | Contact |
| `websiteUrl` | `website_url` | Company |
| `recordId` | `record_id` | (uses stored type) |
| `phoneNumber` | `phone_number` | Contact |
| `postalCode` | `postal_code` | Location |
| `deviceId` | `device_id` | Device |
| `contentId` | `content_id` | Content |

## Diagnostic Steps

### Step 1: Verify Data Exists

```typescript
// Check if any data exists for this entity
const recall = await client.memory.recall({
  query: 'everything',
  email: '<the-email>',
  type: 'Contact',
});
console.log('Total memories:', recall.data.memories.length);
console.log('Freeform:', recall.data.freeformMemories?.length);
```

If 0 results: data was never stored, or the email doesn't match. Check memorize logs.

### Step 2: Check Identifier Matching

```typescript
// Emails must match exactly (case-insensitive)
// Common mistake: memorized with "John@Acme.com" but recalling with "john@acme.com"
// The SDK handles case normalization, but check for typos

// For websiteUrl: domain is extracted (https://www.acme.com → acme.com)
// Make sure the domain matches what was used during memorize
```

### Step 3: Try smartRecall with Different Identifiers

```typescript
// If recall() is empty, try smartRecall — it runs vector similarity search
const sr = await client.memory.smartRecall({
  query: 'everything about this entity',
  email: '<the-email>',
  mode: 'fast',
});
console.log('smartRecall results:', sr.data.results.length);

// If email doesn't work, try other identifiers:
const sr2 = await client.memory.smartRecall({
  query: 'everything',
  recordId: '<the-record-id>',     // or record_id
  mode: 'fast',
});

const sr3 = await client.memory.smartRecall({
  query: 'everything',
  websiteUrl: 'https://acme.com',  // or website_url
  mode: 'fast',
});
```

### Step 4: Test Query Variations

```typescript
const queries = [
  'Tell me about this person',       // broad
  'job title company',                // keywords
  '<exact phrase from memorized data>', // exact match
];
for (const q of queries) {
  const r = await client.memory.smartRecall({ query: q, email: '<email>', mode: 'fast' });
  console.log(`"${q}" → ${r.data.results.length} results`);
}
```

### Step 5: Check Memory Content Quality

```typescript
const recall = await client.memory.recall({ query: 'everything', email: '<email>', type: 'Contact' });
recall.data.memories.forEach((m, i) => {
  console.log(`\n--- Memory ${i + 1} ---`);
  console.log('Content:', m.content?.substring(0, 300));
  console.log('Tags:', m.tags);
});
```

### Step 6: Check smartDigest

```typescript
const digest = await client.memory.smartDigest({
  email: '<the-email>',
  include_properties: true,
  include_memories: true,
});
console.log('Context length:', digest.data.compiledContext?.length);
console.log('Properties:', Object.keys(digest.data.properties || {}).length);
console.log('Memories:', digest.data.memories?.length);
```

### Step 4b: Debug Recency Issues

If the user expects recent data but gets stale results, use `prefer_recent`:

```typescript
const r = await client.memory.smartRecall({
  query: 'latest updates on this person',
  email: '<email>',
  mode: 'fast',
  prefer_recent: true,   // boost recently memorized data
});
console.log('Results:', r.data.results.length);
r.data.results.forEach((r, i) => {
  console.log(`  ${i+1}. ${r.text?.substring(0, 100)}`);
});
```

If `prefer_recent: true` surfaces the expected data but the default does not, the issue is that older memories are outranking newer ones by semantic similarity. This is expected behavior — `prefer_recent` is the fix, not a workaround.

## Common Root Causes (ranked by likelihood)

1. **Wrong identifier** — typo or format mismatch between memorize and recall
2. **Missing `type` in `recall()`** — returns 400 error; `type` is required for `recall()` but optional for `smartRecall()`
3. **Wrong parameter name** — using `record_id` where `recordId` expected (or vice versa). Both are now accepted, but older deployments may only accept one format.
4. **Data not yet indexed** — memorize is async; wait a few seconds before recalling
5. **Query too specific** — semantic search works best with natural language, not exact strings
6. **`type` mismatch** — memorized as `'Contact'` but recalling with `'Company'`
7. **Too much noise** — memorized raw data dumps instead of focused content
8. **Missing context in memorized content** — content was too short for AI extraction
9. **Stale results outranking recent data** — semantic similarity favors older, more detailed memories over recent ones. Use `prefer_recent: true` on `smartRecall()`

## Fixes

| Root Cause | Fix |
|---|---|
| Wrong identifier | Double-check email/websiteUrl/recordId in both memorize and recall calls |
| Missing `type` | Add `type: 'Contact'` or `type: 'Company'` to `recall()` calls |
| Wrong param name | Use camelCase (`recordId`, `websiteUrl`) — both cases are accepted |
| Not yet indexed | Add a 5-10 second delay between memorize and recall in scripts |
| Query too specific | Use natural language questions: "What is their job title?" not "job_title" |
| Type mismatch | Verify the type used during memorize matches the type in recall |
| Too much noise | Use `enhanced: true` with focused content; break large documents into meaningful chunks |
| Missing context | Include surrounding context when memorizing |
| Stale results outranking recent | Pass `prefer_recent: true` to `smartRecall()` for recency-sensitive queries |

## Prevention

- Always verify recall immediately after memorize (see VERIFY-MEMORY action)
- Use `smartDigest()` instead of raw `recall()` when you need a compiled view
- Use `smartRecall()` with `mode: 'fast'` for quick data existence checks
- Structure content for AI consumption: include entity name, context, and key facts in each memorize call
- Pass `type` explicitly when calling `recall()` — it is required and will error without it
