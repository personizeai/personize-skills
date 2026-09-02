# Deployment Mode — SaaS vs. Personize Private vs. BYOC

Personize runs in **three** shapes, not two. Picking between them is one of the three decisions a proposal must answer.

| | **Multi-tenant SaaS** | **Personize Private** | **BYOC** |
|---|---|---|---|
| What it is | The hosted platform at `agent.personize.ai` | A single Docker image you run yourself | The Personize platform deployed into the customer's AWS account |
| Runs on | Personize infrastructure | Anywhere Docker or Kubernetes runs | AWS only |
| Data substrate | Platform-managed | **One Postgres + pgvector. No AWS.** | S3 Vectors + PostgreSQL, in the customer's account |
| Surface | Full product API | A deliberately smaller memory-layer surface + bundled MCP | Same as SaaS |
| Ops burden | None | Customer runs one container and one database | Customer or partner runs the full stack |
| Time to value | Immediate | Hours | Slower, provision infra first |

**Architects propose; humans decide.** Present this as a recommendation with trade-offs, not a verdict. The default is multi-tenant SaaS.

## Decision tree

```
Start: does a hard constraint force isolation?
│
├─ No constraint fires ────────────────────────────────────── Multi-tenant SaaS
│    (fastest to value, no infra to run)
│
├─ Data must not leave the customer's perimeter, OR they want
│  to run offline / on-prem / on a non-AWS cloud, OR they want
│  to own the database and the model endpoint ─────────────── Personize Private
│
└─ They specifically want the FULL Personize platform, on AWS,
   in their own account (dedicated throughput, own VPC/KMS,
   own upgrade cadence, full product surface) ─────────────── BYOC
```

The distinction people get wrong: **Private is not "BYOC on a smaller cloud."** Private is a different product with a different substrate and a smaller surface. If the driver is *"our data cannot leave our walls"* the answer is almost always Private, because it is cheaper, faster, and has no cloud dependency at all. BYOC is the answer only when the customer wants the whole hosted platform, and wants it inside their own AWS account.

## Signals

| Signal | Points to |
|---|---|
| Data residency, a specific region or jurisdiction | Private, or BYOC if they are AWS-committed |
| Compliance regime mandating a single-tenant boundary (HIPAA + BAA, SOC2 scope, contractual data isolation) | Private, or BYOC |
| PHI, regulated PII, or customer's-customer data under a DPA | Private |
| Air-gapped or offline environment, no outbound network | **Private only.** Pair with Ollama or vLLM. |
| Not on AWS (Azure, GCP, DigitalOcean, on-prem, bare metal) | **Private only** |
| They already own a Postgres and want to keep their data in it | Private |
| Sustained very high volume, dedicated throughput, noisy-neighbour isolation | BYOC |
| They want their own VPC, KMS keys, network peering, upgrade cadence | BYOC |

If only the "lean" signals fire (scale, control) with no hard data or compliance constraint, weigh the operational cost against the benefit. Sometimes a larger SaaS plan plus BYOK covers the need with no infrastructure at all.

## Personize Private in brief

One OCI container plus one Postgres. Everything (memories, governance docs, schema, job queue, relation graph, quota counters) lives in that single database, so there is no separate vector-store bill and no proprietary storage layer.

- **Deploy target:** anywhere Docker or Kubernetes runs. AWS ECS/EKS, Azure Container Apps/AKS, Google Cloud Run/GKE, DigitalOcean, Fly.io, Railway, Render, a bare VM, or fully offline.
- **Database:** any Postgres with `pgvector`. Neon and Supabase both work on their free tiers; RDS/Aurora, Azure Flexible Server, Cloud SQL, and DigitalOcean managed Postgres all work with the `vector` extension enabled.
- **Licensing:** the box refuses business routes with `403` until it is licensed. Connected mode uses a Personize API key (a **free plan is enough**); air-gapped customers install a signed license bundle instead.
- **Not identical to SaaS.** It serves a focused memory-layer surface, not the full product API. Check the specifics before promising an endpoint.

→ Vocabulary, what is and is not in the box, and where to read further: [`personize-private.md`](./personize-private.md).

## BYOC in brief

The same platform deployed into the customer's AWS account. Vectors go to their own S3 Vectors index; typed properties, filtering, and graph relations go to their own PostgreSQL. Compute runs in their account, so data never leaves their perimeter. Keys are customer-controlled.

The application surface matches SaaS, so an integration designed on SaaS ports to BYOC without rewriting schema, guidelines, or pipelines.

## BYOK is orthogonal to all three

**BYOK** (bring-your-own-*key*) isolates the **LLM hop**: the customer's provider key powers extraction, recall, and generation, and Personize charges only the platform fee. It stacks with any deployment mode. A regulated customer often wants BYOK *and* one of Private or BYOC, so that model calls go to their own provider and region under their own key while the data substrate is also theirs. Pair them whenever the driver is compliance or residency.

→ Per-function model routing: [`cheat-byok-provider.md`](./cheat-byok-provider.md).

## Setup

Whichever mode is chosen, the modeling layer is provisioned the same way: install a **kit** (`personize-starter`, `engineering-memory`, or a fork). New orgs are empty until a kit runs, and a kit authored on SaaS installs identically on Private and BYOC.

For provisioning order and the infra checklist once a mode is chosen (entity types → collections → governance → scripts → MCPs → destinations → workspace), see [`cheat-infrastructure-setup.md`](./cheat-infrastructure-setup.md).

→ Cost modeling and the BYOK delta: [`cost-simulator.md`](./cost-simulator.md).
