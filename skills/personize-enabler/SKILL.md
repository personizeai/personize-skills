---
name: personize-enabler
description: "Ready-to-execute resources for building with Personize: TypeScript scripts (CSV import, CRM sync, outreach, monitoring), n8n workflow templates, collection schema presets, and governance guideline templates. Grab, customize, and run. Use whenever you need a script, template, starter schema, or pre-built workflow."
license: Apache-2.0
compatibility: "Requires @personize/sdk or Personize MCP server and a Personize API key (sk_live_...)"
metadata: {"author": "personize-ai", "version": "2.0", "homepage": "https://personize.ai"}
---

# personize-enabler

**Description:** Ready-to-execute resources: TypeScript scripts (CSV import, CRM sync, outreach, monitoring), n8n workflow templates, collection schema presets, and governance guideline templates. Grab, customize, and run. Use whenever you need a script, template, starter schema, or pre-built workflow.

**Tags:** `personize:skill`, `personize:skill:enabler`, `personize:skill:code`, `personize:skill:pipeline`, `personize:skill:import`, `personize:skill:setup`

---

## What's Available -- Resource Catalog

| Resource | Type | Customize |
|---|---|---|
| **Masterclass Scripts** (pattern-teaching, heavily commented) | | |
| script-data-ingest.ts | Script | Inbound: external data -> Personize. Teaches batch, chunking, field mapping |
| script-recall-and-act.ts | Script | Outbound: recall -> govern -> act -> store. Teaches the core loop as code |
| script-monitor-and-alert.ts | Script | Ongoing: search -> evaluate -> alert. Teaches monitoring and workspace issues |
| **Popular Scripts** (grab-and-run) | | |
| script-csv-import.ts | Script | CSV import with field mapping and batching |
| script-cold-outreach.ts | Script | Personalized outreach with governance and sender rotation |
| script-daily-digest.ts | Script | Morning briefing to Slack |
| script-enrichment.ts | Script | External API enrichment (Apollo, Tavily) |
| **Sync Scripts** (governance-as-code) | | |
| script-sync-org-guidelines.ts | Script | Pull org guidelines to local files / push local changes back |
| script-sync-platform-guidelines.ts | Script | Download platform skills (agent-core, architect, etc.) to local |
| **Governance Templates** | | |
| template-brand-voice.md | Governance template | Tone and rules |
| template-icp.md | Governance template | Qualification criteria |
| template-sales-playbook.md | Governance template | Stage messaging |
| template-compliance.md | Governance template | Policies |
| **Collection Presets** | | |
| preset-sales-contact.json | Collection schema | Deploy as-is or extend |
| preset-company.json | Collection schema | Deploy as-is or extend |
| preset-support-ticket.json | Collection schema | Deploy as-is or extend |
| preset-product-user.json | Collection schema | Deploy as-is or extend |
| preset-program.json | Collection schema | Campaigns, care plans, enrollment drives |
| preset-interaction-log.json | Collection schema | Outreach logs, visit logs, touchpoint tracking |

## Common Requests → Script

| User says... | Script | Command |
|---|---|---|
| "Download my guidelines locally" | script-sync-org-guidelines.ts | `npx tsx script-sync-org-guidelines.ts --mode pull` |
| "Push my local guideline changes" | script-sync-org-guidelines.ts | `npx tsx script-sync-org-guidelines.ts --mode push` |
| "Download platform skills locally" | script-sync-platform-guidelines.ts | `npx tsx script-sync-platform-guidelines.ts` |
| "Import this CSV" | script-csv-import.ts | `npx tsx script-csv-import.ts --file data.csv` |
| "Send outreach to my leads" | script-cold-outreach.ts | `npx tsx script-cold-outreach.ts --campaign "Q2"` |

## Scripts -- Ready-to-Run TypeScript

All scripts are self-contained (single file, `@personize/sdk` only), JSON-in/JSON-out, `--dry-run` by default, with rate-limit retry and a summary JSON with counts on exit.

How to use: fetch the attachment, read the customization block at the top, swap collection IDs and field mapping, run `npx tsx script-name.ts --dry-run`, review output, then run live with `--dry-run=false`.

## Pipeline Templates -- Trigger.dev

Use a pipeline instead of a script for recurring operations, durable retry, runs over 5 minutes, or scheduling. Scripts are for one-time or ad-hoc runs.

Available patterns: outreach (`cold-outreach`), monitoring (`monitor-and-alert`, `daily-digest`), data ingest (`data-ingest`, `csv-import`). The masterclass scripts teach how to structure any of these as a durable pipeline.

To deploy: copy script into Trigger.dev, wrap `main()` in a `task()`, add `trigger.config.ts`, run `npx trigger.dev@latest deploy`.

## Workflow Templates -- n8n

For non-code users. The `n8n-workflows.zip` bundle contains four importable JSONs: HubSpot to Personize sync, Webhook to Personize ingest, Personize to Slack export, Google Sheets to Personize import.

How to use: download ZIP, extract, import JSON into n8n, configure the Personize API key node (HTTP Request, Authorization: Bearer), set trigger, test, activate.

## Collection Presets -- Starter Schemas

These `presets/*.json` schemas are for post-kit customization. First provision the org with a kit (`client.kits.install({ kitId })` or the `kits_install` MCP tool; built-in kits: `personize-starter`, `engineering-memory`), then customize or extend it with these presets. To author your own kit, see the kit-authoring guide: `Docs/setup-kits/kit-authoring-guide.md`.

Pre-designed schemas with 8-12 properties, ready to deploy via `client.collections.create(preset)` or the `collection_create` MCP tool.

- **preset-sales-contact.json** -- name, email, company, title, deal stage, ARR, last contact, notes
- **preset-company.json** -- domain, industry, headcount, ARR, health score, CRM owner, renewal date
- **preset-support-ticket.json** -- title, status, priority, product area, contact email, resolution notes
- **preset-product-user.json** -- email, plan, usage score, feature flags, onboarding status, last active

SHOULD customize before deploying -- add, remove, or rename properties to match the actual data model.

## Governance Templates -- Starter Guidelines

Ready-to-use guideline bodies deployable via `context_save`. Written in MUST/SHOULD/MAY format that SmartContext understands.

- **template-brand-voice.md** -- tone rules, vocabulary list, dos/don'ts, rewrites
- **template-icp.md** -- three-tier qualification (Tier 1/2/3), firmographic and behavioral signals
- **template-sales-playbook.md** -- stage messaging, objection handling, CTA rules
- **template-compliance.md** -- opt-out handling, data retention, audit trail requirements

SHOULD customize before deploying. At minimum replace bracketed placeholders (`[YOUR COMPANY]`) and adjust criteria to match the actual business.

## Customization Patterns

- **Swap identity keys** -- replace `email` with `website_url` for company-focused workflows
- **Change collection IDs** -- get real IDs from `personize_context` or `collection_list`
- **Adjust extraction hints** -- pass a `schema` parameter with domain-specific properties
- **Modify governance constraints** -- change MUST to SHOULD for softer rules, add domain examples
- **Adjust preset properties** -- match the schema to actual data before deploying

MUST test with `--dry-run` after any customization before going live.

## Go Deeper

Need the thinking pattern for how to approach a task? Ask about `personize-agent-core`.
Need to design the schema before deploying a preset? Ask about `personize-solution-architect`.
Need exact API parameters or error codes? Ask about `personize-reference`.
