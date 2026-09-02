# Personize GPE — The Reference Implementation

**Personize GPE** (Generative Personalization Engine) is the flagship application built on the Personize platform. It takes a person, company, account, campaign, or engagement event and produces researched, scored, governed, personalized output: intelligence briefs, landing experiences, email, and seller playbooks. It then verifies delivery, recovers failures, and audits campaign quality.

For an architect this matters for one reason: **the production patterns in [`production-patterns.md`](./production-patterns.md) are not theoretical.** GPE is where most of them were proven under load. When you are arguing for a pattern in a design review, this is the existence proof.

GPE is built on Memory and Governance, not beside them. It did not build a customer-data platform; Memory gave it one, and every surface it generates reads the same account truth. That is the argument for the platform, stated as a working system rather than a claim.

## Honest labelling

The GPE capability overview labels every capability **LIVE**, **IN PROGRESS**, or **ROADMAP** so that claims stay honest. That discipline matters more here than in most reference files, because **an agent reading this will repeat what it finds as fact to a customer.**

Only LIVE capabilities are listed below. If you need the current state of anything else, **ask the Personize team.** Do not infer that a pattern is available as a product feature just because it is named here: several of these are how GPE is built, not switches a customer can turn on.

## The patterns, and what proves them

| Pattern | In GPE | Status |
|---|---|---|
| **Three-layer data trust** | Every structured fact is cross-checked for plausibility before it is trusted. Nothing gets printed that the system cannot stand behind. | LIVE |
| **Layered generation context** | Organization rules + campaign rules + channel rules + artifact rules + trusted account context, composed into one generation context. Campaign rules resolve by stable guideline ID, so messaging ships without a code deploy. | LIVE |
| **Constrained claims** | Capability maps restrict the model to approved offers so it cannot invent product features. Approved-stat whitelists constrain numeric claims. Customer-status rules block unsupported claims about what a prospect already owns. | LIVE |
| **Extensible entity schema** | The reference lead schema carries roughly 47 governed properties (identity, engagement, firmographics, scoring outputs, researched facts) and is collection-backed and per-organization, so extending it is normal customization, not a services exception. | LIVE |
| **Durable intake journal** | Work entering the system is journaled so it cannot be silently lost between stages. | LIVE |
| **Provider circuit breakers** | Multi-source research degrades safely when a provider fails, instead of failing the whole run. | LIVE |
| **Read-after-write verification** | Important writes are awaited and verified through the same API the downstream consumer uses. A successful write does not guarantee the next reader sees the value. | LIVE |
| **Extraction discipline** | Structured data is stored exactly; only rich text gets AI extraction. A secondary AI pass can never overwrite an authoritative score, industry, or identity field from a lower-confidence source. | LIVE |
| **Delivery verification and recovery** | Generated is not delivered. Delivery is verified and failures are recovered automatically, and content failures are distinguished from delivery failures. | LIVE |
| **Population-wide QA** | Campaign quality is audited by querying the full record population deterministically, not by sampling logs. | LIVE |
| **Human gate before scale** | A human review gate sits in front of campaign-wide execution. Supervision is the thing that makes the automation safe to run at volume. | LIVE |
| **Identity reconciliation** | Ambiguous identity (personal email addresses, company name collisions) is normalized and classified rather than guessed. | LIVE |

## How this maps onto `production-patterns.md`

The abstract patterns in that file line up with the above. Use this mapping when a customer asks "has anyone actually run this?":

| production-patterns.md | GPE equivalent |
|---|---|
| A. Coordinated Program | Multi-tenant campaign routing |
| B. Channel Identity Management | Lead classification and company identity reconciliation |
| E. Interaction Ledger | The durable workflow journal |
| F. Vertical Configuration | Campaign guideline sets resolved by stable ID |
| G. Governance Safety | Capability maps, approved-stat whitelists, customer-status rules |
| I. Observability and Health Monitoring | Operational health monitoring, delivery verification, automated recovery |
| J. Learning and Evolution Loop | Human-supervised improvement (LIVE as a practice; productization is in progress) |
| K. Escalation and Human-in-the-Loop | The human review gate |
| L. Typed Task Dispatch | Intake routing |

## What to take into a design

Three transferable lessons, independent of GTM:

1. **Ground every generated claim in something checkable.** The trust layer is what separates this from an AI copy generator. If a design cannot say where a fact came from, it is not ready.
2. **Design for delivery, not generation.** Most of the reliability engineering in GPE sits after the model call: verification, recovery, and distinguishing a content failure from a delivery failure.
3. **Put the human gate before scale, not after.** Supervision early is cheaper than remediation late, and it is what makes a campaign-wide rollout approvable.

## Naming

Use **Personize GPE** in all external and customer-facing language. It was known internally as **PartnerVista**; that name is retired and should not appear in anything a customer sees.

## Where to go next

GPE does not live in a public repository. The authoritative source is the **Personize GPE Capabilities Overview**, an internal document held by the Personize team, which carries the current per-capability status labels and the claim guidance for GTM language.

**Ask the Personize team before making any customer-facing claim about GPE.** This page is deliberately limited to architectural patterns that transfer; it carries no roadmap, no customer names, and no competitive positioning, and it will go stale on anything more specific.
