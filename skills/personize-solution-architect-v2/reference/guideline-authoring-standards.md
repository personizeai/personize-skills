# Guideline Authoring Standards

Guidelines are the primary input to SmartContext. Every guideline written becomes part of every AI agent's knowledge base for your organization. Well-written guidelines save tokens, improve routing accuracy, and produce better AI output. Poorly written ones waste tokens, confuse routing, and degrade results.

## Structure Rules (Hard Constraints)

1. **Lead with purpose** — First paragraph: what this guideline is for and when to use it (1-2 sentences max)
2. **Use markdown headers** — Every guideline MUST use `##` headers to create sections. SmartContext can deliver individual sections instead of the full document, saving 50-80% tokens
3. **One concern per guideline** — Don't combine "Brand Voice" + "Email Templates" + "ICP Criteria" in one guideline. Split them. SmartContext routes each independently
4. **300-800 word sweet spot** — Under 300 words: probably too vague. Over 800 words: probably contains multiple concerns or excessive examples. Split or use references
5. **No meta-commentary** — Don't write "This guideline covers..." or "The purpose of this document is...". Just write the rules

## Content Patterns (Best Practices)

### Principles Before Rules

The AI follows principles better than arbitrary rules. Explain WHY before WHAT.

BAD:
```
Always use the prospect's first name in the subject line.
```

GOOD:
```
## Personalization Standard
Personalized subject lines get 26% higher open rates. Use the prospect's
first name in the subject line when available. If no name is known, use
their company name or role instead.
```

### Contrasted Examples Over Descriptions

Show good vs bad side-by-side. The AI calibrates from examples faster than rules.

BAD:
```
Write professional emails that are not too formal or too casual.
```

GOOD:
```
## Tone Calibration

TOO FORMAL (avoid):
"Dear Mr. Johnson, I hope this correspondence finds you well..."

TOO CASUAL (avoid):
"Hey! Saw your company and thought it was super cool..."

TARGET TONE:
"Hi David — I noticed Acme recently expanded into healthcare.
We help companies like yours..."
```

### Tables for Criteria, Prose for Process

Use tables when comparing options or defining criteria. Use prose for workflows.

GOOD for criteria:
```
| ICP Tier | Revenue | Employee Count | Industry |
|----------|---------|----------------|----------|
| Tier 1   | $10M+   | 100+           | SaaS, Fintech |
| Tier 2   | $2M-10M | 25-100         | Any tech |
```

GOOD for process:
```
## Qualification Flow
1. Check ICP fit against the tier table above
2. If Tier 1: route to AE immediately with full context
3. If Tier 2: schedule nurture sequence, tag for monthly review
4. If no match: politely decline with referral suggestion
```

### RFC 2119 Keywords and Constraint Tags

Guidelines use [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) keywords to express rule strength. These keywords are the **authoring language** — write them inline in your rules. The system auto-infers `<HARD_CONSTRAINT>`, `<BEST_PRACTICE>`, and `<REFERENCE>` tags at save time from these keywords.

#### Full Keyword Table

| Keyword | Synonym | Level | Constraint Tag | Meaning |
|---------|---------|-------|----------------|---------|
| **MUST** | **REQUIRED**, **SHALL** | Hard | `<HARD_CONSTRAINT>` | Absolute requirement — violations are failures |
| **MUST NOT** | **SHALL NOT** | Hard | `<HARD_CONSTRAINT>` | Absolute prohibition — violations are failures |
| **SHOULD** | **RECOMMENDED** | Soft | `<BEST_PRACTICE>` | Strong default — follow unless you state explicit reasoning to deviate |
| **SHOULD NOT** | **NOT RECOMMENDED** | Soft | `<BEST_PRACTICE>` | Strong default against — override only with stated reasoning |
| **MAY** | **OPTIONAL** | Reference | `<REFERENCE>` | Agent discretion — choose either way without justification |

All nine keywords (MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY) plus their adjective forms (REQUIRED, RECOMMENDED, OPTIONAL, NOT RECOMMENDED) are recognized. Use whichever reads most naturally — they map to the same three enforcement levels.

#### How It Works

