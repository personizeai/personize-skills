# CREATE — Design and Attach a Workspace

Design a workspace schema for any entity type and create it in Personize. The workspace turns the entity from a data record into a collaboration surface.

---

## Design Workflow

### Step 1: Understand the Entity

Ask these questions conversationally — 2-3 at a time, not a checklist:

1. **What entity?** Contact, company, deal, project, ticket, patient, student, or something custom?
2. **Who works on it?** Which agents, humans, and systems touch this entity today?
3. **What do they do?** Log calls? Update status? Flag risks? Create follow-ups? Send messages?
4. **What's missing?** When someone picks up this entity, what context do they wish they had?
5. **What goes wrong?** Where does collaboration break down today? Duplicated work? Missed handoffs? Lost context?

### Step 2: Map Contributors

Identify every participant that will write to or read from the workspace:

| Contributor Type | Examples | How they contribute |
|---|---|---|
| **AI Agent (scheduled)** | Sales intel agent, CS health agent, product analytics agent | Runs on cron/pulse, reads workspace, adds updates/notes/tasks/issues |
| **AI Agent (event-driven)** | Call transcript processor, email analyzer, webhook handler | Triggered by events, adds notes/updates from new data |
| **Human (direct)** | Account manager, sales rep, support engineer | Adds notes, creates tasks, resolves issues via SDK/MCP/UI |
| **Human (via AI)** | Manager using Claude Desktop, rep using Cursor | Uses MCP tools to read digest and contribute via natural language |
| **System (automated)** | CRM webhook, support desk integration, analytics pipeline | Pushes structured data into workspace via API |

### Step 3: Design from the Starter

Start from the 5-property starter and adjust to the domain:

#### Property 1: Context (text, replace)

The living summary. Current state of this record — what's happening, what matters, what's next. Rewritten by whichever participant has the freshest understanding.

```json
{
    "name": "Context",
    "systemName": "context",
    "type": "text",
    "description": "Current state summary for this record — what's happening, what matters most, and what's next. Any participant (agent or human) can rewrite this when they have a materially updated understanding. This is the 'start here' for anyone engaging with this entity.",
    "autoSystem": true,
    "updateSemantics": "replace",
    "tags": ["workspace", "context", "working-memory"]
}
```

**Design decisions:**
- `autoSystem: true` — AI can update this from unstructured content (e.g., "rewrite the context based on this call transcript")
- `replace` semantics — this is always the CURRENT state, not a history. Old contexts are superseded, not accumulated.

#### Property 2: Updates (array, append, immutable)

The timeline. What happened, who did it, when. Immutable because history shouldn't be rewritten.

```json
{
    "name": "Updates",
    "systemName": "updates",
    "type": "array",
    "description": "Chronological record of what happened on this entity. Each entry is an object: { author (who contributed this — agent ID, user name, or system name), type (observation | action | change | milestone), summary (one-line description), details (full context if needed), timestamp (ISO 8601) }. Append only — never update or delete existing entries. This is the timeline that keeps all participants aware of what others have done.",
    "autoSystem": true,
    "updateSemantics": "append",
    "update": false,
    "tags": ["workspace", "timeline", "immutable"]
}
```

**Entry schema:**
```typescript
interface WorkspaceUpdate {
    author: string;          // "sales-agent" | "jane.doe" | "crm-webhook"
    type: 'observation' | 'action' | 'change' | 'milestone';
    summary: string;         // One-line: "Sent follow-up email about pricing"
    details?: string;        // Full context if needed
    timestamp: string;       // ISO 8601
}
```

#### Property 3: Tasks (array, append, mutable)

What needs to happen. Any contributor can create a task. Any contributor can claim one.

```json
{
    "name": "Tasks",
    "systemName": "tasks",
    "type": "array",
    "description": "Action items for this entity. Each entry is an object: { title, description (enough context that anyone picking this up understands what to do and why), status (pending | in_progress | done | cancelled), owner (who should do this — agent ID, role, or person name), createdBy (who created this task), priority (low | medium | high | urgent), dueDate (ISO 8601 or null), outcome (result description when completed, null otherwise) }. Any participant can create tasks. Any participant can update status on tasks they own or observe.",
    "autoSystem": true,
    "updateSemantics": "append",
    "update": true,
    "tags": ["workspace", "action", "operational"]
}
```

**Entry schema:**
```typescript
interface WorkspaceTask {
    title: string;
    description: string;      // Enough context for a stranger to execute
    status: 'pending' | 'in_progress' | 'done' | 'cancelled';
    owner: string;            // "account-manager" | "sales-agent" | "jane.doe"
    createdBy: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    dueDate?: string;         // ISO 8601
    outcome?: string;         // Filled when completed
}
```

**Key insight:** A task assigned to someone IS a handoff. The description carries the context. The workspace carries the history. No handoff ceremony needed.

#### Property 4: Notes (array, append, immutable)

Knowledge, observations, ideas from any contributor. Things that don't fit in a task or update but matter for understanding this entity.

