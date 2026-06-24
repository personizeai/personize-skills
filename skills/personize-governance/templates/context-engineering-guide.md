# Context Engineering Guide

How to design, write, and maintain guidelines that make AI agents genuinely effective. This guide covers the principles of context engineering — the discipline of ensuring the right context reaches the right agent at the right time.

---

## What Is Context Engineering?

Context engineering is the practice of structuring organizational knowledge so that AI agents can find, understand, and apply it correctly. It's the difference between:

- **Without context engineering:** "Write a cold email" → AI hallucinates pricing, uses wrong tone, violates compliance rules
- **With context engineering:** "Write a cold email" → AI fetches sales playbook, brand voice, compliance rules → writes an email that follows all organizational standards

Governance variables are the backbone of context engineering. They are the structured, versioned, searchable knowledge base that every agent in your organization draws from.

---

## The Three Laws of Context Engineering

### 1. Context must be findable

If an agent can't find the right guideline, it doesn't exist. This means:

- **Headers match search intent.** An agent asking "how to handle refunds" should find `## Refund Policy`, not `## Section 4.2.1`
- **Variable names are descriptive.** `sales-cold-outreach-guidelines` not `sales-doc-3`
- **Tags enable filtering.** Tag by department, type, and audience so agents can narrow results
- **Content uses the vocabulary agents will search for.** If your team says "churn", put "churn" in the governance, not just "customer attrition"

### 2. Context must be actionable

Agents need clear rules, not vague guidance. This means:

- **Rules are explicit.** "Maximum discount: 15% without VP approval" not "be reasonable with discounts"
- **Examples are concrete.** Show actual good/bad examples with real values
- **Steps are numbered.** "1. Verify the customer's plan. 2. Check their usage. 3. Calculate the refund." not "verify things and process the refund"
- **Exceptions are stated.** "Exception: Enterprise customers with annual contracts — escalate to Account Manager"

### 3. Context must be current

Stale governance is worse than no governance — it confidently gives wrong answers. This means:

- **Every change is tracked.** `historyNote` on every update
- **Learnings flow back.** Bug fixes, incident resolutions, process changes → governance updates
- **Periodic audits.** Review governance quarterly for accuracy
- **Automated ingestion.** CI/CD pipelines scan for changes and propose governance updates

---

## Governance Variable Architecture

### Variable Naming Convention

```
{department}-{topic}[-{subtopic}]

Examples:
  sales-cold-outreach-guidelines
  sales-objection-handling
  engineering-api-standards
  engineering-security-requirements
  cs-refund-policy
  cs-escalation-procedures
  hr-onboarding-checklist
  product-roadmap-faq
```

**Rules:**
- Always kebab-case
- Department prefix for organization (enables tag-based filtering)
- Be specific enough that the name tells you the content
- Don't use generic suffixes like `-doc`, `-info`, `-data`

### Variable Structure Template

Every guideline should follow this structure:

```markdown
# [Clear, Descriptive Title]

[One paragraph: what this document covers, who it's for, when to reference it.]

## Overview

[High-level summary. An agent reading only this section should understand the main rules.]

## [Core Topic 1]

[Detailed rules, guidelines, or procedures.]

- **Rule 1:** Explicit, actionable statement
- **Rule 2:** Explicit, actionable statement
- **Exception:** When Rule 1 doesn't apply

### [Subtopic 1a]

[More detail when needed. Use H3 for subtopics within a section.]

## [Core Topic 2]

[Next major topic.]

## Examples

| Scenario | Good | Bad | Why |
|---|---|---|---|
| [Situation] | [Correct approach] | [Wrong approach] | [Explanation] |

## FAQ

**Q: [Common question agents might ask]**
A: [Clear answer with any caveats.]

## Changelog

- YYYY-MM-DD: [What changed and why]
```

### Tagging Strategy

Use a consistent tagging taxonomy:

```
Department tags:    sales, marketing, engineering, cs, product, hr, finance, legal
Type tags:          governance, policy, best-practice, checklist, how-to, faq, playbook, runbook
Audience tags:      internal, customer-facing, leadership, all-hands
Status tags:        active, draft, deprecated, under-review
Compliance tags:    gdpr, hipaa, soc2, pci (when applicable)
```

**Apply 2-4 tags per variable.** Too few tags = hard to filter. Too many tags = noise.

---

## Writing for AI Consumption

### Do: Write Like a Reference Manual

AI agents scan for specific answers. Structure content for lookup, not narrative reading.

```markdown
## Refund Policy

**Eligibility:** Customers within 30 days of purchase, with less than 50% usage.
**Maximum:** $500 without manager approval. Over $500 requires VP sign-off.
**Process:** 1. Verify eligibility. 2. Calculate amount. 3. Process in Stripe. 4. Send confirmation email.
**Timeline:** Refunds processed within 3-5 business days.
**Exception:** Annual enterprise contracts — escalate to Account Manager.
```

