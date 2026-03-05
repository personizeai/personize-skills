# BAD-EXTRACTION — Memorized Data Isn't Being Extracted Correctly

## Symptoms

- Properties are empty or have wrong values after `memorizeBatch()`
- AI extractions produce generic or irrelevant facts
- `enhanced: true` doesn't seem to extract anything useful
- Structured data (job title, company) isn't appearing as properties

## Diagnostic Steps

### Step 1: Check What Was Memorized

```typescript
const digest = await client.memory.smartDigest({
  email: '<the-email>',
  include_properties: true,
  include_memories: true,
});
console.log('Properties:', JSON.stringify(digest.data.properties, null, 2));
console.log('Memory count:', digest.data.memories?.length || 0);
```

### Step 2: Check memorizeBatch Configuration

```typescript
// Verify your batch call structure
const batch = {
  records: [{
    email: 'person@example.com',
    properties: {
      name: { value: 'Jane Doe', extractMemories: false },       // ← structured, no AI
      bio: { value: 'Jane is a VP of Engineering...', extractMemories: true }, // ← AI extracts
      company: { value: 'Acme Corp', extractMemories: false },
    },
  }],
};
```

**Common mistakes:**
- Setting `extractMemories: false` on fields that need AI extraction
- Setting `extractMemories: true` on fields that should be stored verbatim (names, emails)
- Passing empty strings as values

### Step 3: Check Content Quality

```typescript
// The AI extraction is only as good as the input
// Bad: "VP Eng" → AI has little to extract
// Good: "Jane Doe is the VP of Engineering at Acme Corp. She leads a team of 50 engineers focused on cloud infrastructure." → Rich extraction
```

## Common Root Causes (ranked by likelihood)

1. **Wrong extractMemories flags** — structured fields marked for extraction, or rich text fields NOT marked for extraction
2. **Identity fields not selected** — generic properties (first name, company name, location) score low in embedding similarity because they match everything weakly. The extraction is highly precise (see our research paper) — this is a completeness issue, not an accuracy issue
3. **Input too short** — the AI needs enough context to extract meaningful facts
4. **Input already processed** — running content through an LLM before memorizing with `enhanced: true` wastes tokens and degrades extraction
5. **Missing property mapping** — properties not included in the `memorizeBatch()` call
6. **Schema mismatch** — property names don't match what downstream code expects

## Fixes

| Root Cause | Fix |
|---|---|
| Wrong flags | Use `extractMemories: false` for structured data (name, email, title), `true` for unstructured text (bios, notes, conversations) |
| Identity fields not selected | Prepend extraction hints to content: `"Also extract First Name, Last Name, Company Name if mentioned.\n\n" + rawContent`. This boosts similarity with those property definitions so they get selected alongside the 15+ content-relevant properties. The selector still picks all relevant properties — hints just ensure identity fields are in the mix. See entity-memory skill → `reference/memorize.md` → "Extraction Hints" |
| Input too short | Include full context: paragraphs, not fragments |
| Double-processing | Pass raw content to `memorize({ enhanced: true })` — the extraction pipeline is optimized for raw input |
| Missing mapping | Ensure every field you want as a property is included in the `properties` object of `memorizeBatch()` |
| Schema mismatch | Use consistent property names across all memorize calls for the same entity type |

## Prevention

- Follow the entity-memory skill's constraint: **MUST NOT** pre-process content with an LLM before calling `memorize()` with `enhanced: true`
- Use `extractMemories: true` only on fields with rich unstructured content
- Verify extractions immediately after batch sync (see VERIFY-MEMORY action)
