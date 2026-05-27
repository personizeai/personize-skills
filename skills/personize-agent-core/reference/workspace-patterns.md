# Workspace Patterns

Workspace is a shared collection every record can use — contacts, companies, and agent self-records all use the same schema (Context, Pending Tasks, Updates, Issues, Notes, Decisions, etc.).

---

## The Three-Layer Memory Model

| Layer | Mechanism | Content | Scope |
|-------|-----------|---------|-------|
| **Knowledge** | Guidelines + smart_update | Learnings, policies, best practices | Org-wide (all agents) |
| **State** | Workspace collection | Tasks, notes, issues, context summary | Per-record |
| **Identity** | Profile properties | Name, role, preferences, active projects | Per-record |

Use guidelines for things that get better over time and apply to everyone.
Use workspace for operational state that belongs to a specific record or project.

---

## Self-Workspace: Agent's Own Operational State

Agents can use the workspace collection for their own project state by creating records with `customKeyName` + `customKeyValue` as the identity.

### The Right Pattern

```
customKeyName: "Self_Project"    ← reserved prefix signals this is an agent workspace
customKeyValue: "{userId}_{projectName}"   ← MUST include userId to prevent collision
type: "contact"
```

On creation, also set these properties:
- `Workspace Name` = readable project name (e.g. "GTM OS")
- `Workspace Type` = "Project" | "Campaign" | "Account" | "General"
- `Workspace Description` = one sentence on what this workspace is for

### Why userId in customKeyValue

`generateRecordId` hashes `orgId + type + customKey`. There is NO userId in the formula.

Two agents in the same org using `Self_Project:gtm-os` → **same record**. They overwrite each other silently.

MUST prefix with userId:
```
GOOD: customKeyValue: "usr_abc123_gtm-os"
BAD:  customKeyValue: "gtm-os"   ← collides across all agents in the org
```

---

## about: "self" vs customKeyName — Do Not Mix

These are two separate identity mechanisms. Combining them causes inconsistent behaviour across tools.

| Tool | about: "self" behaviour | With customKeyName added |
|------|------------------------|--------------------------|
| `memory_update_property` | Routes to userId-based record | customKeyValue wins — routes to customKey record instead |
| `memorize` | Routes to email-based user record | customKey added as secondary index on email record |

They write to **different records**. Pick one:

```
GOOD: about: "self"                              ← agent's own profile, no project scope
GOOD: customKeyName + customKeyValue             ← project workspace, no about: "self"
BAD:  about: "self" + customKeyName + customKeyValue  ← ambiguous, tool-dependent
```

---

## Discovery: Finding All Workspace Records

You cannot filter by "all records where customKeyName = Self_Project" — the filter engine matches exact `customKey` values, not key names.

Use `Workspace Name IS_SET` instead:

```json
{
  "groups": [{
    "conditions": [{ "property": "Workspace Name", "operator": "IS_SET" }]
  }],
  "type": "contact"
}
```

To narrow by type:
```json
{ "property": "Workspace Type", "operator": "equals", "value": "Project" }
```

This works because `Workspace Name` is stored as a real property in `snapshot.Memories`, which the filter engine scans.

---

## Slug Convention

Every workspace record needs a unique slug as its `customKeyValue`:

| Type | Slug format | Example |
|------|-------------|---------|
| Self-workspace | `{userId}_{type}:{name}` | `usr_abc_project:q2-outbound` |
| Shared workspace | `{type}:{name}` | `campaign:seg1-revenue-leaders` |

Self-workspace MUST include userId prefix (prevents collision). Shared workspace omits userId (multiple agents share it).

Record types and their default status:

| Type | Purpose | Status lifecycle |
|------|---------|-----------------|
| project | Multi-step initiative | planning → active → paused → completed → archived |
| campaign | Outreach targeting a segment | draft → active → paused → archived |
| task | Atomic unit of work | pending → running → completed |
| resource | Things, not actions | active → paused → retired |

MUST NOT set invalid status transitions (e.g., task → "archived", project → "completed" without passing through "active").

## Claiming and Dependencies

**Claiming (prevent double-work):** Before executing a workspace record, MUST claim it:
1. Set `Status` to `running`
2. Set `Assignee` to your agent identifier
3. Append to Updates: `[timestamp] Claimed by {agent}`

