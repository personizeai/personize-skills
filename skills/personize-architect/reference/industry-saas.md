# Industry Guide: SaaS / B2B Software

SaaS companies accumulate rich behavioral data across product usage, support, billing, and sales -- but rarely connect it into a unified picture. The result is generic onboarding, CS teams flying blind into renewals, and marketing that ignores what customers actually do. Personize unifies all of this into a single memory layer every team and agent can read from, enabling personalization at scale from trial conversion through expansion and renewal.

---

## Recommended Entity Types

- **Contact** -- Individual user or stakeholder at a customer account
- **Company** -- The customer organization; account-level decisions and health
- **Deal** -- Active sales opportunity with stage, blockers, and close signals
- **Product-User** -- Usage intelligence: features adopted, activity patterns, engagement depth

---

## Starter Schema

### Contact
| Property | Type | Description |
|---|---|---|
| `role` | text | Job title or function (e.g., "VP Engineering", "Power User") |
| `department` | select | Engineering, Sales, Marketing, Operations, Executive |
| `technical-level` | select | technical, business, executive |
| `onboarding-status` | select | not-started, in-progress, complete, stalled |
| `feature-adoption-score` | number | 0-100 adoption health score |
| `last-active` | date | Last product activity date |
| `decision-maker-flag` | boolean | Is this person a budget/decision authority? |
| `champion-score` | number | 0-100 internal champion strength |

### Company
| Property | Type | Description |
|---|---|---|
| `plan-tier` | select | trial, starter, growth, enterprise |
| `arr` | select | Revenue band (e.g., "<10K", "10K-50K", ">50K") -- never exact amounts |
| `health-score` | number | 0-100 overall account health |
| `contract-end-date` | date | Renewal date |
| `expansion-signals` | text | Summary of detected expansion opportunities |
| `tech-stack` | array | Key tools and platforms in use |

### Product-User
| Property | Type | Description |
|---|---|---|
| `features-used` | array | Feature keys the user has adopted |
| `usage-frequency` | select | daily, weekly, monthly, inactive |
| `power-user-flag` | boolean | True if user is in top engagement tier |
| `integration-count` | number | Number of connected integrations |
| `last-feature-discovered` | text | Most recently adopted feature |

---

## Common Use Cases

1. **Trial-to-paid conversion** -- Personalized emails referencing actual features the user tried, not generic upgrade prompts
2. **Renewal and expansion** -- CS teams get full account context; agents detect usage approaching plan limits and generate upgrade proposals
3. **QBR auto-generation** -- Pull a full quarter of account activity into a structured executive summary with real metrics
4. **Churn risk alerts** -- Daily signals on engagement decline, support ticket spikes, or usage regression; route to CSM with action plan
5. **Product-led growth nurture** -- Usage milestone triggers personalized "what to try next" sequences matched to role and adoption stage

---

## Integration Patterns

**CRM (HubSpot, Salesforce):** Batch-memorize contacts and companies. Use `extractMemories: false` for structured fields, `true` for notes and descriptions.

**Product analytics (Mixpanel, Amplitude, PostHog):** Memorize per-event batches with extraction enabled. Patterns surface: power user identification, feature gaps, drop-off signals.

**Support (Zendesk, Intercom):** Memorize per ticket with extraction. Captures pain points, feature requests, sentiment.

**Call transcripts (Gong, Chorus):** Memorize per call with extraction. Surfaces buyer signals, objections, decision criteria, stakeholder mapping.

**Billing (Stripe):** Memorize plan changes, payment failures, and expansion events. Extraction off -- events are already structured.

**Cross-entity context:** Always pull both Contact and Company context when working on a contact. The company layer reveals account health, renewal risk, and expansion signals that the individual user record won't show.

---

## Key Governance Variables

| Variable | Purpose |
|---|---|
| `brand-voice` | Tone for all outbound -- technical vs business audience, email style |
| `icp-definition` | Ideal customer profile for scoring and prioritization |
| `competitor-policy` | How to handle competitor mentions -- never disparage, redirect to differentiators |
| `pricing-rules` | Discount authority, positioning rules, when to escalate |
| `email-playbook` | Sequence limits, timing rules, weekend suppression, unsubscribe requirements |
| `data-handling` | What customer data can be referenced in outreach (usage: yes; revenue: no) |

