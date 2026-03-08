# Skills

Skills are modular packages of instructions that help AI agents perform specific tasks. Each skill is a folder with a `SKILL.md` entry point.

**How discovery works**: Only the `name` and `description` frontmatter is pre-loaded at startup. The full `SKILL.md` loads when the skill is triggered. Reference files load on-demand as the agent needs them. This progressive disclosure pattern is the same architecture that powers `smartGuidelines()` — agents receive only the governance relevant to the current query, not all of it.

---

## Skills Catalog

### Personize SDK

| Skill | Description | Use when... |
|---|---|---|
| [entity-memory](./entity-memory/) | Persistent memory for contacts, companies, and records — store, sync, recall, export | Storing data, syncing CRM/databases, querying memory, assembling context |
| [governance](./governance/) | Org rules, brand voice, compliance, and playbooks as AI guidelines via SmartContext | Setting up policies, brand voice, ICPs, or any rules agents must follow |
| [code-pipelines](./code-pipelines/) | GTM automation with Trigger.dev + Personize SDK — outbound, inbound, enrichment, signals | Building durable pipelines: email sequences, lead processing, reply handlers |
| [no-code-pipelines](./no-code-pipelines/) | n8n workflow JSON for 400+ app integrations — no code required | Building visual no-code workflows to sync data between Personize and other apps |
| [collaboration](./collaboration/) | Shared workspace for multi-agent coordination on any entity | Multiple agents, humans, or systems need to work on the same record |
| [signal](./signal/) | AI-powered notification engine — decides IF, WHAT, WHEN, HOW per person | Building smart notifications, alerts, or digests for a SaaS product |
| [diagnostics](./diagnostics/) | Verify setup and troubleshoot the Personize stack | After setting up any Personize capability, or when something isn't working |
| [solution-architect](./solution-architect/) | Plan, design, and validate complete Personize integrations end-to-end | Centralizing customer knowledge, deploying personalization, or reviewing an integration |

### Meta

| Skill | Description | Use when... |
|---|---|---|
| [skill-builder](./skill-builder/) | Create, structure, and install new skills | Building a new skill for this repo |

### Internal Reference Docs

Platform-internal development docs (not discoverable skills) are in [_internal/](./_internal/).

---

## Skill Routing Guide

When multiple skills could apply, use the developer's primary intent to route:

| Developer says... | Primary skill | Why not the others |
|---|---|---|
| "Sync my CRM/database" (wants code) | **entity-memory** | Has CRM sync section with batch-memorize, deploy templates, source recipes |
| "Sync my CRM/database" (wants no-code) | **no-code-pipelines** | Visual n8n workflows, no TypeScript needed |
| "Build outbound sequences / GTM automation" | **code-pipelines** | Durable execution with Trigger.dev, retries, scheduling |
| "Add personalization to my product" | **solution-architect** | Covers architecture, channels, schemas, and guardrails end-to-end |
| "Store or retrieve data" (single call) | **entity-memory** | Other skills add unnecessary scaffolding |
| "Set up organizational rules" | **governance** | `entity-memory` is for entity data, not org policies |
| "Coordinate multiple agents on a record" | **collaboration** | `entity-memory` is single-entity; workspace is multi-contributor |
| "Build smart / AI-powered notifications" | **signal** | `code-pipelines` runs sequences; signal decides IF/WHAT/WHEN per person |
| "How do I verify my setup works?" | **diagnostics** | VERIFY mode confirms every stack layer works |
| "Something isn't working" | **diagnostics** | FIX mode with systematic diagnosis and ranked root causes |
| "Help me plan my Personize integration" | **solution-architect** | Discovery → Schema → Plan → Generate → Wire → Review |

### Disambiguation

When intent is ambiguous (e.g., "I want to automate emails"), ask:

> "Do you want to (a) **plan** the full personalization architecture for your product, (b) **build** a production pipeline that runs on a schedule, or (c) connect your data via a **no-code** workflow?"
>
> (a) → solution-architect  |  (b) → code-pipelines  |  (c) → no-code-pipelines