### Don't: Write Like a Blog Post

```markdown
## Our Approach to Refunds

At our company, we believe in treating customers fairly. When a customer
requests a refund, we want to make sure we handle it with care and attention.
Our refund policy has evolved over the years to balance customer satisfaction
with business sustainability...
```

The first version gives an agent everything it needs in 6 lines. The second version buries the rules in prose.

### Headers as Search Queries

Think about what an agent will search for, and make that the header:

| Agent's question | Good header | Bad header |
|---|---|---|
| "How do I handle refunds?" | `## Refund Policy` | `## Section 3: Financial Processes` |
| "What's our cold email approach?" | `## Cold Email Guidelines` | `## Outbound Strategy` |
| "How to deploy to production?" | `## Production Deployment Checklist` | `## DevOps Procedures` |
| "What are the security requirements?" | `## Security Requirements` | `## Appendix B` |

### Use Tables for Comparisons

When agents need to choose between options, tables are ideal:

```markdown
## Support Tier Response Times

| Tier | First Response | Resolution Target | Escalation Path |
|---|---|---|---|
| Critical (P0) | 15 minutes | 4 hours | VP Engineering → CTO |
| High (P1) | 1 hour | 24 hours | Team Lead → VP Engineering |
| Medium (P2) | 4 hours | 3 business days | Team Lead |
| Low (P3) | 24 hours | 10 business days | Self-serve KB first |
```

### Use Code Blocks for Technical Rules

```markdown
## API Response Format

All API endpoints must return responses in this format:

\`\`\`json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2026-01-15T10:30:00Z"
  }
}
\`\`\`

Error responses:

\`\`\`json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [{ "field": "email", "issue": "invalid format" }]
  }
}
\`\`\`
```

---

## Constraint Engineering

Guidelines can express three levels of constraint strength. Use explicit language to signal the level — SmartContext auto-classifies and tags them at save time.

### Constraint Levels

| Level | Tag | Language | Behavior |
|---|---|---|---|
| **Hard constraint** | `<HARD_CONSTRAINT>` | "Never...", "Must always...", "Required:", "Prohibited:" | Agent must follow; violations are logged |
| **Best practice** | `<BEST_PRACTICE>` | "Should...", "Recommended:", "Prefer..." | Agent follows unless there's a specific reason not to |
| **Reference** | `<REFERENCE>` | "FYI:", "Note:", "Context:" | Informational; agent uses for background understanding |

> **Auto-tagging:** When you save a guideline, the system infers and applies these tags automatically. Using the canonical language above produces the most accurate classification.

### How Agents Read Tagged Content

When guidelines are delivered to agents, a preamble is prepended:

> *"Guidelines may contain `<HARD_CONSTRAINT>` (must follow — violations are logged), `<BEST_PRACTICE>` (should follow when applicable), and `<REFERENCE>` (informational context) tags. If you cannot comply with a HARD_CONSTRAINT, state the conflict explicitly."*

This means agents are primed to treat hard constraints as non-negotiable and to surface conflicts rather than silently choosing a behavior.

### Writing Hard Constraints

Use absolute language and make the constraint self-contained — the agent may only receive this section, not the full document:

```markdown
## Compliance Requirements

<HARD_CONSTRAINT>Never include competitor product names in outbound emails. This is a legal requirement under our marketing agreement — violations trigger a compliance review.</HARD_CONSTRAINT>

<HARD_CONSTRAINT>All emails must include an unsubscribe link. Required under CAN-SPAM and GDPR. Use the {{unsubscribe_url}} template variable.</HARD_CONSTRAINT>

<BEST_PRACTICE>Keep subject lines under 50 characters. Longer subjects get truncated on mobile (60%+ of opens).</BEST_PRACTICE>

<REFERENCE>Our legal team reviews flagged emails every Monday. Escalate unclear cases via #legal-marketing Slack channel.</REFERENCE>
```

### Writing Best Practices

Best practices should explain the "why" — agents apply them contextually and need the reasoning to judge edge cases:

```markdown
<BEST_PRACTICE>Use first name only in email openers (not full name). Reason: full name openers feel automated; first name feels personal. Exception: formal industries (law, government) where full name is standard.</BEST_PRACTICE>
```

### When to Escalate vs. Skip

If an agent cannot comply with a hard constraint (e.g., the template variable is missing), it should:
1. State the conflict explicitly to the user
2. NOT silently skip the requirement
3. NOT invent a workaround that violates the constraint

Design your guidelines with this in mind — include fallback instructions inside the constraint when relevant:

