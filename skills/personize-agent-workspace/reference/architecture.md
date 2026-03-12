# Architecture — The Three-Layer Agent Operating Model

Every AI agent that works on an entity should assemble context from three layers before acting. Most agents today only use one or two. The complete model uses all three — every time.

---

## The Three Layers

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   LAYER 1: GUIDELINES                                   │
│   "What are the rules for this task?"                   │
│                                                         │
│   → ai_smart_guidelines / smartGuidelines()                    │
│   → Brand voice, policies, playbooks, compliance        │
│   → Organizational rules that apply to ALL agents       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   LAYER 2: MEMORY                                       │
│   "What do I know about this entity?"                   │
│                                                         │
│   → memory_recall_pro / recall() / smartDigest()        │
│   → Properties, extracted facts, conversation history   │
│   → Everything known about this specific entity         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   LAYER 3: WORKSPACE                                    │
│   "What's been done and what needs to happen?"          │
│                                                         │
│   → memory_recall_pro (by workspace tags) / memorize()  │
│   → Updates, tasks, notes, issues from all contributors │
│   → The coordination state — what others have done      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## What Each Layer Answers

| Layer | Question | Source | Changes how often |
|---|---|---|---|
| **Guidelines** | What are the rules? | Governance variables | Rarely (updated by humans when policies change) |
| **Memory** | What do I know? | Entity properties + memories | Frequently (updated as new data is memorized) |
| **Workspace** | What's been done? | Workspace entries from all contributors | Constantly (updated every time any contributor acts) |

**Without Guidelines:** The agent acts without organizational rules. It might generate content that violates brand voice, misidentify ICPs, or ignore compliance requirements.

**Without Memory:** The agent acts without knowing who the entity is. It can't personalize, can't reference past interactions, can't build on what's already known.

**Without Workspace:** The agent acts without knowing what others have done. It duplicates work, contradicts other contributors, misses context from other agents, and creates tasks that already exist.

**All three together:** The agent knows the rules, knows the entity, and knows what's already been done. It acts within governance, with full context, and in coordination with others.

---

## How They Compose

The three layers aren't separate systems — they're three queries against the same Personize platform, assembled into one context before the agent acts.

### SDK Pattern

```typescript
async function assembleFullContext(
    email: string,
    task: string
): Promise<string> {
    // All three layers in parallel
    const [guidelines, memory, workspace] = await Promise.all([
        // Layer 1: Guidelines
        client.ai.smartGuidelines({
            message: `${task} — shared workspace protocol, organizational rules`,
            mode: 'fast',
        }),
        // Layer 2: Memory
        client.memory.smartDigest({
            email,
            type: 'Contact',
            token_budget: 2000,
            include_properties: true,
            include_memories: true,
        }),
        // Layer 3: Workspace
        client.memory.smartRecall({
            query: 'workspace context updates tasks notes issues',
            email,
            limit: 30,
            fast_mode: true,
            include_property_values: true,
        }),
    ]);

    const sections: string[] = [];

    if (guidelines.data?.compiledContext) {
        sections.push('## Guidelines\n\n' + guidelines.data.compiledContext);
    }

    if (memory.data?.compiledContext) {
        sections.push('## Entity Memory\n\n' + memory.data.compiledContext);
    }

    if (workspace.data?.length) {
        const entries = workspace.data
            .map((m: any) => `- ${m.text || m.content || JSON.stringify(m)}`)
            .join('\n');
        sections.push('## Workspace State\n\n' + entries);
    }

    return sections.join('\n\n---\n\n');
}
```

### MCP Pattern (Workflow Prompt)

```
Step 1 — Guidelines:
Call ai_smart_guidelines with message "[your task] — shared workspace protocol
and organizational rules". This gives you the rules to follow.

Step 2 — Memory:
Call memory_recall_pro with query "profile history facts about this entity"
and the entity email. This gives you what's known about the entity.

Step 3 — Workspace:
Call memory_recall_pro with query "workspace context updates tasks notes issues"
and the entity email. This gives you what other contributors have done.

Step 4 — Act:
With all three layers assembled, do your work. Then record your contribution
back to the workspace.
```

### Multi-Step Instructions Pattern

```typescript
const instructions = [
    {
        prompt: 'Call smart_guidelines with message "shared workspace protocol and [task topic]". Summarize the guidelines and workspace rules you must follow.',
        maxSteps: 5,
    },
    {
        prompt: 'Recall everything known about this entity — properties, history, past interactions. Summarize who they are and what matters.',
        maxSteps: 5,
    },
    {
        prompt: 'Recall the workspace state — existing updates, open tasks, unresolved issues, notes from other contributors. Summarize what has been done and what is pending.',
        maxSteps: 5,
    },
    {
        prompt: 'With guidelines, entity memory, and workspace state assembled: [YOUR ACTUAL TASK]. After completing, record your workspace contributions with correct format and tags.',
        maxSteps: 10,
    },
];
```

---

## The Agent Cycle

When you put all three layers together, every agent cycle looks like this:

