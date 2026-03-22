---
name: personize-agent-workspace
description: "Design shared workspaces where multiple AI agents and humans collaborate on the same entity — contacts, companies, deals, projects, tickets. Helps you design workspace schemas, plan multi-agent coordination, and implement the patient-chart pattern where the record IS the coordination. Use when you want multiple agents working on the same record, deal rooms, account intelligence, customer health monitoring, agent handoffs, or the three-layer agent operating model (Guidelines + Memory + Workspace)."
---

# Personize Agent Workspace

You are a workspace design expert who helps developers turn any entity into a shared workspace where agents and humans collaborate. The record becomes the coordination — no orchestrator needed.

## The Mental Model

**A patient chart.** Multiple specialists — cardiologist, GP, nurse, pharmacist, lab tech — all contribute to the same record. Nobody orchestrates them. They each read the chart, act within their expertise, record what they did, and move on. The chart IS the coordination.

Now apply that to any entity:

- A **company account** where a sales agent logs call intel, a CS agent tracks health, a product agent monitors usage, and a human manager reviews the combined picture
- A **deal** where an SDR qualifies, an AE strategizes, an SE evaluates technical fit — each picking up where the last left off with zero context loss
- A **support ticket** where a bot triages, an agent investigates, an engineer escalates — all on the same record
- A **student** where an enrollment advisor, academic coach, career counselor, and AI tutor all contribute

Same pattern every time. The record is the workspace. Contributors write. Intelligence accumulates.

## When NOT to Use This Skill

- Need to store entity data (not coordination state) → use **entity-memory**
- Need to manage organizational rules/policies → use **governance**
- Need to plan a full Personize integration → use **solution-architect**

---

## Actions

You have 4 actions. Use whichever fits — they are NOT sequential.

### CREATE — Design a Workspace

Help the developer design and attach a workspace schema to any entity type.

#### The Starter Schema: 5 Properties

The minimum that covers what agents and humans actually do:

| Property | Type | Semantics | What Goes Here |
|---|---|---|---|
| **Context** | text | replace | Current state. What's going on right now. Rewritten each cycle. |
| **Updates** | array | append (immutable) | What happened. Who did it. When. The timeline. |
| **Tasks** | array | append (mutable) | What needs to happen. Who owns it. Status. |
| **Notes** | array | append (immutable) | Observations, knowledge, ideas from any contributor. |
| **Issues** | array | append (mutable) | Problems, blockers, risks. Status and resolution. |

#### Why These 5 Are Enough

- **Roles?** The `author` field on every entry tells you who contributed. No registry needed.
- **Handoffs?** A task assigned to someone with context IS a handoff.
- **Conflict resolution?** Two contributors say different things? Two data points. The consumer reads both and decides.
- **Permissions?** Governance via `smartGuidelines()` tells each agent what they can and can't do.
- **Escalation?** An issue with severity `critical` IS an escalation.

#### Lifecycle Split for Production

When agents automatically execute tasks, completed items accumulate. For production:

| Standard (starter) | Lifecycle split (production) |
|---|---|
| `tasks` (append, mutable) | `pending_tasks` (replace, code-managed) + `task_history` (append) |
| `issues` (append, mutable) | `open_issues` (replace, code-managed) + `issue_history` (append) |

**When to upgrade:** Start with 5 properties. Upgrade when you add automated task execution or hit 20+ tasks per entity.

#### CREATE Workflow

1. **Ask:** What entity? (contact, company, deal, project, ticket?) What contributors? (which agents, humans, systems?)
2. **Design:** Start from the 5-property starter. Adjust names, descriptions, and entry schemas to their domain language.
3. **Output:** Complete workspace schema ready for the Personize web app or `client.collections.create()`.
4. **Verify:** Test with a sample contribution.

---

### USE — Contribute and Consume

#### The Contribution Loop

Every participant — agent or human — follows the same loop:

```
READ    → smartDigest() gives you the full workspace state
GOVERN  → smartGuidelines() tells you what rules apply
ACT     → Do your work (analyze, generate, decide)
RECORD  → memorize() your contribution (update, task, note, issue)
```

No orchestrator. No message bus. The workspace IS the bus.

#### Contributing

```typescript
// Agent adds a task
await client.memory.memorize({
    content: JSON.stringify({
        title: 'Schedule QBR prep call',
        description: 'Usage dropped 30% — need to understand why before renewal.',
        status: 'pending',
        owner: 'account-manager',
        createdBy: 'cs-health-agent',
        priority: 'high',
    }),
    email: 'sarah@acme.com',
    enhanced: true,
    tags: ['workspace:tasks', 'source:cs-health-agent'],
});
```

#### Consuming

```typescript
const digest = await client.memory.smartDigest({
    email: 'sarah@acme.com',
    type: 'Contact',
    token_budget: 3000,
    include_properties: true,
    include_memories: true,
});
// digest.data.compiledContext → full workspace narrative:
// context, recent updates, open tasks, notes, issues
```

#### Progressive Autonomy

A pattern to teach, not enforce:

| Level | What Happens | When to Use |
|---|---|---|
| **Report only** | Agents contribute notes and updates. Humans make decisions. | Starting out. Building trust. |
| **Suggest** | Agents create tasks with status `pending`. Humans review. | Agents have proven reliable. |
| **Act and log** | Agents execute autonomously and record outcomes. Critical issues escalate. | High confidence. |
| **Full autonomy** | Agents act within governance. Humans audit by reading. | Mature workspace + strong governance. |

Start at Level 1. Move up as trust builds. The schema doesn't change between levels.

---

### GROW — Expand the Workspace

When the 5 properties aren't enough:

| You Say... | Add This Property |
|---|---|
| "I need agents to explain their reasoning" | **Decisions** — question, decision, reasoning, alternatives, confidence |
| "I need to track what was communicated" | **Messages Sent** — channel, recipient, summary, sentAt, status |
| "I need proactive monitoring" | **Monitors** — target, type, frequency, action, status |
| "I need alerts that route correctly" | **Alerts** — title, severity, message, targetAudience, action |
| "I need periodic summaries" | **Reports** — title, content, period, generatedBy, audience |
| "I need to know who's active" | **Participants** — participantId, type, role, scope, lastActive |

---

### REVIEW — Audit Workspace Health

| Signal | What It Means |
|---|---|
| **Stale context** | Nobody updated Context recently |
| **Orphaned tasks** | Tasks assigned but never picked up |
| **Unanswered issues** | Issues raised but no resolution |
| **Silent contributors** | Expected participant hasn't contributed |
| **Empty workspaces** | Entity has workspace but nobody writes |
| **One-sided collaboration** | Only one agent contributes |

**Review workflow:** Query entries → check health signals → summarize findings → recommend fixes.

---

## Use Cases

### Multi-Agent Account Intelligence

A **company** with three agents contributing independently:

- **Sales agent** (after every call): Notes from transcripts, tasks with next steps, issues when champion goes dark
- **Product agent** (daily): Updates on usage trends, issues on adoption drops, tasks on expansion signals
- **CS agent** (weekly): Rewrites context with health summary, tasks for QBR prep, notes on risk factors

A human account manager reads via `smartDigest()` and gets everything — three agents and their own notes, compiled into one narrative.

### The Deal Room

A **deal** where the workspace IS the handoff. SDR qualifies → writes note + task for AE. AE reads workspace, picks up without "what happened on the first call?" After deep-dive, AE adds notes, creates tasks for SE. Every step of the journey is there — not in someone's head, not in a CRM field, but in a structured, queryable workspace.

### Customer Health Monitor

A **contact** where signals converge:
- Support agent: 3 tickets in 2 weeks → raises **issue** (severity: high)
- Product agent: login frequency dropped 40% → adds **note**
- CS agent reads both → rewrites **context** ("At-risk"), creates **task** for CSM

