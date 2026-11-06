---
name: personize-agent-core
description: "Use as the foundation for any autonomous Personize-powered agent on any platform -- how to think, compose tools, coordinate, self-correct, and learn. Trigger when building or running an agent on Personize memory and governance: bootstrap, the core loop (recall-govern-act-store), tool composition, multi-agent coordination, self-correction, analysis, code generation, governance compliance, risk, resilience, learning, observability, and cost awareness."
license: Apache-2.0
compatibility: "Requires Personize MCP server or @personize/sdk with a Personize API key (sk_live_...)"
metadata: {"author": "personize-ai", "version": "2.0", "homepage": "https://personize.ai", "alwaysOn": true}
---

# personize-agent-core

**Description:** How to think, compose, coordinate, self-correct, and learn as an autonomous Personize-powered agent. Covers bootstrap, core loop, tool composition, multi-agent coordination, self-correction, analysis, code generation, governance compliance, risk management, resilience, learning, observability, and cost awareness. Use as the foundation for any agent on any platform.

**Tags:** `personize:skill`, `personize:skill:agent`, `personize:skill:core`

---

## agent2_0 Profile: Core Tool Surface

On the `agent2_0` MCP profile the core tools are `memory_retrieve`, `memory_save`, `memory_delete`, plus `personize_md`. The sections below describe the wider surface; this section is your authoritative override. This section needs the core MCP tool list (legacy variant: see the migration table).

### Bootstrap (agent2_0)
MUST call `personize_md` first: it returns org identity, collections schema, guidelines index, routing rules, session phase, and any handoffs. This replaces the old two-call platform-guidance-plus-org-state bootstrap in a single call. MUST then call `memory_retrieve(about='self')` to recall self-private preferences from prior sessions. If it returns nothing, fall back to whatever `personize_md`'s handoffs surfaced.

### Core Loop (agent2_0): Recall → Govern → Act → Store

| Step | What | Call |
|---|---|---|
| Recall | What do we know about the entities involved? | `memory_retrieve(mode='scout', record={email:...})` or `mode='filter'` for lists |
| Govern | What rules apply to this task? | `memory_retrieve(mode='scout', message='...', sources={documents:true, memories:false}, intent={perSource:{documents:{types:['guideline','playbook']}}})` |
| Act | Generate, decide, execute | n/a |
| Store (record) | What happened to this record? | `memory_save(record={email:...}, content=...)` or `shape:'property'` with `operations:[...]` |
| Store (org-level) | Generalizable learning or updated policy | `memory_save(shape='document', type='guideline')` with no record key |

**Calling retrieve twice per turn is correct and expected.** First call is memory-intent (scout/filter); second is governance-intent (contexts). Do not skip the governance call.

### Write Decision (agent2_0)

| Situation | Call |
|---|---|
| Structured field update (title, status, score) | `memory_save(shape='property', record={email:...}, operations:[{op:'set', property:'Status', value:'active'}])` |
| Narrative document (call summary, deal brief) | `memory_save(record={email:...}, shape='document', content='...')` |
| Both shapes for same record | Call `memory_save` **TWICE** on the same key: once for properties, once for document |
| Org-level learning / policy update | `memory_save(shape='document', type='guideline')` with **no** email/website_url key |
| Batch of content items | `memory_save(shape='shortform', items=[...])`. Do not put `identifiers` inside `items[]`: the code rejects it. |

Org-level documents (no record key) are readable by all agents and teammates via `memory_retrieve` with a `message` and `sources={documents:true}`.

### Retrieval Strategy (agent2_0)

Scout first (topK≈5), assess gaps, then follow up with targeted calls:
1. `memory_retrieve(mode='scout', record={websiteUrl:'acme.io'})`: company overview
2. `memory_retrieve(mode='filter', filters={groups: [{conditions: [...]}]})`: contacts, deals, or segments
3. `memory_retrieve(mode='scout', message='policy for this scenario', sources={documents:true, memories:false}, intent={perSource:{documents:{types:['guideline','playbook']}}})`: governance
4. `memory_retrieve(mode='scout', record={id:...}, sources={graph:true})`: relationship traversal if needed
5. `memory_retrieve(mode='expand', continueFrom=<sessionId>)`: deepen a prior session

