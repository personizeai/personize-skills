# BAD-RECALL — Recall Returns Irrelevant, Empty, or Noisy Results

## Symptoms

- `recall()` returns 0 memories when data was memorized
- Top results are irrelevant to the query
- Results are noisy (mix of relevant and irrelevant)
- Same query returns different results each time

## Diagnostic Steps

### Step 1: Verify Data Exists

```typescript
// Check if any data exists for this entity
const recall = await client.memory.recall({
  query: 'everything',
  email: '<the-email>',
  limit: 20,
});
console.log('Total memories:', recall.data.memories.length);
```

If 0 results: data was never stored, or the email doesn't match. Check memorize logs.

### Step 2: Check Email Matching

```typescript
// Emails must match exactly (case-insensitive)
// Common mistake: memorized with "John@Acme.com" but recalling with "john@acme.com"
// The SDK handles case normalization, but check for typos
```

### Step 3: Test Query Variations

```typescript
const queries = [
  'Tell me about this person',       // broad
  'job title company',                // keywords
  '<exact phrase from memorized data>', // exact match
];
for (const q of queries) {
  const r = await client.memory.recall({ query: q, email: '<email>', limit: 5 });
  console.log(`"${q}" → ${r.data.memories.length} results`);
}
```

### Step 4: Check Memory Content Quality

```typescript
const recall = await client.memory.recall({ query: 'everything', email: '<email>', limit: 10 });
recall.data.memories.forEach((m, i) => {
  console.log(`\n--- Memory ${i + 1} ---`);
  console.log('Content:', m.content.substring(0, 300));
  console.log('Tags:', m.tags);
});
```

## Common Root Causes (ranked by likelihood)

1. **Wrong email** — typo or case mismatch between memorize and recall
2. **Query too specific** — semantic search works best with natural language, not exact strings
3. **Data not yet indexed** — memorize is async; wait a few seconds before recalling
4. **Too much noise** — memorized raw data dumps instead of focused content; AI extractions are producing low-quality facts
5. **Missing context in memorized content** — content was too short or lacked context for the AI to extract meaningful facts

## Fixes

| Root Cause | Fix |
|---|---|
| Wrong email | Double-check email in both memorize and recall calls |
| Query too specific | Use natural language questions: "What is their job title?" not "job_title" |
| Not yet indexed | Add a 5-10 second delay between memorize and recall in scripts |
| Too much noise | Use `enhanced: true` with focused content; break large documents into meaningful chunks |
| Missing context | Include surrounding context when memorizing (e.g., include the question that was asked, not just the answer) |

## Prevention

- Always verify recall immediately after memorize (see VERIFY-MEMORY action)
- Use `smartDigest()` instead of raw `recall()` when you need a compiled view
- Structure content for AI consumption: include entity name, context, and key facts in each memorize call