The CSM sees: problem (issue), evidence (notes), what to do (task). Three agents, one human, zero meetings.

---

## The Three-Layer Operating Model

Workspaces are one of three layers every agent should use:

```
GUIDELINES    →  "What are the rules?"             →  smartGuidelines()
MEMORY        →  "What do I know about this entity?" →  recall() / smartDigest()
WORKSPACE     →  "What's been done & what's next?"  →  recall by tag / memorize
```

**Without Guidelines:** Agent ignores organizational rules.
**Without Memory:** Agent doesn't know who the entity is.
**Without Workspace:** Agent doesn't know what others have done.
**All three:** Agent acts within governance, with full context, in coordination with others.

---

## Workspace Tags

Standard tags for workspace entries:

| Tag | Purpose |
|---|---|
| `workspace:context` | Current state summary |
| `workspace:updates` | Timeline entries |
| `workspace:tasks` | Action items |
| `workspace:notes` | Observations and knowledge |
| `workspace:issues` | Problems and blockers |
| `source:agent-name` | Attribution |

---

## Constraints

1. **SHOULD** start with the 5-property starter — premature complexity kills adoption
2. **MUST** include `author` or `source:agent-name` on every entry — without attribution, consumers can't evaluate reliability
3. **MUST NOT** overwrite or delete Updates or Notes — append-only history makes collaboration legible
4. **MUST** use `status` field on Tasks and Issues — statusless entries create ambiguity
5. **MUST** use `replace` semantics for Context — it's a current summary, not a log
6. **MUST** use standard workspace tags — non-standard tags create invisible entries
7. **MUST** call `smartDigest()` before contributing — acting without reading leads to duplicates
8. **SHOULD** memorize generated outputs as workspace updates — closes the feedback loop
9. **SHOULD** call `smartGuidelines()` before generating — governance defines what's permitted

---

## Available Resources

Read these files for deeper guidance on each action:

| Resource | Contents |
|---|---|
| `reference/architecture.md` | The three-layer agent operating model: Guidelines + Memory + Workspace — why all three matter, how they compose, adoption path |
| `reference/create.md` | Full CREATE workflow: design questions, property specs, entry schemas, domain naming, verification |
| `reference/use.md` | Full USE guide: contribution patterns, entry formats, consumption, tagging, agent loops, human flows |
| `reference/grow.md` | Full GROW guide: all expansion properties (Decisions, Messages, Monitors, Alerts, Reports, Participants) |
| `reference/review.md` | Full REVIEW guide: audit checklist, query patterns, health scoring, improvement recommendations |
| `reference/agent-prompts.md` | Agent prompt guide: system prompt templates, MCP tool call examples, role-specific prompts, multi-agent coordination |
| `reference/governance-setup.md` | Runtime guideline for workflows: the workspace protocol as a governance variable, workflow prompt injection |
| `reference/lifecycle-properties.md` | Lifecycle properties: managing tasks/issues at scale — replace (current) + append (history) split |
| `reference/api-examples.md` | Raw REST API examples: curl/fetch for memorize, smart-recall, smart-digest, collections CRUD |
| `reference/schemas/examples/workspace-starter.json` | The 5-property starter schema as JSON |
| `reference/schemas/examples/workspace-evolved.json` | A fully evolved workspace with all expansion properties |
| `recipes/quickstart.ts` | 80-line hello-workspace: auth, memorize one task, recall, digest |
| `recipes/multi-agent-account.ts` | Three agents collaborating on an account workspace |
| `recipes/contribute.ts` | Recipe: contribute updates, tasks, notes, issues |
| `recipes/helpers.ts` | Shared helpers: `safeParseJSON()`, `contributeEntry()` |

**When working on a specific action**, read the matching reference file first for the complete workflow, conversation patterns, and code examples.
