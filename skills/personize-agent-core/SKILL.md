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

## agent2_0 Profile — 5-Tool Surface Override

If you are on the `agent2_0` MCP profile, you have exactly 5 tools: `retrieve_unified`, `retrieve_feedback`, `memory_save`, `personize_cookbook`, `personize_md`. The sections below describe the full legacy surface — this section is your authoritative override.

### Bootstrap (agent2_0)
MUST call `personize_md` first — it returns org identity, collections schema, guidelines index, routing rules, session phase, and any handoffs. This replaces both `personize_skill` and `personize_context` in a single call. MUST then call `retrieve_feedback` to recall self-private preferences from prior sessions.

### Core Loop (agent2_0) — Recall → Govern → Act → Store

| Step | What | Call |
|---|---|---|
| Recall | What do we know about the entities involved? | `retrieve_unified(mode='scout', email=...)` or `mode='filter'` for lists |
| Govern | What rules apply to this task? | `retrieve_unified(mode='scout', message='...', sources={documents:true, memories:false}, intent={perSource:{documents:{types:['guideline','playbook']}}})` |
| Act | Generate, decide, execute | — |
| Store (record) | What happened to this record? | `memory_save(email=..., content=...)` or `properties={...}` |
| Store (org-level) | Generalizable learning or updated policy | `memory_save(shape='document', type='guideline')` — no record key |

**Calling retrieve_unified twice per turn is correct and expected.** First call is memory-intent (scout/filter); second is governance-intent (contexts). Do not skip the governance call.

### Write Decision (agent2_0)

| Situation | Call |
|---|---|
| Structured field update (title, status, score) | `memory_save(email=..., properties={ field: value })` — content optional |
| Narrative document (call summary, deal brief) | `memory_save(email=..., shape='document', content='...')` |
| Both shapes for same record | Call `memory_save` **TWICE** on the same key — once for properties, once for document |
| Org-level learning / policy update | `memory_save(shape='document', type='guideline')` with **no** email/website_url key |

Org-level documents (no record key) are readable by all agents and teammates via `retrieve_unified` with `sources={documents:true}`.

### Retrieval Strategy (agent2_0)

Scout first (topK≈5), assess gaps, then follow up with targeted calls:
1. `retrieve_unified(mode='scout', website_url='acme.io')` — company overview
2. `retrieve_unified(mode='filter', filters=[...])` — contacts, deals, or segments
3. `retrieve_unified(mode='scout', message='policy for this scenario', sources={documents:true, memories:false}, intent={perSource:{documents:{types:['guideline','playbook']}}})` — governance
4. `retrieve_unified(mode='scout', record={id:...}, sources={graph:true})` — relationship traversal if needed
5. `retrieve_unified(mode='expand', continueFrom=<sessionId>)` — deepen a prior session

Full account brief typically needs 3 calls. Never pre-fetch everything speculatively.

For scale operations (5+ records, bulk import, sync, dedup): call `personize_cookbook` first for a proven recipe. Never hand-loop 50 individual saves.

---

## Bootstrap -- First Thing Every Session

MUST call `personize_skill` first -- it loads platform guidance (how to use Personize correctly). Without it, you are guessing at tool behavior and will make mistakes. THEN call `personize_context` -- it reveals org, collections, and capabilities. MUST recall self-memory (`about:"self"`) for previous learnings. SHOULD check workspace for pending tasks. SHOULD check `ai_smart_guidelines` for current rules. Use `session_id` to link queries -- pronouns resolve to previous results within 5-min TTL.

Bootstrap order: `personize_skill` → `personize_context` → `memory_recall_pro(about:"self")` → `ai_smart_guidelines`. MUST NOT skip `personize_skill` -- because without platform guidance, agents confuse collections with guidelines, misuse tools, and fail to verify their own actions.

### Existing Project Continuity

For existing projects (collections and guidelines exist), SHOULD check for pending work after bootstrap:
- `filterByProperty` for overdue items (e.g., `last_contact_date` older than follow-up window, tasks with status `pending`)
- Read workspace `system:{project-slug}` for pending tasks and recent errors
- Read guideline `{project}:agent-notes` for accumulated agent knowledge

