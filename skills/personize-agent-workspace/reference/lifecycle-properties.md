# Lifecycle Properties — Code-Managed State in Workspaces

When workspace properties contain items with lifecycle states (pending → done, open → resolved), the standard append-only pattern creates problems. This guide teaches the **split + code-manage** pattern that keeps workspace state clean at any scale.

---

## The Problem

With append-only `tasks` and `issues` properties, completed items pile up alongside active ones:

```json
// tasks property after a few weeks — append-only
[
  { "title": "Send Email #1", "status": "pending" },
  { "title": "Send Email #1", "status": "done", "outcome": "Sent" },
  { "title": "Enrich via Apollo", "status": "pending" },
  { "title": "Enrich via Apollo", "status": "done" },
  { "title": "Schedule call", "status": "pending" },
  { "title": "OOO detected", "status": "open" },
  { "title": "OOO detected", "status": "resolved" }
]
```

**What goes wrong:**
- `smartDigest()` returns noisy summaries mixing current and historical state
- Agents waste tokens processing stale items
- AI may confuse done tasks with pending ones
- The property grows unboundedly — no way to "clean up" in append mode

---

## The Solution: Split + Code-Manage

Split each lifecycle property into two:

| Role | Mode | `enhanced` | Managed by | Contents |
|---|---|---|---|---|
| **Current state** | replace | `false` | Your code | Only active items — always clean |
| **History** | append | `true` | AI extraction | Completed/resolved items — audit trail |

### Which Properties Need This?

> **Rule:** If items have lifecycle states, split the property. If items are write-once, keep append-only.

| Property | Has lifecycle? | Pattern |
|---|---|---|
| **Tasks** (pending → done/declined/rescheduled) | YES | `pending_tasks` (replace) + `task_history` (append) |
| **Issues** (open → resolved/dismissed) | YES | `open_issues` (replace) + `issue_history` (append) |
| **Updates** (write once, never modified) | NO | Single append property — unchanged |
| **Notes** (write once, never modified) | NO | Single append property — unchanged |
| **Messages** (write once, engagement tracked elsewhere) | NO | Single append property — unchanged |
| **Context** (always rewritten) | N/A | Single replace property — unchanged |

---

## The Pattern: Read → Parse → Modify → Replace

### Why `enhanced: false`?

```
enhanced: true  = "AI, figure out what properties to extract from this text"
                  Great for: unstructured notes, conversation summaries, enrichment data
                  Bad for:   precise state management (removing 1 task from an array of 10)

enhanced: false = "Store exactly this JSON, don't interpret it"
                  Great for: structured state you manage in code
                  Bad for:   unstructured content you want AI to parse
```

For replace-mode properties with structured JSON, **always use `enhanced: false`**. You control the exact array contents — no AI interpretation, no data loss, deterministic behavior.

### Unique IDs

Always generate unique IDs for items in replace-mode properties:

```typescript
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
// → "t_1710700800000_x7k2m9"
// → "i_1710700800000_p3q8n1"
```

This eliminates fragile title-matching dedup and prevents collisions when multiple agents create tasks simultaneously.

---

## Schema Design

### Replace-mode properties (code-managed)

```json
{
  "name": "Pending Tasks",
  "systemName": "pending_tasks",
  "type": "array",
  "description": "Active tasks only. JSON array managed by code — read, modify, write back. Rewritten on every state change. Each entry: { taskId, title, description, owner, priority, createdBy, createdAt, dueDate }. Never contains completed or cancelled tasks.",
  "autoSystem": false,
  "updateSemantics": "replace"
}
```

```json
{
  "name": "Open Issues",
  "systemName": "open_issues",
  "type": "array",
  "description": "Active blockers only. JSON array managed by code. Rewritten on resolution. Each entry: { issueId, title, description, severity, status (open|investigating), raisedBy, raisedAt }. Never contains resolved or dismissed issues.",
  "autoSystem": false,
  "updateSemantics": "replace"
}
```

### Append-mode properties (AI-managed)

