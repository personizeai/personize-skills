# Project Lifecycle Framework

| Phase | Goal | Gate |
|-------|------|------|
| 1. UNDERSTAND | Know what the human wants | Human confirms understanding |
| 2. PLAN | Design the system architecture | Human approves plan |
| 3. BUILD | Create collections, governance, scripts, integrations | Checkpoint each step |
| 4. TEST | Dry-run everything, verify quality | Human approves test results |
| 5. OPERATE | Monitor, execute, respond to events | Ongoing |
| 6. EVOLVE | Optimize based on learnings, handle change requests | Continuous |

## How to Determine Mode

**NEW project:** No collections exist, or human says "start from scratch", "set up", "create a system".
Run phases 1-4 before any live execution.

**EXISTING project:** Collections exist, human gives a task or asks a question.
Use session start protocol, then jump to Mode A, B, or C.

---

## NEW Project: 6 Phases

### Phase 1 -- UNDERSTAND

Goal: Know exactly what the human needs before touching anything.

Ask:
- What is the entity? (contacts, companies, deals, tickets, students, etc.)
- What data do you have? (CSV, CRM export, live sync, manual input)
- What do you want the agent to do? (recall, generate, notify, score, route)
- Who else touches these records? (sales, support, other agents)
- What does success look like?

Gate: Summarize understanding in 3-5 sentences. Human says "yes, that's right."
Log to workspace: `{project}:agent-notes` with `type: "understanding"`

### Phase 2 -- PLAN

Goal: Design the schema, governance, and integration architecture.

Deliverables:
- Collection name and entity type
- Property schema (5-15 properties, typed, with update flags)
- Governance guidelines (3-10 rules for behavior, tone, constraints)
- Identity key strategy (email? website_url? CRM ID? custom?)
- Data sources and ingest method
- Agent workflow outline (what triggers what)
- Credit estimate for planned operations

Gate: Present plan as a document. Human approves. MUST NOT proceed to Build without explicit approval.
Log approval: `{project}:agent-notes` with `type: "plan-approval"`, include timestamp.

### Phase 3 -- BUILD

Goal: Create everything needed. Checkpoint after each step.

Order:
1. Create collection with schema (client.collections.create)
2. Create governance guidelines (client.governance.create for each rule)
3. Set up workspace schema on system record (`system:{project-slug}`)
4. Write ingest script (--dry-run first, then live with 5-record sample)
5. Wire integrations (webhooks, CRM sync, pipeline triggers)
6. Store scripts as guideline attachments for future reuse

Safety:
- MUST run --dry-run before any live data write
- MUST checkpoint workspace after each step
- If a step fails: log error, stop, surface to human
- NEVER skip steps to go faster

### Phase 4 -- TEST

Goal: Verify everything works before going live.

Steps:
1. Dry-run ingest on 5 real records -- verify extraction quality
2. Recall test: smartRecall on each test record, verify results
3. Generate test: ai.prompt on one record, verify governance is applied
4. Notification test (if applicable): trigger one event, verify delivery
5. Credit check: confirm actual credits match estimate

Gate: Show results to human. Human says "looks good, go live."
MUST NOT go live without human sign-off on test results.

### Phase 5 -- OPERATE

Goal: Run the system, monitor quality, respond to events.

Data to read every session:

| What | Where | When |
|------|-------|------|
| Pending tasks | workspace `{project-slug}` tasks list | Session start |
| Agent notes | guideline `{project}:agent-notes` | Session start |
| Recent errors | workspace timeline (last 24h) | Session start |
| Credit balance | analytics.credits() | Before large ops |
| Governance rules | ai_smart_guidelines() | Before generating |

Operating loop:
1. Read workspace for pending tasks
2. Recall context for each record in scope
3. Check governance
4. Act (generate, update, notify, route)
5. Store outcome
6. Checkpoint workspace

### Phase 6 -- EVOLVE

Goal: Optimize based on learnings, handle change requests.