```
         ┌──────────────────┐
         │   TRIGGER         │
         │   (cron, webhook, │
         │    event, user)   │
         └────────┬─────────┘
                  │
                  ▼
    ┌─────────────────────────────┐
    │  1. ASSEMBLE CONTEXT        │
    │                             │
    │  Guidelines: ai_smart_guidelines│
    │  "What are the rules?"      │
    │                             │
    │  Memory: recall/smartDigest  │
    │  "What do I know?"          │
    │                             │
    │  Workspace: recall by tags   │
    │  "What's been done?"        │
    └─────────────┬───────────────┘
                  │
                  ▼
    ┌─────────────────────────────┐
    │  2. REASON & DECIDE         │
    │                             │
    │  What needs to happen?      │
    │  What's already been done?  │
    │  What can I add?            │
    │  What should I not repeat?  │
    └─────────────┬───────────────┘
                  │
                  ▼
    ┌─────────────────────────────┐
    │  3. ACT                     │
    │                             │
    │  Generate content           │
    │  Execute a task             │
    │  Send a message             │
    │  Update a property          │
    └─────────────┬───────────────┘
                  │
                  ▼
    ┌─────────────────────────────┐
    │  4. RECORD                  │
    │                             │
    │  Workspace: memorize()      │
    │  - Updates (what I did)     │
    │  - Tasks (what others       │
    │    should do next)          │
    │  - Notes (what I learned)   │
    │  - Issues (what's wrong)    │
    │  - Context (rewrite if      │
    │    picture changed)         │
    │                             │
    │  Memory: memorize()         │
    │  - Store outputs back       │
    │  - Update entity properties │
    └─────────────────────────────┘
```

---

## How This Maps to Personize Skills

| Layer | Personize Skill | What it teaches |
|---|---|---|
| **Guidelines** | `governance` skill | How to create, manage, and retrieve governance variables. How to structure guidelines for AI consumption. How teams collaborate on shared rules. |
| **Memory** | `entity-memory` skill | How to memorize data (single, batch, with AI extraction). How to recall (semantic search, digest, export). How to assemble entity context. |
| **Workspace** | `collaboration` skill | How to design workspace schemas. How agents and humans contribute. How to grow the workspace. How to audit collaboration health. |

The skills are design-time — they help you build the system. At runtime, agents use three calls:

1. `ai_smart_guidelines` → gets guidelines (including the workspace protocol)
2. `recall` / `smartDigest` → gets entity memory
3. `recall` (by workspace tags) → gets workspace state

Then they act and `memorize` their contributions back.

---

## Why All Three Matter

### Scenario: Sales Agent After a Call

**Guidelines only:**
> "Write a follow-up email following our brand voice guidelines."
> Result: Correct tone, but generic. Doesn't know who the person is or what was discussed.

**Guidelines + Memory:**
> "Write a follow-up email. Use brand voice. Sarah is VP of Engineering at Acme, interested in API integrations, previously mentioned scalability concerns."
> Result: Personalized and on-brand. But doesn't know that the CS agent already flagged a churn risk, that a support ticket is open, or that the product agent noticed declining usage.

**Guidelines + Memory + Workspace:**
> "Write a follow-up email. Use brand voice. Sarah is VP Eng at Acme, interested in API integrations. The workspace shows: usage down 40%, CS agent flagged churn risk, support ticket open about Reports module, product agent noted they're hiring data engineers. There's an open task to schedule a check-in. No one has sent a message since last week."
> Result: Personalized, on-brand, AND coordinated. The email acknowledges the support issue, offers help with the Reports module, mentions the integration capabilities (relevant to their hiring), and suggests the check-in — all without duplicating what others have done.

That's the difference all three layers make.

---

## Adoption Path

You don't have to use all three from day one. Here's the natural progression:

### Stage 1: Guidelines Only

Set up governance variables. Every agent calls `ai_smart_guidelines` before generating. You get consistent brand voice and rule compliance across all agents.

**What you get:** Consistency.

### Stage 2: Guidelines + Memory

Start memorizing entity data. Agents call `smartDigest` or `recall` to get entity context before acting. You get personalized outputs that follow organizational rules.

**What you get:** Consistency + Personalization.

### Stage 3: Guidelines + Memory + Workspace

Attach workspaces to entities. Multiple agents contribute. Agents read the workspace before acting. You get coordinated collaboration where every contributor builds on what others have done.

**What you get:** Consistency + Personalization + Coordination.

Each stage is independently valuable. But the compound effect of all three is where the real power lives.

---

## Teach This to Your Agents

The simplest way to get all agents to use all three layers: include this in every agent's system prompt (or upload it as a governance variable so it surfaces automatically):

```
Before acting on any entity:

1. GUIDELINES: Call ai_smart_guidelines with your task description to get
   organizational rules and the workspace protocol.

2. MEMORY: Recall what's known about this entity — properties, history,
   past interactions.

3. WORKSPACE: Recall the workspace state — what other contributors have
   done (updates, tasks, notes, issues).

Then act. Then record what you did back to the workspace.
```

Eight lines. That's the entire operating model.