```json
{
    "name": "Notes",
    "systemName": "notes",
    "type": "array",
    "description": "Knowledge, observations, and ideas from any contributor — things that matter for understanding this entity but aren't tasks or timeline events. Each entry is an object: { author, content (the note itself — can be a paragraph, a bullet list, an analysis, a gut feeling), category (observation | analysis | idea | reference | question), timestamp (ISO 8601) }. Append only — notes are permanent. If an observation changes, add a new note referencing the old one.",
    "autoSystem": true,
    "updateSemantics": "append",
    "update": false,
    "tags": ["workspace", "knowledge", "immutable"]
}
```

**Entry schema:**
```typescript
interface WorkspaceNote {
    author: string;
    content: string;          // The note itself — any length
    category: 'observation' | 'analysis' | 'idea' | 'reference' | 'question';
    timestamp: string;        // ISO 8601
}
```

#### Property 5: Issues (array, append, mutable)

Problems, blockers, risks. Mutable because issues get resolved.

```json
{
    "name": "Issues",
    "systemName": "issues",
    "type": "array",
    "description": "Problems, blockers, risks, and concerns for this entity. Each entry is an object: { title, description (what's wrong and why it matters), severity (low | medium | high | critical), status (open | investigating | resolved | dismissed), raisedBy (who flagged this), resolvedBy (who resolved it, null if unresolved), resolution (how it was resolved, null if unresolved), timestamp (ISO 8601) }. Any participant can raise issues. Issues with severity 'critical' are implicit escalations. Mutable — status, resolvedBy, and resolution get updated as the issue progresses.",
    "autoSystem": true,
    "updateSemantics": "append",
    "update": true,
    "tags": ["workspace", "risk", "operational"]
}
```

**Entry schema:**
```typescript
interface WorkspaceIssue {
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'investigating' | 'resolved' | 'dismissed';
    raisedBy: string;
    resolvedBy?: string;
    resolution?: string;
    timestamp: string;        // ISO 8601
}
```

---

## Domain-Specific Naming

The 5 properties are universal, but you can rename them to match the domain:

| Domain | Context → | Updates → | Tasks → | Notes → | Issues → |
|---|---|---|---|---|---|
| **Sales** | Account Brief | Activity Log | Next Steps | Intel | Risks |
| **Support** | Ticket Status | Timeline | Action Items | Investigation Notes | Blockers |
| **Healthcare** | Patient Summary | Chart Entries | Care Plan | Clinical Notes | Concerns |
| **Education** | Student Profile | Progress Log | Assignments | Advisor Notes | Flags |
| **Project Mgmt** | Project Status | Changelog | Action Items | Design Notes | Blockers |
| **Real Estate** | Listing Brief | Activity | Follow-ups | Agent Notes | Issues |

The naming is cosmetic. The underlying pattern is the same: one current-state summary (replace), one timeline (append/immutable), one action list (append/mutable), one knowledge base (append/immutable), one problem tracker (append/mutable).

---

## Collection Setup

### Option A: Create via Personize Web App

1. Go to Collections in the Personize dashboard
2. Create a new collection (or select an existing entity type)
3. Add the 5 properties with the specifications above
4. Note the `collectionId` for use in SDK calls

### Option B: Create via SDK

```typescript
import { Personize } from '@personize/sdk';
const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

// Create the collection with workspace properties
const collection = await client.collections.create({
    name: 'Account Workspace',
    entityType: 'Company',
    description: 'Shared workspace for agents and humans collaborating on company accounts.',
    properties: [
        {
            name: 'Context',
            systemName: 'context',
            type: 'text',
            description: 'Current state summary for this account...',
            // ... full spec from above
        },
        // ... remaining 4 properties
    ],
});

console.log('Collection created:', collection.data?.id);
```

### Option C: Add workspace properties to an existing collection

If the entity type already exists (e.g., you already have a Contact collection with profile properties), add the workspace properties alongside them. The workspace properties don't replace existing ones — they layer on top.

---

## Verification

After creating the workspace, verify it works:

```typescript
// 1. Check the collection exists
const collections = await client.collections.list();
const workspace = collections.data?.actions?.find(c => c.name === 'Account Workspace');
console.log('Collection:', workspace?.id, workspace?.properties?.length, 'properties');

// 2. Write a test update
await client.memory.memorize({
    content: JSON.stringify({
        author: 'setup-test',
        type: 'milestone',
        summary: 'Workspace created and verified',
        timestamp: new Date().toISOString(),
    }),
    website_url: 'https://acme.com',  // or email for contacts
    enhanced: true,
    tags: ['workspace:updates', 'source:setup-test'],
});

// 3. Read it back
const digest = await client.memory.smartDigest({
    website_url: 'https://acme.com',
    type: 'Company',
    token_budget: 1000,
});

console.log('Workspace digest:', digest.data?.compiledContext);
```

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| Adding too many properties at the start | Start with 5. Add more via GROW when you feel the gap. |
| Missing the `author` field on entries | Every entry must say who contributed it. Without attribution, the workspace is a mystery. |
| Using `replace` on Updates/Notes | These are append-only. History should not be rewritten. |
| Using `append` on Context | Context is the current summary. It should be replaced, not accumulated. |
| Forgetting tags | Tag entries with `workspace:tasks`, `workspace:notes`, etc. This enables filtered recall. |
| Skipping verification | Always write a test entry and read it back. Don't assume the schema is correct until you see it work. |
