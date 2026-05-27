# Skills

Skills are modular packages of instructions that help AI agents perform specific tasks. Each skill is a folder with a `SKILL.md` entry point.

**How discovery works**: Only the `name` and `description` frontmatter is pre-loaded at startup. The full `SKILL.md` loads when the skill is triggered. Reference files load on-demand as the agent needs them. This progressive disclosure pattern is the same architecture that powers `smartGuidelines()` — agents receive only the governance relevant to the current query, not all of it.

---

## Skills Catalog

### Personize Platform

| Skill | Description | Use when... |
|---|---|---|
| [personize](./personize/) | Complete Personize platform reference — memory, governance, analytics, notifications, organizations, MCPs, destinations, schedules, CRM passthrough (HubSpot/Salesforce) | Any Personize task; covers 95% of API/SDK/MCP surface in one skill |
| [personize-memory](./personize-memory/) | Persistent memory for contacts, companies, employees, members — memorize, recall, smartRecall, smartDigest, batch, search | Storing data, syncing CRM/databases, querying memory, assembling context |
| [personize-governance](./personize-governance/) | Org rules, brand voice, compliance, and playbooks as AI guidelines via SmartContext | Setting up policies, brand voice, ICPs, or any rules agents must follow |
| [personize-code](./personize-code/) | Build production AI agent pipelines (Trigger.dev / n8n) + author advanced multi-step `instructions[]` patterns | Building durable pipelines (outbound, enrichment, reply handlers); authoring complex prompts with branching, fanout, compliance gates, self-refinement |
| [personize-agent-workspace](./personize-agent-workspace/) | Shared workspace for multi-agent + human coordination on any entity | Multiple agents, humans, or systems need to work on the same record |
| [personize-solution-architect](./personize-solution-architect/) | Plan, design, and validate complete Personize integrations end-to-end | Centralizing customer knowledge, deploying personalization, or reviewing an integration |

### ShareInfo

| Skill | Description | Use when... |
|---|---|---|
| [shareinfo-magic-link](./shareinfo-magic-link/) | Email-domain-gated ShareInfo links with magic-link authentication | Restricting who can open a ShareInfo page; B2B partner pages; gated sales playbooks |

### Internal Reference Docs

Platform-internal development docs (not discoverable skills) are in [_internal/](./_internal/).

---

## Skill Routing Guide

When multiple skills could apply, use the developer's primary intent to route:

| Developer says... | Primary skill | Why not the others |
|---|---|---|
| "What can Personize do?" / general API question | **personize** | Master reference; covers every endpoint, SDK method, and MCP tool |
| "Call HubSpot/Salesforce from my script" | **personize** | CRM passthrough lives in master; one Personize key, both CRMs, no OAuth |
| "Schedule a recurring prompt / one-time reminder" | **personize** | Schedule surface lives in master (`client.schedules.*` → `/api/v1/schedules`) |
| "Sync my CRM/database into memory" | **personize-memory** | Has CRM sync section with batch-memorize, deploy templates, source recipes |
| "Build outbound sequences / GTM automation" | **personize-code** | Durable execution with Trigger.dev, retries, scheduling, n8n alternative |
| "Author a multi-step prompt that branches / reconciles / refines" | **personize-code** | Advanced `instructions[]` patterns: conditional, fanout, compliance-gated, self-reflective |
| "Add personalization to my product" | **personize-solution-architect** | Covers architecture, channels, schemas, and guardrails end-to-end |
| "Store or retrieve data" (single call) | **personize-memory** | Other skills add unnecessary scaffolding |
| "Set up organizational rules" | **personize-governance** | `personize-memory` is for entity data, not org policies |
| "Coordinate multiple agents on a record" | **personize-agent-workspace** | `personize-memory` is single-entity; workspace is multi-contributor |
| "How do I verify my setup works?" / "Something isn't working" | **personize** | Diagnostics live under `personize/reference/diagnostics/` (VERIFY + FIX modes) |
| "Help me plan my Personize integration" | **personize-solution-architect** | Discovery → Schema → Plan → Generate → Wire → Review |
| "Gated ShareInfo link / B2B partner page" | **shareinfo-magic-link** | Email-domain allowlist + magic-link auth |

### Disambiguation

When intent is ambiguous (e.g., "I want to automate emails"), ask:

> "Do you want to (a) **plan** the full personalization architecture for your product, (b) **build** a production pipeline that runs on a schedule, or (c) just **schedule** a recurring prompt against your Personize memory?"
>
> (a) → personize-solution-architect  |  (b) → personize-code  |  (c) → personize (schedules section)

---

## Recent consolidation (2026-05-26)

Three previously standalone skills were merged into the broader skills below to reduce overlap and keep triggering accurate:

| Old standalone | Merged into | Why |
|---|---|---|
| `personize-schedules/` | [personize/](./personize/) — `reference/schedules.md` + Section 5 (Build & Automate) | Scheduling is a first-class platform surface; belongs alongside other Personize SDK/MCP/REST endpoints |
| `personize-crm-passthrough/` | [personize/](./personize/) — `reference/crm-passthrough.md` + "CRM Direct Access" section | CRM passthrough (`client.hubspot.*` / `client.salesforce.*`) is a platform primitive, not pipeline-specific |
| `personize-instructions-advanced/` | [personize-code/](./personize-code/) — `reference/instructions-advanced{,-patterns,-cookbook}.md` + body section | Advanced multi-step `instructions[]` patterns are practical authoring patterns for prompts embedded in pipelines |

Both target skills' `description:` frontmatter was extended with the merged trigger phrases, so existing triggering against the old skill names continues to land correctly.

### API + SDK + CLI baseline

The merged content is verified against:

- **API**: `/api/v1/*` is the canonical surface for schedules and CRM passthrough (v1.1 doesn't yet expose those). For prompt orchestration, `/api/v1/prompt` and `/api/v1.1/prompt` mirror each other — the `instructions[]` payload shape is identical.
- **SDK**: `@personize/sdk@0.12.0` — `client.schedules.{create,list,get,update,delete,executions}`, `client.hubspot.{contacts,companies,deals,tasks,notes,request}`, `client.salesforce.{request,query,queryAll,sobject(...).{create,get,update,upsert,delete}}`, `client.ai.prompt({ instructions: [...] })`.
- **CLI**: `@personize/cli@0.5.0`.
- **v1 sunset**: `2026-07-15` for the routes explicitly marked deprecated in [Docs/MIGRATION-GUIDE-v1.1.md](../Docs/MIGRATION-GUIDE-v1.1.md). Schedules + CRM passthrough are NOT in that deprecation set.