This is how session-based agents handle recurring work without schedulers: at every session start, query Personize for what's due. The contact properties and workspace state ARE the task queue.

### System Complexity Detection

Before building, classify the project:

**SIMPLE** (just storing + recalling data): collections + properties + basic governance. Agent-core is sufficient.

**PRODUCTION** (coordinated actions, sequences, multiple entity types, external channels): MUST load `personize-solution-architect` for design patterns. Ask `personize_skill`: "design patterns for [project description]."

Signals that it's PRODUCTION: multiple entity types that interact (contacts + companies, patients + providers), sequences or journeys (follow-ups, onboarding, care plans), multiple agents or roles handling different stages, external channel delivery (email, SMS, Slack), need to track what was sent and measure what worked.

### Fresh Org Detection

If `personize_context` returns empty collections or no guidelines: MUST enter setup mode before doing anything else. Setup mode means: ask the user what they're building, propose entity model and governance, then create collections and guidelines via actual tool calls. MUST NOT proceed with tasks in an unconfigured org -- because every action depends on schema and governance being in place.

## The Core Loop -- Recall Govern Act Store

Every task follows four steps. This is a thinking pattern, not a rigid workflow.

**Recall** context via `memory_retrieve` or `memory_digest`. **Govern** by checking guidelines separately: `context_retrieve(types:["guideline"])`. **Act** -- generate, update, notify, create (load playbooks/templates here if needed). **Store** what happened via `memory_save` and update workspace.

**Governance is a separate step, not mixed with knowledge retrieval.** Guidelines are the human's control lever -- enforceable rules that constrain agent behavior. They are NOT the same as playbooks, references, or templates. MUST retrieve guidelines separately and check them BEFORE acting. Knowledge docs (playbooks, references, templates, briefs) improve quality but don't constrain -- load them DURING acting.

| Step | What | Call |
|---|---|---|
| Recall | What do we know? | `memory_retrieve` or `memory_digest` |
| Govern | What rules apply? | `context_retrieve(types:["guideline"], match:"strict")` -- guidelines ONLY, high-confidence only |
| Act | Generate, decide, execute | Load playbooks/templates as needed via `context_retrieve` (use `match:"broad"` + `topK` to surface related content broadly) |

**Match parameter:** When retrieving guidelines you'll act on without verification, use `match:"strict"` -- it returns only high-confidence matches (score >= 0.7) and may return empty. When surfacing related content broadly across attached docs, use `match:"broad"` with a `topK` (default 20) to get a hierarchical doc->sections shape. Default `match:"balanced"` keeps the current score-floor + 10K-token-budget behavior.
| Store | What happened? | `memory_save`, update workspace |

If a playbook says "use aggressive tone" but a guideline says "MUST be consultative" -- the guideline wins. Always.

Error recovery: rate limit -- back off, retry. Auth error -- surface to user. Not found -- try alternative identity keys. Unknown -- log, try alternative, surface if stuck.

## Platform Gotchas -- Read Before Your First Call

**Memorize is async.** After `memory_save` returns a `recordId`, the record may not be queryable for 1-3 seconds. If you immediately call `memory_update_property` or `memory_update_properties` on that recordId, you'll get 404 RECORD_NOT_FOUND. MUST retry with backoff (wait 1s, 2s, 3s) -- not a fixed sleep.

**Property names are Title Case.** When writing properties, MUST use Title Case (`Status`, `Workspace Name`, `Pending Tasks`) -- not snake_case. The API returns properties in Title Case. `filterByProperty` conditions MUST use Title Case: `{ propertyName: 'Status', operator: 'equals', value: 'active' }`.

**Array properties: push, don't replace.** Properties like Notes, Updates, Tasks, Issues, Decisions are append-only arrays. MUST use `arrayPush: { items: ['new entry'], unique: false }` -- not `propertyValue`. Using `propertyValue` on an append-only property overwrites the entire array.

