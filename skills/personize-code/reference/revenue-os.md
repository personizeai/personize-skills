# Revenue OS — Opinionated GTM Agent Pack

Revenue OS is a full, opinionated reference implementation of a GTM automation stack built on Personize SDK + Trigger.dev. Use it as a **pattern library** when a user wants AI SDR / cold outbound / multi-channel outreach / reply handling / account strategy — instead of building every pipeline from scratch from `personize-code` primitives.

**Repository:** https://github.com/personizeai/revenue-os (public, MIT)

> This is a pointer, not a package. Claude Code (or any agent with file-read access) should clone or reference the repo locally, then **copy the specific files relevant to the user's use case** into their project. Users don't take the whole 130-file repo — they take 8–45 files depending on their scope.

---

## When to reach for Revenue OS (vs bespoke personize-code pipelines)

| Use case | Revenue OS fits? | Notes |
|---|---|---|
| Cold outbound (email + LinkedIn + phone) for B2B SaaS | **Yes — the core use case** | Named cadences, sender pool, DRY_RUN gate, governance already wired |
| Inbound lead processing via webhook | **Yes** | `personize-webhook.ts` trigger handles it; pair with `enrich-apollo.ts` + `account-strategy.ts` |
| Ecommerce win-back / post-purchase / abandoned cart | **Yes — see ECOMMERCE.md** | Separate pipeline set; can coexist with B2B outbound |
| Reply classification + auto-routing | **Yes** | `analyze-reply.ts` + `imap-reply-monitor.ts` + `reply-handler.ts` trigger |
| Account-level multi-contact coordination | **Yes — the account-strategy loop** | Carpet-bomb prevention, sender assignment, pre-flight gates |
| Single one-off pipeline (e.g., "enrich this CSV once") | **No — overkill** | Use `personize-code` scaffold + one cold-outreach template |
| Non-sales automation (support triage, HR, content) | **No** | Use personize-code directly; Revenue OS patterns are GTM-shaped |
| Pure no-code / visual workflow | **No** | Use n8n via `personize-no-code-pipelines` skill |

---

## Architecture snapshot

After the 2026-04-21 agent-native convergence, Revenue OS exposes these layers:

```
┌───────────────────────────────────────────────────────────────┐
│ src/lib/memory.ts  — Central memory facade                    │
│   • memory.save / saveBatch / retrieve / retrieveDigest       │
│   • memory.update / bulkUpdate / filterByProperty / …         │
│   • Auto-unwraps ApiResponse; throws PersonizeError on failure│
├───────────────────────────────────────────────────────────────┤
│ src/lib/personize-helpers.ts  — unwrapOrThrow + error class   │
│ src/lib/dry-run.ts           — cached file-backed safety gate │
│ src/pipelines/registry.ts    — names all 33 pipeline entries  │
│ src/scripts/pipeline.ts      — CLI dispatcher (`ros pipeline`)│
│ src/mcp-server.ts            — profile-scoped MCP tool server │
├───────────────────────────────────────────────────────────────┤
│ src/pipelines/  — 30 pure async functions (business logic)    │
│ src/delivery/   — 7 real-send adapters (gmail, linkedin, …)   │
│ src/trigger/    — 22 Trigger.dev tasks (cron + webhooks only) │
│ src/lib/        — workspace, campaign, outreach-log, helpers  │
├───────────────────────────────────────────────────────────────┤
│ governance/     — 14 markdown guidelines (brand voice, ICP, …)│
│ PLAN.md         — human-owned strategic intent                │
│ STATUS.md       — agent-regenerated live state                │
│ data/state/dry_run.txt — send safety gate (default ON)        │
└───────────────────────────────────────────────────────────────┘
```

**Every pipeline is a pure async function.** No Trigger.dev imports in `src/pipelines/`. Pipelines are invokable from:
- CLI: `npm run pipeline <name> -i '<json>'`
- Direct import: `import { researchCompany } from './pipelines/research-company.js'`
- MCP tool: `run_pipeline({ name, input })` (when using Revenue OS MCP server)
- Trigger.dev task: thin wrapper in `src/trigger/` calls the pure function

---

## Decision tree — which files to copy

### Minimum viable cold outreach (~10 files)

```
src/config.ts
src/types.ts
src/lib/memory.ts
src/lib/personize-helpers.ts
src/lib/dry-run.ts
src/lib/logger.ts
src/pipelines/sync-csv.ts
src/pipelines/detect-signals.ts
src/pipelines/generate-outreach.ts
src/delivery/gmail.ts           # or smtp.ts if not Gmail
```
Plus root: `package.json`, `tsconfig.json`, `.env.example`, `CLAUDE.md`, `PLAN.md`, `STATUS.md` (template), `data/state/dry_run.txt` (contents: `true`), `governance/` starter folder.

### Add LinkedIn
```
src/delivery/linkedin.ts
src/pipelines/generate-linkedin-message.ts
src/pipelines/analyze-linkedin-event.ts
src/trigger/heyreach-webhook.ts
```

