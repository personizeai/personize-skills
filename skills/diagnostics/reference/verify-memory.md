# VERIFY-MEMORY — Confirm Data is Stored and Recallable

## Pre-conditions

- `PERSONIZE_SECRET_KEY` is set
- At least one `memorize()` or `memorizeBatch()` call has been made

## Steps

### Step 1: Recall by Email

```typescript
const recall = await client.memory.recall({
  query: 'Tell me everything about this person',
  email: '<the-email-you-memorized>',
});
console.log('Memories:', recall.data.memories.length);
console.log('Sample:', recall.data.memories[0]?.content?.substring(0, 200));
```

**What to check:**
- `memories.length > 0` — data was stored
- Content matches what you memorized (not garbled or truncated)
- If using `enhanced: true`, check that AI extractions produced meaningful facts

### Step 2: Recall by Semantic Query

```typescript
const recall = await client.memory.recall({
  query: '<a question the data should answer>',
  email: '<the-email>',
});
```

**What to check:**
- The most relevant memory appears in the top 3 results
- Relevance scores are reasonable (higher = better match)

### Step 3: Check Properties (if using memorizeBatch)

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

### Step 4: Check Compiled Context

```typescript
const digest = await client.memory.smartDigest({
  email: '<the-email>',
  include_properties: true,
  include_memories: true,
});
console.log('Compiled context length:', digest.data.compiledContext.length);
console.log('Preview:', digest.data.compiledContext.substring(0, 500));
```

**What to check:**
- `compiledContext` is non-empty and human-readable
- It includes both properties and memory content
- It's suitable for injecting into an LLM prompt

## Common Failure Modes

| Symptom | Likely Cause | Fix |
|---|---|---|
| `memories.length === 0` | Wrong email or data not yet indexed | Wait 5-10 seconds; verify the email matches exactly |
| Properties are empty | Used `memorize()` instead of `memorizeBatch()` for structured data | Use `memorizeBatch()` with per-property `extractMemories` flags |
| Recall returns irrelevant results | Query doesn't match the content semantically | Rephrase query; check that content was memorized with enough context |
| `compiledContext` is too short | Only memorized one small piece of data | Memorize more data; check `include_properties` and `include_memories` flags |

## Success Criteria

- [ ] `recall()` returns stored data for the correct email
- [ ] Semantic query returns relevant results in top 3
- [ ] Properties appear correctly (if using batch)
- [ ] `smartDigest()` produces usable compiled context
