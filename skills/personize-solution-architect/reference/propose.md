# Propose — Turn Discovery Into a Concrete Proposal

The consultative deliverable. Discovery told you *what they have and what they need*; strategic-fit told you *whether Personize is the right shape*. This doc turns that into a **proposal the architect presents**: a recommended architecture, a memory-model sketch, the integration mode, a phased roadmap, a cost estimate, and a deployment-mode recommendation — with use cases written so the customer hears their own business described back to them.

**Architects propose, humans decide.** You MUST present **2-3 options with trade-offs**, not one anointed answer. The body of the proposal recommends one, but the alternatives are visible and the human picks.

Read first: [`discover.md`](./discover.md) (the inputs this consumes) and [`strategic-fit.md`](./strategic-fit.md) (the go/no-go that gates it). Lead the framing with [`memory-as-business-model.md`](./memory-as-business-model.md). Price it with [`cost-simulator.md`](./cost-simulator.md).

---

## The Specificity Bar — Why This Lands

A proposal that names their tools, their roles, and their terminology reads like a consultant who has done the work. A proposal in generic terms reads like a deck. Specificity is the entire credibility mechanism — it is how the customer trusts that you understood them.

| Generic (sounds like a pitch) | Specific (sounds like you know the business) |
|---|---|
| "Personalize your outreach" | "Your SDRs spend ~15 min/prospect copying HubSpot fields into Outreach to write something that still sounds templated. That context assembly happens automatically." |
| "Improve retention" | "When an Acme user's API-call volume drops 30% WoW, your CS team doesn't know until they check Mixpanel manually. A health signal fires a Slack alert with support + usage + billing in one narrative." |
| "AI notifications" | "Your app sends 'You have 3 new matches.' Personize writes 'Sarah Chen — the healthcare VP you've tracked — just changed roles; it aligns with your Q2 pipeline.'" |

**Rules for every use case in the proposal:** use *their* nouns (members/patients/candidates, not "contacts"); name *their* actual tools (HubSpot, Zendesk, Mixpanel — not "your CRM"); use "likely"/"probably" when inferring a workflow (honest, and still shows insight); and pass the differentiation test below.

### The differentiation test

For every proposed use case ask: **"Could they build this with their CRM + a single LLM call?"** If yes, cut it — it is not a Personize proposal.

- **Fails:** role-based greeting (CRM lookup + if/else), segment feature flags, template onboarding (path A/B/C). These look up a field and branch.
- **Passes:** AI *writes* an onboarding guide synthesizing CRM + support + usage in the org's voice under compliance rules; AI *generates* a per-visitor landing headline governed by messaging rules; AI *composes* an alert that fuses 3 sources into one narrative. These **generate** original output using all three layers.

The three layers are **governance** (`context_save` guidelines — one brand, applied to every AI touchpoint regardless of who/which tool created it), **unified memory** (structured `memory.upsert` + content `saveBatch`, recalled cross-source so the AI sees everything in one window), and **generation** (`instructions[]` multi-step: analyze → apply rules → generate → evaluate). If a use case needs only one or two layers, it is not showcasing Personize.

---

## How to Build the Use Cases (their business, not ours)

### 1. Map their value chain

From the discovery brief, trace value through the business and, at each stage, ask **"what would a human expert do with unlimited time and perfect memory?"** — that is the use case.

```
ACQUISITION → ACTIVATION → RETENTION → EXPANSION → ADVOCACY
  channels?     onboarding?  churn        upsell      referrals/
  data caught?  data needed? signals?     triggers?   reviews?
```

### 2. Mine pain from public signals

Job posts (hiring CSMs → retention pain; Data Engineers → pipeline pain) · G2/Capterra ("onboarding was rough" → onboarding opportunity) · their blog ("scaling CS" → hit the manual-CS limit) · pricing tiers (many tiers → complex segmentation) · help center (deep docs → complex product → proactive-notification opportunity) · leadership social ("customer-centricity" → already a priority).

### 3. Write each use case in their language

```markdown
## [Use case name — their terminology]
**Today:**   [Which role, which tool, which manual step. Use "likely" for inferences.]
**With Personize:** [The automated version, naming their tools/data/roles. All three layers.]
**Why it matters for <Company>:** [A business outcome — revenue, retention, efficiency, risk.]
**Sketch:** [3-5 line code/data-flow using THEIR entity names.]
```

For the most relevant role, build a **"Day in the Life"**: an 8:30/9:00/10:00/2:00 walkthrough of *today* (tabs, manual context assembly, missed signal) vs. *tomorrow* (morning briefing, one-click prep, AI-drafted batch reviewed in 10 min, health signal caught at 2 PM yesterday). It is the most persuasive single artifact in the proposal.

### Credibility checklist (every use case must pass)

- [ ] Their terminology, their tools by name · [ ] A workflow someone there would recognize · [ ] Quantifies the problem (time/opportunity/scale) · [ ] Shows all three layers · [ ] Passes the differentiation test · [ ] Ties to a business outcome · [ ] Acknowledges what they already do well · [ ] Calibrated to their maturity · [ ] Honest about inferences ("likely", "based on what I see").

