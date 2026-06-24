# Workspace Schemas: Starter and Evolved Examples

**Starter workspace (5 properties -- minimal viable collaboration surface):**

| # | Property | Type | Semantics | Purpose |
|---|---|---|---|---|
| 1 | `context` | text | replace | Living summary -- current state, rewritten by freshest source |
| 2 | `updates` | array | append, immutable | Timeline -- what happened, who, when |
| 3 | `tasks` | array | append, mutable | Action items any contributor can create or claim |
| 4 | `notes` | array | append, immutable | Knowledge and observations |
| 5 | `issues` | array | append, mutable | Problems, blockers, risks |

---

## Starter Workspace Schema

The 5-property starter works for any entity type. Start here, evolve later.

### Property 1: Context (replace)

The "start here" for anyone engaging with this entity. Rewritten by whichever participant has the freshest understanding.

```json
{
    "name": "Context",
    "systemName": "context",
    "type": "text",
    "description": "Current state summary for this record -- what's happening, what matters most, and what's next. Any participant (agent or human) can rewrite this when they have a materially updated understanding.",
    "autoSystem": true,
    "updateSemantics": "replace",
    "tags": ["workspace", "context", "working-memory"]
}
```

**Design rule:** Always `replace` -- this is the current state, not history. Old contexts are superseded.

### Property 2: Updates (append, immutable)

The timeline. What happened, who did it, when. History should not be rewritten.

```json
{
    "name": "Updates",
    "systemName": "updates",
    "type": "array",
    "description": "Chronological record of what happened. Each entry: { author (agent/user/system), type (observation|action|change|milestone), summary (one-line), details (optional), timestamp (ISO 8601) }. Append only.",
    "autoSystem": true,
    "updateSemantics": "append",
    "update": false,
    "tags": ["workspace", "timeline", "immutable"]
}
```

### Property 3: Tasks (append, mutable)

Action items. Any contributor can create a task. Any contributor can claim one. A task assigned to someone IS a handoff -- the description carries the context.

```json
{
    "name": "Tasks",
    "systemName": "tasks",
    "type": "array",
    "description": "Action items. Each entry: { title, description (enough context for a stranger to execute), status (pending|in_progress|done|cancelled), owner, createdBy, priority (low|medium|high|urgent), dueDate (ISO 8601), outcome (when completed) }.",
    "autoSystem": true,
    "updateSemantics": "append",
    "update": true,
    "tags": ["workspace", "action", "operational"]
}
```

**Production tip:** When agents auto-execute tasks, split into `pending_tasks` (replace, code-managed via `memory_update_property`) + `task_history` (append, AI-extracted). This keeps `smartDigest()` clean.

### Property 4: Notes (append, immutable)

Knowledge, observations, ideas from any contributor. Things that matter but aren't tasks or timeline events.

```json
{
    "name": "Notes",
    "systemName": "notes",
    "type": "array",
    "description": "Knowledge and observations. Each entry: { author, content (the note itself), category (observation|analysis|idea|reference|question), timestamp (ISO 8601) }. Append only -- if an observation changes, add a new note referencing the old one.",
    "autoSystem": true,
    "updateSemantics": "append",
    "update": false,
    "tags": ["workspace", "knowledge", "immutable"]
}
```

### Property 5: Issues (append, mutable)

Problems, blockers, risks. Mutable because issues get resolved. Critical severity = implicit escalation.

```json
{
    "name": "Issues",
    "systemName": "issues",
    "type": "array",
    "description": "Problems, blockers, and risks. Each entry: { title, description, severity (low|medium|high|critical), status (open|investigating|resolved|dismissed), raisedBy, resolvedBy, resolution, timestamp (ISO 8601) }. Mutable -- status and resolution updated as issue progresses.",
    "autoSystem": true,
    "updateSemantics": "append",
    "update": true,
    "tags": ["workspace", "risk", "operational"]
}
```

---

## Domain-Specific Naming

Rename the 5 properties to match the domain. The underlying pattern stays the same.

| Domain | Context | Updates | Tasks | Notes | Issues |
|---|---|---|---|---|---|
| **Sales** | Account Brief | Activity Log | Next Steps | Intel | Risks |
| **Support** | Ticket Status | Timeline | Action Items | Investigation Notes | Blockers |
| **Healthcare** | Patient Summary | Chart Entries | Care Plan | Clinical Notes | Concerns |
| **Education** | Student Profile | Progress Log | Assignments | Advisor Notes | Flags |
| **Project Mgmt** | Project Status | Changelog | Action Items | Design Notes | Blockers |
| **Real Estate** | Listing Brief | Activity | Follow-ups | Agent Notes | Issues |

---

## Evolved Workspace Schema

After running the starter for a few weeks, you'll feel gaps. Here's what a fully evolved workspace looks like for a Sales Account entity:

### Added Properties (beyond the starter 5)

#### Lifecycle Properties

```json
{
    "name": "Stage",
    "systemName": "stage",
    "type": "options",
    "options": "prospect,discovery,evaluation,negotiation,closed-won,closed-lost,churned",
    "description": "Current lifecycle stage. Updated by agents or humans when stage changes.",
    "updateSemantics": "replace",
    "tags": ["workspace", "lifecycle"]
}
```