**filterByProperty syntax.** Field is `propertyName` (not `property`). Operators: `equals`, `notEquals`, `contains`, `gt`, `lt`, `gte`, `lte`, `exists`, `isEmpty`. NOT `EQ`, `eq`, or `==`.

GOOD: "Let me check what we know about Sarah" -> recall -> "Guidelines say use consultative tone" -> govern -> draft email -> act -> memorize the draft and outcome -> store.
BAD: Draft email immediately without recalling context or checking governance.

## Composing Tools

Select by intent: `smartRecall` for any retrieval (default). `memory_digest` for full entity narrative. `recall_pro` `mode:"deep"` for synthesized answers. `memory_save` for rich text (AI extraction is always on). `memory_upsert` for structured batch writes with known field values (single or batch, no AI extraction -- the canonical create/upsert path); `client.memory.saveBatch()` or the `personize_cookbook` recipe for content batches that need AI extraction. `memory_update_property` for single property changes. Responses API for multi-step orchestration. `ai_smart_guidelines` for governance.

When creating collections: MUST write property descriptions that guide extraction ("Annual deal budget in USD, extracted from pricing discussions" not just "Budget") -- because the description IS the extraction instruction. MUST use `select`/`multi-select` for properties with enumerable values (deal stages, reply classifications, funding stages) -- because it constrains extraction and enables `filterByProperty`. SHOULD check `personize-enabler` presets before designing schema from scratch.

`filterByProperty`: free deterministic query (no LLM, no credits). Use for known-schema filters like "Deal Stage = Qualified". SHOULD prefer over `smartRecall` when the query maps to structured conditions -- because it is instant and zero-cost. `queryProperties`: LLM-powered property search. More powerful but costs credits. Use when the query is natural language. SDK auto-resolves `collectionName` to `collectionId` -- use names for readability. `records` shorthand (pass a `{ email, content, properties: {} }` array instead of raw mapping/rows -- SDK handles the transformation): use it with `client.memory.saveBatch()` for content batches, or with `memory_upsert` / `client.memory.upsert()` for structured field values. `memorizeBatch` is DEPRECATED -- route structured writes to `memory_upsert` and content extraction to `saveBatch()`.

## Execute Then Verify -- Never Describe Without Doing

MUST actually call tools, not just describe what you would call. Writing "I will create a collection with these properties" in a document is NOT the same as calling `collection_create`. The user's system remains unconfigured.

After every create/update operation, MUST verify the result:
- After `collection_create` or `collection_update` → call `collection_list` and confirm properties exist
- After `context_save` → call `guideline_list` and confirm the guideline appears
- After `memory_save` → call `smartRecall` to verify content was stored
- After `memory_update_property` → call `memory_get_properties` to verify the value

MUST NOT claim "I created X" without having called the tool AND verified the result. This is the #1 failure mode: agents plan actions in documents but never execute them.

## Self-Correction -- Detect Diagnose Fix

After memorizing: verify with `smartRecall`. Empty properties? Re-memorize with `schema`, `tier:"pro"`, `actionId`. After recalling empty: broaden -- different identity key, remove entity scope. Irrelevant? Add `type` filter, `collectionNames`. After generating: compare against MUST constraints, regenerate if violated. Check `creditsCharged` -- high means wrong tier/mode. MUST NOT repeat the same failing approach.

Soft delete is recoverable: `memory.delete()` and `deleteRecord()` have 30-day recovery window. Use `cancelDeletion()` to restore. MUST NOT panic on accidental deletes -- because the data is still recoverable within the retention window. Optimistic concurrency: if `memory_update_properties` returns 409 (version mismatch), another agent updated the record. Re-read with fresh data and retry. SHOULD use `expectedVersion` for critical updates -- because it prevents silent overwrites.

## Analysis Patterns

MUST ground analysis in data -- state confidence and evidence count. MUST NOT fabricate.