1. **You write** RFC 2119 keywords in your guideline text (e.g., "Emails **MUST** include an unsubscribe link")
2. **The system infers** `constraintLevel` (hard/soft/reference) and wraps rules in the corresponding XML tags at save time
3. **Agents receive** a preamble explaining the tags: `<HARD_CONSTRAINT>` = non-negotiable, `<BEST_PRACTICE>` = follow when applicable, `<REFERENCE>` = informational context
4. **You can also write tags explicitly** for precision when auto-inference isn't enough

#### Rationale Clauses

Every constraint gets a "because" rationale after an em dash. This gives agents context to make good decisions in edge cases rather than blindly following rules.

```
**MUST** [do X] -- because [consequence of not doing it].
**SHOULD** [do Y] -- because [benefit, with acceptable override conditions].
**MAY** [do Z] -- because [benefit when applicable].
```

#### Language That Triggers Auto-Inference

| Detected Language | Inferred Level | Constraint Tag |
|---|---|---|
| "MUST", "REQUIRED", "SHALL", "Never...", "Must always...", "Required:", "Prohibited:" | Hard | `<HARD_CONSTRAINT>` |
| "SHOULD", "RECOMMENDED", "Should...", "Recommended:", "Prefer..." | Soft | `<BEST_PRACTICE>` |
| "MAY", "OPTIONAL", "FYI:", "Note:", "Context:", "For reference:" | Reference | `<REFERENCE>` |

#### Balance Check

Not everything should be MUST. A guideline with zero SHOULD or MAY rules is probably over-constraining. The three-tier gradient exists so agents can exercise judgment on best practices while never violating safety-critical requirements. Aim for a healthy mix across all three levels.

GOOD (RFC 2119 keywords with rationale):
```
## Compliance Requirements

Emails **MUST** include an unsubscribe link -- because CAN-SPAM and GDPR
require it; non-compliance risks fines and domain blacklisting.

Outbound emails **MUST NOT** include competitor product names -- because
our marketing agreement prohibits it; legal reviews violations weekly.

Subject lines **SHOULD** be under 50 characters -- because longer subjects
get truncated on mobile (60%+ of opens); override for A/B tests only.

Our legal team reviews flagged emails every Monday. Escalate unclear
cases to #legal-marketing. (**OPTIONAL** — this is informational context.)
```