Full account brief typically needs 3 calls. Never pre-fetch everything speculatively.

For scale operations (5+ records, bulk import, sync, dedup): call `personize_md(topic='bulk', message='<what you are doing>')` first for a proven recipe. Never hand-loop 50 individual saves.

---

## Bootstrap -- First Thing Every Session

MUST call `personize_md` first -- it reveals org, collections, capabilities, and routing rules in one call. Without it, you are guessing at org state and will make mistakes. MUST recall self-memory (`memory_retrieve(about='self')`) for previous learnings. SHOULD check workspace for pending tasks. SHOULD check governance docs with `memory_retrieve(mode='scout', message='<task or rule topic>', sources={documents:true, memories:false}, ...)` for current rules. For a specific "how do I do X" question, call `personize_md(topic='bulk', message='<how do I do X>')` on demand. Use `session_id` to link queries -- pronouns resolve to previous results within 5-min TTL.

Bootstrap order: `personize_md` → `memory_retrieve(about='self')` → governance `memory_retrieve(mode='scout', message='<task or rule topic>', sources={documents:true, memories:false})`. MUST NOT skip `personize_md` -- because without org state and platform guidance, agents confuse collections with guidelines, misuse tools, and fail to verify their own actions.

### Existing Project Continuity

For existing projects (collections and guidelines exist), SHOULD check for pending work after bootstrap:
- `memory_retrieve` with `mode='filter'` for overdue items (e.g., `last_contact_date` older than follow-up window, tasks with status `pending`)
- Read workspace `system:{project-slug}` for pending tasks and recent errors
- Read guideline `{project}:agent-notes` for accumulated agent knowledge

This is how session-based agents handle recurring work without schedulers: at every session start, query Personize for what's due. The contact properties and workspace state ARE the task queue.

### System Complexity Detection

Before building, classify the project:

**SIMPLE** (just storing + recalling data): collections + properties + basic governance. Agent-core is sufficient.

**PRODUCTION** (coordinated actions, sequences, multiple entity types, external channels): MUST load `personize-solution-architect` for design patterns. Ask `personize_md(topic='bulk', message='design patterns for [project description]')`.

Signals that it's PRODUCTION: multiple entity types that interact (contacts + companies, patients + providers), sequences or journeys (follow-ups, onboarding, care plans), multiple agents or roles handling different stages, external channel delivery (email, SMS, Slack), need to track what was sent and measure what worked.

### Fresh Org Detection

If `personize_md` returns empty collections or no guidelines: MUST enter setup mode before doing anything else. Setup mode means: ask the user what they're building, propose entity model and governance, then create collections and guidelines via actual tool calls. MUST NOT proceed with tasks in an unconfigured org -- because every action depends on schema and governance being in place.

## The Core Loop -- Recall Govern Act Store

Every task follows four steps. This is a thinking pattern, not a rigid workflow.

**Recall** context via `memory_retrieve` (mode='scout' or mode='brief'). **Govern** by checking guidelines separately: `memory_retrieve(mode='scout', message='...', sources={documents:true, memories:false}, intent={perSource:{documents:{types:['guideline','playbook']}}})`. **Act** -- generate, update, notify, create (load playbooks/templates here if needed). **Store** what happened via `memory_save` and update workspace.

**Governance is a separate step, not mixed with knowledge retrieval.** Guidelines are the human's control lever -- enforceable rules that constrain agent behavior. They are NOT the same as playbooks, references, or templates. MUST retrieve guidelines separately and check them BEFORE acting. Knowledge docs (playbooks, references, templates, briefs) improve quality but don't constrain -- load them DURING acting.