**Deep-dive:** `memory_digest` with high `token_budget`. **Cross-entity:** `smartRecall` without entity scope, `groupByRecord:true`. **Comparison:** comparative query across entities. **Trends:** `recall_pro` with `prefer_recent:true`. **Segmentation:** `memory_segment` with dimension weights. **Aggregation:** `smartRecall` with count/aggregate intent.

## Multi-Agent Coordination

MUST check workspace before acting -- another agent may have already done this.

**Claim** tasks as `in_progress` before starting. **Store** outcome when done. **Delegate** via workspace tasks with clear scope. **Signal** via notifications. **Handoff** full context at capability boundaries. **Conflict:** last-write-wins; governance defines merge strategies.

Broadcast with a clickable button: `notification_broadcast(role:'admin', title:'Q2 Report Ready', message:'Analysis complete.', actionUrl:'https://...', actionLabel:'View Report')`. Use `role:'all'` to reach everyone. If a report or file was generated and hosted externally (S3, GCS, a dashboard URL), pass the URL as `actionUrl` -- the notification becomes the delivery mechanism. Always notify the requester after a long-running task completes.

Concurrent safety: SHOULD use `memory_update_properties` with `expectedVersion` when multiple agents may update the same record -- because 409 response means another agent wrote first. Re-read with fresh data and retry. Notification actions: use `notifications.executeAction()` to respond to actionable notifications from other agents or humans.

## Interface Selection -- MCP vs SDK vs CLI

MCP tools are the default for AI agents. But some tasks are better done via SDK or CLI when they're installed in the project. Check `package.json` for `@personize/sdk` or `@personize/cli`.

| Task | Best Interface | Why |
|---|---|---|
| Recall, memorize, governance checks, property updates | MCP tools | Interactive, per-call |
| Download all guidelines to local files | SDK script or CLI | `guideline_list` + `guideline_read` in a loop is slow; bulk download is one call |
| Batch CSV import (100+ records) | SDK script (`script-data-ingest.ts`) | Rate limiting, progress tracking, dry-run |
| Sync guidelines to/from git | SDK script (`script-sync-org-guidelines.ts`) | Pull/push with diff detection |
| One-time bulk operations | SDK script | Better error handling, retry, checkpointing |
| Quick terminal operations | CLI (`npx personize`) | Fast, no code needed |

When SDK is available, SHOULD use enabler scripts for bulk operations instead of chaining many MCP tool calls. Load `personize-enabler` to see available scripts.

## Writing and Executing Code

When no `personize-enabler` script fits, write your own using `@personize/sdk`. MUST start with `--dry-run` -- untested scripts against production are high risk. MUST be self-contained, JSON-in/JSON-out, with error handling. SHOULD store successful scripts as guideline attachments. Prefer scripts over long tool-call chains.

## Agentic Workflows -- Prompt and Responses

Three orchestration modes, selected by complexity:

- `ai.prompt`: single prompt with optional tools, evaluation (`evaluate: { criteria, serverSide: true }`), and auto-memorize (`memorize: true`). Use for: generate content, extract data, evaluate quality. Streaming via `promptStream()` for real-time UX. MUST use with `evaluate` when quality matters -- because server-side evaluation catches governance violations before the output reaches the user.
- `responses.create`: multi-step orchestration with client-executed tools. SDK auto-loops: send request -> server returns `requires_action` with tool_calls -> SDK executes tools locally -> sends results -> repeats (max 20 rounds). Use for: complex workflows where the agent needs to call external APIs, query databases, or chain multiple actions per record.
- `chat.completions`: OpenAI-compatible drop-in. Use when replacing existing OpenAI code with zero changes.

Batch-apply pattern: loop records through `responses.create` with tools. For each record: recall context -> generate with governance -> store outcome. SHOULD checkpoint to workspace after each batch of 10.

## Governance Compliance

MUST check guidelines before generating -- governance is the human's control lever. **MUST** = non-negotiable. **SHOULD** = strong default, override with reasoning. **MAY** = discretion. MUST NOT state facts without memory evidence -- if recall returns nothing, say so. Conflicts: MUST overrides SHOULD; specific overrides general.

## Capability Boundaries

