# HEALTH-CHECK — Ongoing Quality, Performance, and Coverage

## When to Run

- Weekly for active deployments
- After major data imports or guideline changes
- When agents start producing lower-quality output
- Before expanding to new channels or use cases

## Checks

### 1. Account Health

```typescript
const me = await client.me();
console.log('Plan:', me.data.plan.name);
console.log('Rate limits:', JSON.stringify(me.data.rateLimits));
console.log('Usage this period:', JSON.stringify(me.data.usage));
```

**What to check:**
- Not approaching rate limits
- Usage is within plan allowance
- API key has correct permissions

### 2. Memory Quality

Test whether AI extractions are producing useful facts, not noise.

```typescript
// Pick 3-5 representative entities
const testEmails = ['customer1@example.com', 'customer2@example.com', 'customer3@example.com'];

for (const email of testEmails) {
  const recall = await client.memory.recall({
    query: 'What do we know about this person?',
    email,
  });

  console.log(`\n--- ${email} ---`);
  console.log(`Memories: ${recall.data.memories.length}`);

  // Check quality: are the top memories useful?
  recall.data.memories.slice(0, 3).forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.content.substring(0, 100)}...`);
  });
}
```

**Quality signals:**
- Top memories contain actionable facts (job title, company, interests), not noise
- No duplicate or near-duplicate memories
- Memories from different sources (CRM, email, enrichment) are all present
- `smartDigest()` produces a coherent narrative, not a jumbled list

### 3. Governance Reach

Test whether guidelines are reaching the right agents with the right content.

```typescript
// Test queries that agents actually send
const agentQueries = [
  'How should I write a cold email?',
  'What is our ideal customer profile?',
  'What compliance rules apply to outbound?',
  'What tone should I use for enterprise accounts?',
];

for (const q of agentQueries) {
  const result = await client.ai.smartGuidelines({ message: q });
  const hasContent = result.data.compiledContext && result.data.compiledContext.length > 50;
  console.log(`${hasContent ? '✅' : '❌'} "${q}" → ${hasContent ? result.data.compiledContext.length + ' chars' : 'EMPTY'}`);
}
```

**Quality signals:**
- Every common agent query returns relevant guidelines
- No query returns irrelevant guidelines (false positives)
- Guidelines contain explicit, actionable instructions (not vague prose)

### 4. Pipeline Throughput

For teams running batch pipelines or scheduled tasks.

```typescript
// Check recent pipeline runs (Trigger.dev)
// Use the Trigger.dev dashboard or API to check:
// - Last successful run time
// - Error rate over past 7 days
// - Average records processed per run
// - Any stuck or timed-out runs
```

**Quality signals:**
- Pipelines are running on schedule
- Error rate is < 5%
- No runs have been stuck for > 1 hour
- Batch sizes are within rate limits

### 5. Workspace Activity

For teams using shared workspaces.

```typescript
// Check that workspaces are being actively used
const testEntities = ['account1@example.com', 'account2@example.com'];

for (const email of testEntities) {
  const workspace = await client.memory.recall({
    query: 'recent updates tasks notes',
    email,
    tags: ['workspace'],
  });

  const recent = workspace.data.memories.filter(m => {
    try {
      const entry = JSON.parse(m.content);
      const age = Date.now() - new Date(entry.timestamp).getTime();
      return age < 7 * 24 * 60 * 60 * 1000; // last 7 days
    } catch { return false; }
  });

  console.log(`${email}: ${recent.length} entries in last 7 days ${recent.length > 0 ? '✅' : '⚠️ stale'}`);
}
```

**Quality signals:**
- Active workspaces have entries from the past 7 days
- Multiple contributors are writing (not just one agent)
- Entry types are diverse (Updates, Tasks, Notes — not all one type)

## Output Template

After running the health check, summarize results:

```
## Health Check — [Date]

| Layer | Status | Details |
|---|---|---|
| Account | ✅/⚠️/❌ | Plan usage, rate limits |
| Memory | ✅/⚠️/❌ | Quality of extractions, coverage |
| Governance | ✅/⚠️/❌ | Query reach, relevance |
| Pipelines | ✅/⚠️/❌ | Success rate, throughput |
| Workspaces | ✅/⚠️/❌ | Activity, contributor diversity |

### Actions Needed
- [ ] [specific fix or improvement]
```

## Constraints

> Keywords follow [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119): **MUST** = non-negotiable, **SHOULD** = strong default (override with stated reasoning), **MAY** = agent discretion.

1. **MUST** test with queries that agents actually use, not generic test strings — because a health check that passes on synthetic queries but fails on real ones provides false confidence.
2. **SHOULD** run the full health check weekly for production deployments — because drift in data quality, governance coverage, and pipeline reliability compounds over time.
3. **SHOULD** present results in the output template format — because consistent reporting makes trends visible across health checks.
4. **MAY** skip layers that haven't changed since the last check — because stable layers don't need re-verification every cycle.
