# Deployment Mode — Multi-Tenant SaaS vs. Private / BYOC

Personize runs in two shapes: the shared **multi-tenant SaaS** (the hosted platform at `agent.personize.ai`) and **private / BYOC** (bring-your-own-cloud — the platform deployed into the customer's own AWS account). This file is the decision tree: which shape fits, the signals that push toward BYOC, and what the BYOC architecture looks like. **Architects propose; humans decide** — present this as a recommendation with trade-offs, not a verdict.

The default is multi-tenant SaaS. BYOC is the answer when a hard constraint — data, compliance, scale, or control — makes the shared platform a non-starter. Most integrations should start on SaaS and graduate to BYOC only when a signal below actually fires.

## Decision tree

```
Start: does a hard constraint force isolation?
│
├─ Data residency required (data must stay in a region/account/jurisdiction)? ──── yes → BYOC
├─ Compliance regime that mandates a single-tenant boundary (HIPAA/BAA, SOC2
│   scope, FedRAMP-adjacent, contractual data-isolation)? ───────────────────────── yes → BYOC
├─ Sensitive data that cannot leave the customer's perimeter (PHI, regulated
│   PII, classified, customer's-customer data under DPA)? ──────────────────────── yes → BYOC
├─ Scale beyond shared-tenant comfort (sustained very high volume, dedicated
│   throughput / noisy-neighbor isolation needed)? ────────────────────────────── lean BYOC
├─ Deployment control required (own VPC, own keys/KMS, own upgrade cadence,
│   network peering to internal systems)? ─────────────────────────────────────── lean BYOC
│
└─ none of the above → Multi-tenant SaaS (default: fastest to value, no infra to run)
```

If a hard signal fires, go BYOC. If only the "lean" signals fire (scale, control) without a hard data/compliance constraint, SHOULD weigh BYOC's operational cost against the benefit — sometimes a larger SaaS plan plus BYOK (provider isolation for the LLM hop) covers the need without standing up infrastructure.

## Signals that push to BYOC

| Signal | Why it forces BYOC |
|---|---|
| **Data residency** | Data (vectors, properties, content) must physically live in a specific region or the customer's own account. SaaS stores it in the platform account. |
| **Security / compliance** | A regime or contract mandates a single-tenant boundary, customer-controlled keys, or an auditable isolated environment (HIPAA + BAA, SOC2 scope, data-isolation clauses). |
| **Scale** | Sustained very-high volume where dedicated throughput and noisy-neighbor isolation matter more than shared-platform convenience. |
| **Deployment control** | Customer needs their own VPC, KMS keys, network peering to internal systems, and control over the upgrade/patch cadence. |
| **Sensitive data** | PHI, regulated PII, or customer's-customer data under a DPA that cannot transit or rest in a multi-tenant store. |

A useful framing for stakeholders: SaaS optimizes for **time-to-value and zero ops**; BYOC optimizes for **control and boundary**. The question is never "which is better" — it's "does a hard constraint make the boundary non-negotiable?"

## BYOC architecture (in brief)

BYOC deploys the same platform into the customer's AWS account, but the storage substrate differs from multi-tenant prod:

- **Vectors: S3 Vectors** — semantic recall ("what is relevant?") backed by the customer's own S3 Vectors index, in their account/region. (Multi-tenant prod is mid-migration to S3 Vectors; BYOC standardizes on it.)
- **Structured: PostgreSQL** — typed properties, filtering, ordering, aggregation, and graph relations live in the customer's PostgreSQL (the symbolic + graph layers of the three-layer substrate). This is also what makes `filterByProperty` fast.
- **Compute** — the agent execution platform runs in the customer's account; data never leaves their perimeter.
- **Keys** — customer-controlled. Pairs naturally with BYOK (see below): both the LLM hop *and* the data substrate stay under the customer's control.

The application surface is identical — same memory / governance / recall / generate API, same SDK, MCP, and CLI. Code paths switch substrate via module flags; the integration you design on SaaS ports to BYOC without rewriting your schema, guidelines, or pipelines.

## BYOK and BYOC are orthogonal — and complementary
**BYOK** (bring-your-own-*key*) isolates the **LLM hop**: your provider key powers extraction/recall/generation and Personize charges only the platform fee. **BYOC** (bring-your-own-*cloud*) isolates the **data + compute**. They stack: a regulated customer often wants both — sensitive data never leaves their account (BYOC) *and* model calls go to their own provider/region under their key (BYOK). SHOULD pair them when the driver is compliance or residency. See [`cheat-byok-provider.md`](./cheat-byok-provider.md) for per-function model routing.

## Comparison table

| Dimension | Multi-tenant SaaS | Private / BYOC |
|---|---|---|
| **Where data lives** | Personize platform account | Customer's own AWS account/region |
| **Vector store** | Platform-managed (migrating to S3 Vectors) | S3 Vectors (in customer account) |
| **Structured store** | Platform-managed | PostgreSQL (in customer account) |
| **Keys / KMS** | Platform-managed | Customer-controlled |
| **Compliance boundary** | Shared multi-tenant | Single-tenant, isolated |
| **Time to value** | Immediate — no infra | Slower — provision infra first |
| **Ops burden** | None (Personize runs it) | Customer/partner runs the stack |
| **Upgrade cadence** | Continuous, platform-driven | Customer-controlled releases |
| **Best for** | Most teams; pilots; standard GTM/ops | Residency, compliance, very high scale, perimeter control |
| **Pairs with BYOK** | Yes (isolates LLM hop only) | Yes (isolate data *and* LLM hop) |

## Setup
For provisioning order and the infra checklist once a mode is chosen (entity types → collections → governance → scripts → MCPs → destinations → workspace), see [`cheat-infrastructure-setup.md`](./cheat-infrastructure-setup.md). Whichever mode you pick, the modeling layer is provisioned the same way — install a **kit** (`personize-starter`, `engineering-memory`, or a fork); new orgs are empty until a kit runs. The kit you author on SaaS installs identically on BYOC.

→ Provider routing and BYOK details: [`cheat-byok-provider.md`](./cheat-byok-provider.md). Cost modeling (and the BYOK delta): [`cost-simulator.md`](./cost-simulator.md).
