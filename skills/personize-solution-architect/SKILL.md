---
name: personize-solution-architect
description: "Design, build, evaluate, and evolve Personize integrations and the multi-step instructions[] prompts they run. Use when planning a Personize solution; designing collections, entities, properties, or governance guidelines; choosing an integration mode (SDK/MCP/CLI/API/no-code); installing or authoring a setup kit; modeling memory as a business domain; weighing compaction vs RAG or raw-query cost; designing graph relations or workspaces; evaluating extraction or recall quality; or debugging multi-step prompt chains that fail, loop, or write bad data."
license: Apache-2.0
compatibility: "Requires @personize/sdk or Personize MCP server and a Personize API key (sk_live_...)"
metadata: {"author": "personize-ai", "version": "2.0", "homepage": "https://personize.ai"}
---

# personize-solution-architect

How to design, build, evaluate, and evolve Personize integrations -- from situation assessment and entity/property modeling through governance, kits, scaling, schema evolution, and the multi-step `instructions[]` prompts those integrations run. **Architects propose options with trade-offs; humans decide.**

**Tags:** `personize:skill`, `personize:skill:architect`, `personize:skill:planning`, `personize:skill:architecture`, `personize:skill:schema`, `personize:skill:evaluation`, `personize:skill:quality`, `personize:skill:prompt-patterns`

---

## Memory as a Model of Your Business -- Lead With This

The mental model under every Personize design, and the first thing to convey to a technical stakeholder: **agent memory is to AI agents what the relational model was to software -- the discipline of modeling a domain so the machine can use it.** But the consumer changed. The reader is no longer a deterministic query planner; it is a stochastic reasoner with a small, costly context window and native fluency in unstructured data. So the objective flips from "normalize for storage" to "deliver the most task-relevant signal per token."

**Three layers, one substrate** -- a good design uses all three:
- **Sub-symbolic (vector):** "what is relevant?" -- semantic recall; cannot do exact match, negation, or aggregation.
- **Symbolic (properties):** "which actually qualify?" -- typed filters, ordering, aggregation, governance.
- **Graph (relations):** "what is connected?" -- traversal across entities.

**One write, multiple representations.** A single memorize call embeds the raw text for semantic recall AND projects it into the schema in the same pass, where each property's `description` IS the extraction prompt. Designing the descriptions = designing what the org's AI notices and remembers.

**The core design decision is the boundary:** what to crystallize into a typed property (high-frequency, filter-on, governance-critical, aggregatable) vs. leave as prose/memory (nuance, narrative, the "why"). Quality saturates around ~7 well-chosen memories per entity -- the constraint is curation, not capacity.

**This is also the opportunity lens.** When a design pumps raw records or N API calls into every prompt, or RAG-chunks a whole corpus into context, it pays linearly in tokens and hands the agent unfiltered signal. Personize compacts once at write time and serves a small ranked payload per call. Signals to model it in Personize: raw-data-in-prompt, re-derivation across runs/agents, or RAG that cannot filter/aggregate. Because memory is a shared substrate, the same model lets you fan out many subagents (one per record) without each re-deriving what the last knew.