If Status is already `running` with a different Assignee, MUST NOT claim -- another agent is working on it.

**Dependencies:** Check the `Depends On` property before executing. If it contains a slug (e.g., `task:download-contacts`), look up that record's Status. If it's not `completed`, the current record is blocked -- skip it and move to the next pending record.

## Session Flow

**Session start — read before acting:**
```
1. memory_get_properties(about: "self") → who am I, active projects
2. memory_get_properties(customKeyName: "Self_Project", customKeyValue: "{userId}_gtm-os")
   → propertyNames: ["Context", "Pending Tasks", "Open Issues"]
3. personize_skill("current task") → org guidelines
4. filterByProperty(Status=pending, Assignee=agent) → find claimable work
5. For each pending record: check Depends On → skip if blocker is not completed
```

**During session — claim then execute:**
```
1. CLAIM: set Status=running, Assignee={agent}, append to Updates
2. READ: Context property contains instructions for this record
3. EXECUTE: do the work described in Context
4. LOG: append to Notes (findings), Decisions (choices), Issues (problems), Updates (actions)
5. COMPLETE: set Status=completed, append to Updates with summary
```

**Session end — always close the loop:**
```
memory_update_property → set Context with updated summary
memory_update_property → push completed tasks to Tasks (history), remove from Pending Tasks
memory_update_property → resolve Open Issues that were fixed
memory_update_property(about: "self") → update Active Projects list on profile
```

---

## Task Management -- Pending Tasks Is the Single System

All tasks live in the `Pending Tasks` array property. One system, one mental model. No separate Task Type or Task Input properties on the record.

### Two Entry Formats

**Free-form** (human-readable, simple tasks):
```json
{ "taskId": "t_a3f2", "title": "Review campaign results", "description": "Check reply rates",
  "owner": "hamed", "priority": "P1", "status": "pending", "dueDate": "2026-04-15" }
```

**Typed** (machine-dispatchable, batch processing):
```json
{ "taskId": "t_b4e1", "type": "enrich-contact", "input": {"fields":["title","company"]},
  "priority": "P1", "status": "pending", "createdBy": "operator" }
```

Both formats coexist in the same array. Agents check `type` field: present = typed dispatch, absent = read title/description.

### Querying at Scale

`filterByProperty` cannot search inside array values. The operator pattern:

```
1. filterByProperty(Pending Tasks, operator: IS_SET)
   → Returns all records that have tasks. 0 credits.

2. Parse arrays client-side → extract individual tasks
   → 10K records × 3 tasks each = 30K tasks. Parsing takes <1s.

3. Group by type → route to scripts
   → enrich-contact: 5K tasks (AI, ~3 credits each)
   → send-email: 8K tasks (pipeline, 0 credits)
   → update-stage: 2K tasks (pipeline, 0 credits)

4. Execute, update task status in array, move completed to Tasks (history)
```

### Parallel Tasks on One Record

A single record can have multiple tasks executing simultaneously:
```json
Pending Tasks: [
  { "taskId": "t1", "type": "enrich-contact", "status": "running", ... },
  { "taskId": "t2", "type": "research-company", "status": "running", ... },
  { "taskId": "t3", "type": "write-email", "status": "pending", "depends": "t1", ... }
]
```
Each task has its own status. t3 is blocked on t1. t1 and t2 run in parallel. No conflict.

### Cross-Entity Tasks

Pending Tasks works on ANY entity type -- contacts, companies, projects, campaigns:

```
Contact john@acme.com:
  Pending Tasks: [{ type: "follow-up", input: {step:2}, status: "pending" }]

Company acme.com:
  Pending Tasks: [{ type: "research-company", input: {fields:["funding"]}, status: "pending" }]

Project q2-outbound:
  Pending Tasks: [{ title: "Review campaign results", status: "pending" }]
```

### Status vs Pending Tasks

The `Status` property on a record is for **entity lifecycle** (project: planning → active → completed), NOT for task status. Whether a record has work to do is determined by `Pending Tasks IS_SET`, not by `Status = pending`.

| Property | Purpose | Example |
|---|---|---|
| Status | Entity lifecycle state | Project is "active", campaign is "draft" |
| Pending Tasks | Work queue -- individual tasks with their own status | 3 tasks: 1 running, 1 pending, 1 blocked |