### Add AI voice calling
```
src/delivery/phone.ts
src/pipelines/generate-call-script.ts
src/pipelines/analyze-call.ts
src/trigger/call-webhooks.ts
```

### Add Apollo-powered discovery + enrichment
```
src/lib/apollo.ts
src/pipelines/discover-contacts-apollo.ts
src/pipelines/enrich-apollo.ts
src/pipelines/enrich-companies-apollo.ts
src/pipelines/source-contacts.ts
```

### Add account-level coordination (multi-contact, carpet-bomb prevention)
```
src/lib/account-workspace.ts
src/lib/campaign.ts
src/pipelines/account-strategy.ts
src/pipelines/account-preflight.ts  (if exists — check pipeline-inventory.md)
src/trigger/multichannel-engine.ts
src/trigger/outreach-engine.ts
```

### Add reply handling
```
src/pipelines/analyze-reply.ts
src/trigger/imap-reply-monitor.ts
src/trigger/reply-handler.ts
src/lib/imap-accounts.ts
src/delivery/smtp.ts               # for threaded replies
```

### Add CRM sync
```
# HubSpot:
src/pipelines/sync-hubspot.ts
src/delivery/hubspot-deliver.ts
src/trigger/crm-sync.ts
src/trigger/webhooks.ts             # HubSpot + SendGrid engagement webhooks

# Salesforce:
src/pipelines/sync-salesforce.ts
src/trigger/crm-sync.ts

# Clay:
src/pipelines/sync-clay.ts
src/trigger/clay-webhook.ts
```

### Add ecommerce personalization
See `ECOMMERCE.md` in the repo. Core files:
```
src/pipelines/sync-ecommerce.ts
src/pipelines/infer-preferences.ts
src/pipelines/ingest-enrichment.ts
```

### Add MCP server (profile-scoped)
```
src/mcp-server.ts
src/pipelines/registry.ts
```
Run with `MCP_PROFILE=workflow|agent|admin` env var. Default is `agent`.

---

## Setup flow (after copying files)

```bash
# 1. Install deps listed in copied package.json
npm install

# 2. Fill in .env (PERSONIZE_SECRET_KEY required; Trigger.dev optional)
cp .env.example .env

# 3. Create entity schemas in Personize
npx tsx src/setup/create-schemas.ts

# 4. Sync governance markdown → Personize (idempotent)
npx tsx src/setup/sync-governance.ts

# 5. Verify DRY_RUN is on
cat data/state/dry_run.txt    # should print: true

# 6. List available pipelines + smoke-test one
npx tsx src/scripts/pipeline.ts --list
npx tsx src/scripts/pipeline.ts research-company -i '{"domain":"personize.ai"}'

# 7. When ready for real sends:
npx tsx src/scripts/ros.ts dry-run off --reason "first production send"
```

---

## Agent-native primitives (the operational contract)

Revenue OS enforces a clean separation between human intent, agent execution, and safety:

| Primitive | Owner | Purpose |
|---|---|---|
| `PLAN.md` | Human | Strategic intent — vision, goals, campaigns, decisions. Agents READ it every session; never WRITE. |
| `STATUS.md` | Agent | Live system state — regenerated via `npm run status` by querying Personize. |
| `governance/<slug>/SKILL.md` | Human-editable markdown | Brand voice, ICP, outreach playbook — synced to Personize with `npm run setup:governance` (idempotent diff+apply). |
| `data/state/dry_run.txt` | Safety gate | `true` (default) = sends suppressed and logged as `[DRY_RUN] Would send …`. Flip with `ros dry-run on\|off --reason "..."`. Every flip audits to `data/state/dry_run.log`. |
| `src/lib/memory.ts` | Code | Single import surface for all memory ops. Never call `client.memory.*` directly in business code. |

**Agent operating loop:** every pipeline and tool call follows **RECALL → GOVERN → ACT → STORE**. See the Personize `agent-playbook` guideline (available via `context_retrieve({ contextNames: ['agent-playbook'] })`) for the canonical version — Revenue OS `CLAUDE.md` references it rather than duplicating.

---

## MCP profile model

The Revenue OS MCP server (`src/mcp-server.ts`) scopes tool exposure by profile:

| Profile | ~Tool count | Use case |
|---|---|---|
| `workflow` | 8 | Task-focused pipelines (read-only + narrow execution) |
| `agent` *(default)* | 20 | Broad capability for Claude Code / Cowork / Goose / OpenClaw |
| `admin` | 24 | Everything, including `set_dry_run` (requires `reason` argument, audit-logged) |

Set via env: `MCP_PROFILE=admin npx tsx src/mcp-server.ts`.

The `admin` profile is the only one that can flip the DRY_RUN safety gate. Keep autonomous agents on `workflow` or `agent` profiles unless you've explicitly authorized them to go live.

---

## Key library modules

