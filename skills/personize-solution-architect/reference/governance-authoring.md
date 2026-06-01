# Context Doc Authoring Standard

## Guidelines vs Other Context Doc Types

Context Docs have 5 types. The most critical distinction: **guidelines are governance (constraints on behavior), everything else is knowledge (context for better output).**

| Type | Purpose | Agent treats as | When to use |
|---|---|---|---|
| **guideline** | Rules the agent MUST follow | **Constraint** -- checks before acting | Compliance, limits, tone rules, ICP criteria, opt-out policies |
| **playbook** | Steps to follow in order | **Process** -- follows during acting | Onboarding flows, outreach sequences, triage protocols |
| **reference** | Background information | **Context** -- reads when needed | Competitor analysis, API docs, market research |
| **template** | Output scaffold to adapt | **Starting point** -- fills in | Email templates, report formats, meeting agendas |
| **brief** | Account or project context | **Personalization** -- uses for specifics | Company dossiers, deal summaries, project status |

**MUST put enforceable rules in guidelines, not playbooks.** If a rule uses MUST/MUST NOT and violation would be harmful (contacting opted-out people, exceeding send limits, breaking compliance), it belongs in a guideline. Agents retrieve guidelines separately and enforce them strictly. A MUST rule buried in a playbook may not be enforced.

**Wrong:** Playbook with "Step 3: MUST check opt-out list before sending" -- the MUST rule is hidden inside a process doc.
**Right:** Guideline "opt-out-policy" with the MUST rule. Playbook references: "see `opt-out-policy` for send rules."

---

## Guideline Writing Rules

**Key authoring rules (well-authored guidelines are 20-50% more discoverable):**

| Rule | Requirement | Why |
|---|---|---|
| Naming | MUST use kebab-case (`brand-voice`, `sales-playbook`) | Searchable, enables cross-references |
| First paragraph | MUST state WHAT it covers and WHEN to use it | First ~1,000 chars drive embedding score |
| Section headers | MUST use `##` with domain keywords | Headers are routing targets, not `## Section 3.2` |
| Scope | MUST be one concern per guideline | Each routes independently |
| Length | SHOULD be 300-800 words | Under 300 too vague, over 800 split it |
| Constraints | MUST use RFC 2119 keywords with rationale | MUST/SHOULD/MAY with "because" clause |
| Examples | SHOULD include GOOD/BAD/TARGET contrasts | AI calibrates from examples faster than rules |
| Tags | MUST include 2-5 tags (audience + domain) | Tags BOOST relevance scoring |

---

## Naming Convention

**MUST** use kebab-case names: `brand-voice`, `sales-playbook`, `icp-definitions`.

Consistent naming enables reliable cross-references between guidelines. When one guideline references another by name (e.g., "see `brand-voice` for tone rules"), the reference is unambiguous.

**Good names:** `cold-email-tone`, `discount-approval-process`, `hipaa-compliance-rules`
**Bad names:** `Brand Voice Guidelines`, `rules_v2`, `misc-notes`

---

## First Paragraph Optimization

The first paragraph is the single highest-leverage optimization for routing accuracy. The first ~1,000 characters drive 80% of the embedding similarity score.

**MUST** state WHAT the guideline covers and WHEN to use it in the first paragraph.

**Good first paragraph:**
> How to write cold outreach emails for enterprise prospects in the healthcare vertical. Apply when generating any first-touch email to a healthcare company with 500+ employees. Covers tone, compliance requirements (HIPAA references), approved claims, and subject line patterns.

**Bad first paragraph:**
> This document contains guidelines for our team. Please read carefully and follow the rules below.

**SHOULD** front-load the most important terms. Put the domain-specific keywords (the ones agents will search for) in the first two sentences.

---

## Section Headers as Routing Targets

SmartGuidelines delivers individual sections, not whole documents. Each `##` header is independently routable -- the system matches query terms against header text with a 0.3 score threshold and delivers only matched sections. This saves 50-80% tokens.

**MUST** use `##` headers for every topic section.

**MUST** use domain keywords in headers.

**Good headers:**
- `## Cold Email Tone Rules`
- `## Discount Approval Process`
- `## ICP Qualification Criteria`
- `## HIPAA Compliance Checklist`

**Bad headers:**
- `## Section 3.2`
- `## Rules`
- `## Getting Started`
- `## Overview`