| Step | What | Call |
|---|---|---|
| Recall | What do we know? | `memory_retrieve` (mode='scout' or mode='brief') |
| Govern | What rules apply? | `memory_retrieve(mode='scout', message='...', sources={documents:true, memories:false}, intent={perSource:{documents:{types:['guideline','playbook']}}})` |
| Act | Generate, decide, execute | Load playbooks/templates as needed via the same `memory_retrieve(mode='scout', message='...', sources={documents:true, memories:false}, intent={perSource:{documents:{types:['guideline','playbook']}}})` call |
| Store | What happened? | `memory_save`, update workspace |

If a playbook says "use aggressive tone" but a guideline says "MUST be consultative" -- the guideline wins. Always.

Error recovery: rate limit -- back off, retry. Auth error -- surface to user. Not found -- try alternative identity keys. Unknown -- log, try alternative, surface if stuck.

## Platform Gotchas -- Read Before Your First Call

**Saving is async.** After `memory_save` returns a `recordId`, the record may not be queryable for 1-3 seconds. If you immediately call `memory_save` with `shape:'property'` on that recordId, you'll get 404 RECORD_NOT_FOUND. MUST retry with backoff (wait 1s, 2s, 3s) -- not a fixed sleep.

**Property names are Title Case.** When writing properties, MUST use Title Case (`Status`, `Workspace Name`, `Pending Tasks`) -- not snake_case. The API returns properties in Title Case. `memory_retrieve` `mode='filter'` conditions MUST use Title Case: `filters.groups[].conditions[] = { property: 'Status', operator: 'EQ', value: 'active' }`.

**Array properties: push, don't replace.** Properties like Notes, Updates, Tasks, Issues, Decisions are append-only arrays. MUST use `memory_save(shape:'property', record:{...}, operations:[{op:'push', property:'Notes', value:'new entry'}])` -- not `op:'set'`. Using `op:'set'` on an append-only property overwrites the entire array.

**Filter syntax (`mode='filter'`).** Shape is `filters.groups[].conditions[] = {property, operator, value}`. Operators include `EQ`, `NEQ`, `CONTAINS`, `GT`, `IN`, `IS_SET`, `BETWEEN` (17 in total). NOT `equals`, `eq`, or `==`.

GOOD: "Let me check what we know about Sarah" -> recall -> "Guidelines say use consultative tone" -> govern -> draft email -> act -> save the draft and outcome with `memory_save` -> store.
BAD: Draft email immediately without recalling context or checking governance.

## Composing Tools

Select by intent: `memory_retrieve(mode='scout')` for any retrieval (default). `memory_retrieve(mode='brief')` for a full entity narrative or a synthesized answer (LLM-compiled). `memory_save` for rich text (AI extraction is always on). `memory_save` with `shape:'property'` for structured writes and single property changes with known field values (no AI extraction, one call per record); `memory_save` with `shape:'shortform'` and `items[]` (or the `personize_md(topic='bulk', message='<what you are doing>')` recipe) for content batches that need AI extraction. `memory_delete` for deletes. Responses API for multi-step orchestration. `memory_retrieve(mode='scout', message='<task or rule topic>', sources={documents:true, memories:false})` for governance.

When creating collections: MUST write property descriptions that guide extraction ("Annual deal budget in USD, extracted from pricing discussions" not just "Budget") -- because the description IS the extraction instruction. MUST use `select`/`multi-select` for properties with enumerable values (deal stages, reply classifications, funding stages) -- because it constrains extraction and enables `mode='filter'`. SHOULD check `personize-enabler` presets before designing schema from scratch.

`memory_retrieve` `mode='filter'`: deterministic query (no LLM). Use for known-schema filters like "Deal Stage = Qualified". SHOULD prefer over `mode='scout'` when the query maps to structured conditions -- because it is instant and zero-cost. `memory_retrieve mode=scout with filters`: LLM-powered property search. More powerful but costs credits. Use when the query is natural language. SDK auto-resolves `collectionName` to `collectionId` -- use names for readability. `records` shorthand (pass a `{ email, content, properties: {} }` array instead of raw mapping/rows -- SDK handles the transformation): use it with `client.memory.save({ shape: 'shortform', items: [...] })` for content batches, or `client.memory.save({ shape: 'property', record, operations: [{ op: 'set', property, value }] })` (one call per record) for structured field values. Do not put `identifiers` inside `items[]`: the code rejects it.

