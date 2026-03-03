# Governance Setup — The Runtime Guideline for Shared Workspaces

Skills help you design workspaces. But in workflows — n8n nodes, Trigger.dev tasks, cron jobs, custom pipelines — agents don't have access to Skills. They only have MCP tools. The one tool they always call before acting is `ai_smart_guidelines`.

If there's no governance variable teaching them the workspace protocol, they won't know the workspace exists.

**The solution:** Upload a governance variable called `shared-workspace-protocol` that teaches any agent how to participate in a shared workspace. When any workflow step calls `ai_smart_guidelines` with anything related to working on an entity, it gets the protocol back automatically.

This is the **runtime version** of the skill — the skill is design-time (helps you build), the guideline is runtime (tells agents what to do in the moment).

---

## The Guideline

Upload this as a governance variable. It's self-contained — an agent reading this from `ai_smart_guidelines` will know exactly how to participate in a workspace without ever seeing the skill docs.

### Variable Name

`shared-workspace-protocol`

### Tags

`["workspace", "collaboration", "agent-protocol", "operational"]`

### Description

Protocol for AI agents and humans to collaborate on shared workspaces attached to any entity (contact, company, deal, project, ticket). Covers the contribution loop, entry formats, tagging, and coordination rules.

### Content

```markdown
# Shared Workspace Protocol

Every entity (contact, company, deal, project, ticket) can have a shared workspace where multiple agents and humans collaborate. The workspace is just structured properties on the record. Anyone reads. Anyone writes. The record IS the coordination.

## Workspace Entry Types

| Type | Tag | What goes here | Mutable? |
|---|---|---|---|
| **Context** | workspace:context | Current state summary — what's happening now, priorities, next actions | Yes (replace) |
| **Updates** | workspace:updates | Timeline — what happened, who did it, when | No (append only) |
| **Tasks** | workspace:tasks | Action items — what needs to happen, who owns it, status | Yes (status changes) |
| **Notes** | workspace:notes | Knowledge — observations, analysis, ideas, intel | No (append only) |
| **Issues** | workspace:issues | Problems — risks, blockers, concerns, severity | Yes (status changes) |

## Your Workflow

Every time you work on an entity, follow this loop:

### 1. READ the Workspace

Before doing anything, recall the workspace state:
- Query for existing updates, tasks, notes, and issues
- Use tags to filter: workspace:updates, workspace:tasks, workspace:notes, workspace:issues
- Include the entity identifier (email for contacts, website_url for companies)

This tells you what other contributors have already done. Do NOT skip this step.

### 2. GET Guidelines

Fetch organizational rules for your specific task (you're already doing this — that's how you got this protocol). Also fetch any task-specific guidelines (e.g., "sales playbook", "CS retention strategy") relevant to your action.

### 3. ACT

Do your work — analyze, generate, decide, communicate. Base your work on:
- Workspace state (what's already known and done)
- Guidelines (organizational rules)
- Memory (entity properties and history)

### 4. RECORD Your Contribution

Write back to the workspace. Always:
- Format as JSON with the fields below
- Tag with the entry type: workspace:updates, workspace:tasks, etc.
- Tag with your identity: source:your-agent-name
- Include a timestamp

## Entry Formats

### Update
```json
{ "author": "your-agent-name", "type": "observation|action|change|milestone", "summary": "one-line description", "details": "full context if needed", "timestamp": "ISO 8601" }
```
Tags: ["workspace:updates", "source:your-agent-name"]

### Task
```json
{ "title": "...", "description": "enough context for anyone to execute this", "status": "pending|in_progress|done|cancelled", "owner": "who should do this", "createdBy": "your-agent-name", "priority": "low|medium|high|urgent", "dueDate": "ISO 8601 or null" }
```
Tags: ["workspace:tasks", "source:your-agent-name", "priority:high"]

### Note
```json
{ "author": "your-agent-name", "content": "the observation or analysis", "category": "observation|analysis|idea|reference|question", "timestamp": "ISO 8601" }
```
Tags: ["workspace:notes", "source:your-agent-name"]

### Issue
```json
{ "title": "...", "description": "what's wrong and why it matters", "severity": "low|medium|high|critical", "status": "open|investigating|resolved|dismissed", "raisedBy": "your-agent-name", "timestamp": "ISO 8601" }
```
Tags: ["workspace:issues", "source:your-agent-name", "severity:high"]

### Context Rewrite
```json
{ "author": "your-agent-name", "context": "1-3 paragraph summary of current state, priorities, and next actions", "rewrittenAt": "ISO 8601" }
```
Tags: ["workspace:context", "source:your-agent-name"]

## Rules

1. **Read before writing.** Always recall the workspace before contributing. Never act blind.
2. **Don't duplicate.** If another contributor already noted an observation, don't repeat it. Build on it.
3. **Author everything.** Include your name in every entry and in tags as source:your-name.
4. **Immutable history.** Never modify Updates or Notes. If something changes, add a new entry.
5. **Tasks are handoffs.** A task assigned to someone with a good description IS a handoff. No ceremony needed.
6. **Critical = escalation.** An issue with severity "critical" demands immediate human attention. Use sparingly.
7. **Context is current state.** Replace it when the picture changes. It's not a log — it's the latest understanding.
```

---

