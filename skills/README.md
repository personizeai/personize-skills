# Skills 2.0

Four persona-based platform guidelines replacing 22 feature-based skills. Each persona is a single cohesive document an agent loads once and uses throughout a session.

## The 4 Personas

| Persona | Guideline Name | Purpose | Mode |
|---------|---------------|---------|------|
| **Agent Core** | `personize-agent-core` | How to think, compose, coordinate, self-correct, and learn. Foundation for any agent on any platform. | AlwaysOn |
| **Architect** | `personize-solution-architect` | Design, model, plan, and evaluate Personize integrations. Entity modeling, schema evolution, topology, **advanced multi-step `instructions[]` patterns** (conditional branching, multi-source reconciliation, compliance-gated generation, persona fanout, bounded research, few-shot classification, checklist-gated workflows, self-reflective refinement). | On-demand |
| **Reference** | `personize-reference` | Complete API/SDK/CLI/MCP lookup. Every endpoint, method, error code, and FAQ in one place. Includes **schedules** (recurring/one-time `run_prompt` and `send_notification`) and **CRM passthrough** (HubSpot/Salesforce direct REST API via the org's managed OAuth connection). | On-demand |
| **Enabler** | `personize-enabler` | Ready-to-run resources: TypeScript scripts, n8n templates, collection presets, governance templates. | On-demand |

## Folder Structure

```
Skills-2.0/
  personize-agent-core/
    SKILL.md                  # Main guideline document
    reference/                # Attached reference files (auto-inlined or on-demand)
  personize-solution-architect/
    SKILL.md
    reference/
      design-patterns.md            # 6 architectural patterns (event-driven, CQRS, workspace, etc.)
      instruction-patterns.md       # 9 prompt-authoring patterns (instructions[] array)
      cheat-anti-patterns.md        # Architectural + prompt-level anti-pattern catalog
      industry-*.md                 # Per-industry guidance (saas, healthcare, recruiting, ecommerce, etc.)
      schema-design-guide.md, workspace-schemas.md, ...
  personize-reference/
    SKILL.md                        # Cross-interface operation tables (Memory, Governance, Schedules, CRM, ...)
    faq/                            # FAQ files (on-demand attachments)
    reference/                      # Endpoint/SDK/CLI/MCP detailed tables
      api-endpoints.md              # All REST endpoints, incl. /api/v1/schedules + /api/v1/crm/*
      sdk-methods.md                # client.* namespace docs, incl. client.schedules, client.hubspot, client.salesforce
      mcp-tools.md                  # MCP tool catalog, incl. schedule_*
      cli-commands.md               # CLI command reference, incl. `personize schedules` + `personize crm`
      prompt-options-schema.md      # Full PromptOptions interface
      response-schemas-full.md, batch-processing.md, ...
  personize-enabler/
    SKILL.md
    scripts/                  # TypeScript scripts
    templates/                # n8n workflow templates
    presets/                  # Collection schema presets
  README.md                   # This file
  guideline-metadata.json     # Conversion config for convert-to-guidelines.ts
  convert-to-guidelines.ts    # Build script — produces platform-guidelines-v2/ output
```

## Dual-Mode Operation

Each persona works in two modes simultaneously:

1. **Local SKILL.md** — IDE agents (Claude Code, Cursor, Windsurf) read SKILL.md directly from the filesystem via skill installation.
2. **Platform guideline** — Uploaded to Personize SmartContext. The `personize_skill` MCP tool scores all 4 guidelines against the current task and delivers relevant sections + attachment previews.

The YAML frontmatter in each SKILL.md is used by `convert-to-guidelines.ts` to produce the platform format. The body content is identical in both modes.

## Tag Taxonomy

| Tag | Applies To |
|-----|-----------|
| `personize:skill` | All 4 personas |
| `personize:skill:agent` | agent-core |
| `personize:skill:core` | agent-core |
| `personize:skill:architect` | architect |
| `personize:skill:planning` | architect |
| `personize:skill:architecture` | architect |
| `personize:skill:schema` | architect |
| `personize:skill:prompt-patterns` | architect |
| `personize:skill:reference` | reference |
| `personize:skill:api` | reference |
| `personize:skill:sdk` | reference |
| `personize:skill:cli` | reference |
| `personize:skill:mcp` | reference |
| `personize:skill:schedules` | reference |
| `personize:skill:crm` | reference |
| `personize:skill:enabler` | enabler |
| `personize:skill:code` | enabler |
| `personize:skill:pipeline` | enabler |
| `personize:skill:import` | enabler |
| `personize:skill:setup` | enabler |

## Three-Tier Attachment Strategy

Attachments (reference files, scripts, templates) are sized to fit one of three delivery tiers:

| Tier | Size | Delivery |
|------|------|---------|
| **Instant** | <= 2 KB | Auto-inlined in SmartContext response body |
| **Preview** | 2-20 KB | First 10 lines shown; agent fetches rest if needed |
| **On-demand** | > 20 KB | Metadata only (name, description, size); agent calls `personize_fetch_attachment` |

Author attachments to hit the lowest tier that fits. Split large reference tables into per-topic files rather than one monolith.

Current totals (as of 2026-05-27): **4 guidelines, 81 attachments** — 33 instant, 42 preview, 6 on-demand.

## How Routing Works

1. Agent calls `personize_skill` tool with current task description.
2. SmartContext scores all 4 guidelines by semantic relevance to the task.
3. Relevant guideline sections are returned inline; attachment previews are appended.
4. Agent fetches specific attachments on demand using `personize_fetch_attachment`.
5. `agent-core` is AlwaysOn -- it is always included regardless of score.

## Converting & Seeding to the Platform

Skills 2.0 has two distinct scripts:

```bash
# 1. Local build / review (writes to platform-guidelines-v2/)
npx ts-node Skills-2.0/convert-to-guidelines.ts

# 2. Seed to the live platform (deletes existing SYSTEM guidelines, then re-creates)
npx ts-node scripts/seed-platform-guidelines.ts          # skip existing
npx ts-node scripts/seed-platform-guidelines.ts --force  # delete all + re-create
```

`seed-platform-guidelines.ts` writes to the `agents` DynamoDB table with `orgId='SYSTEM'`, `userId='system'`, `type='variables'` — and uploads attachment files to the platform's attachment S3 bucket via `AttachmentService.upload(...)`. Use `--force` to wipe and re-create all 4 guidelines + their attachments in one pass.

After seeding, the new content is available platform-wide via the `personize_skill` MCP tool and the `GET /api/v1/guidelines/download?scope=platform` endpoint (which serves a zipped manifest from S3 at `platform-guidelines/v2/guidelines.zip`).

## Versioning & Migration Status

Skills 2.0 reached **feature parity with `Skills-Optimized/` as of 2026-05-27**. The historical 22 feature-based skills have been consolidated into the 4 personas, and the recent Skills-Optimized merges (schedules, CRM passthrough, advanced instruction patterns) have been ported into the relevant personas. Track which Skills-Optimized skills feed each persona in `guideline-metadata.json` under each persona's `migratedFrom` array:

| Persona | `migratedFrom` (Skills-Optimized sources) |
|---------|-------------------------------------------|
| personize-agent-core | (greenfield — new mental-model layer) |
| personize-solution-architect | (renamed 2026-05-31 from `personize-architect`; before that consolidated from `personize-solution-architect` + `personize-instructions-advanced`) |
| personize-reference | `personize` (master), `personize-memory`, `personize-governance`, `personize-schedules`, `personize-crm-passthrough` |
| personize-enabler | `personize-code`, `personize-agent-workspace` |

Once `Skills-Optimized/` is archived, this folder becomes the sole source of truth for the platform-guideline pipeline.

## Tested Against

- **API:** `/api/v1/*` for schedules + CRM passthrough (v1.1 does not yet expose these surfaces). `/api/v1/prompt` and `/api/v1.1/prompt` mirror each other for the `instructions[]` payload — no payload differences. v1 sunsets `2026-07-15` for the routes listed in [../Docs/MIGRATION-GUIDE-v1.1.md](../Docs/MIGRATION-GUIDE-v1.1.md); schedules and CRM passthrough are NOT in that deprecation set.
- **SDK:** `@personize/sdk@0.12.0` — verified `client.schedules.{create,list,get,update,delete,executions}`, `client.hubspot.{contacts,companies,deals,tasks,notes,request}`, `client.salesforce.{request,query,queryAll,sobject(...).{create,get,update,upsert,delete}}`, `client.ai.prompt({ instructions: [...] })`.
- **CLI:** `@personize/cli@0.5.0`.

## Recent Changes

### 2026-05-27 — Parity port from Skills-Optimized

Ported the schedules + CRM passthrough + advanced-instructions content that had landed in `Skills-Optimized/` but had not yet reached Skills-2.0. Specifically:

**Reference persona:**
- `SKILL.md` — added "Schedules Reference" and "CRM Direct Access (HubSpot & Salesforce)" tables before "Authentication and Keys"
- `reference/sdk-methods.md` — appended `client.schedules`, `client.hubspot`, `client.salesforce` sections with full method signatures
- `reference/api-endpoints.md` — added "Schedules Endpoints" and "CRM Passthrough Endpoints" tables with v1.1 sunset clarification
- `reference/mcp-tools.md` — added "Schedules" section with `schedule_create`, `schedule_list`, `schedule_get`, `schedule_update`, `schedule_delete`, `schedule_executions`
- `reference/cli-commands.md` — added `personize schedules *` and `personize crm hubspot|salesforce` command groups

**Architect persona:**
- `reference/instruction-patterns.md` (NEW) — 9-pattern catalog (A–I), error-handling tier framework (T1–T4), context-wiring rules, instruction-scope gotchas, abort vs. stop-workflow distinction, full pattern detail with examples
- `reference/cheat-anti-patterns.md` — extended with a 22-row "Prompt-level anti-patterns" table
- `SKILL.md` — added "Advanced Multi-Step Instruction Patterns" section with the 9-pattern selector + tier framework

**Migration tracker:**
- `guideline-metadata.json` — populated `migratedFrom` for all 4 personas; updated descriptions to match SKILL.md frontmatter; added `$migrationNotes`