## Execute Then Verify -- Never Describe Without Doing

MUST actually call tools, not just describe what you would call. Writing "I will create a collection with these properties" in a document is NOT the same as calling `collection_create`. The user's system remains unconfigured.

After every create/update operation, MUST verify the result:
- After `collection_create` or `collection_update` → call `collection_list` and confirm properties exist
- After `memory_save(shape:'document', type:'guideline', content:'...')` → call `memory_retrieve(mode='filter', filters={documents:{docType:['guideline']}})` and confirm the guideline appears (you can add `status:['active']`)
- After `memory_save` → call `memory_retrieve` to verify content was stored
- After `memory_save` with `shape:'property'` → call `memory_retrieve(mode='fetch', fetch:{recordIds:["<id>"]})` to verify the value

MUST NOT claim "I created X" without having called the tool AND verified the result. This is the #1 failure mode: agents plan actions in documents but never execute them.

## Self-Correction -- Detect Diagnose Fix

After saving: verify with `memory_retrieve`. Empty properties? Re-save with `schema`, `tier:"pro"`, `actionId`. After recalling empty: broaden -- different identity key, remove entity scope. Irrelevant? Add `type` filter, `collectionNames`. After generating: compare against MUST constraints, regenerate if violated. Check `creditsCharged` -- high means wrong tier/mode. MUST NOT repeat the same failing approach.

Soft delete is recoverable: `memory.delete()` and `deleteRecord()` have 30-day recovery window. Use `cancelDeletion()` to restore. MUST NOT panic on accidental deletes -- because the data is still recoverable within the retention window. Optimistic concurrency: if `memory_save` (`shape:'property'`) returns 409 (version mismatch), another agent updated the record. Re-read with fresh data and retry. SHOULD pass `ifMatch:<version>` on each operation (`operations:[{op:'set', property, value, ifMatch}]`) -- because it prevents silent overwrites.

## Analysis Patterns

MUST ground analysis in data -- state confidence and evidence count. MUST NOT fabricate.

**Deep-dive:** `memory_retrieve(mode='brief')`. **Cross-entity:** `memory_retrieve(mode='scout')` without entity scope, `groupByRecord:true`. **Comparison:** comparative query across entities. **Trends:** `memory_retrieve(mode='filter')` with `updatedAfter` / `sortOrder` to surface what changed recently. **Segmentation:** `memory_retrieve(mode='filter')` on the segment properties. **Aggregation:** `memory_retrieve(mode='scout')` with count/aggregate intent.

## Multi-Agent Coordination

MUST check workspace before acting -- another agent may have already done this.

**Claim** tasks as `in_progress` before starting. **Store** outcome when done. **Delegate** via workspace tasks with clear scope. **Signal** via notifications. **Handoff** full context at capability boundaries. **Conflict:** last-write-wins; governance defines merge strategies.

Broadcast with a clickable button: `notification_broadcast(role:'admin', title:'Q2 Report Ready', message:'Analysis complete.', actionUrl:'https://...', actionLabel:'View Report')`. Use `role:'all'` to reach everyone. If a report or file was generated and hosted externally (S3, GCS, a dashboard URL), pass the URL as `actionUrl` -- the notification becomes the delivery mechanism. Always notify the requester after a long-running task completes.

Concurrent safety: SHOULD use `memory_save` (`shape:'property'`) with `ifMatch:<version>` on each operation (`operations:[{op:'set', property, value, ifMatch}]`) when multiple agents may update the same record -- because 409 response means another agent wrote first. Re-read with fresh data and retry. Notification actions: use `notifications.executeAction()` to respond to actionable notifications from other agents or humans.

## Interface Selection -- MCP vs SDK vs CLI

MCP tools are the default for AI agents. But some tasks are better done via SDK or CLI when they're installed in the project. Check `package.json` for `@personize/sdk` or `@personize/cli`.

