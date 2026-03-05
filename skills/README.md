# Skills

Skills are modular packages of instructions that help AI agents perform specific tasks. Each skill is a folder with a `SKILL.md` entry point.

**How discovery works**: Only the `name` and `description` frontmatter is pre-loaded at startup. The full `SKILL.md` loads when the skill is triggered. Reference files load on-demand as the agent needs them. This progressive disclosure pattern is the same architecture that powers `smartGuidelines()` — agents receive only the governance relevant to the current query, not all of it.

---

## Skills Catalog

### Personize SDK

| Skill | Description | Use when... |
|---|---|---|
| [entity-memory](./entity-memory/) | Persistent memory for contacts, companies, and records | Storing, syncing, or querying entity data |
| [governance](./governance/) | Org rules, brand voice, and compliance as AI guidelines | Setting up policies agents must follow |
| [personalization](./personalization/) | End-to-end personalization architecture across channels | Centralizing customer knowledge, deploying personalized experiences |
| [code-pipelines](./code-pipelines/) | GTM automation with Trigger.dev + Personize SDK | Outbound sequences, durable scheduled pipelines |
| [no-code-pipelines](./no-code-pipelines/) | n8n workflow JSON for 400+ app integrations | No-code visual workflows |
| [data-sync](./data-sync/) | CRM and database sync connectors | Connecting Salesforce, HubSpot, Postgres to Personize |
| [collaboration](./collaboration/) | Shared workspace for multi-agent coordination | Agents + humans working on the same record |
| [signal](./signal/) | AI-powered notification engine (IF, WHAT, WHEN, HOW) | Building smart notifications for a SaaS product |
| [verify-setup](./verify-setup/) | Post-setup verification for every stack layer | Confirming things work after setup |
| [troubleshooting](./troubleshooting/) | Diagnose and fix common Personize issues | Something isn't working as expected |

### Meta

| Skill | Description | Use when... |
|---|---|---|
| [skill-builder](./skill-builder/) | Create and structure new skills | Building a new skill for this repo |

### Internal Reference Docs

Platform-internal development docs (not discoverable skills) are in [_internal/](./_internal/).

---

## Skill Routing Guide

When multiple skills could apply, use the developer's primary intent to route:

| Developer says... | Primary skill | Why not the others |
|---|---|---|
| "Sync my CRM/database" (wants code) | **data-sync** | `entity-memory` is too low-level; `no-code-pipelines` is no-code; `code-pipelines` is for GTM motions |
| "Sync my CRM/database" (wants no-code) | **no-code-pipelines** | `data-sync` requires TypeScript |
| "Build outbound sequences / GTM automation" | **code-pipelines** | `personalization` is design-time, not runtime pipelines |
| "Add personalization to my product" | **personalization** | Covers architecture, channels, and guardrails end-to-end |
| "Store or retrieve data" (single call) | **entity-memory** | Other skills add unnecessary scaffolding |
| "Set up organizational rules" | **governance** | `entity-memory` is for entity data, not org policies |
| "Coordinate multiple agents on a record" | **collaboration** | `entity-memory` is single-entity; workspace is multi-contributor |
| "Build smart / AI-powered notifications" | **signal** | `code-pipelines` runs sequences; signal decides IF/WHAT/WHEN per person |
| "How do I verify my setup works?" | **verify-setup** | No other skill covers end-to-end testing |
| "Something isn't working" | **troubleshooting** | Systematic diagnosis with ranked root causes |

### Disambiguation

When intent is ambiguous (e.g., "I want to automate emails"), ask:

> "Do you want to (a) **design** the personalization architecture for your product, (b) **build** a production pipeline that runs on a schedule, or (c) connect your data via a **no-code** workflow?"
>
> (a) → personalization  |  (b) → code-pipelines  |  (c) → no-code-pipelines