**SHOULD** write headers as if answering "what section covers X?" -- because that's exactly how routing works. A query about "cold email tone" matches `## Cold Email Tone Rules` but not `## Communication Guidelines Part A`.

**SHOULD** aim for 3-6 sections per guideline. Too many creates routing ambiguity; too few eliminates section-level delivery benefit.

---

## Constraint Keywords (RFC 2119)

Write constraint keywords inline. The system auto-infers constraint tags at save time.

| Keyword | Auto-Tag | Meaning |
|---|---|---|
| **MUST** / REQUIRED | `<HARD_CONSTRAINT>` | Non-negotiable. Violation = failure. |
| **SHOULD** / RECOMMENDED | `<BEST_PRACTICE>` | Strong default. Override with stated reasoning. |
| **MAY** / OPTIONAL | `<REFERENCE>` | Agent discretion. |

**MUST** include a rationale clause after every constraint -- because "MUST include unsubscribe link -- CAN-SPAM requires it" gives agents context for edge cases, while "MUST include unsubscribe link" alone doesn't.

**SHOULD** balance across all three levels. A guideline with only MUST rules is probably over-constraining. The three-tier gradient lets agents exercise judgment where appropriate.

**Example with all three levels:**

```markdown
## Cold Email Tone

MUST keep emails under 150 words -- because mobile open rates drop 40% above 150 words.
MUST include an unsubscribe mechanism -- CAN-SPAM requires it.
SHOULD lead with a specific observation about the prospect -- because personalized openers get 2x reply rates.
SHOULD use the prospect's first name in the greeting -- because it signals personal attention.
MAY include a P.S. line with a secondary value prop -- some reps find this effective for certain verticals.
MAY reference mutual connections if available -- use judgment on whether it feels natural.
```

---

## Examples and Completion Criteria

**SHOULD** include contrasted examples labeled GOOD / BAD / TARGET.

The AI calibrates from examples faster than from rules. One good GOOD/BAD pair is worth three paragraphs of explanation.

```markdown
## Email Subject Lines

GOOD: "Quick question about Acme's API scaling"
BAD: "Personize - AI-Powered Customer Intelligence Platform"
TARGET: "[Specific observation] + [question or value prop]"

GOOD: "Saw your Series B -- congrats"
BAD: "Re: Re: Following up"
```

**SHOULD** include completion criteria listing what "done right" looks like:

```markdown
## Completion Criteria
- Email references at least 2 specific facts about the prospect
- Tone matches brand voice guidelines
- Under 150 words
- Contains exactly one CTA
- No claims not in the approved messaging list
```

---

## Tags

**MUST** include 2-5 tags with at least one audience tag and one domain tag.

Tags boost relevance scoring in SmartGuidelines retrieval.

**Tag categories:**
- **Audience:** `sales`, `marketing`, `cs`, `product`, `engineering`, `leadership`
- **Domain:** `outbound`, `email`, `slack`, `notification`, `content`, `onboarding`
- **Stage:** `prospecting`, `demo`, `negotiation`, `renewal`, `onboarding`

**Example:**
```
tags: sales, outbound, email, prospecting
```

**Filtering at query time:**
- `excludeTags: ["draft", "deprecated"]` -- hide work-in-progress
- `guidelineNames: ["brand-voice"]` -- force-include by name, bypassing scoring

---

## How SmartGuidelines Scores Your Guideline

Understanding the scoring model helps you write guidelines that route reliably:

- **80% embedding similarity** -- driven by the first ~1,000 characters. Front-load key terms.
- **20% keyword overlap** -- computed from name + description + tags + synthetic queries.
- **Governance boosts:**
  - `alwaysOn: true` adds +0.15 flat (use sparingly, 2-3 max per org)
  - Each matching trigger keyword adds +0.04 (capped at +0.20 total)
  - Trigger keywords are auto-inferred at save time

---

## Token Budget Competition

When the token budget (default: 8,000 in MCP, 10,000 via API) is exceeded, lower-scoring guidelines are demoted to summaries (id + description + section titles only). Demoted guidelines appear in `budgetMetadata.demotedGuidelines`.