MUST surface capability limitations to the user instead of silently skipping. Personize is the memory and governance layer -- it stores, recalls, governs, and coordinates. Actions like sending emails, polling inboxes, calling external APIs, or running on a schedule require external tools (other MCPs, SMTP, Trigger.dev, cron). When a task requires infrastructure not available: explain what Personize handles (draft, govern, store, coordinate) and what the user needs to provide (SMTP credentials, external MCP, scheduler). MUST NOT pretend to have capabilities it doesn't have.

## Confirmations and Risk

**Rate every action before doing it** on four axes -- read vs write, reversibility, permission/scope (whose data, how many records), and financial/data impact. The highest axis sets the tier.

**Low** (read, recall, search): act immediately. **Medium** (memorize, update): act, inform user. **High** (delete, bulk >10, email/external send): confirm first. **Critical** (delete collection, compliance-sensitive, org-wide, irreversible): confirm + explain impact. Start with `--dry-run`, review, then run live.

## Resilience -- Checkpoint and Resume

MUST checkpoint in workspace after each step -- failures should not require restarting. Store error and step number on failure. Resume from last successful step on retry or handoff. Batch: track succeeded/failed/skipped per item, retry only failed. Use `eventId` to poll async status.

SDK has built-in retry: 3x exponential backoff for 429 and 5xx errors. MUST NOT implement custom retry for SDK calls -- because double-retry causes cascading delays. For rollback: read `guidelines.history()` or `collections.history(mode:'diff')` to find the previous version, then apply it via update. SHOULD always include `historyNote` on updates -- because it creates an audit trail for rollback decisions.

## Learning and Self-Memory

Store what worked, what failed, and why. Use `about:"self"` for learnings that persist across sessions. Self-improvement: notice failure patterns, adjust (e.g., "basic tier for transcripts gives poor extraction -- use pro"). After completing a task, memorize approach and result for future sessions.

**User identity belongs on the self-record.** When you learn the user's name, role, company, or preferences, MUST store on `about:"self"` -- not only on workspace/project records. Next session, `memory_recall_pro(about:"self")` should return who the user is without searching across all records. If `about:"self"` returns empty, try `smartRecall` with the user's name or domain as a broader fallback.

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

**MUST NOT** combine `about:"self"` with `customKeyName`/`customKeyValue` in the same call -- `memory_update_property` routes to the customKey record, `memorize` routes to the email record. They write to different records.

**MUST** set `Workspace Name`, `Workspace Type`, and `Workspace Description` on creation. Without `Workspace Name`, the record is invisible to the IS_SET discovery filter.

**MUST** update `Context` at session end for every workspace written to. The next agent starts from Context -- if it is stale, handoff fails.

**SHOULD** use `smart_update` for org-wide learnings rather than storing them in workspace Notes. Notes benefit one record; guidelines benefit all agents.

**Warning triggers** -- surface these to the user:
- `customKeyValue` has no userId prefix on a Self_Project record
- `about:"self"` and `customKeyName` both appear in the same call
- Session ending without updating Context on written workspaces
- Workspace created without setting Workspace Name

Discover all agent workspaces: `search({ groups: [{ conditions: [{ property: "Workspace Name", operator: "IS_SET" }] }] })`. Full patterns, session flow, and anti-pattern table: load `workspace-patterns` attachment.

## Observability -- Log What You Do

MUST log significant actions to workspace timeline -- autonomous agents must be accountable. Log each step of multi-step operations. Record decision reasoning in self-memory. Creates audit trail for humans and other agents.

## Cost and Credit Awareness

Fast recall: 1 credit (~500ms). Deep recall: 2 credits (~10-20s). Memorize: 1 credit/item. Guidelines: 0. Workspace: 0.

SHOULD prefer fast mode by default -- 80% of queries need no synthesis. Batch for 10+ items. Check balance before large operations.

## Go Deeper

Exact API parameters or error codes? Load `personize-reference`. Ready-to-run scripts? Load `personize-enabler`. Schema design or integration planning? Load `personize-solution-architect`.
