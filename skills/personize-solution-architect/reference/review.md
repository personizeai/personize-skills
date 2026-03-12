# Reference: REVIEW Action

Complete audit checklist for reviewing an existing Personize integration and suggesting improvements.

---

## Audit Checklist

### 1. Data Completeness

**Question:** What data exists in their system vs. what are they memorizing?

**How to audit:**
- Read their data models (database schemas, CRM fields, analytics events)
- Read their `memorizeBatch()` mappings
- Identify gaps: data that exists but isn't being sent to Personize

**Common gaps:**
- Search queries (pure intent signals — often missed)
- Content consumption (articles read, videos watched — memorize the content itself, not just the event)
- User-generated content (uploads, documents, form submissions)
- ML model outputs (predictions without explanations)
- Support tickets (rich unstructured text)
- Generated content (emails, proposals the AI already sent — must be stored back)

**What to recommend:**
```
Data you have but aren't memorizing:
├── search_queries → memorize with enhanced: true (intent signals)
├── video_watch_events → memorize the video CONTENT, not just "user watched"
├── uploaded_files → memorize summary/content
└── churn_model_predictions → memorize prediction + explanation
```

### 2. `extractMemories` Decisions

**Question:** Are the right fields using AI extraction?

**Common mistakes:**
| Mistake | Problem | Fix |
|---|---|---|
| `extractMemories: true` on email/name/phone | Wasting AI tokens on structured data | Set to `false` or omit |
| `extractMemories: false` on notes/transcripts | Missing semantic search capabilities | Set to `true` |
| `extractMemories: true` on numeric metrics | AI extraction adds no value to numbers | Set to `false` |
| No `extractMemories` on generated content | AI can't know what it already said | Set to `true` |

**Rule of thumb:**
- Structured, filterable, numeric → `false`
- Unstructured, natural language, rich text → `true`
- Developer interpretations, explanations → `true`

### 3. Recall Quality

**Question:** Are they using the right recall methods for the right purposes?

**Audit for these patterns:**

| What They Should Use | For What | Common Mistake |
|---|---|---|
| `smartDigest()` | Full entity context before generating content | Using only `recall()` — misses properties and non-matching memories |
| `recall()` | Task-specific facts (semantic search) | Not using at all, or using with too-broad queries |
| `smartGuidelines()` | Governance rules before generating | Hardcoding rules in prompts instead of fetching governance |

**What good recall looks like:**
```typescript
// GOOD: Three-layer context assembly
const vars = await client.ai.smartGuidelines({ message: task });        // Rules
const digest = await client.memory.smartDigest({ email, type: 'Contact' }); // Who
const recalled = await client.memory.recall({ query: task, email }); // What
```

**What bad recall looks like:**
```typescript
// BAD: Only using recall, missing governance and full entity context
const recalled = await client.memory.recall({ query: 'write email for john' });
```

### 4. Governance Usage

**Question:** Do they have governance variables? Are they using `smartGuidelines()` before generating?

**What to check:**
- Do governance variables exist? (`client.guidelines.list()`)
- Are they calling `smartGuidelines()` before generating content?
- Are there governance variables for: brand voice, ICPs, policies, tone guidelines?

**If no governance:**
- Suggest creating starter variables (brand voice, ICP definitions, content guidelines)
- Point them to the Governance Manager skill for setup

**If governance exists but unused:**
- Add `smartGuidelines()` calls before every `ai.prompt()` call
- Include the compiled context as the first part of the context block

### 5. Prompt Quality

**Question:** Are their prompts well-structured for personalization?

**Audit criteria:**

| Aspect | Good | Bad |
|---|---|---|
| **Structure** | Multi-step `instructions[]` with distinct steps | Single monolithic prompt |
| **Specificity** | "Reference 2+ specific facts about the contact" | "Write a personalized email" |
| **Evaluation** | Uses `evaluate: true` with criteria | No self-evaluation |
| **Context** | Includes governance + entity + recalled facts | Only includes one source |
| **Reasoning** | Analyze → Plan → Generate pattern | Jump straight to generation |

