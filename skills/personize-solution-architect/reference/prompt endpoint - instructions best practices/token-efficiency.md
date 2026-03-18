# Token Efficiency Guide

How to write instructions that minimize cost, maximize speed, and produce better results.

## Why This Matters

| Factor | Verbose prompt | Efficient prompt |
|--------|---------------|-----------------|
| Input tokens | ~150 per instruction | ~30 per instruction |
| Output tokens | Long explanations (3-4x cost of input) | Concise deliverables |
| Response time | More tokens = more seconds | Fewer tokens = faster |
| Quality | Diluted intent, model guesses what you want | Clear intent, model executes precisely |

**Output tokens cost 3-4x more than input tokens.** A verbose instruction doesn't just waste input — it causes verbose output, which is the real cost multiplier.

---

## Rule 1: State the Task, Not the Process

The system prompt already tells the AI when to call `smart_guidelines`, `recall_pro`, and other tools. You don't need to instruct it.

```
BAD (47 tokens — tells AI what it already knows):
"First, call smart_guidelines with message 'sales email guidelines and
best practices' to get organizational guidelines. Then use those
guidelines to write a cold email."

GOOD (12 tokens — just the task):
"Write a cold email to a VP of Sales at a mid-market SaaS company"
```

**Savings: ~35 tokens input + hundreds of tokens in output** (because the AI won't narrate the tool-calling process).

---

## Rule 2: One Deliverable Per Instruction

Each instruction should produce one clear output. Don't combine research + writing + analysis.

```
BAD (1 instruction doing 3 things):
{ prompt: "Research Aimsio, summarize what you find, then write a
personalized email to their CEO Ash" }

GOOD (3 focused instructions):
instructions: [
  { prompt: "Research Aimsio (aimsio.com)", maxSteps: 4 },
  { prompt: "Write cold email to Ash, CEO at Aimsio", maxSteps: 1 },
]
```

Why 2 instructions instead of 3? The AI carries context between steps via `chatHistory` — it doesn't need a separate "summarize" step.

---

## Rule 3: Front-Load the Action Verb

Put what you want first. Skip pleasantries, qualifiers, and meta-commentary.

```
BAD: "Can you please help me draft a follow-up email for..."
GOOD: "Write follow-up email for ash@aimsio.com — reference our last call about HubSpot integration"

BAD: "I'd like you to analyze the company and then determine..."
GOOD: "Analyze Aimsio — ICP fit, buying signals, tech stack"
```

---

## Rule 4: Don't Explain What the AI Should Already Know

These phrases waste tokens and produce nothing:

| Wasted instruction | Why it's unnecessary |
|---|---|
| "Call smart_guidelines first" | System prompt already says to |
| "Remember to save this to memory" | Use `memorize: {}` config instead |
| "Search the web for information about..." | AI chooses tools automatically |
| "Make sure to follow our brand guidelines" | smart_guidelines provides them |
| "Be thorough and detailed" | Causes verbose output — be specific instead |
| "Think step by step" | AI SDK handles multi-step execution |

---

## Rule 5: Use Config, Not Instructions

Many behaviors are better controlled via API parameters than prompt text:

| Instead of saying... | Use this config |
|---|---|
| "Save the results to memory for ash@aimsio.com" | `memorize: { email: 'ash@aimsio.com' }` |
| "Evaluate the quality of your response" | `evaluate: { serverSide: true }` |
| "Return the company profile as JSON" | `outputs: [{ name: 'company_profile' }]` |
| "Use the same context from the last call" | `sessionId: 'session-123'` |
| "Keep it brief" | `maxSteps: 1` on the instruction |

---

## Rule 6: Set maxSteps Intentionally

Every step is an LLM round-trip (~5-15s + tokens). Default is 10 — that's almost never needed.

| Task type | Recommended maxSteps |
|---|---|
| Writing from existing context | 1 |
| Single tool call + write | 2 |
| Research (2-3 tools) + write | 3-4 |
| Deep research + multiple tools | 5 |

```typescript
instructions: [
  { prompt: "Get outreach guidelines", maxSteps: 2 },
  { prompt: "Research ash@aimsio.com", maxSteps: 4 },
  { prompt: "Write cold email to Ash", maxSteps: 1 },  // No tools needed — context is already there
]
```

---

## Rule 7: Use Smart Context Modes Wisely

| Mode | Speed | Cost | Best for |
|------|-------|------|----------|
| `fast` | ~200ms | Free (embedding only) | Real-time chat, known orgs with many variables |
| `deep` | ~3-5s | 1 LLM call | First interaction, complex tasks, few variables |
| `auto` | Varies | System decides | Default — good for most cases |

> **Mode rename:** `'full'` was renamed to `'deep'`. Update any older code using `mode: 'full'`.

For batch/workflow use cases, always pass `mode: 'fast'` to skip the routing LLM call:
```typescript
await client.ai.smartGuidelines({ message: task, mode: 'fast' });
```

### SmartContext Token Optimization

SmartContext supports additional controls to keep token usage predictable:

**1. Token budget cap (`maxTokenBudget`)**

Cap how many tokens are returned across all guidelines. Excess guidelines are demoted to `supplementary[]` — delivered by name only (call again with `guidelineNames` to fetch them when needed):

```typescript
const ctx = await client.ai.smartGuidelines({
  message: 'cold email guidelines',
  maxTokenBudget: 3000,  // cap total returned content
});

// If budget exceeded:
// ctx.data.supplementary — guidelines that didn't fit (name + reason only)
// ctx.data.budgetMetadata.demotedGuidelines — names to fetch on follow-up

if (ctx.data.budgetMetadata?.demotedGuidelines?.length) {
  const moreCtx = await client.ai.smartGuidelines({
    message: 'cold email guidelines',
    guidelineNames: ctx.data.budgetMetadata.demotedGuidelines,
  });
}
```

**2. Section-level delivery**

When a guideline has `##` section headers, SmartContext can deliver only the sections relevant to the query — instead of the full document. This is automatic in `fast` mode when sections match the query. To maximize section-level delivery:
- Write guidelines with clear `##` section headers (minimum 2-3 per guideline)
- Use headers that match how agents will search (e.g., `## Cold Email Rules` not `## Section 3`)
- Section-level delivery saves 50-80% tokens vs full-document delivery

**3. Constraint tags are free context**

Guidelines containing `<HARD_CONSTRAINT>`, `<BEST_PRACTICE>`, and `<REFERENCE>` tags get a ~40-token preamble prepended to `compiledContext` — a one-time cost per session. The preamble primes the agent to enforce hard constraints without additional instruction in your prompt. Do NOT repeat constraint instructions in your prompt if guidelines already contain them.

---

## Rule 8: Use sessionId for Multi-Step Workflows

Without `sessionId`, smart_guidelines may return the same context on every call. With it, previously delivered content is skipped.

```typescript
const sessionId = `workflow-${Date.now()}`;

await client.ai.prompt({
  instructions: [
    { prompt: "Get sales guidelines" },
    { prompt: "Get objection handling guidelines" },  // Won't re-deliver sales guidelines
    { prompt: "Write email" },
  ],
  sessionId,  // Context deduplication across all steps
});
```

**Savings: 30-50% fewer tokens on repeated smart_guidelines calls.**

---

## Rule 9: Use fast_mode for Recall in Interactive Flows

```typescript
// Chat / real-time: skip reflection + answer generation (~700ms)
await client.memory.recall({ query: '...', email: '...', fast_mode: true });

// Batch / research: full analysis (~3-5s)
await client.memory.recall({ query: '...', email: '...', generate_answer: true });
```

---

## Rule 10: Budget Tokens on Smart Digest

Default `token_budget` is 1000 — often more than needed for a simple email.

```typescript
// Quick context for a single email
await client.memory.smartDigest({ email: '...', token_budget: 500 });

// Deep context for account planning
await client.memory.smartDigest({ email: '...', token_budget: 2000 });
```

---

## Before/After Example

### Before (verbose — ~200 input tokens, ~2000 output tokens)
```typescript
await client.ai.prompt({
  prompt: 'First, call smart_guidelines with message "write a sales sequence for our top 3 ICPs" to get organizational guidelines. Then use those guidelines to explain how to write a sales sequence for our top 3 ICPs. Make sure to include details about each ICP, the sequence structure, and best practices.',
});
```

### After (efficient — ~30 input tokens, ~400 output tokens)
```typescript
await client.ai.prompt({
  instructions: [
    { prompt: "Sales sequence framework for our top 3 ICPs", maxSteps: 2 },
  ],
  sessionId: `session-${Date.now()}`,
});
```

**Result: ~80% fewer tokens, ~60% faster response, same quality.**