```json
{
  "name": "Task History",
  "systemName": "task_history",
  "type": "array",
  "description": "Completed, declined, and rescheduled tasks. Append only — full audit trail. Each entry: { taskId, title, decision (execute|decline|reschedule|skip), outcome, completedBy, completedAt }.",
  "autoSystem": true,
  "updateSemantics": "append"
}
```

```json
{
  "name": "Issue History",
  "systemName": "issue_history",
  "type": "array",
  "description": "Resolved and dismissed issues. Append only — full audit trail. Each entry: { issueId, title, severity, resolution, resolvedBy, resolvedAt }.",
  "autoSystem": true,
  "updateSemantics": "append"
}
```

---

## Complete Implementation

### Types

```typescript
interface Task {
  taskId: string;
  title: string;
  description: string;
  owner: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdBy: string;
  createdAt: string;
  dueDate?: string;
}

interface Issue {
  issueId: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating';
  raisedBy: string;
  raisedAt: string;
}
```

### Reading current state

```typescript
async function readPendingTasks(email: string): Promise<Task[]> {
  const result = await client.memory.recall({
    email,
    message: 'pending_tasks current active tasks JSON array',
    limit: 3,
  });
  for (const item of result.data || []) {
    try {
      const parsed = JSON.parse(item.content || '');
      if (parsed.pending_tasks) return parsed.pending_tasks;
    } catch { continue; }
  }
  return [];
}

async function readOpenIssues(email: string): Promise<Issue[]> {
  const result = await client.memory.recall({
    email,
    message: 'open_issues current active blockers JSON array',
    limit: 3,
  });
  for (const item of result.data || []) {
    try {
      const parsed = JSON.parse(item.content || '');
      if (parsed.open_issues) return parsed.open_issues;
    } catch { continue; }
  }
  return [];
}
```

### Writing state (code-managed, enhanced: false)

```typescript
async function writePendingTasks(email: string, tasks: Task[]): Promise<void> {
  await client.memory.memorize({
    email,
    content: JSON.stringify({ pending_tasks: tasks }),
    enhanced: false,   // Code manages this — no AI extraction
    tags: ['workspace:pending-tasks'],
  });
}

async function writeOpenIssues(email: string, issues: Issue[]): Promise<void> {
  await client.memory.memorize({
    email,
    content: JSON.stringify({ open_issues: issues }),
    enhanced: false,
    tags: ['workspace:open-issues'],
  });
}
```

### Task lifecycle

```typescript
// ─── ADD TASK ───
async function addTask(email: string, input: Omit<Task, 'taskId' | 'createdAt'>): Promise<string> {
  const taskId = generateId('t');
  const current = await readPendingTasks(email);
  const newTask: Task = { ...input, taskId, createdAt: new Date().toISOString() };

  await writePendingTasks(email, [...current, newTask]);
  return taskId;
}

// ─── COMPLETE TASK ───
async function completeTask(email: string, taskId: string, outcome: string): Promise<void> {
  const current = await readPendingTasks(email);
  const task = current.find(t => t.taskId === taskId);
  if (!task) return;

  // Remove from pending (code-managed, replace)
  await writePendingTasks(email, current.filter(t => t.taskId !== taskId));

  // Append to history (AI-managed, append)
  await client.memory.memorize({
    email,
    content: JSON.stringify({
      taskId: task.taskId, title: task.title,
      decision: 'execute', outcome,
      completedBy: 'task-executor',
      completedAt: new Date().toISOString(),
    }),
    enhanced: true,
    tags: ['workspace:task-history'],
  });
}

// ─── DECLINE TASK ───
async function declineTask(email: string, taskId: string, reason: string): Promise<void> {
  const current = await readPendingTasks(email);
  const task = current.find(t => t.taskId === taskId);
  if (!task) return;

  await writePendingTasks(email, current.filter(t => t.taskId !== taskId));

  await client.memory.memorize({
    email,
    content: JSON.stringify({
      taskId: task.taskId, title: task.title,
      decision: 'decline', reason,
      declinedAt: new Date().toISOString(),
    }),
    enhanced: true,
    tags: ['workspace:task-history'],
  });
}

// ─── RESCHEDULE TASK ───
async function rescheduleTask(email: string, taskId: string, newDueDate: string, reason: string): Promise<void> {
  const current = await readPendingTasks(email);
  const updated = current.map(t =>
    t.taskId === taskId ? { ...t, dueDate: newDueDate } : t
  );

  // Same array, one task's dueDate changed
  await writePendingTasks(email, updated);

  await client.memory.memorize({
    email,
    content: JSON.stringify({
      taskId, reason, newDueDate,
      rescheduledAt: new Date().toISOString(),
    }),
    enhanced: true,
    tags: ['workspace:task-history'],
  });
}
```