---

## PLG vs Sales-Led Patterns

**Product-led growth (PLG):** Memory anchors on product usage. Triggers are usage milestones (first feature adopted, integration connected, team invite sent). Agents generate contextual nudges -- what to try next, why it matters for their role. Conversion is earned through demonstrated value, not sales pressure.

**Sales-led:** Memory anchors on account and deal data. Triggers are stage changes, contract dates, and engagement signals. Agents generate personalized outreach for reps -- meeting prep briefs, stakeholder maps, renewal packages. Sales team gets context; agents handle the drafting.

**Hybrid (most common):** PLG handles the self-serve segment through automated usage-triggered flows. Sales-led kicks in above a usage or company-size threshold. Agents route based on ICP fit score and usage signals.

---

## Department-by-Department Use Cases

### Sales
- **Trial-to-paid conversion:** Day 7/11/13 emails referencing specific features the user actually tried
- **Multi-threading:** Identify all contacts at an account; generate role-specific messages per stakeholder
- **Competitive displacement:** Pull competitor mentions from call transcripts; generate battle-card outreach
- **Meeting prep briefs:** Combine contact + company + deal context into a one-page prep brief before every call
- **Win-back sequences:** 90 days post-churn, reference the specific churn reason and what's changed since

### Customer Success
- **Health score alerts:** When score drops below threshold, agent generates action plan and Slack alert to CSM
- **QBR auto-generation:** Full quarter of account activity becomes a structured executive summary with real metrics
- **Proactive feature adoption:** Monthly scan for unused-but-relevant features; personalized "did you know" campaigns
- **Onboarding progress:** Step-by-step nudges personalized to the user's role and adoption stage
- **CSM handoff briefs:** When ownership changes, full relationship history becomes a new-CSM onboarding document

### Marketing
- **Product launch announcements:** Find who requested or would benefit from each feature; send "you asked, we built it" emails
- **ABM campaigns:** All stakeholders at target accounts get role-specific messages from one coordinated campaign
- **Re-engagement:** 30-day inactive users get win-back messages referencing their peak usage, not generic prompts
- **Referral requests:** NPS > 8 + recent success milestone triggers personalized referral ask timed to positive moment

### Product / Engineering
- **Feature request intelligence:** Aggregate requests across tickets and calls into a prioritized report with customer impact data
- **API deprecation communication:** Find who uses a deprecated endpoint; generate migration emails showing their usage patterns
- **Beta invite targeting:** Match beta candidates to usage patterns and engagement level; personalized invite per user

---

## Churn Prediction Signal Framework

Personize memory accumulates the signals that predict churn before it shows up in health scores. Configure agents to scan for combinations of:

- Usage frequency dropping 30%+ week-over-week for 2+ consecutive weeks
- Support ticket volume increasing alongside satisfaction score decline
- No executive sponsor activity in 60+ days
- Key champion leaving the company (LinkedIn monitoring or direct signal)
- Contract renewal within 90 days with no expansion conversation started
- Feature adoption stalled at onboarding-level features (never advanced to power features)

When 3+ signals appear together, that account is at meaningful churn risk. Agents generate a proactive intervention brief for the CSM with the specific signals, the account history context, and recommended talking points for a re-engagement call.

---

## Memory Architecture for SaaS

The Contact-Company split is critical. Contacts hold individual intelligence (usage, sentiment, role, champion status). Companies hold account-level intelligence (health, ARR, renewal, expansion). Always read both when working on any outreach or CS task.

Deals are optional but valuable: if the sales motion is complex (multiple stakeholders, long cycles), a Deal entity captures the pipeline state independently from Contact or Company. This enables deal-level context (blockers, decision criteria, competing evaluations) to accumulate without polluting the account record.

Tag all generated content for the feedback loop. When an email is sent, memorize what was sent, when, and to whom. This prevents duplicate outreach across agents, provides the audit trail for compliance, and enables A/B analysis of what content drives responses.