## How to Upload

### Option A: Via SDK

```typescript
import { Personize } from '@personize/sdk';
const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

await client.guidelines.create({
    name: 'shared-workspace-protocol',
    value: `# Shared Workspace Protocol\n\nEvery entity (contact, company, deal...`, // full content above
    tags: ['workspace', 'collaboration', 'agent-protocol', 'operational'],
    description: 'Protocol for agents and humans to collaborate on shared workspaces attached to any entity.',
});
```

### Option B: Via MCP

```
Tool: guideline_create
Parameters:
  name: "shared-workspace-protocol"
  value: "# Shared Workspace Protocol\n\n..." (full content above)
  tags: ["workspace", "collaboration", "agent-protocol", "operational"]
  description: "Protocol for agents and humans to collaborate on shared workspaces."
```

### Option C: Via Personize Web App

1. Go to Governance → Variables
2. Create new variable
3. Name: `shared-workspace-protocol`
4. Paste the content above
5. Add tags: workspace, collaboration, agent-protocol, operational

---

## Workflow Prompt Injection

In any workflow step where an agent works on an entity, add this to the prompt or instructions:

### One-Liner (Minimum)

```
Before acting on this record, call ai_smart_guidelines with message "shared workspace protocol for collaborating on this entity" to get the workspace collaboration protocol. Follow it.
```

### Two-Liner (Better)

```
Before acting on this record:
1. Call ai_smart_guidelines with message "shared workspace protocol and [your-task-specific-topic]" to get collaboration protocol and task guidelines.
2. Call memory_recall_pro with query "workspace context updates tasks notes issues" for this entity to see what other contributors have done. Then proceed.
```

### Full Injection (Best — For Multi-Step Instructions)

```typescript
// In a Trigger.dev task, n8n Code node, or any pipeline:
const instructions = [
    {
        prompt: 'Call ai_smart_guidelines with message "shared workspace protocol and sales outreach guidelines" to get (1) the workspace collaboration protocol and (2) task-specific guidelines. Summarize the rules you must follow.',
        maxSteps: 5,
    },
    {
        prompt: 'Call memory_recall_pro to read the workspace state for this entity — query "workspace updates tasks notes issues" with the entity email. Summarize: what is the current context? What open tasks exist? What issues are flagged? What have other contributors noted?',
        maxSteps: 5,
    },
    {
        prompt: 'Based on the workspace state and guidelines, [YOUR ACTUAL TASK HERE]. After completing the task, record your contributions to the workspace using memory_store_pro with the correct entry format and tags from the protocol.',
        maxSteps: 10,
    },
];
```

### n8n Workflow Example

In an n8n AI Agent node, add to the system prompt:

```
You are [agent-role] working on entity records that have shared workspaces.

Before acting on any record:
1. Call ai_smart_guidelines with message "shared workspace protocol and [topic]"
2. Call memory_recall_pro to read the workspace for this entity
3. Follow the workspace protocol — read before writing, tag your contributions, don't duplicate

After acting:
4. Record your contributions to the workspace using memory_store_pro
5. Tag every entry with workspace:[type] and source:[your-name]
```

### Trigger.dev Task Example

In a Trigger.dev task using the Personize SDK with multi-step instructions:

```typescript
const result = await client.ai.prompt({
    context: entityContext,
    instructions: [
        {
            prompt: 'Fetch the shared workspace protocol: call smart_guidelines with message "shared workspace protocol for this entity collaboration". Also fetch guidelines for "' + taskTopic + '". List the rules.',
            maxSteps: 5,
        },
        {
            prompt: 'Read the workspace: what updates, tasks, notes, and issues exist for this entity? Summarize the current state.',
            maxSteps: 5,
        },
        {
            prompt: taskPrompt + '\n\nAfter completing, record your workspace contributions with the correct format and tags.',
            maxSteps: 10,
        },
    ],
});
```

---

## How It Gets Matched

When an agent calls `ai_smart_guidelines`, Personize matches the `message` against all governance variables using semantic search. The tags `workspace`, `collaboration`, and `agent-protocol` boost relevance.

The guideline will be returned when agents ask about:
- "working on a record" / "working on this entity"
- "collaboration protocol" / "workspace protocol"
- "how to contribute to a shared workspace"
- "shared workspace" / "entity workspace"
- Any message that includes "workspace" + entity-related terms

**Tip:** Tag the guideline with additional tags matching your domain (e.g., `sales`, `cs`, `support`) if you want it to surface alongside task-specific guidelines.

---

## Verifying It Works

After uploading, verify the guideline surfaces correctly:

```typescript
const result = await client.ai.smartGuidelines({
    message: 'shared workspace protocol for collaborating on this entity record',
    mode: 'fast',
});

console.log(result.data?.compiledContext);
// Should include the full workspace protocol
```

Or via MCP:

```
Tool: ai_smart_guidelines
Parameters:
  message: "shared workspace protocol for collaborating on this entity record"
  mode: "fast"

→ Should return the workspace protocol content
```

If the protocol doesn't surface, check:
1. Was the variable created successfully? (`guideline_list` to verify)
2. Are the tags set? (`workspace`, `collaboration`, `agent-protocol`)
3. Is the message descriptive enough? Include "workspace" and "protocol" or "collaboration"