| Task | Best Interface | Why |
|---|---|---|
| Recall, save, governance checks, property updates | MCP tools | Interactive, per-call |
| Download all guidelines to local files | SDK script or CLI | `memory_retrieve` (`mode='filter'` then `mode='fetch'` per document) in a loop is slow; bulk download is one call |
| Batch CSV import (100+ records) | SDK script (`script-data-ingest.ts`) | Rate limiting, progress tracking, dry-run |
| Sync guidelines to/from git | SDK script (`script-sync-org-guidelines.ts`) | Pull/push with diff detection |
| One-time bulk operations | SDK script | Better error handling, retry, checkpointing |
| Quick terminal operations | CLI (`npx personize`) | Fast, no code needed |

When SDK is available, SHOULD use enabler scripts for bulk operations instead of chaining many MCP tool calls. Load `personize-enabler` to see available scripts.

## Writing and Executing Code

When no `personize-enabler` script fits, write your own using `@personize/sdk`. MUST start with `--dry-run` -- untested scripts against production are high risk. MUST be self-contained, JSON-in/JSON-out, with error handling. SHOULD store successful scripts as guideline attachments. Prefer scripts over long tool-call chains.

## Agentic Workflows -- Prompt and Responses

Three orchestration modes, selected by complexity:

- `ai.prompt`: single prompt with optional tools, evaluation (`evaluate: { criteria, serverSide: true }`), and auto-save (`memorize: true`). Use for: generate content, extract data, evaluate quality. Streaming via `promptStream()` for real-time UX. MUST use with `evaluate` when quality matters -- because server-side evaluation catches governance violations before the output reaches the user.
- `responses.create`: multi-step orchestration with client-executed tools. SDK auto-loops: send request -> server returns `requires_action` with tool_calls -> SDK executes tools locally -> sends results -> repeats (max 20 rounds). Use for: complex workflows where the agent needs to call external APIs, query databases, or chain multiple actions per record.
- `chat.completions`: OpenAI-compatible drop-in. Use when replacing existing OpenAI code with zero changes.

Batch-apply pattern: loop records through `responses.create` with tools. For each record: recall context -> generate with governance -> store outcome. SHOULD checkpoint to workspace after each batch of 10.

## Governance Compliance

MUST check guidelines before generating -- governance is the human's control lever. **MUST** = non-negotiable. **SHOULD** = strong default, override with reasoning. **MAY** = discretion. MUST NOT state facts without memory evidence -- if recall returns nothing, say so. Conflicts: MUST overrides SHOULD; specific overrides general.

## Capability Boundaries

MUST surface capability limitations to the user instead of silently skipping. Personize is the memory and governance layer -- it stores, recalls, governs, and coordinates. Actions like sending emails, polling inboxes, calling external APIs, or running on a schedule require external tools (other MCPs, SMTP, Trigger.dev, cron). When a task requires infrastructure not available: explain what Personize handles (draft, govern, store, coordinate) and what the user needs to provide (SMTP credentials, external MCP, scheduler). MUST NOT pretend to have capabilities it doesn't have.

## Confirmations and Risk

**Rate every action before doing it** on four axes -- read vs write, reversibility, permission/scope (whose data, how many records), and financial/data impact. The highest axis sets the tier.

**Low** (read, recall, search): act immediately. **Medium** (save, update): act, inform user. **High** (delete, bulk >10, email/external send): confirm first. **Critical** (delete collection, compliance-sensitive, org-wide, irreversible): confirm + explain impact. Start with `--dry-run`, review, then run live.

## Resilience -- Checkpoint and Resume

MUST checkpoint in workspace after each step -- failures should not require restarting. Store error and step number on failure. Resume from last successful step on retry or handoff. Batch: track succeeded/failed/skipped per item, retry only failed. Use `eventId` to poll async status.

SDK has built-in retry: 3x exponential backoff for 429 and 5xx errors. MUST NOT implement custom retry for SDK calls -- because double-retry causes cascading delays. For rollback: read `guidelines.history()` or `collections.history(mode:'diff')` to find the previous version, then apply it via update. SHOULD always include `historyNote` on updates -- because it creates an audit trail for rollback decisions.

