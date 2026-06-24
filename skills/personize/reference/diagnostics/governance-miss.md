# GOVERNANCE-MISS — Guidelines Aren't Reaching Agents

## Symptoms

- `smartGuidelines()` returns empty or irrelevant content
- Agents are not following organizational rules
- Wrong guideline returned for a query
- Guidelines exist in `guidelines.list()` but don't appear in `smartGuidelines()`

## Diagnostic Steps

### Step 1: Verify Guidelines Exist

```typescript
const list = await client.guidelines.list();
console.log(`Total guidelines: ${(list.data?.actions || []).length}`);
(list.data?.actions || []).forEach(v => console.log(`  ${v.name}: ${v.description || '(no description)'}`));
```

If 0 results: no guidelines have been created. Use the **governance** skill to create them.

### Step 2: Test smartGuidelines with Exact Content

```typescript
// Use a phrase you KNOW is in a guideline
const result = await client.ai.smartGuidelines({
  message: '<exact phrase from your guideline>',
});
console.log('Result:', result.data.compiledContext?.substring(0, 300) || 'EMPTY');
```

### Step 3: Test with Agent-Style Queries

```typescript
// These are how agents actually query — natural language tasks
const queries = [
  'Write a cold email to a VP of Sales',
  'What tone should I use?',
  'Are there compliance rules for outbound?',
];
for (const q of queries) {
  const r = await client.ai.smartGuidelines({ message: q });
  console.log(`"${q}" → ${r.data.compiledContext ? '✅' : '❌'}`);
}
```

### Step 4: Check Guideline Content Quality

```typescript
// Read the guideline and check if headers match likely queries
const structure = await client.guidelines.getStructure('<guideline-id>');
console.log('Headers:', structure.data);
// Headers should be questions or topics that agents would search for
```

### Step 5: Check if maxContentTokens Is Causing Truncation

```typescript
// If using maxContentTokens, try without it to see if the missing guideline appears
const withBudget = await client.ai.smartGuidelines({
  message: '<query that should match>',
  maxContentTokens: 500,   // your current budget
});
const withoutBudget = await client.ai.smartGuidelines({
  message: '<query that should match>',
  // no maxContentTokens — unlimited
});
console.log('With budget:', withBudget.data.compiledContext?.length || 0, 'chars');
console.log('Without budget:', withoutBudget.data.compiledContext?.length || 0, 'chars');
// If "without" is significantly larger, the budget is truncating results
```

## Common Root Causes (ranked by likelihood)

1. **Headers don't match queries** — guideline uses internal jargon that agents don't search for
2. **Guideline too broad** — covers multiple topics, reducing relevance for any single query
3. **Content is vague** — prose written for humans, not explicit instructions for agents
4. **No guidelines created** — the setup step was skipped
5. **Wrong tags** — if using tag-filtered queries, tags don't match
6. **`maxContentTokens` budget exceeded** — if using `maxContentTokens` on `smartGuidelines()`, lower-ranked guidelines get demoted (truncated or dropped) when the total exceeds the token budget. Increase the budget or split large guidelines so the important ones fit

## Fixes

| Root Cause | Fix |
|---|---|
| Headers don't match | Rewrite H2 headers as questions agents ask: "How should I write cold emails?" not "Email Policy" |
| Too broad | Split into focused, single-topic guidelines (one per policy area) |
| Vague content | Rewrite with explicit instructions: "ALWAYS include a CTA" not "Consider including a call to action" |
| No guidelines | Use the **governance** skill to create them — start with brand voice and ICP definitions |
| Wrong tags | Standardize tags; check `guidelines.list()` to see existing tag conventions |
| Token budget exceeded | Remove or increase `maxContentTokens`, or split large guidelines so high-priority ones aren't demoted |

## Prevention

- Write guideline headers as search queries, not document titles
- Limit each guideline to one topic or policy domain
- Always verify with `smartGuidelines()` after creating or updating (see VERIFY-GOVERNANCE action)
- Use the governance skill constraint: **MUST** call `smartGuidelines()` after any create or update to verify visibility