→ Full treatment, with the relational→agent mapping and the engineering-memory worked example: [`memory-as-business-model.md`](./reference/memory-as-business-model.md). Source framing: [relational-schemas-to-agent-memory](https://hamedtaheri.com/articles/relational-schemas-to-agent-memory/).

## Discovery & Opportunity Engineering -- The Front Half

Before you can design, you must discover. This is the consultative engagement an agent runs *instead of* weeks of manual SE work: go into the customer's world, find where Personize fits, and propose it. MUST run it in order:

1. **Research** the prospect (site, LinkedIn, job posts, integrations page) → a Prospect Intelligence Brief, so you validate instead of interrogate.
2. **Validate** with discovery questions, 2-3 at a time: product, channels, data landscape, personalization gap, **retrieval economics**, stack.
3. **Read the codebase** (when shared) → an 8-step repo recon (data models, CRM/event/outbound integration points, decision branches, identity, batch/cron), each mapped to a Personize capability in an **Opportunity Inventory** table.
4. **Map** each data source to its destination: `memory.upsert` (structured) / `saveBatch` (content) / `context_save` (guideline) / workspace / graph.
5. **Assess** the 6 dimensions (below), then **propose 2-3 options with trade-offs**.

→ Full framework incl. the repo-reading methodology + Opportunity Inventory: [`discover.md`](./reference/discover.md). Is Personize even the right fit (two-lens, build-vs-buy, point-tool breakpoints, BYOC signal)? [`strategic-fit.md`](./reference/strategic-fit.md). Turn discovery into a consultative proposal (architecture options, memory-model sketch, roadmap): [`propose.md`](./reference/propose.md).

Three decisions the proposal MUST answer: **cost** ([`cost-optimization.md`](./reference/cost-optimization.md) -- tier / recall / compaction / batch / BYOK levers), **deployment** ([`deployment-mode.md`](./reference/deployment-mode.md) -- SaaS vs private/BYOC), and **enablement** ([`enablement.md`](./reference/enablement.md) -- rolling it out to all employees + their AI agents).

## Situation Assessment -- The 6 Dimensions

Before designing anything, assess six dimensions. **Entity complexity:** how many types, nested relationships? **Data volume:** hundreds (script), thousands (batch), millions (streaming). **Integration depth:** standalone, CRM-connected, or multi-system. **Autonomy level:** human-in-loop, supervised, or fully autonomous (the human→human-agent→agent-agent progression). **Compliance:** PII handling, audit trails, retention, deletion rights. **Retrieval economics:** is the current design feeding raw records, N API calls, or RAG-chunked corpus into every prompt? That is the compaction opportunity -- Personize serves a small ranked payload per call instead (see *Memory as a Model of Your Business* above).

After assessment, MUST propose 2-3 options with trade-offs before building -- because architects propose, humans decide. Each option: approach, complexity, cost profile, what it trades away.

**For onboarding an existing corpus** (user has data and asks "how do I get it in?"): load [`audit-and-plan.md`](./reference/audit-and-plan.md) — the four-phase playbook (audit → decide destination per data type → sequence the import → verify) covers the concrete questions you must answer before any code: how many records, how many entity types, how much unstructured content, and what becomes a collection vs. context doc vs. workspace property. Includes the batch-sizing decision table (per-record / batch / async-batch by volume) and credit-budget rule of thumb.

**For a vertical starting point** (domain entities, properties, governance, relations): load the matching industry playbook — [`industry-saas.md`](./reference/industry-saas.md), [`industry-healthcare.md`](./reference/industry-healthcare.md), [`industry-recruiting.md`](./reference/industry-recruiting.md), [`industry-ecommerce.md`](./reference/industry-ecommerce.md), or [`industries-other.md`](./reference/industries-other.md). Adapt a domain-specific schema + rules rather than designing from scratch.

**For cost estimation** before committing to a tier or batch strategy: load [`cost-simulator.md`](./reference/cost-simulator.md) — text-based simulator with the same model as the website's savings calculator. Inputs: records, pages per record, monthly recall volume, LLM tier. Outputs: raw-LLM cost vs. Personize cost vs. savings %.

**For graph relations** (when to use edges vs. nested properties, how the inference engine seeds edges from properties, what relation types are built-in, how to query the graph via `POST /api/v1.1/memory/retrieve` with `sources.graph` — or `retrieve_unified(mode='scout', sources={graph:true})` on agent2_0): load [`graph-relations.md`](./reference/graph-relations.md). Key insight: edges are inferred automatically during memorize from foreign-key-shaped properties (`company`, `linkedin_url`, `attendees`, `assigned_to_email`); manual seeding is rarely needed.

## Collections vs Guidelines -- The Most Common Mistake

MUST understand this distinction before creating anything:

- **Collections** = data containers for entities with identity keys. Contacts, companies, deals, tickets, products. Created via `collection_create`. Each record is an instance of the entity (one contact, one company). Properties are structured fields extracted from content.
- **Guidelines** = behavioral rules, policies, and governance for how agents act. ICP criteria, email writing standards, sales playbooks, compliance policies, brand voice. Created via `context_save({ type: 'guideline' })` (MCP/SDK; the underlying tool is also exposed as `context_manage_create`). Written in MUST/SHOULD/MAY format. Routed by SmartContext to agents when relevant.

**The test:** Does it describe a *thing with an identity* (person, company, deal)? → Collection. Does it describe *how to behave* (rules, criteria, standards, policies)? → Guideline.

MUST NOT create governance rules as collections -- because collections are for data, guidelines are for rules. Creating "ICP Criteria" as a collection instead of a guideline means no agent will ever receive those rules via `ai_smart_guidelines`. The rules become invisible.

| Example | Correct Type | Why |
|---------|-------------|-----|
| Contact with email, title, company | Collection | Entity with identity key |
| "Qualify leads by industry + ARR" | Guideline | Behavioral rule |
| Campaign with status, reply rate | Collection | Entity with trackable state |
| "Use consultative tone in emails" | Guideline | Writing standard |
| "Daily send limit = 50" | Guideline | Policy constraint |
| Company with domain, headcount | Collection | Entity with identity key |

## Entity Modeling -- What Deserves a Record

Core decision: collection record (structured, searchable), property on existing record (attribute), workspace property (coordination state), guideline (behavioral rule), or freeform memory (unstructured observations).

Anything with an identity key can be an entity -- contacts, companies, products, tickets, projects. SHOULD create entity types matching domain language ("Candidate" not "Contact" for recruiting) -- because domain language improves extraction accuracy. Identity keys: email for people, domain/URL for companies, external ID for CRM-synced records. MUST choose stable, unique identity keys -- because key changes break record continuity.

## Property Design -- The Schema That Extracts Well

Properties are the structured data layer. The AI extraction engine reads property names and descriptions to decide what to extract -- property design directly controls extraction quality.

Display types: `text`, `number`, `date`, `select`, `multi-select`, `url`, `email`, `phone`, `currency`, `percent`, `rating`, `boolean`, `json`, `array`, `rich-text`.

MUST write descriptions that guide extraction: "Annual deal budget in USD, extracted from pricing discussions" not just "Budget" -- because the description is the extraction instruction. SHOULD use `select`/`multi-select` when values are enumerable -- because it constrains extraction and enables filtering. SHOULD keep property count under 20 per collection -- because too many dilutes extraction focus. Freeform memories capture everything outside properties.

## Integration Topology -- Where Personize Fits

Personize as shared memory layer across agent sprawl -- one brain, many hands.

**Inbound:** CRM to Personize (webhook for real-time, polling for batch), CSV import, API ingestion. **Outbound:** Personize to channels (email via SMTP, Slack via webhook, custom via destinations). **Bidirectional:** scheduled sync pipelines reconciling both sides.

Interface selection: **MCP** for AI platforms (tool-based, zero code). **SDK** (`@personize/sdk`) for TypeScript pipelines. **CLI** (`npx personize`) for terminal ops. **REST API** for any language or webhooks. SHOULD default to MCP for AI agents, SDK for production pipelines.

## Workspace Design -- Coordination Surfaces

Workspaces turn records into collaboration surfaces. The "patient chart" model: every contributor reads the same record and adds to it.

When to add workspace: multi-agent coordination, task tracking, agent-human handoff, or longitudinal state tracking. Schema patterns: tasks (`status`, `assignee`, `priority`, `due_date`), issues (`severity`, `resolution`), notes (freeform timeline), context_summary (AI-compiled digest).

Role-based overlays: research agent writes findings, review agent approves, notification agent alerts humans. MUST include `status` -- because every coordination pattern needs state tracking.

**Naming convention (canonical):** property names are **Title Case** on the API (`Status`, `Pending Tasks`, `Notes`, `Context`); array properties (`Pending Tasks`, `Notes`, `Updates`, `Issues`, `Decisions`) are **append-only** (push, don't replace). See `personize-agent-core` "Platform Gotchas" for the exact write rules.

## Governance Architecture -- Rules That Scale

Three-layer stack: platform skills (`personize:skill`, immutable) -> org guidelines (`skill:org`, admin-managed) -> role-specific (`skill:role:*`, team-scoped).

Guidelines MUST have one concern each -- because each routes independently in SmartContext. SHOULD target 5-15 guidelines per org -- because too many creates routing ambiguity, too few means gaps.

Constraint hierarchy: **MUST** > **SHOULD** > **MAY**. Every constraint needs a rationale clause. SHOULD cross-reference by backtick name instead of duplicating rules -- because duplication causes drift. Header naming drives SmartContext routing: use domain keywords ("## Cold Email Tone" not "## Section 3").

## Kits -- Provision a Domain's Memory Model in One Install

A **kit** is a portable, declarative bundle (a `kit.json` manifest + markdown content) that provisions an org's entire modeling layer at once: entity types, collections (property schemas), document types + tag vocabulary, guidelines, and relation types. It is **pure data, no executable code** -- safe to author, review, and share (partner / open-source).

**Why kits exist:** `createOrganization()` no longer seeds content -- new orgs are **empty**. All provisioning happens by installing a kit. This decouples "make an org" from "set up an org" and lets you ship reusable domain setups. A kit is the deliverable form of the **Memory as a Model of Your Business** section above: draw a domain's entities + properties + governance + relations once, and every install starts with that model instead of a blank database.

**Install** (async -- returns `installId`, then poll status):
- MCP: `kits_list` → `kits_install({ kitId })` → `kits_get_status({ installId })`
- SDK: `client.kits.list()` / `client.kits.install({ kitId })` / `client.kits.getInstallStatus({ installId })`
- CLI: `personize kits list | install <id> | status <installId>`
- API: `GET /api/v1/kits`, `POST /api/v1/kits { kitId }` or `{ manifest }` → `202 { installId }`, then `GET /api/v1/kits/:installId`

**Built-in kits:** `personize-starter` (Contact + Company + Standard Profile + Shared Workspace + base guideline -- the old default seeding, repackaged). `engineering-memory` (module / initiative / contributor / decision / incident / release / monitor / dependency for multi-developer + AI-agent teams).

**Customize -- two distinct moves:**
1. **Author / fork (before install):** copy `personize-starter`, change `id`/`name`/`version`, tune property `description`s (the biggest extraction-quality lever), swap guideline markdown, `requires` another kit to layer on top. Ship as a repo-catalog kit or an inline supplied manifest.
2. **Per-org (after install):** customers edit entity types, properties, and guidelines. A re-install **never clobbers** customer edits unless that resource is `upsertAllowed: true` AND the kit `version` is newer (semver). Re-install is first-wins and idempotent.

SHOULD layer, not replace -- assume the starter's Contact/Company exist (install or `requires` them) and add domain-specific resources on top. MUST treat each property `description` as an extraction prompt, not a comment.

→ Full authoring + API + customization guide: `Docs/setup-kits/kit-authoring-guide.md`.

## Scaling Patterns

>10 items MUST batch -- sequential calls waste credits and risk rate limits. Pick by write shape:
- **Structured create/upsert** (you have known field values): `memory.upsert()` -- `POST /api/v1.1/memory/upsert`, MCP `memory_upsert`, CLI `personize memory upsert`. Single or batch; sets properties directly without re-extraction. This is the canonical create/upsert path.
- **Content → AI extraction** at volume: `memory.save()` / `memory.saveBatch()` (v1.1). The legacy `memorizeBatch` still works but is **deprecated toward `memory.upsert()`**; each item can specify its own `tier`, `schema`, `max_properties`, and batch returns an `eventId` you poll via `GET /api/v1/events/{eventId}`.

Tier selection: `basic` for structured data, `pro` for rich text (default), `ultra` for complex content. Check plan limits via `GET /api/v1/me`. SHOULD plan rate budget before large operations.

Cost: 1 credit/memorize, 1 credit/fast recall, 2 credits/deep recall. Guidelines and workspace: free. Budget = items * credits_per_operation.

## Schema Evolution -- Changing What's Already Live

**Adding properties:** safe, backward-compatible. New properties extract from future memorizations only. **Renaming:** requires migration (export, re-import). SHOULD avoid unless critical. **Splitting collections:** export, create new collection, re-import. Plan for dual-write period. **Re-extraction:** re-memorize content with updated `schema`, `actionId`, or higher `tier`.

MUST NOT delete properties that agents or pipelines depend on without coordinating -- because silent schema changes cause silent failures. SHOULD document changes in a governance guideline so agents discover them via SmartContext.

## Evaluation and Optimization

**Extraction accuracy:** `POST /api/v1/evaluate/memorization-accuracy` with test content and expected properties. SHOULD run after every schema change -- because descriptions directly affect extraction.

**Recall quality:** query via `smartRecall`, compare against expected results. **Governance routing:** test with `ai_smart_guidelines({ message: "task description" })`, verify correct guidelines appear.

**Optimization loop:** evaluate -> identify weak descriptions -> adjust -> re-extract -> re-evaluate. SHOULD define accuracy threshold before starting -- because without a target, optimization never converges.

→ Build evals **first** (baseline before you build), the 4 eval types (extraction / recall / governance routing / end-to-end), metrics, and a runnable harness: [`evaluating-solutions.md`](./reference/evaluating-solutions.md) (+ `personize-enabler` `script-eval-solution.ts`).

## Deployment Patterns

**Ad-hoc script:** TypeScript with `@personize/sdk`, run with `npx tsx`. For prototyping and one-time ops. **Durable pipeline (Trigger.dev):** recurring or long-running operations with retries and durability. **No-code (n8n):** visual workflow automation, import generated JSON. **CI/CD governance-as-code:** guidelines as markdown in git, sync on push. **Signal:** context-aware notifications that decide IF, WHAT, WHEN, HOW to notify.

SHOULD start with scripts, graduate to pipelines when proven -- because premature infrastructure wastes effort on unvalidated designs.

## The Solution Lifecycle -- Discover to Enable

When given a project, MUST follow the lifecycle. Each phase has a home in this skill -- this is the spine that ties the front half (discovery) to the back half (design, build, operate):

1. **Discover** -- research the prospect, validate, read the codebase, build the Opportunity Inventory → [`discover.md`](./reference/discover.md)
2. **Assess** -- strategic fit (two-lens, build-vs-buy, BYOC signal) + the 6-dimension Situation Assessment (above) → [`strategic-fit.md`](./reference/strategic-fit.md)
3. **Design** -- memory model, property schema, governance, integration topology → [`memory-as-business-model.md`](./reference/memory-as-business-model.md), [`schema-design-guide.md`](./reference/schema-design-guide.md), [`governance-authoring.md`](./reference/governance-authoring.md)
4. **Review & Propose** -- harden the design + ask the questions to improve it, then package the recommendation (2-3 options, cost, deployment) for human approval → [`design-review.md`](./reference/design-review.md), [`propose.md`](./reference/propose.md), [`cost-optimization.md`](./reference/cost-optimization.md), [`deployment-mode.md`](./reference/deployment-mode.md). MUST get approval before building.
5. **Build** -- provision the empty org by installing a kit, then entity types → collections → governance → scripts/webhooks → workspace. Checkpoint each step.
6. **Evaluate** -- build evals FIRST; verify extraction, recall, and governance routing before go-live → [`evaluating-solutions.md`](./reference/evaluating-solutions.md). MUST get approval before going live.
7. **Operate & Scale** -- run, monitor, fleet-dispatch at volume, observability → [`production-patterns.md`](./reference/production-patterns.md)
8. **Evolve** -- learning loop, smart update, schema evolution from evidence → [`cheat-smart-update.md`](./reference/cheat-smart-update.md)
9. **Enable** -- roll out to all employees + their AI agents (MCP profiles, governance, adoption stages) → [`enablement.md`](./reference/enablement.md)

Write the project brief to the system workspace (`system:{project-slug}`). For EXISTING projects: read it first, check pending tasks, determine mode (task execution, human request, or optimization). Keep `{project}:agent-notes` for accumulated learnings, human preferences, and edge cases -- update after every significant session.

## Infrastructure Management -- Entity Types MCPs Destinations

Entity type management: `entityTypes.list()` to discover, `entityTypes.update()` to modify display names and config, `entityTypes.archive()` to retire. SHOULD create domain-specific types ("Candidate" not "Contact" for recruiting).

MCP server management: `mcps.create()` to connect external AI tools, `mcps.test()` to verify connectivity, `mcps.refreshTools()` to update tool catalog, `mcps.updateTools()` to enable/disable specific tools. This is how the agent extends its own capabilities.

Destinations (webhook): `destinations.create()` for event routing (new memorization, property change, etc.), `destinations.test()` to verify delivery, `destinations.getLogs()` to diagnose delivery failures.

Notifications: `notifications.send()` for targeted alerts, `notifications.broadcast()` for team-wide, `notifications.executeAction()` for actionable notification buttons.

Setup order: entity types → collections → governance → scripts → MCPs → destinations → workspace. MUST test each integration before moving to next.

## Curated Taxonomies -- Tags + Relation Types

Two per-org taxonomies are human-curated and shared across all AI agents and tools in the org. Both follow the same pattern as `context_doc_types`: system built-ins under `SYSTEM_ORG_ID` merged with per-org overrides.

- **Tag vocabulary** (`org_tag_vocabulary`) -- controlled tag set that auto-tagging snaps to. Use for: organizing context docs by business domain so the LLM section-selector can include / exclude the right docs for each retrieval query. AI agents may USE tags during snap but never INVENT new canonicals. Manage via `client.v1_1.context.{listTags, createTag, updateTag, deleteTag, renameTag}` or `personize v1.1 context tags ...`. **Tag descriptions MUST follow `"Use for: X. Not for: Y."` format** -- the description is injected into the LLM selector prompt to reject plausible-but-wrong docs.
- **Relation types** (`relation_types`) -- typed taxonomy for graph edges between memory records (works_at, reports_to, treats_patient, ...). Used by edge inference, graph traversal, and retrieval scoring. Manage via `client.v1_1.memory.{listRelationTypes, createRelationType, batchCreateRelationTypes, ...}` or `personize v1.1 memory relation-types ...`.

SHOULD seed both during onboarding using the curated example sets in `reference/tag-vocabulary-examples.json` (organized by industry/department) and the `personize-enabler` skill's `presets/relation-types-examples.json` (organized by entity-relationship pattern). Users can pick one or more sets, customize labels/descriptions, then bulk-create via the CLI's `batch-create --file <path>` -- because a seeded vocab is decisively better for retrieval than auto-generated tags (CD2 +4 / CD3 +6 in internal benchmarks).

MUST NOT let AI auto-register new canonical tags or relation types -- because the vocabularies are the org's business mental model. Unmatched candidates from snap are dropped on purpose.

## Smart Update -- AI-Powered Evolution

`guidelines.smartUpdate({ type, instruction, strategy })`:
- `type: 'guidelines'`: evolve governance based on learnings, feedback, or new requirements
- `type: 'collections'`: evolve schemas based on new data patterns or extraction improvements
- `strategy: 'suggest'`: returns proposed changes for human review (recommended for production)
- `strategy: 'apply'`: applies changes directly (use for non-critical updates)

Feed it learnings: "Our CTO outreach data shows ROI angles work better than pain-point angles" → Smart Update proposes guideline changes.

Collection versioning: `collections.history(id, { mode: 'diff' })` returns token-efficient diffs. Use for auditing what changed and when.

Guideline versioning: `guidelines.history(id)` returns snapshots. MUST include `historyNote` on every update explaining WHY the change was made. Rollback: read previous version from history, apply via `guidelines.update()`.

SHOULD use suggest mode for production systems -- because AI-proposed changes need human review before affecting live operations.

## Production Design Patterns

When building production systems (not just storing/recalling data), these patterns solve common architectural challenges. Load `production-patterns` attachment for full details.

| Pattern | When You Need It |
|---|---|
| **Coordinated Program** | Isolated execution units with own rules, enrollment, stats (campaigns, care plans, drives) |
| **Channel Identity** | Stable sender/provider profiles with health tracking and capacity |
| **Entity-Level Coordination** | Parent-child coordination, preflight gates (company→contacts, household→patients) |
| **Multi-Touch Journey** | Sequenced actions with timing gates -- uses `filterByProperty` as task queue |
| **Interaction Ledger** | Separate collection for logging all touchpoints with attribution for learning |
| **Vertical Configuration** | Governance-as-modes for industry presets (one guideline per vertical) |
| **Governance Safety** | Snapshot → validate → dry-run → apply → rollback |
| **Responsibility Routing** | Role-based ownership with handoff triggers and governance overlays |
| **Observability & Health** | Metrics aggregation, threshold alerts, daily digest stored as self-memory |
| **Learning & Evolution** | Analyze outcomes from ledger, evolve governance based on evidence |
| **Escalation** | Human-in-the-loop triggers, workspace tasks, notification with action buttons |
| **Typed Task Dispatch** | Standardized task types with contracts for batch processing, AI vs pipeline routing, credit estimation |
| **Notebook** | Verbatim content storage (posts, templates, code, transcripts) with versioning and discovery |
| **Fleet Dispatch (subagent-per-record)** | Fan out one bounded subagent per record across thousands of records -- predictable cost (records × token envelope), format-consistent outputs, governed per-record memory as the shared substrate so agents don't re-derive |

SHOULD scan this table before designing any production system. If 3+ patterns apply, load the full attachment.

## Advanced Multi-Step Instruction Patterns

When a prompt is more than "do X, return Y" — when it needs to branch on tier, reconcile data from multiple sources, gate output on compliance, fan out to N personas, triangulate research, or refine iteratively — author it as a multi-step `instructions[]` array on `client.ai.prompt()`, not one bloated prompt.

| I need to… | Pattern |
|---|---|
| Branch on account tier with different artifacts per tier | A. Conditional Specialize |
| Reconcile the same entity across CRM, web, uploaded doc | B. Multi-Source Reconciliation |
| Score/classify with partial data without aborting | C. Soft Degradation (`confidence` tier) |
| Compliance/legal/brand check BEFORE generation | D. Compliance-Gated Generation |
| N personalized variants for N personas on one account | E. Multi-Recipient Fanout |
| Current-events research with 3+ source triangulation | F. Tool-Bounded Research |
| Reply classification where adjacent labels drift | G. Few-Shot Calibrated Classification |
| Workflow gated on N pre-conditions with structured skip | H. Checklist-Gated Workflow |
| Iteratively refine a draft against a rubric | I. Self-Reflective Refinement Loop |

Pick the lightest error-handling tier that covers the real risk: T1 hard abort (run is fundamentally invalid), T2 soft degrade (valid run, partial output, caller routes by confidence), T3 self-correct (audit and rewrite before emit), T4 blast-radius bound (`maxSteps`, retry-once-then-skip for flaky tools). Same payload works on `/api/v1/prompt` and `/api/v1.1/prompt`.

→ Full pattern catalog with code examples, context-wiring rules, instruction-scope gotchas, and the prompt-level anti-pattern catalog: `instruction-patterns.md`, `cheat-anti-patterns.md`.

## Go Deeper

Need exact API parameters or error codes? Ask about `personize-reference`. Need a ready-to-run script or template? Ask about `personize-enabler`. Need operational thinking patterns? Ask about `personize-agent-core`.