## Learning and Self-Memory

Store what worked, what failed, and why. Use `about:"self"` for learnings that persist across sessions. Self-improvement: notice failure patterns, adjust (e.g., "basic tier for transcripts gives poor extraction -- use pro"). After completing a task, save approach and result for future sessions.

**User identity belongs on the self-record.** When you learn the user's name, role, company, or preferences, MUST store on `about:"self"` -- not only on workspace/project records. Next session, `memory_retrieve(about='self')` should return who the user is without searching across all records. If `about:"self"` returns empty, try `memory_retrieve` with the user's name or domain as a broader fallback.

MUST call `memory_save(about:"self")` before session ends -- because without it, the next session starts from zero. Content should include: who the user is (name, role, company), what was built/configured, decisions made, what worked, what failed, pending tasks.

Session-end checklist:
1. Store learnings + user identity: `memory_save(content:"...", about:"self")`
2. Update workspace Context if any workspace was written to
3. Surface pending tasks or open questions to the user

## Self-Workspace Pattern

Agents use the Workspace collection for their own project state -- same collection used by contacts and companies. Each project is a separate record identified by `customKeyName` + `customKeyValue`. Agent profile (not project-scoped) uses `about:"self"`.

**MUST** include userId in `customKeyValue` for self-workspace records -- `generateRecordId` is org-scoped, not user-scoped. Without it, two agents using the same project name collide silently into the same record.

```
GOOD: customKeyName:"Self_Project", customKeyValue:"{userId}_gtm-os"
BAD:  customKeyName:"Self_Project", customKeyValue:"gtm-os"  ← collides across all agents
```

**MUST NOT** combine `about:"self"` with `customKeyName`/`customKeyValue` in the same call -- `memory_save` with `shape:'property'` routes to the customKey record, `memory_save` with `shape:'text'` routes to the email record. They write to different records.

**MUST** set `Workspace Name`, `Workspace Type`, and `Workspace Description` on creation. Without `Workspace Name`, the record is invisible to the IS_SET discovery filter.

**MUST** update `Context` at session end for every workspace written to. The next agent starts from Context -- if it is stale, handoff fails.

**SHOULD** use `memory_save(shape:'document', type:'guideline', ...)` for org-wide learnings rather than storing them in workspace Notes. Notes benefit one record; guidelines benefit all agents.

**Warning triggers** -- surface these to the user:
- `customKeyValue` has no userId prefix on a Self_Project record
- `about:"self"` and `customKeyName` both appear in the same call
- Session ending without updating Context on written workspaces
- Workspace created without setting Workspace Name

Discover all agent workspaces: `search({ groups: [{ conditions: [{ property: "Workspace Name", operator: "IS_SET" }] }] })`. Full patterns, session flow, and anti-pattern table: load `workspace-patterns` attachment.

## Observability -- Log What You Do

MUST log significant actions to workspace timeline -- autonomous agents must be accountable. Log each step of multi-step operations. Record decision reasoning in self-memory. Creates audit trail for humans and other agents.

## Cost and Credit Awareness

Scout retrieve: 1 credit (~500ms). Brief retrieve (~1-3s): billed by quality tier only when Personize's model synthesizes (`synthesize:true`): basic 2 / pro 4 (default) / ultra 8; 1 when the org uses its own model, and 1 for brief without synthesis. Scout with a `message` is billed at the tier rate (pro 4 default); scout without a message is 1. Calls through MCP that use no model are free. Save: 1 credit/item. List/get via filter/fetch, similar and memory list: 1 credit per call for API-key callers, 0 in the UI and MCP. Doc search (`memory_retrieve` on documents): retrieve rate, pro 4 / basic 2. Guidelines: 0. Workspace: 0.

SHOULD prefer fast mode by default -- 80% of queries need no synthesis. Batch for 10+ items. Check balance before large operations.

## Go Deeper

Exact API parameters or error codes? Load `personize-reference`. Ready-to-run scripts? Load `personize-enabler`. Schema design or integration planning? Load `personize-solution-architect`.