GOOD (explicit tags when auto-inference isn't enough):
```
## Data Handling

<HARD_CONSTRAINT>PII must not appear in log output. Redact before writing.</HARD_CONSTRAINT>

<BEST_PRACTICE>Prefer structured logging (JSON) over free-text log lines.</BEST_PRACTICE>

<REFERENCE>Log retention is 90 days in production, 30 days in staging.</REFERENCE>
```

BAD (unmarked rules — agents cannot distinguish hard from soft):
```
## Compliance (MUST follow)
- Never mention competitor pricing
- Always include unsubscribe link in marketing emails
- PII must not appear in subject lines

## Style Preferences (follow when possible)
- Prefer short paragraphs (2-3 sentences)
- Use bullet points for lists of 3+ items
- End with a clear call-to-action
```

### Completion Criteria

Tell the AI what "done right" looks like. Without this, the AI guesses.

```
## Output Quality Checklist
A complete cold email MUST have:
- [ ] Personalized opening (name + specific company detail)
- [ ] One clear pain point addressed
- [ ] Social proof (case study, metric, or customer name)
- [ ] Single CTA (not multiple asks)
- [ ] Under 150 words
```

## Anti-Patterns (What NOT to Do)

| Anti-Pattern | Problem | Fix |
|---|---|---|
| "Be professional and helpful" | Too vague, AI already does this | Delete it — adds nothing |
| 2,000-word guideline with 15 sections | Everything selected = nothing prioritized | Split into 3-4 focused guidelines |
| Pasting entire blog posts as guidelines | Huge token cost, low signal density | Summarize to rules + 1-2 examples |
| Duplicating rules across guidelines | Token waste, contradictions over time | Single source of truth per concern |
| "Follow all company policies" | Circular — the AI is reading policies to learn them | Be specific about which policies |
| Examples without labels | AI can't tell good from bad | Always label: "GOOD:", "BAD:", "TARGET:" |
| No markdown headers | SmartContext can't do section-level delivery | Add `##` headers for every major topic |
| Flat walls of prose | Hard to scan, low keyword density for routing | Use headers, bullets, and tables |

## Naming Conventions

The guideline name is the first signal for routing. Name it the way someone would search for it.

### Rules
- Use kebab-case: `brand-voice`, `sales-playbook`, `data-handling`
- Name reflects TOPIC, not format: `cold-email-rules` not `email-template-v3`
- Be specific: `enterprise-sales-playbook` not `playbook`
- Don't include dates or versions in names -- use `historyNote` for versioning

### Description
The description field is a single-sentence summary answering "what is this?"
- GOOD: "Rules for outbound cold email tone, structure, and compliance"
- BAD: "This is our email guideline document"

## First-Paragraph Optimization

The first ~1000 characters of your guideline have outsized influence on routing accuracy. The embedding model weights early content more heavily when calculating relevance scores.

### Rules
- First sentence: WHAT this guideline covers (the topic/domain)
- Second sentence: WHEN to use it (the trigger condition)
- Include the exact keywords agents will use in their queries
- Don't waste the first paragraph on meta-commentary ("This document describes our approach to...")

### Example

GOOD (front-loaded):
```
Rules for outbound cold email to enterprise SaaS prospects.
Use when writing first-touch emails, follow-up sequences, or
break-up messages to accounts in our Tier 1 and Tier 2 ICPs.
```

BAD (buried):
```
This guideline was created by the sales team in Q4 2025 to
standardize our outreach approach. It covers various aspects
of how we communicate with potential customers via email.
```

## Section Headers as Routing Targets

When `smartGuidelines` selects a guideline, it can deliver individual sections instead of the full document. The section header IS the routing key. Name sections as someone would search for them.

### Rules
- Write headers matching how agents will describe the topic
- "## Cold Email Tone" not "## Section 3.2: Email Guidelines"
- "## Pricing Objection Handling" not "## Pricing"
- Headers **SHOULD** be self-contained -- readable without the parent guideline name
- Keep to 3-6 sections per guideline (too many = routing ambiguity)

### How Section Delivery Works
1. `smartGuidelines` scores the full guideline based on embedding similarity
2. If selected, it evaluates which SECTIONS match the query
3. Only matched sections are delivered (saving 50-80% tokens)
4. `availableSections` and `trimmedSections` in the response show what was included vs. cut

## Tagging Standards

Tags are routing infrastructure, not metadata decoration. They determine which guidelines are candidates for selection when agents call `smartGuidelines({ tags: [...] })`.

### Rules
- **MUST** use 2-5 tags per guideline -- zero tags means the guideline relies entirely on semantic matching (slower, less precise)
- **MUST** use a controlled vocabulary -- inconsistent tags fragment routing
- **SHOULD** include at least one audience tag (who) and one domain tag (what)

### Controlled Vocabulary (Starter)

| Category | Tags |
|----------|------|
| Audience | `sales`, `marketing`, `cs`, `product`, `engineering`, `ops`, `all` |
| Domain | `outbound`, `inbound`, `email`, `slack`, `sms`, `linkedin`, `web` |
| Stage | `prospecting`, `qualification`, `demo`, `proposal`, `renewal` |
| Compliance | `compliance`, `legal`, `privacy`, `security` |
| Internal | `internal`, `draft`, `deprecated` |

### How Tags Are Used

```typescript
// Broad: semantic match filtered by tags
const governance = await client.ai.smartGuidelines({
    message: 'cold outbound email for VP of Sales',
    tags: ['sales', 'outbound'],        // only guidelines with these tags
    excludeTags: ['draft', 'internal'], // never include these
});
```

### Anti-Pattern
Don't use `excludeTags: ["draft"]` if you never tag drafts as "draft." The tag system only works when authors consistently apply it.

## Governance Scope

Every guideline is automatically analyzed at save time for two routing signals:

### alwaysOn
Guidelines flagged as `alwaysOn` are included in EVERY `smartGuidelines` response, regardless of the query. Use for non-negotiable rules that apply to all AI interactions.

- **MUST** limit `alwaysOn` guidelines to 2-3 across the entire org
- **MUST** keep `alwaysOn` guidelines short (under 300 words) -- they consume tokens on every single call
- Good candidates: core compliance rules, universal brand principles, data handling minimums
- Bad candidates: sales playbooks, email templates, ICP criteria (these **SHOULD** route by relevance, not always-on)

### triggerKeywords
The system auto-extracts action and domain keywords from your content. These boost inclusion when a query mentions the same terms.

To improve trigger accuracy:
- Front-load domain-specific terms in the first paragraph
- Use the exact words your agents will use in their queries (e.g., "cold email" not "initial outreach communication")
- Include both the concept and common synonyms (e.g., "renewal" and "retention" and "churn prevention")

## Token Budget Behavior

`smartGuidelines` has a token budget (default: 10,000 tokens). When multiple guidelines match, they compete for budget space.

### What happens when budget is tight:
1. Highest-scoring guidelines are included first
2. Lower-scoring guidelines are "demoted" -- cut from the response
3. Long guidelines may be auto-trimmed to relevant sections only
4. The response includes `demotedGuidelines` so agents know what was cut and can fetch on demand via `client.guidelines.getSection()`

### Implications for authors:
- Shorter guidelines (300-500 words) survive budget competition better than long ones (800+ words)
- Well-structured guidelines with clear sections can be partially delivered -- only the relevant sections consume budget
- A 200-word focused guideline beats an 800-word rambling one in budget competition, even if both are relevant

## Token Budget Guide

| Guideline Type | Target Words | Target Sections | Notes |
|---|---|---|---|
| Brand Voice | 300-500 | 3-4 (Tone, Vocabulary, Examples, Anti-patterns) | 2-3 contrasted examples |
| Email Templates | 400-600 | By template type (Cold, Follow-up, Break-up) | 1 example per type |
| ICP / Qualification | 200-400 | Criteria table + routing flow | 1 table |
| Compliance / Legal | 200-300 | MUST rules + prohibited actions | No examples needed |
| Product Knowledge | 500-800 | By feature or use case | Use references for deep docs |
| Sales Playbook | 400-700 | By stage (Discovery, Demo, Proposal) | 1-2 examples per stage |

### Word Count Rationale
- Under 300: too vague for the AI to calibrate behavior
- 300-500: ideal for focused policy (compliance, tone rules)
- 500-800: ideal for playbooks with examples
- Over 800: almost always contains multiple concerns -- split
- Over 1,200: system warning fires (TOO_LONG)

## Cross-Guideline References

When guidelines are related but separate, use explicit references instead of duplicating content.

### Pattern
```
For pricing details, see the **pricing-rules** guideline.

ICP criteria are defined in **icp-definitions** -- use those
tiers when deciding outreach priority.
```

### Why This Works
- `smartGuidelines` can fetch both in a single call if both are relevant
- Agents can follow the reference with `guideline_read` if only one was delivered
- Avoids duplication (single source of truth per concern)

### Anti-Pattern
Don't copy sections between guidelines. When the source updates, the copy becomes stale. Reference instead of duplicate.

## Quality Warnings (Automated)

The system checks these automatically when you save a guideline:

- **NO_SECTIONS** -- No `##` headers found. SmartContext will always deliver the full content even when only part is relevant.
- **TOO_LONG** -- Over 1,200 words. Consider splitting into focused guidelines.
- **TOO_SHORT** -- Under 50 words. May be too vague to guide the AI effectively.
- **NO_EXAMPLES** -- No examples detected. Consider adding contrasted GOOD/BAD examples.
- **WEAK_CONSTRAINTS** -- No RFC 2119 keywords (MUST, SHOULD, MAY, etc.) or constraint tags detected. Agents cannot distinguish hard requirements from soft preferences without explicit strength signals.
- **NO_TAGS** -- No tags set. Guideline relies entirely on semantic matching for routing -- less precise and slower.
- **DUPLICATE_CONCERN** -- Another guideline has high semantic overlap. Consider merging or differentiating.

These are warnings, not blockers. Use your judgment -- some guidelines are intentionally short (e.g., a simple checklist) or purely informational (reference-level).

## Changelog

- 2026-03-21: Added system-level authoring guidance: naming conventions, first-paragraph optimization, section headers as routing targets, tagging standards, governance scope (alwaysOn + triggerKeywords), token budget behavior, cross-guideline references, NO_TAGS and DUPLICATE_CONCERN warnings
- 2026-03-13: Initial authoring standards document created
