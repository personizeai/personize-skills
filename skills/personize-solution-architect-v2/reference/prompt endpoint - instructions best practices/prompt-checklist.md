# Prompt Writing Checklist

Quick reference for writing efficient Personize SDK instructions.

---

## Pre-Flight Checklist

Before calling `client.ai.prompt()`, verify:

- [ ] **No meta-instructions** — removed "call smart_guidelines", "search the web", "remember to save"
- [ ] **Action verb first** — "Write email..." not "Can you help me write..."
- [ ] **One deliverable per instruction** — split multi-task prompts
- [ ] **maxSteps set** — 1 for writing, 2-3 for research, 4-5 for deep research
- [ ] **sessionId passed** — for multi-step or repeated smart_guidelines calls
- [ ] **Config over instructions** — using `memorize`, `evaluate`, `outputs` params instead of text

## Cost Checklist

- [ ] **smart_guidelines mode** — using `fast` for real-time, `auto` for default
- [ ] **recall mode** — using `'fast'` for chat/interactive flows
- [ ] **token_budget** — set on smartDigest (500 for emails, 1000+ for planning)
- [ ] **maxSteps minimal** — no instruction has maxSteps > 5 unless necessary
- [ ] **No filler phrases** — removed "please", "make sure", "be thorough", "think step by step"

## Instruction Patterns

### Simple task (no research needed)
```typescript
await client.ai.prompt({
  prompt: "Write cold email to VP Sales at mid-market SaaS",
  // AI calls smart_guidelines automatically, writes email
});
```

### Research + write
```typescript
await client.ai.prompt({
  instructions: [
    { prompt: "Research ash@aimsio.com, Aimsio", maxSteps: 4 },
    { prompt: "Write cold email to Ash, CEO at Aimsio", maxSteps: 1 },
  ],
  memorize: { email: "ash@aimsio.com", websiteUrl: "aimsio.com", type: "Company" },
  sessionId: `s-${Date.now()}`,
});
```

### Structured output extraction
```typescript
await client.ai.prompt({
  instructions: [
    { prompt: "Research Aimsio — ICP fit, buying signals, tech stack", maxSteps: 4 },
    { prompt: "Write cold email to Ash, CEO at Aimsio", maxSteps: 1 },
  ],
  outputs: [{ name: "company_profile" }, { name: "outreach_email" }],
  evaluate: { serverSide: true },
});
```

### Batch workflow (maximum efficiency)
```typescript
const sessionId = `batch-${Date.now()}`;

for (const lead of leads) {
  await client.ai.prompt({
    instructions: [
      { prompt: `Research ${lead.email}, ${lead.company}`, maxSteps: 3 },
      { prompt: `Write personalized email to ${lead.name}`, maxSteps: 1 },
    ],
    memorize: { email: lead.email, websiteUrl: lead.website, type: "Contact", captureToolResults: true },
    outputs: [{ name: "outreach_email" }],
    sessionId,  // Reuse — governance context cached across leads
  });
}
```

## Common Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| "Call smart_guidelines with message '...'" | +30 input tokens, +200 output tokens | Just state the task |
| "Be detailed and thorough" | 3-5x more output tokens | Be specific: "Include ICP fit score and 3 buying signals" |
| No maxSteps set | Up to 10 LLM round-trips | Set 1-4 based on task |
| No sessionId | Duplicate context delivery | Always pass sessionId |
| "Remember to memorize this" | +15 tokens, unreliable | Use `memorize: {}` config |
| "Search the web for..." | Forces external tools | Let AI choose tools (prefers free internal tools) |