### Issue lifecycle

```typescript
// ─── RAISE ISSUE ───
async function raiseIssue(email: string, input: Omit<Issue, 'issueId' | 'raisedAt'>): Promise<string> {
  const issueId = generateId('i');
  const current = await readOpenIssues(email);
  const newIssue: Issue = { ...input, issueId, raisedAt: new Date().toISOString() };

  await writeOpenIssues(email, [...current, newIssue]);
  return issueId;
}

// ─── RESOLVE ISSUE ───
async function resolveIssue(email: string, issueId: string, resolution: string): Promise<void> {
  const current = await readOpenIssues(email);
  const issue = current.find(i => i.issueId === issueId);
  if (!issue) return;

  await writeOpenIssues(email, current.filter(i => i.issueId !== issueId));

  await client.memory.memorize({
    email,
    content: JSON.stringify({
      issueId: issue.issueId, title: issue.title,
      severity: issue.severity, resolution,
      resolvedAt: new Date().toISOString(),
    }),
    enhanced: true,
    tags: ['workspace:issue-history'],
  });
}
```

---

## The Result

```
┌─────────────────────────────────────────────────────┐
│  sarah@acme.com — Workspace Record                   │
│                                                       │
│  ╔═══ REPLACE (always current, code-managed) ═══╗   │
│  ║  pending_tasks: [ {Schedule call (urgent)} ]  ║   │
│  ║  open_issues:   [ ]                           ║   │
│  ║  context:       "Replied positively, call due" ║   │
│  ╚═══════════════════════════════════════════════╝   │
│                                                       │
│  ╔═══ APPEND (history, AI-managed) ══════════════╗   │
│  ║  task_history:  [ {Email#1 ✓}, {Enrich ✓} ]  ║   │
│  ║  issue_history: [ {OOO resolved} ]            ║   │
│  ║  updates:       [ ...timeline entries... ]     ║   │
│  ║  notes:         [ ...knowledge... ]            ║   │
│  ║  messages_sent: [ {email#1}, {email#2} ]       ║   │
│  ╚═══════════════════════════════════════════════╝   │
│                                                       │
│  smartDigest() → clean, accurate summary             │
└─────────────────────────────────────────────────────┘
```

---

## When to Use This Pattern

| Scenario | Use lifecycle split? |
|---|---|
| Automated task execution (agents process tasks) | **YES** — essential |
| High-volume workspaces (100+ tasks per entity) | **YES** — prevents bloat |
| Multi-agent coordination with handoffs | **YES** — clean state matters |
| Simple workspace, few tasks, mostly human | **Optional** — starter 5 is fine |
| Read-only workspace (agents observe, humans act) | **No** — append is sufficient |

**Start with the 5-property starter.** When you add automated task execution or hit 20+ tasks per entity, upgrade to the lifecycle split.

---

## Common Mistakes

| Mistake | Problem | Fix |
|---|---|---|
| Using `enhanced: true` for replace properties | AI may misparse, duplicate, or lose items | Use `enhanced: false` — manage JSON in code |
| Using append for stateful items at scale | Ghost data pollutes `smartDigest()` | Split into replace (current) + append (history) |
| No unique IDs on tasks/issues | Title-matching dedup is fragile | Generate unique IDs with `generateId()` |
| Not reading before writing replace properties | Overwrites other items in the array | Always read → parse → modify → write back |
| Writing empty arrays on first task | Loses existing state if read fails | Default to `[]` only when recall returns no results |
| Skipping the history append | Loses audit trail | Always write to history when removing from current state |