---

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | What To Do Instead |
|--------------|---------------|-------------------|
| `customKeyValue: "gtm-os"` (no userId) | Collides across all agents in org | Prefix with userId |
| `about: "self"` + `customKeyName` | Inconsistent routing across tools | Pick one identity mechanism |
| Single self record for all projects | Arrays grow unbounded, no isolation | One record per project via customKeyName |
| Never updating Context | Next agent starts blind | Set Context at session end — always |
| Storing org-wide learnings in workspace Notes | Only one record benefits | Use smart_update → guidelines instead |
| Creating workspace without Workspace Name | Invisible to IS_SET discovery filter | Always set Workspace Name on creation |
| Renaming customKeyValue to rename a project | Old record abandoned, new one created | Keep customKeyValue stable; update Workspace Name property instead |

---

## Warning Triggers

Warn the user when:
- `customKeyValue` does not contain a userId-like prefix for Self_Project records
- `about: "self"` and `customKeyName`/`customKeyValue` are both provided in the same call
- Session ends without updating `Context` on any workspace that was written to
- A workspace record is being created without setting `Workspace Name`
- `smart_update` has not been called after discovering a reusable learning (missed knowledge capture)

---

## CRUD Recipes

### CREATE a workspace record

```
Step 1: memory_store_pro
  content: "Project: Q2 Outbound Push"
  type: "workspace"           (or "contact" — workspace properties work on any entity type)
  customKeyName: "slug"
  customKeyValue: "{userId}_project:q2-outbound"
  tier: "basic"
  → Returns recordId

Step 2: WAIT — memorize is async (1-3 seconds)
  Retry bulkUpdate with backoff. Do NOT call immediately.

Step 3: bulkUpdate (once record is queryable)
  recordId: (from step 1)
  updates:
    - Workspace Name = "Q2 Outbound Push"
    - Workspace Type = "project"
    - Status = "planning"
    - Context = "Initial setup. Waiting for ICP criteria and first campaign design."
```

### READ workspace records

```
List by status (FREE — no credits):
  filterByProperty(type="workspace", conditions=[
    { propertyName: "Status", operator: "equals", value: "pending" },
    { propertyName: "Assignee", operator: "equals", value: "agent" }
  ])

Get specific record properties:
  memory_get_properties(recordId=..., nonEmpty=true)

Full digest:
  memory_digest(customKeyName="slug", customKeyValue="{userId}_project:q2-outbound")
```

### UPDATE properties

```
Replace a text property (Status, Context, Assignee):
  memory_update_property(recordId=..., propertyName="Status", propertyValue="active")

Append to an array property (Notes, Updates, Tasks, Issues, Decisions):
  memory_update_property(recordId=..., propertyName="Notes",
    arrayPush={ items: ["[2026-04-11 09:30] Found 47 leads, exported to CSV"], unique: false })

⚠️ NEVER use propertyValue on append-only array properties — it overwrites the entire array.
```

### Cross-entity workspace

Workspace properties work on ANY entity type, not just workspace records:

```
Add a task to a CONTACT:
  memory_update_property(email="john@acme.com", propertyName="Pending Tasks",
    arrayPush={ items: ["Follow up on pricing question"], unique: false })

Add notes to a COMPANY:
  memory_update_property(websiteUrl="acme.com", propertyName="Notes",
    arrayPush={ items: ["[2026-04-11] CTO leaving Q3"], unique: false })
```

## Quick Reference

```
Create workspace:
  memorize(customKeyName, customKeyValue, type: "contact", content: "...")
  WAIT for async indexing (retry with backoff)
  bulkUpdate → set Workspace Name, Workspace Type, Context

Read workspace:
  memory_get_properties(customKeyName, customKeyValue, propertyNames: [...])
  memory_digest(customKeyName, customKeyValue)  ← full picture in one call
  filterByProperty(conditions=[...])  ← FREE, no credits

Update workspace:
  memory_update_property(propertyName, propertyValue)  ← text properties
  memory_update_property(propertyName, arrayPush)  ← array properties

Find all workspaces:
  search(groups: [{ conditions: [{ property: "Workspace Name", operator: "IS_SET" }] }])

Agent profile (not project-scoped):
  memory_get_properties(about: "self")
  memory_update_property(about: "self", propertyName: "Active Projects", ...)
```
