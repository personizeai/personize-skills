# VERIFY-GOVERNANCE — Confirm Agents Can See Guidelines

## Pre-conditions

- `PERSONIZE_SECRET_KEY` is set
- At least one guideline has been created via `guidelines.create()` or `guideline_create`

## Steps

### Step 1: List All Guidelines

```typescript
const list = await client.guidelines.list();
console.log(`Total guidelines: ${(list.data?.actions || []).length}`);
(list.data?.actions || []).forEach(v => console.log(`  - ${v.name} (${v.tags?.join(', ') || 'no tags'})`));
```

**What to check:**
- Your guideline appears in the list
- Name is kebab-case and descriptive
- Tags are present and consistent with other guidelines

### Step 2: Read Guideline Structure

```typescript
const structure = await client.guidelines.getStructure('<guideline-id>');
console.log('Sections:', structure.data);
```

**What to check:**
- Headers reflect the expected markdown structure
- No unexpected or missing sections

### Step 3: Query via smartGuidelines

This is the critical test — it's how agents actually fetch guidelines at runtime.

```typescript
// Test with a query an agent would actually ask
const result = await client.ai.smartGuidelines({
  message: '<a question your agents will ask>',
});
console.log('Compiled context length:', result.data.compiledContext.length);
console.log('Preview:', result.data.compiledContext.substring(0, 500));
```

**What to check:**
- `compiledContext` is non-empty
- It contains content from the relevant guideline(s)
- It does NOT include irrelevant guidelines (good relevance filtering)

### Step 4: Test Multiple Query Angles

Agents will query guidelines with different phrasings. Test at least 3 variations:

```typescript
const queries = [
  'What are our rules for cold emails?',       // direct question
  'cold email compliance',                       // keyword-style
  'Write a cold outreach email to a VP of Sales', // task-style (how agents actually query)
];

for (const q of queries) {
  const r = await client.ai.smartGuidelines({ message: q });
  console.log(`Query: "${q}" → ${r.data.compiledContext ? '✅ found' : '❌ empty'}`);
}
```

## Common Failure Modes

| Symptom | Likely Cause | Fix |
|---|---|---|
| `smartGuidelines` returns empty | Guideline content doesn't match query semantically | Rewrite guideline headers to match likely agent queries |
| Returns wrong guideline | Multiple guidelines cover overlapping topics | Add distinguishing tags; narrow each guideline to one topic |
| Returns too much content | Guidelines are too broad | Split into focused, single-topic guidelines |
| Guideline not in list | Create call failed silently | Check API response; verify `PERSONIZE_SECRET_KEY` has write permissions |

## Success Criteria

- [ ] Guideline appears in `guidelines.list()` with correct name and tags
- [ ] `smartGuidelines()` returns relevant content for at least 3 query variations
- [ ] Irrelevant queries do NOT return this guideline (good precision)
- [ ] Content is actionable for an AI agent (explicit instructions, not vague prose)