---

## Calibrate the Proposal to the Situation Profile

Pull the profile from [`discover.md`](./discover.md) — it changes *what* you propose and *how* you present it.

| Archetype | Proposal focus / lead with |
|---|---|
| Communication-heavy | Email/notification generation w/ governance guardrails; before/after examples |
| Analysis-heavy | Research synthesis, health narratives; deep recall, high token budgets |
| Decision-heavy | Scoring/routing with structured JSON; governance scoring criteria, learning loop |
| Execution-heavy | Batch sync/enrichment/webhooks; `saveBatch` + rate math. Show data flow, minimize prose |
| Collaboration-heavy | Workspace patterns, multi-agent coordination; contribution protocols |

| Company profile | Lead use cases (see source patterns) |
|---|---|
| High-volume B2C (10K+) | Segment-of-one messaging, smart notification throttling, lifecycle-aware content, churn signals |
| Mid-market B2B SaaS (100-5K) | Meeting-prep briefs, health-score narratives, per-profile onboarding, cross-team context, QBR auto-gen |
| Enterprise B2B (<500, high ACV) | Account-intelligence workspace, stakeholder mapping, institutional-knowledge capture, governed proposals |
| Platform / marketplace | Match-narrative generation, dual-entity personalization (supply ≠ demand governance), per-side churn |
| No dev team | MCP-on-Claude email writing, n8n/Zapier sync, simple knowledge-capture workflows |

**Department resonance:** Sales → velocity/quality (avoid over-engineering) · Marketing → campaigns/brand consistency (avoid technical depth) · CS → proactive/health/churn (avoid reactive) · Product → research synthesis/adoption · Ops → governance/compliance/cost (avoid flashy demos).

**Autonomy emphasis:** human-driven → developer experience · human-in-loop → review queue · supervised → monitoring dashboard · fully autonomous → governance guardrails + learning loop (show the safety net).

---

## Recommend the Architecture — 2-3 Options With Trade-offs

This is the rule the architect MUST honor. Present a small option set; recommend one; expose what each trades away. A typical spread:

| Option | Shape | Trades away | Fits when |
|---|---|---|---|
| **A. Quick win** | One archetype, MCP or a single SDK pipeline, starter kit, no graph | Breadth, automation depth | Validating value fast; small team; unproven design |
| **B. Recommended** | 2-3 archetypes, SDK pipelines + governance, custom kit, graph for the core relation | More build effort up front | They've confirmed the use cases and want production posture |
| **C. Platform** | Full topology, fleet dispatch, compaction at scale, workspaces, multi-agent | Cost + ops maturity required | High volume, multi-team, autonomous agents |