Triggers: Human requests change, error pattern detected, quality score drops, new data source added.

Process:
1. UNDERSTAND the change (same as Phase 1 but scoped)
2. Check impact: what collections/guidelines/scripts are affected?
3. PLAN the change -- never modify schema live without a plan
4. TEST in isolation before applying broadly
5. Apply with historyNote on every update
6. Log what changed and why to `{project}:agent-notes`

Schema migration rule: adding properties is safe. Removing or renaming properties requires re-extraction on affected records.

---

## EXISTING Project: Session Start Protocol

Every session on an existing project begins with these reads (in order):

1. `personize_context` -- discover org, collections, capabilities
2. `smartRecall` about:"self" -- recall previous learnings
3. Read workspace `system:{project-slug}` -- pending tasks, recent timeline
4. Read guideline `{project}:agent-notes` -- accumulated agent knowledge
5. `ai_smart_guidelines` -- current governance rules

Only after completing all 5 reads: identify which mode applies.

---

## Mode A -- Task Execution

**Trigger:** Human gives a specific task ("send follow-ups to all leads", "score this week's signups").

Steps:
1. Clarify scope if ambiguous (how many records? what criteria?)
2. Estimate credits -- present to human if >1000
3. Get approval if >1000 credits or irreversible
4. Execute with checkpoints every 10 records
5. Store outcome summary to workspace
6. Report: X succeeded, Y failed, Z skipped

Failure handling: log each failure with reason. Never silently skip. Surface patterns to human.

---

## Mode B -- Human Request / Question

**Trigger:** Human asks a question or requests analysis ("who are our top accounts?", "what did we learn from David?").

Steps:
1. Recall context (smartRecall or memory_digest)
2. Check governance for relevant constraints
3. State confidence and evidence count (MUST NOT fabricate)
4. Answer with citations (record IDs or memory IDs)
5. Offer to store insight if it's reusable

If recall returns nothing: say so explicitly. Try alternative identity keys or broader query.

---

## Mode C -- Learning / Optimization

**Trigger:** Agent notices a pattern, quality issue, or improvement opportunity.

Steps:
1. Document the observation in self-memory (about:"self")
2. Propose the improvement to human before acting
3. Get approval
4. Apply with historyNote
5. Log outcome

Examples: "extraction quality is low for this field -- should we switch to pro tier?", "3 records have conflicting emails -- should I merge them?"

---

## System Workspace Convention

Every project uses a record keyed to `system:{project-slug}` as the coordination hub.

This record holds:
- `tasks` property: list of pending/in-progress/done tasks (append-only)
- `timeline` property: log of significant events (append-only)
- `status` property: current phase and state (replaceable)
- `errors` property: recent errors with timestamps (append-only)

Example: `system:acme-leads`, `system:patient-intake`, `system:deal-room`

---

## Agent Notes Guideline

Store accumulated project knowledge in a governance guideline named `{project}:agent-notes`.

Content: what worked, what failed, schema decisions, human preferences, known issues.
Format: timestamped entries, newest first.
Update with historyNote on every change.

This survives agent restarts, handoffs, and model upgrades.

---

## Handoff Between Agents

When handing off to another agent:

1. Write current state to workspace tasks list (status: "handed-off")
2. Store context summary to `{project}:agent-notes`
3. Create a task entry with: scope, progress, blockers, next action
4. Notify human that handoff occurred
5. Receiving agent reads session start protocol before acting

MUST NOT leave work in an ambiguous state. Either done or explicitly handed off.

---

## Safety Rules

- NEVER build without human approval of the plan (Phase 2 gate)
- NEVER go live without human approval of test results (Phase 4 gate)
- NEVER run >1000 credits without explicit human approval
- NEVER modify schema without checking what depends on it
- NEVER skip dry-run for any data write script
- ALWAYS log phase gates and approvals to workspace
- ALWAYS include historyNote on guideline and property updates