| File | What it does | Copy when |
|---|---|---|
| `src/lib/memory.ts` | Central memory facade — every `memory.save`, `retrieve`, `saveBatch`, `update`, `filterByProperty` goes through here | Always |
| `src/lib/personize-helpers.ts` | `unwrapOrThrow<T>()` + `PersonizeError` class | Always (memory.ts needs it) |
| `src/lib/dry-run.ts` | File-backed + cached `isDryRun()` gate | When sending anything real |
| `src/lib/workspace.ts` | Contact-scoped workspace ops (tasks, notes, updates on a contact record) | Multi-step outreach |
| `src/lib/account-workspace.ts` | Company-scoped workspace (for named account strategy) | Account-level coordination |
| `src/lib/campaign.ts` | Campaign model + enrollment logic (prevents duplicate enrollment) | Campaign management |
| `src/lib/outreach-log.ts` | Structured logging of every send / reply / stage change | Production visibility |
| `src/lib/sender-profiles.ts` | Sender identity, warmup ramp, health monitoring, rotation | Multi-sender setups |
| `src/lib/governance-safety.ts` | Snapshot + restore for governance changes (audit trail) | Team-edited governance |
| `src/lib/metrics.ts` | Daily metrics collection for STATUS.md | Always |

---

## Anti-patterns to avoid

1. **Don't call `client.memory.*` directly.** Use `memory.*` from `src/lib/memory.ts` — it absorbs SDK shape divergence and auto-unwraps.
2. **Don't gate sends via env var `DRY_RUN`.** Use `data/state/dry_run.txt` — survives process restart, auditable, flippable via `ros` CLI.
3. **Don't re-introduce manual `setTimeout` rate-limit pauses** around Personize calls. The SDK's built-in retry handles 429. Keep manual pauses only for third-party APIs (Apollo, Tavily, HubSpot) that rate-limit differently.
4. **Don't couple pipelines to Trigger.dev.** Pipelines stay pure functions in `src/pipelines/`. Trigger wrappers live in `src/trigger/` and just call pure functions.
5. **Don't scatter intent across multiple README-like files.** PLAN.md is the one source for human strategic intent. Everything else (ROADMAP, AUTONOMOUS-AGENT-PLAN, etc.) is historical and lives in `archive/`.
6. **Don't store PLAN/STATUS content in environment-shaped config files.** Keep them as markdown at repo root — agents and humans both read them there.

---

## Related skills + guidelines

- **personize-code** (this skill) — the generic pipeline-building primitives Revenue OS is built on
- **personize-governance** — how the `governance/` markdown folder pattern works at scale
- **personize-memory** — memory CRUD patterns, batch import, identity resolution
- **personize-agent-workspace** — the multi-agent workspace model that `account-workspace.ts` + `workspace.ts` implement
- **personize-signal** — smart notification / event-driven alerting (used by `daily-digest.ts` pattern)
- **personize-solution-architect** — for planning before building; useful to run before adopting Revenue OS in a new org

Personize guidelines surfaced via `context_retrieve`:
- `agent-playbook` — canonical RECALL→GOVERN→ACT→STORE loop (Revenue OS CLAUDE.md references it)
- Revenue OS `governance/*` — 14 starter guidelines (brand voice, ICP definition, outreach playbook, role overlays for SDR/AE/CSM)

---

## What's intentionally NOT in Revenue OS

- **No starter repo / no `npx create-revenue-os`.** Users copy files on demand. No template to maintain.
- **No `@revenue-os/sdk` npm package.** Patterns are expressive enough as copied files. If re-use pressure grows, extract the `memory.ts` facade and `dry-run.ts` as helpers in `@personize/sdk` itself.
- **No vendor lock-in.** Email (IMAP/SMTP/Gmail API), CRM (HubSpot/Salesforce/Clay/CSV), LLM (Personize tier or BYOK OpenRouter), enrichment (Apollo swappable), research (Tavily swappable) — every slot is interchangeable.
- **No hidden decisions.** Every ICP score, every generated email, every governance rule — visible, auditable, editable.

---

## For detailed examples, read from the repo

- **Cold outreach end-to-end:** `src/pipelines/generate-outreach.ts` + `src/pipelines/detect-signals.ts` + `src/trigger/outreach-engine.ts`
- **Reply handling end-to-end:** `src/trigger/imap-reply-monitor.ts` + `src/pipelines/analyze-reply.ts` + `src/trigger/reply-handler.ts`
- **Account strategy:** `src/pipelines/account-strategy.ts` + `src/lib/account-workspace.ts`
- **Ecommerce:** `ECOMMERCE.md` + `src/pipelines/infer-preferences.ts` + `src/pipelines/sync-ecommerce.ts`
- **MCP profile-scoped server:** `src/mcp-server.ts` (18 retrofitted + 6 new tools with `registerTool([profiles], ...)`)
- **Governance markdown → Personize sync:** `src/setup/sync-governance.ts`
- **Pipeline inventory + refactor decisions:** `docs/plans/2026-04-21-agent-native-convergence.md` + `docs/plans/pipeline-inventory.md` + `docs/plans/trigger-keep-list.md`