For each option state: **approach · complexity · cost profile · what it trades away** (mirror the SKILL lifecycle's PLAN step). Then write a one-paragraph **recommendation** naming the option and *why it fits this customer* — pinned to their volume, maturity, and the strategic-fit verdict from [`strategic-fit.md`](./strategic-fit.md).

---

## The Memory-Model Sketch

A concrete first cut of the business modeled as memory (not a final schema — that's `schema-design-guide.md`). Frame it with the inversion from [`memory-as-business-model.md`](./memory-as-business-model.md): you are modeling their world so a stochastic reader can use it, drawing the **crystallize-vs-prose boundary** per knowledge unit.

```markdown
### Entities (their nouns)
- <Member>  — key: <member_id|email>   — ~N records
- <Account> — key: <domain>            — ~N records
  [name the entity types in their language; "Candidate" not "Contact"]

### Properties (the highest-leverage authoring — description IS the extraction prompt)
<Member>: status (select), <plan_tier> (select), <renewal_date> (date), <health> (rating)
  → crystallize: high-frequency, filter-on, governance-critical, aggregatable
  → leave as prose/memory: the "why", nuance, narrative  (~7 well-chosen memories/entity)

### Collections vs guidelines (the most common mistake)
- Collection = a thing with identity (member, account, deal)
- Guideline  = how to behave (ICP, tone, compliance) → context_save, MUST/SHOULD/MAY

### Governance (5-15 guidelines, one concern each)
- brand-voice · <vertical>-compliance · scoring-criteria · notification-policy

### Graph (only if a relation is traversed — edges inferred at memorize time)
- <Member> works_at <Account>   (auto-seeded from a company/domain property)
- <Account> has_open <Ticket>
```

State explicitly what becomes a **collection** vs. a **context doc** vs. a **workspace property**, and whether the design needs **graph** at all (most relations are inferred automatically from foreign-key-shaped properties — manual edges are rare; see `graph-relations.md`). If they coordinate across agents/humans on a record, add a **workspace** (`Status` + append-only `Notes`/`Tasks`).

---

## The Integration Mode

One recommendation, with the runner-up noted. Map to how they'll actually use it:

| Mode | Recommend when | Present as |
|---|---|---|
| **MCP** (Claude/ChatGPT/agent) | No/light dev team; agent-driven work | "You say 'write a follow-up for Sarah' → it recalls, fetches guidelines, drafts." |
| **SDK** (`@personize/sdk`) | Production pipelines, code owners | TypeScript with `client.*`, error handling, rate budget |
| **No-code** (n8n/Zapier) | Ops/marketing, visual builders | Trigger → AI node (recall + generate) → send node → memorize outcome |
| **REST API** | Any other language / webhooks | Endpoint sequence with structured outputs |

Default: MCP for agents, SDK for production pipelines. Provisioning in every mode is the same first move — `kits_install` (below).

---

## The Phased Roadmap — Quick Win → Expand

Sequence so value lands before complexity. Map to the SKILL lifecycle (UNDERSTAND → PLAN → BUILD → TEST → OPERATE → EVOLVE).

```markdown
### Phase 0 — Provision (day 1)
kits_install <starter or custom kit>  → entity types + collections + guidelines + relations in one install.
  (createOrganization seeds nothing; kits ARE provisioning. Author/fork a kit to encode THEIR model.)

### Phase 1 — Quick win (week 1) — ONE use case, end to end
- Seed core guidelines (context_save: brand-voice + one vertical rule)
- Load a sample: memory.upsert for structured fields; saveBatch for content → extraction
- Wire ONE generation flow (instructions[]); review queue, human-in-loop
- Verify: recall returns expected; extraction populated; one real output approved

### Phase 2 — Expand (weeks 2-4)
- Add the 2nd/3rd use case from the recommended option
- Bulk-import the real corpus (sequence: companies → contacts → deals → interactions)
- Add graph for the core relation; add a workspace if coordination is needed
- Move proven flows from script → durable pipeline (Trigger.dev / n8n)

### Phase 3 — Scale & evolve (month 2+)
- Compaction for cost (serve a small ranked payload, not raw corpus)
- Fleet dispatch (one subagent per record) for volume — shared memory = no re-derivation
- Observability + learning loop: analyze outcomes, smartUpdate governance from evidence
```

Anchor "quick win" to the customer's own first use case (named, in their language) — not a generic demo.

---

## The Cost Estimate

Run the numbers in [`cost-simulator.md`](./cost-simulator.md) (records × recalls/record/yr × context profile × LLM tier) and present three lines: **raw-LLM monthly · Personize monthly · savings %**. The story is the compaction story from [`memory-as-business-model.md`](./memory-as-business-model.md) — Personize compacts the corpus once at write time and serves ~2K tokens/call instead of dumping ~50K, so the bill scales with task complexity, not corpus size.

State the LLM tier you assumed and why (economy = simple lookups; professional = multi-step reasoning; frontier = regulated/quality-critical), and call out the credit budget for the **initial import** separately (one-time, amortized — see the `audit-and-plan.md` rule of thumb). Keep it honest: cheaper tiers + small context show smaller savings %; say so.

---

## The Deployment-Mode Recommendation

| Mode | Recommend when |
|---|---|
| **Multi-tenant SaaS** (default) | Standard data-residency posture; fastest to value; no infra to run |
| **BYOC** (customer's AWS) | Data sovereignty, regulated vertical, NDA-aware comms, enterprise security review |
| **BYOK** (own LLM key) | High volume with negotiated provider pricing; provider/model control |

Pin the recommendation to the compliance dimension from discovery: PII handling, audit trails, retention/deletion rights → if those are hard requirements, lead with BYOC. Otherwise default to multi-tenant and note BYOC/BYOK as the scale/compliance upgrade path. (BYOK changes only the cost math — platform fee stays, LLM cost moves to their key.)

---

## Output Template

Present the proposal in this order. Keep it scannable; the customer should find their own business in it.

```markdown
# Personize Proposal — <Company>

## What we heard            (2-3 lines from discover.md — their world, their words)
## Why Personize fits       (1 paragraph from strategic-fit.md — the differentiation, honestly)

## Use cases (in your language)
  ### <Use case 1 — their term>   Today / With Personize / Why it matters / Sketch
  ### <Use case 2 …>
  ### A Day in the Life: <Role>    (today vs. tomorrow)

## Recommended architecture
  Option A (quick win) · Option B (recommended) · Option C (platform)
  → Recommendation: <B>, because <pinned to their volume + maturity + fit verdict>

## Memory model            entities · properties (crystallize vs prose) · collections vs guidelines · graph?
## Integration mode        <MCP | SDK | no-code | API> + why
## Roadmap                 Phase 0 provision (kits_install) → 1 quick win → 2 expand → 3 scale
## Cost                    raw $/mo vs Personize $/mo vs savings % (tier assumed); import budget
## Deployment              <multi-tenant | BYOC | BYOK> + why (pinned to compliance)

## What we need from you    (decisions, access, sample data) — humans decide
```

---

## See also

- [`discover.md`](./discover.md) — the situation profile + prospect brief this proposal consumes
- [`strategic-fit.md`](./strategic-fit.md) — the go/no-go and the "vs. point tools" framing to open with
- [`cost-simulator.md`](./cost-simulator.md) — the numbers behind the cost section
- [`memory-as-business-model.md`](./memory-as-business-model.md) — the framing to lead with; the crystallize-vs-prose boundary
