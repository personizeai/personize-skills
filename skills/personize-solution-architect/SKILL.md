---
name: personize-solution-architect
description: "How to design, build, evaluate, and evolve Personize integrations — including the advanced multi-step `instructions[]` patterns those integrations run. Covers situation assessment, entity modeling, property design for extraction quality, integration topology, workspace design, governance architecture, scaling, schema evolution, smart update for AI-powered guideline and schema evolution, evaluation and optimization of extraction and recall quality, infrastructure management (entity types, MCPs, destinations), project lifecycle, deployment patterns, and authoring advanced multi-step prompt patterns (conditional branching by tier, multi-source reconciliation, compliance-gated generation, persona fanout, bounded research with source triangulation, few-shot calibrated classification, checklist-gated workflows, self-reflective refinement loops). Use when designing solutions, creating schemas, planning integrations, evaluating extraction quality, updating or evolving guidelines, improving system performance, or debugging instruction chains that silently fail, produce inconsistent confidence outputs, loop indefinitely, or write bad data to records."
license: Apache-2.0
compatibility: "Requires @personize/sdk or Personize MCP server and a Personize API key (sk_live_...)"
metadata: {"author": "personize-ai", "version": "2.0", "homepage": "https://personize.ai"}
---

# personize-solution-architect

**Description:** How to design, build, evaluate, and evolve Personize integrations — including the advanced multi-step `instructions[]` patterns those integrations run. Covers situation assessment, entity modeling, property design for extraction quality, integration topology, workspace design, governance architecture, scaling, schema evolution, smart update for AI-powered guideline and schema evolution, evaluation and optimization of extraction and recall quality, infrastructure management (entity types, MCPs, destinations), project lifecycle, deployment patterns, and authoring advanced multi-step prompt patterns (conditional branching by tier, multi-source reconciliation, compliance-gated generation, persona fanout, bounded research with source triangulation, few-shot calibrated classification, checklist-gated workflows, self-reflective refinement loops). Use when designing solutions, creating schemas, planning integrations, evaluating extraction quality, updating or evolving guidelines, improving system performance, or debugging instruction chains that silently fail, produce inconsistent confidence outputs, loop indefinitely, or write bad data to records.

**Tags:** `personize:skill`, `personize:skill:architect`, `personize:skill:planning`, `personize:skill:architecture`, `personize:skill:schema`, `personize:skill:evaluation`, `personize:skill:quality`, `personize:skill:prompt-patterns`

---

## Situation Assessment -- The 5 Dimensions

Before designing anything, assess five dimensions. **Entity complexity:** how many types, nested relationships? **Data volume:** hundreds (script), thousands (batch), millions (streaming). **Integration depth:** standalone, CRM-connected, or multi-system. **Autonomy level:** human-in-loop, supervised, or fully autonomous. **Compliance:** PII handling, audit trails, retention, deletion rights.

After assessment, MUST propose 2-3 options with trade-offs before building -- because architects propose, humans decide. Each option: approach, complexity, cost profile, what it trades away.

**For onboarding an existing corpus** (user has data and asks "how do I get it in?"): load [`audit-and-plan.md`](./reference/audit-and-plan.md) — the four-phase playbook (audit → decide destination per data type → sequence the import → verify) covers the concrete questions you must answer before any code: how many records, how many entity types, how much unstructured content, and what becomes a collection vs. context doc vs. workspace property. Includes the batch-sizing decision table (per-record / batch / async-batch by volume) and credit-budget rule of thumb.

**For cost estimation** before committing to a tier or batch strategy: load [`cost-simulator.md`](./reference/cost-simulator.md) — text-based simulator with the same model as the website's savings calculator. Inputs: records, pages per record, monthly recall volume, LLM tier. Outputs: raw-LLM cost vs. Personize cost vs. savings %.

**For graph relations** (when to use edges vs. nested properties, how the inference engine seeds edges from properties, what relation types are built-in, how to query the graph via `POST /api/v1.1/memory/retrieve` with `sources.graph` — or `retrieve_unified(mode='scout', sources={graph:true})` on agent2_0): load [`graph-relations.md`](./reference/graph-relations.md). Key insight: edges are inferred automatically during memorize from foreign-key-shaped properties (`company`, `linkedin_url`, `attendees`, `assigned_to_email`); manual seeding is rarely needed.

## Collections vs Guidelines -- The Most Common Mistake

MUST understand this distinction before creating anything:

- **Collections** = data containers for entities with identity keys. Contacts, companies, deals, tickets, products. Created via `collection_create`. Each record is an instance of the entity (one contact, one company). Properties are structured fields extracted from content.
- **Guidelines** = behavioral rules, policies, and governance for how agents act. ICP criteria, email writing standards, sales playbooks, compliance policies, brand voice. Created via `guideline_create`. Written in MUST/SHOULD/MAY format. Routed by SmartContext to agents when relevant.

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

## Governance Architecture -- Rules That Scale

Three-layer stack: platform skills (`personize:skill`, immutable) -> org guidelines (`skill:org`, admin-managed) -> role-specific (`skill:role:*`, team-scoped).

Guidelines MUST have one concern each -- because each routes independently in SmartContext. SHOULD target 5-15 guidelines per org -- because too many creates routing ambiguity, too few means gaps.

Constraint hierarchy: **MUST** > **SHOULD** > **MAY**. Every constraint needs a rationale clause. SHOULD cross-reference by backtick name instead of duplicating rules -- because duplication causes drift. Header naming drives SmartContext routing: use domain keywords ("## Cold Email Tone" not "## Section 3").

## Scaling Patterns

>10 items MUST use `memorizeBatch` -- because sequential calls waste credits and risk rate limits. Each batch item can specify its own `tier`, `schema`, `max_properties`. Batch returns `eventId`; poll `GET /api/v1/events/{eventId}` for status.

Tier selection: `basic` for structured data, `pro` for rich text (default), `ultra` for complex content. Check plan limits via `GET /api/v1/me`. SHOULD plan rate budget before large operations.

Cost: 1 credit/memorize, 1 credit/fast recall, 2 credits/deep recall. Guidelines and workspace: free. Budget = items * credits_per_operation.

## Schema Evolution -- Changing What's Already Live

**Adding properties:** safe, backward-compatible. New properties extract from future memorizations only. **Renaming:** requires migration (export, re-import). SHOULD avoid unless critical. **Splitting collections:** export, create new collection, re-import. Plan for dual-write period. **Re-extraction:** re-memorize content with updated `schema`, `actionId`, or higher `tier`.

MUST NOT delete properties that agents or pipelines depend on without coordinating -- because silent schema changes cause silent failures. SHOULD document changes in a governance guideline so agents discover them via SmartContext.

## Evaluation and Optimization

**Extraction accuracy:** `POST /api/v1/evaluate/memorization-accuracy` with test content and expected properties. SHOULD run after every schema change -- because descriptions directly affect extraction.

**Recall quality:** query via `smartRecall`, compare against expected results. **Governance routing:** test with `ai_smart_guidelines({ message: "task description" })`, verify correct guidelines appear.

**Optimization loop:** evaluate -> identify weak descriptions -> adjust -> re-extract -> re-evaluate. SHOULD define accuracy threshold before starting -- because without a target, optimization never converges.

## Deployment Patterns

**Ad-hoc script:** TypeScript with `@personize/sdk`, run with `npx tsx`. For prototyping and one-time ops. **Durable pipeline (Trigger.dev):** recurring or long-running operations with retries and durability. **No-code (n8n):** visual workflow automation, import generated JSON. **CI/CD governance-as-code:** guidelines as markdown in git, sync on push. **Signal:** context-aware notifications that decide IF, WHAT, WHEN, HOW to notify.

SHOULD start with scripts, graduate to pipelines when proven -- because premature infrastructure wastes effort on unvalidated designs.

## Project Lifecycle -- Understand Plan Build Test Operate

When given a project: MUST follow the lifecycle phases.

1. **UNDERSTAND:** Interview the human. Research the domain. Document goals and constraints. Write project brief to system workspace (`system:{project-slug}`).
2. **PLAN:** Design collections, governance, integrations, scripts. Propose 2-3 options with trade-offs. Present the plan. MUST get human approval before building.
3. **BUILD:** Create in order -- entity types → collections → governance → scripts → webhooks/MCPs → workspace. Checkpoint each step. Offer customization at each stage.
4. **TEST:** Dry-run everything. Show sample outputs. Verify extraction quality. MUST get human approval before going live.
5. **OPERATE:** Monitor, execute scheduled tasks, respond to human requests. Read system workspace on every session start.
6. **EVOLVE:** Optimize based on learnings, handle change requests, schema evolution.

For EXISTING projects: read system workspace first, check pending tasks, determine mode (task execution, human request, or optimization).

Agent notes guideline: create `{project}:agent-notes` to store agent learnings, human preferences, edge cases. Updated after every significant session.

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