**Implications for authoring:**
- Shorter, focused guidelines survive budget cuts
- A 2,000-word guideline competes poorly against three 500-word focused ones
- Section-level delivery means a long guideline might only deliver 1-2 matched sections anyway
- Demoted guidelines can be fetched on demand via `guideline_read(guidelineId, header)`

---

## Quality Warnings

The system checks at save time and flags issues:

| Warning | Meaning | Fix |
|---|---|---|
| `NO_SECTIONS` | No `##` headers | Add headers for every topic |
| `TOO_LONG` | Over 1,200 words | Split into focused guidelines |
| `TOO_SHORT` | Under 50 words | Add substance or merge into another |
| `NO_EXAMPLES` | No examples in 150+ words | Add GOOD/BAD/TARGET examples |
| `WEAK_CONSTRAINTS` | No RFC 2119 keywords | Add MUST/SHOULD/MAY with rationale |

---

## Visual Attachments -- Diagrams That Agents Can Read

When a guideline describes a complex workflow, decision tree, or architecture, SHOULD include a visual diagram as an attachment. The format matters -- agents parse text, not pixels.

**Format selection:**

| Format | When to use | Why |
|---|---|---|
| **Mermaid in markdown** (.md) | Flowcharts, sequences, state diagrams, ERDs | Agents understand Mermaid natively. Most token-efficient. Embeddable inline or as attachment. |
| **Drawio** (.drawio) | Complex workflows with swimlanes, branches, 20+ nodes | Explicit source→target graph in XML. Agents parse node labels and connections. |
| **SVG** (.svg) | Simple diagrams, icons, visual assets | Text-based XML, but loses graph semantics (connections become anonymous paths). |
| **PNG/JPEG** (.png/.jpg) | Screenshots, photos, UI mockups only | Requires vision model. Agents cannot parse structure. Last resort for diagrams. |

**SHOULD prefer Mermaid** for any diagram an agent needs to reason about. Embed directly in guideline markdown or upload as a `.md` attachment:

```markdown
## Enrollment Flow

​```mermaid
flowchart TD
    A[New Entity] --> B{Meets criteria?}
    B -->|Yes| C{Already enrolled?}
    B -->|No| D[Skip]
    C -->|No| E[Enroll]
    C -->|Yes| F[Skip]
​```
```

**SHOULD use Drawio** when the workflow has swimlanes, parallel branches, or complex conditional logic that Mermaid can't express cleanly. Upload the `.drawio` file directly -- agents parse the XML graph structure (node values, source/target edges).

**MUST NOT use PNG/JPEG for workflows or architecture diagrams** -- agents see pixels, not structure. They will miss connections, misread labels, and cannot reason about the flow.

**When to add a diagram attachment:**
- The guideline describes a multi-step process with branches or conditions
- The guideline defines entity relationships (what connects to what)
- The guideline describes a state machine (lifecycle stages and transitions)
- Text alone would require 200+ words to explain what a diagram shows in 10 lines

**Attachment metadata for diagrams:**
- `type: "reference"`
- `description`: "Workflow diagram showing [what it depicts]"
- `usage`: "Visual reference for [guideline name]. Mermaid format -- parse directly."

## Anti-Patterns

| Pattern | Problem | Fix |
|---|---|---|
| "Be professional and helpful" | Too vague, AI already does this | Delete it |
| 2,000-word guideline | Competes poorly for token budget, probably multiple concerns | Split into 3-4 focused guidelines |
| Pasted blog post | Not structured for routing | Summarize to rules + 1-2 examples |
| Duplicated rules across guidelines | Wastes token budget, risks inconsistency | Use cross-references by name |
| No headers | Cannot route at section level | Add `##` for every topic |
| Unlabeled examples | AI doesn't know which is good/bad | Always label GOOD / BAD / TARGET |
| Generic header names | Won't match queries | Use domain keywords in headers |
| All MUST, no SHOULD/MAY | Over-constraining, no room for judgment | Balance across three levels |

---

## Verification

After creating a guideline, always test routing:

```typescript
// Does the guideline route for expected queries?
const result = await client.ai.smartGuidelines({
    message: 'writing a cold email to a healthcare prospect',
    mode: 'fast',
});

// Check: your guideline appears in results
// If not: improve first paragraph (drives embedding score) or add relevant tags
```

**SHOULD** test with 2-3 different query phrasings to ensure reliable routing. A guideline that only matches one exact query is too narrow.