```json
{
    "name": "Health Score",
    "systemName": "health-score",
    "type": "number",
    "description": "Account health (1-10). Computed by health-check agent based on usage, support tickets, engagement, and renewal proximity. Updated weekly.",
    "updateSemantics": "replace",
    "tags": ["workspace", "lifecycle", "computed"]
}
```

```json
{
    "name": "Next Milestone",
    "systemName": "next-milestone",
    "type": "text",
    "description": "The next significant event or deadline for this account (e.g., 'Renewal in 30 days', 'QBR scheduled March 15', 'POC evaluation ends Friday'). Updated by whichever agent or human identifies a new milestone.",
    "updateSemantics": "replace",
    "tags": ["workspace", "lifecycle"]
}
```

#### Governance Overlays

```json
{
    "name": "Applicable Guidelines",
    "systemName": "applicable-guidelines",
    "type": "array",
    "description": "Governance guidelines that apply specifically to this account. Each entry: { guidelineName (kebab-case reference), reason (why it applies), addedBy }. Agents MUST check these before generating content for this account.",
    "updateSemantics": "append",
    "update": true,
    "tags": ["workspace", "governance"]
}
```

```json
{
    "name": "Constraints",
    "systemName": "constraints",
    "type": "text",
    "description": "Account-specific constraints beyond general governance. E.g., 'Do not discuss competitor X', 'All communications must cc legal@acme.com', 'No pricing below $50k/year'. Agents MUST check this before acting.",
    "updateSemantics": "replace",
    "tags": ["workspace", "governance", "hard-constraint"]
}
```

#### Relationship Properties

```json
{
    "name": "Stakeholders",
    "systemName": "stakeholders",
    "type": "array",
    "description": "Key people involved. Each entry: { name, email, role (champion|decision-maker|influencer|blocker|user), sentiment (positive|neutral|cautious|negative), lastContact (ISO 8601), notes }. Updated as relationships evolve.",
    "updateSemantics": "append",
    "update": true,
    "tags": ["workspace", "relationships"]
}
```

#### Intelligence Properties

```json
{
    "name": "Signals",
    "systemName": "signals",
    "type": "array",
    "description": "Intelligence signals from external sources. Each entry: { source (linkedin|news|g2|crunchbase|product-usage), signal (what was observed), significance (low|medium|high), timestamp, observedBy }. Append only.",
    "autoSystem": true,
    "updateSemantics": "append",
    "update": false,
    "tags": ["workspace", "intelligence", "immutable"]
}
```

---

## Full Evolved Schema Summary

| Property | Type | Semantics | Category |
|---|---|---|---|
| `context` | text | replace | Core (starter) |
| `updates` | array | append, immutable | Core (starter) |
| `tasks` | array | append, mutable | Core (starter) |
| `notes` | array | append, immutable | Core (starter) |
| `issues` | array | append, mutable | Core (starter) |
| `stage` | options | replace | Lifecycle |
| `health-score` | number | replace | Lifecycle |
| `next-milestone` | text | replace | Lifecycle |
| `applicable-guidelines` | array | append, mutable | Governance |
| `constraints` | text | replace | Governance |
| `stakeholders` | array | append, mutable | Relationships |
| `signals` | array | append, immutable | Intelligence |

---

## Collection Creation (SDK)

### Starter Workspace

```typescript
const collection = await client.collections.create({
    name: 'Account Workspace',
    entityType: 'Company',
    description: 'Shared workspace for agents and humans collaborating on company accounts.',
    properties: [
        {
            name: 'Context', systemName: 'context', type: 'text',
            description: 'Current state summary -- what matters and what\'s next.',
            autoSystem: true, updateSemantics: 'replace',
            tags: ['workspace', 'context'],
        },
        {
            name: 'Updates', systemName: 'updates', type: 'array',
            description: 'Timeline entries: { author, type, summary, details?, timestamp }.',
            autoSystem: true, updateSemantics: 'append', update: false,
            tags: ['workspace', 'timeline'],
        },
        {
            name: 'Tasks', systemName: 'tasks', type: 'array',
            description: 'Action items: { title, description, status, owner, priority, dueDate?, outcome? }.',
            autoSystem: true, updateSemantics: 'append', update: true,
            tags: ['workspace', 'action'],
        },
        {
            name: 'Notes', systemName: 'notes', type: 'array',
            description: 'Knowledge entries: { author, content, category, timestamp }.',
            autoSystem: true, updateSemantics: 'append', update: false,
            tags: ['workspace', 'knowledge'],
        },
        {
            name: 'Issues', systemName: 'issues', type: 'array',
            description: 'Problems/risks: { title, description, severity, status, raisedBy, resolution?, timestamp }.',
            autoSystem: true, updateSemantics: 'append', update: true,
            tags: ['workspace', 'risk'],
        },
    ],
});
```

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| Adding too many properties at start | Start with 5 starter properties. Add more when you feel a gap. |
| Missing `author` field on entries | Every entry must say who contributed it. |
| Using `replace` on Updates/Notes | These are append-only. History should not be rewritten. |
| Using `append` on Context | Context is current state. Replace, don't accumulate. |
| Using `memory_save` for code-managed state | AI extraction may misparse arrays. Use `memory_update_property` for code-managed values. |
| Forgetting tags | Tag entries with `workspace:tasks`, `workspace:notes`, etc. for filtered recall. |
| Not verifying after creation | Write a test entry and read it back with `smartDigest`. |
| Skipping governance overlays | Add `applicable-guidelines` and `constraints` when account-level rules exist. |