**What good prompts look like:**
```typescript
instructions: [
    { prompt: 'Analyze the contact: role, pain points, past interactions, objections.', maxSteps: 3 },
    { prompt: 'Plan the best angle. What should we avoid?', maxSteps: 3 },
    { prompt: 'Write the content. Reference specific facts. Include clear CTA.', maxSteps: 5 },
],
evaluate: true,
evaluationCriteria: 'Must reference 2+ specific facts and follow guidelines.',
```

**What bad prompts look like:**
```typescript
prompt: 'Write a personalized email for this contact.',
// No instructions[], no evaluation, no structure
```

### 6. Feedback Loop

**Question:** Are they storing generated outputs back in memory?

**What to check:**
- After generating content, do they call `memorize()` with the output?
- Are generated emails, proposals, and notifications stored with proper tags?
- Does the AI know what it already sent to each contact?

**Why this matters:**
- Without feedback loop: AI may repeat the same outreach angle
- Without feedback loop: No sequence tracking (email #1 vs #2 vs #3)
- Without feedback loop: No audit trail of AI-generated content

**What good feedback looks like:**
```typescript
await client.memory.memorize({
    content: `[OUTREACH-EMAIL] Sent via email on ${new Date().toISOString()}.\nContent: ${generatedEmail}`,
    speaker: 'System: Content Pipeline',
    enhanced: true,
    tags: ['generated', 'pipeline-output', 'channel:email', 'type:outreach'],
    email: contact.email,
});
```

### 7. Missing Opportunities

**Question:** Based on their codebase, what personalization touchpoints are they not using?

**Where to look:**
- UI components with static content → can be AI-personalized
- Emails with `{first_name}` only → can be fully personalized
- Notifications sent to all users equally → can be smart-targeted
- Dashboards showing same data to everyone → can show AI insights
- Onboarding flows that are the same for all → can be adaptive
- Search results with no re-ranking → can be personalized
- Empty states with generic content → can be contextual
- Help content at one level → can adapt to user's technical level

### 8. Rate Limit Efficiency

**Question:** Are they using their API budget wisely?

**What to check:**
- Are they calling `client.me()` to read limits?
- Are they batching with `memorizeBatch()` instead of individual `memorize()` calls?
- Do they have retry logic for 429 errors?
- Are they spacing API calls appropriately?
- Each record needs ~4-6 API calls — are they budgeting correctly?

---

## Review Output Template

Present findings in this format:

```
## What You're Doing Well
- [List strengths]

## Data Gaps — What You're Missing
- [Data source] → should be memorized as [type]
- ...

## Quick Wins — Easy Improvements
1. [Change that takes < 1 hour and adds immediate value]
2. ...

## Structural Improvements
1. [Bigger change with significant impact]
2. ...

## New Personalization Opportunities
1. [Touchpoint they're not personalizing yet]
2. ...

## Recommended Next Steps
1. [Highest priority action]
2. [Second]
3. [Third]
```

---

## Common Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Pre-processing with LLM before `memorize()` | Unnecessary overhead — Memorize does this | Remove the LLM step, pass raw data with `enhanced: true` |
| Application-side deduplication before storing | Unnecessary — Memorize deduplicates at cosine 0.92 | Remove dedup logic, just send the data |
| Hardcoded rules in prompts | Rules drift, inconsistent across agents | Move to governance variables, fetch via `smartGuidelines()` |
| Single `recall()` for all context | Misses properties, governance, non-matching memories | Use three-layer: `smartGuidelines` + `smartDigest` + `recall` |
| Not storing generated outputs | AI doesn't know what it already said | Add `memorize()` after every generation |
| One giant prompt instead of `instructions[]` | No chain-of-thought, worse quality | Split into analyze → plan → generate steps |
| Same notification for all users | Not personalized, users ignore | Use `smartDigest()` per user for unique content |
| Creating collections via code without version tracking | Changes aren't auditable | Use `client.collections.create()` with a `historyNote` for traceability |
