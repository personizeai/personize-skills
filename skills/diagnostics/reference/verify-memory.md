# VERIFY-MEMORY — Confirm Data is Stored and Recallable

## Pre-conditions

- `PERSONIZE_SECRET_KEY` is set
- At least one `memorize()` or `memorizeBatch()` call has been made

## Entity Identifiers

All recall/digest methods accept these identifiers. Pass at least one to scope to an entity.

| Parameter | Aliases | Use For |
|-----------|---------|---------|
| `email` | — | Contacts (most common) |
| `websiteUrl` | `website_url` | Companies |
| `recordId` | `record_id` | Direct record ID (`REC#...`) |
| `phoneNumber` | `phone_number` | Contacts (phone-keyed) |
| `postalCode` | `postal_code` | Locations |
| `deviceId` | `device_id` | Devices |
| `contentId` | `content_id` | Content items |

Both camelCase and snake_case are accepted for all parameters.

## Steps

### Step 1: Recall by Email

```typescript
const recall = await client.memory.recall({
  query: 'Tell me everything about this person',
  email: '<the-email-you-memorized>',
  type: 'Contact',                    // required for recall()
});
console.log('Memories:', recall.data.memories.length);
console.log('Sample:', recall.data.memories[0]?.content?.substring(0, 200));
```

**What to check:**
- `memories.length > 0` — data was stored
- Content matches what you memorized (not garbled or truncated)
- If using `enhanced: true`, check that AI extractions produced meaningful facts

### Step 2: Recall by Other Identifiers

```typescript
// By website URL (for companies)
const recall = await client.memory.recall({
  query: 'company overview',
  websiteUrl: 'https://acme.com',
  type: 'Company',
});

// By recordId (if you already have the REC# ID)
const recall = await client.memory.recall({
  query: 'everything',
  recordId: 'REC#abc123...',
  type: 'Contact',
});
```

### Step 3: Smart Recall (Semantic Search)

```typescript
const results = await client.memory.smartRecall({
  query: '<a question the data should answer>',
  email: '<the-email>',
  fast_mode: true,                    // fast mode for quick verification
});
console.log('Results:', results.data.results.length);
results.data.results.forEach((r, i) => {
  console.log(`  ${i+1}. [${r.score?.toFixed(3)}] ${r.text?.substring(0, 100)}`);
});
```

**What to check:**
- The most relevant memory appears in the top 3 results
- Scores are reasonable (>0.3 for relevant matches)

### Step 4: Check Properties (if using memorizeBatch)

```typescript
const digest = await client.memory.smartDigest({
  email: '<the-email>',
  include_properties: true,
  include_memories: false,
});
console.log('Properties:', JSON.stringify(digest.data.properties, null, 2));
```

**What to check:**
- Properties you mapped in `memorizeBatch()` appear with correct values
- Properties with `extractMemories: true` have AI-extracted values (not raw input)

### Step 5: Check Compiled Context

```typescript
const digest = await client.memory.smartDigest({
  email: '<the-email>',
  include_properties: true,
  include_memories: true,
  token_budget: 3000,
});
console.log('Compiled context length:', digest.data.compiledContext.length);
console.log('Preview:', digest.data.compiledContext.substring(0, 500));
```

**What to check:**
- `compiledContext` is non-empty and human-readable
- It includes both properties and memory content
- It's suitable for injecting into an LLM prompt

## Method Reference

| Method | Required Params | Entity Scoping | AI Processing |
|--------|----------------|----------------|---------------|
| `recall()` | `query`, `type` | email, websiteUrl, recordId | None (DynamoDB lookup) |
| `smartRecall()` | `query` | All 7 identifiers | Vector search + reflection |
| `smartDigest()` | At least 1 identifier | email, websiteUrl, recordId | Context compilation |

## Common Failure Modes

| Symptom | Likely Cause | Fix |
|---|---|---|
| `memories.length === 0` | Wrong email or data not yet indexed | Wait 5-10 seconds; verify the email matches exactly |
| 400: "type is required" | Missing `type` param in `recall()` | Add `type: 'Contact'` or `type: 'Company'` |
| Properties are empty | Used `memorize()` instead of `memorizeBatch()` for structured data | Use `memorizeBatch()` with per-property `extractMemories` flags |
| Recall returns irrelevant results | Query doesn't match the content semantically | Rephrase query; check that content was memorized with enough context |
| `compiledContext` is too short | Only memorized one small piece of data | Memorize more data; check `include_properties` and `include_memories` flags |
| `smartDigest` returns empty with `recordId` | Used wrong parameter name | Use `recordId` (camelCase) or `record_id` (snake_case) — both work |
| `smartRecall` returns empty with `recordId` | Used wrong parameter name | Use `recordId` (camelCase) or `record_id` (snake_case) — both work |
| Data exists in search but not in recall | `type` mismatch between memorize and recall | Check what type was used during memorize; use the same in recall |

## Success Criteria

- [ ] `recall()` returns stored data for the correct entity identifier
- [ ] Semantic query via `smartRecall()` returns relevant results in top 3
- [ ] Properties appear correctly (if using batch)
- [ ] `smartDigest()` produces usable compiled context