```markdown
<HARD_CONSTRAINT>Emails must include the prospect's company name in the first paragraph. If company name is unknown, ask the user to provide it before sending — do not guess or omit.</HARD_CONSTRAINT>
```

---

## Layered Context Architecture

### The Four Layers

```
┌───────────────────────────────────────────────┐
│  Layer 1: Organization Governance             │
│  ─────────────────────────────────────────    │
│  Brand voice, company policies, compliance    │
│  Security standards, data handling rules      │
│  Available to ALL agents via smartGuidelines      │
│  Updated by: Guidelines skill                 │
├───────────────────────────────────────────────┤
│  Layer 2: Department / Team Governance        │
│  ─────────────────────────────────────────    │
│  Sales playbook, engineering standards        │
│  CS procedures, marketing guidelines          │
│  Filtered via: smartGuidelines({ tags: [...] })  │
│  Updated by: Team leads via Governance Mgr    │
├───────────────────────────────────────────────┤
│  Layer 3: Project Context                     │
│  ─────────────────────────────────────────    │
│  CLAUDE.md, .cursorrules, agent.md            │
│  Repo-specific patterns, local conventions    │
│  Available to: IDE agents in this repo        │
│  Updated by: Developers in the repo           │
├───────────────────────────────────────────────┤
│  Layer 4: Task Context (Ephemeral)            │
│  ─────────────────────────────────────────    │
│  Current file, error message, user prompt     │
│  Conversation history, tool outputs           │
│  Available to: Current agent session only     │
│  Updated by: Real-time interaction            │
└───────────────────────────────────────────────┘
```

### How Layers Interact

- **Layer 1** provides the foundation. Every agent gets these rules regardless of context.
- **Layer 2** narrows to relevance. A sales agent gets sales governance, not engineering standards.
- **Layer 3** adds project specifics. "In THIS repo, we use Prisma, not raw SQL."
- **Layer 4** is the current task. The actual code being reviewed, the error being debugged.

### Avoiding Conflicts

When layers disagree, the more specific layer wins — but never violates the more general layer:

- **Org governance says:** "All APIs must use JWT authentication"
- **Project CLAUDE.md says:** "This project uses API keys for internal services"
- **Resolution:** The project can use API keys for internal services, but external-facing APIs must use JWT (org governance is the floor, not the ceiling)

### What Goes Where?

| Content | Layer | Example |
|---|---|---|
| Company-wide policies | 1 (Org) | Data handling, security, brand voice |
| Department playbooks | 2 (Team) | Sales process, engineering standards |
| Repo conventions | 3 (Project) | Framework choice, file structure, local patterns |
| Current task details | 4 (Task) | "Fix the login bug on line 42" |
| Cross-cutting concerns | 1 (Org) | Accessibility, internationalization, compliance |
| Tool-specific rules | 3 (Project) | "Use Vitest not Jest", "Use pnpm not npm" |

---

## Governance Lifecycle

### Phase 1: Bootstrap

Start with the governance that has the highest impact:

1. **Brand voice** — So all AI content sounds like your company
2. **Security standards** — So AI doesn't create vulnerabilities
3. **Coding standards** — So AI-generated code is consistent
4. **Key processes** — Sales playbook, support procedures, onboarding

Use the Document Ingestion recipe to bulk-import existing policies:
```bash
npx ts-node recipes/document-ingestion.ts --folder ./existing-policies --dry-run
```

### Phase 2: Integrate

Connect governance to your development workflow:

1. Add governance blocks to all project CLAUDE.md / .cursorrules files
2. Set up CI/CD governance checks (see `templates/project-governance-setup.md`)
3. Train the team: "Always fetch governance before starting a task"

### Phase 3: Learn

Enable the feedback loop:

1. Set up post-merge learning extraction (see auto-learning-loop.ts)
2. Encourage developers to push learnings after fixing bugs
3. Run quarterly governance audits

### Phase 4: Scale

Expand governance coverage:

1. Add department-specific governance (tagged by team)
2. Enable automated governance updates from incident retrospectives
3. Connect external knowledge sources (vendor docs, compliance updates)

---

## Common Patterns

### Pattern: Pre-Task Governance Fetch

Before any significant task, fetch relevant governance:

```typescript
// In your CLAUDE.md or agent setup:
// "Before writing any code, fetch relevant governance guidelines."

const guidelines = await client.ai.smartGuidelines({
    message: 'coding standards for TypeScript API development',
    tags: ['engineering'],
});

// guidelines.data.compiledContext now contains:
// - Coding standards (naming, structure, patterns)
// - Security requirements (auth, validation, sanitization)
// - API design rules (response format, error handling, versioning)
```

### Pattern: Post-Fix Learning Push

After fixing a bug, persist the learning:

```typescript
await client.guidelines.update(knownBugsId, {
    value: `\n\n### ${bugTitle}\n\n**Symptom:** ${symptom}\n**Root Cause:** ${rootCause}\n**Fix:** ${fix}\n**Prevention:** ${prevention}\n`,
    updateMode: 'appendToSection',
    sectionHeader: '## Recent Fixes',
    historyNote: `Added bug fix: ${bugTitle} (from ${ticketId})`,
});
```

### Pattern: Cross-Variable Audit

When a fact changes (price, name, policy), audit all variables:

```typescript
const allVars = await client.guidelines.list();
const affected = (allVars.data?.actions || []).filter(v =>
    v.payload.value.includes(oldFact)
);

for (const v of affected) {
    // Update each affected section
    // Include historyNote: "Audit: changed X → Y per policy update"
}
```

### Pattern: Governance-Gated Generation

Use governance as a validation layer for AI-generated content:

```typescript
// 1. Generate content
const draft = await client.ai.prompt({ prompt: 'Write a cold email for...' });

// 2. Fetch governance rules
const rules = await client.ai.smartGuidelines({ message: 'cold email compliance rules' });

// 3. Validate against governance
const validation = await client.ai.prompt({
    prompt: `Does this email comply with our governance rules? Flag any violations.`,
    context: `Email: ${draft}\n\nRules: ${rules.data.compiledContext}`,
});
```

---

## Anti-Patterns to Avoid

### 1. The Mega-Variable
**Bad:** One 10,000-word variable covering everything about sales.
**Good:** Separate variables: `sales-cold-outreach`, `sales-follow-up-cadence`, `sales-objection-handling`, `sales-pricing-guidelines`.
**Why:** Smaller, focused variables are easier to update, version, and search.

### 2. The Stale Manual
**Bad:** Governance written once and never updated.
**Good:** Governance updated every time a relevant change happens (bug fix, policy change, process improvement).
**Why:** Stale governance confidently gives wrong answers — worse than no governance.

### 3. The Vague Suggestion
**Bad:** "Try to keep emails short and professional."
**Good:** "Cold emails must be under 150 words. Use first name only. No exclamation marks. One CTA per email."
**Why:** AI agents need unambiguous rules, not suggestions.

### 4. The Duplicate Truth
**Bad:** The same pricing info in `sales-playbook`, `pricing-page-copy`, and `support-faq`.
**Good:** One `pricing-rules` variable. Others reference it: "See `pricing-rules` for current tiers."
**Why:** Duplicates drift. One source of truth stays consistent.

### 5. The Missing Exception
**Bad:** "All support tickets must be resolved within 24 hours."
**Good:** "All support tickets must be resolved within 24 hours. Exception: P0 incidents — 4 hour resolution target. Exception: Feature requests — moved to backlog, no resolution target."
**Why:** Without exceptions, agents apply rules blindly to cases where they shouldn't.

### 6. The Flat Wall of Text

**Bad:** A 2,000-word section with no H2/H3 headers, no bullet points, just paragraphs of prose.
**Good:** Break into subsections with descriptive H2 headers, use bullet points for lists, tables for comparisons, and code blocks for technical rules.
**Why:** SmartContext uses section headers as retrieval targets. A flat wall of text cannot be section-delivered — the entire document must be loaded even when only one rule is relevant, burning 5-10× more tokens than needed.

### 7. The Ambiguous Constraint

**Bad:** "Be professional in emails." / "Follow legal requirements."
**Good:** "Emails must be under 150 words. No exclamation marks. One CTA per email. No competitor mentions (legal requirement — CAN-SPAM + marketing agreement)."
**Why:** Ambiguous constraints are effectively invisible — agents interpret them optimistically and skip enforcement. Use `<HARD_CONSTRAINT>` tags with explicit, testable rules. If an agent can ask "does this comply?", the rule is too vague.

---

## Measuring Governance Effectiveness

### Signals that governance is working
- AI assistants give consistent answers across projects
- New team members ramp up faster (AI knows the rules)
- Fewer "how do we do X here?" questions in Slack
- Code reviews find fewer pattern violations
- Incident retrospectives reference governance updates

### Signals that governance needs work
- AI assistants still hallucinate policies or standards
- Different projects follow different conventions
- Governance variables haven't been updated in months
- Developers bypass governance because it's wrong or outdated
- Same bugs keep recurring (learnings aren't being captured)

### Key metrics
- **Coverage:** What % of your team's common questions have a guideline?
- **Freshness:** When was each variable last updated?
- **Accuracy:** Do random smartGuidelines queries return correct information?
- **Adoption:** Are CLAUDE.md / .cursorrules files referencing governance?
- **Learning velocity:** How many governance updates per week from automated sources?
