# USE — Contribute and Consume

How agents and humans write to the workspace and read from it. The core loop is the same for everyone: read the workspace, do your work, record what you did.

---

## The Contribution Loop

Every participant follows this loop:

```
1. READ    → smartDigest() — full workspace state in one call
2. GOVERN  → smartGuidelines() — organizational rules for your role/task
3. ACT     → Do your work (analyze, generate, decide, communicate)
4. RECORD  → memorize() — write your contribution to the workspace
```

No orchestrator. The workspace IS the coordination substrate. Reading it gives you context from every other contributor. Writing to it signals what you've done.

---

## Writing to the Workspace

### Contribution Format

Every workspace contribution follows the same pattern:

```typescript
await client.memory.memorize({
    content: JSON.stringify(entry),       // The structured entry
    email: 'contact@company.com',         // Entity identifier (email for contacts)
    // OR: website_url: 'https://company.com',  // For companies
    // OR: record_id: 'project-123',            // For custom entities
    enhanced: true,                        // Enable AI extraction
    tags: ['workspace:<type>', 'source:<contributor>'],
    timestamp: new Date().toISOString(),
});
```

### Writing Updates

Timeline events — what happened:

```typescript
// Agent logs an observation
await client.memory.memorize({
    content: JSON.stringify({
        author: 'product-analytics-agent',
        type: 'observation',
        summary: 'Login frequency dropped 40% over the past 2 weeks',
        details: 'Average daily logins went from 12 to 7. Feature usage of "Reports" module dropped from 8x/week to 2x/week. Dashboard usage unchanged.',
        timestamp: new Date().toISOString(),
    }),
    email: 'sarah@acme.com',
    enhanced: true,
    tags: ['workspace:updates', 'source:product-analytics-agent'],
});

// Human logs an action
await client.memory.memorize({
    content: JSON.stringify({
        author: 'jane.doe',
        type: 'action',
        summary: 'Called Sarah to discuss renewal — she mentioned budget concerns',
        details: 'Sarah said the team loves the product but finance is reviewing all vendor contracts. She asked for a cost breakdown by feature. Sent via email after the call.',
        timestamp: new Date().toISOString(),
    }),
    email: 'sarah@acme.com',
    enhanced: true,
    tags: ['workspace:updates', 'source:jane.doe'],
});
```

### Writing Tasks

Action items for any contributor:

```typescript
// Agent creates a task for a human
await client.memory.memorize({
    content: JSON.stringify({
        title: 'Send feature cost breakdown to Sarah',
        description: 'Sarah asked for a cost breakdown by feature during our call. She needs this for finance review. Use the pricing sheet from Q4 — adjust for the 15% renewal discount we discussed.',
        status: 'pending',
        owner: 'jane.doe',
        createdBy: 'cs-health-agent',
        priority: 'high',
        dueDate: '2026-02-25',
    }),
    email: 'sarah@acme.com',
    enhanced: true,
    tags: ['workspace:tasks', 'source:cs-health-agent'],
});

// Agent creates a task for another agent
await client.memory.memorize({
    content: JSON.stringify({
        title: 'Generate renewal risk assessment',
        description: 'Usage declining + budget concerns raised. Compile a risk assessment with: usage trends (30/60/90 day), support ticket volume, feature adoption rates, and recommended retention actions.',
        status: 'pending',
        owner: 'cs-health-agent',
        createdBy: 'sales-intel-agent',
        priority: 'medium',
        dueDate: '2026-02-28',
    }),
    email: 'sarah@acme.com',
    enhanced: true,
    tags: ['workspace:tasks', 'source:sales-intel-agent'],
});
```

### Writing Notes

Knowledge and observations:

```typescript
// Agent adds an analysis
await client.memory.memorize({
    content: JSON.stringify({
        author: 'sales-intel-agent',
        content: 'Acme Corp recently posted 3 job listings for data engineers. Combined with their increased API usage last quarter, this suggests they are building internal data infrastructure. Our integration capabilities could be a strong retention lever — position as "build with us, not around us."',
        category: 'analysis',
        timestamp: new Date().toISOString(),
    }),
    email: 'sarah@acme.com',
    enhanced: true,
    tags: ['workspace:notes', 'source:sales-intel-agent'],
});

// Human adds a gut feeling
await client.memory.memorize({
    content: JSON.stringify({
        author: 'jane.doe',
        content: 'Sarah seemed distracted on the call. Usually very engaged. Something might be going on internally — worth a soft check-in next week.',
        category: 'observation',
        timestamp: new Date().toISOString(),
    }),
    email: 'sarah@acme.com',
    enhanced: true,
    tags: ['workspace:notes', 'source:jane.doe'],
});
```

### Writing Issues

Problems and risks:

```typescript
// Agent raises an issue
await client.memory.memorize({
    content: JSON.stringify({
        title: 'Churn risk: declining engagement + budget review',
        description: 'Three signals converging: (1) login frequency down 40%, (2) Sarah mentioned budget review for all vendors, (3) support tickets up 50% in past month. Renewal is in 60 days.',
        severity: 'high',
        status: 'open',
        raisedBy: 'cs-health-agent',
        timestamp: new Date().toISOString(),
    }),
    email: 'sarah@acme.com',
    enhanced: true,
    tags: ['workspace:issues', 'source:cs-health-agent'],
});
```

### Resolving Issues / Completing Tasks

For mutable entries (tasks, issues), update the existing entry:

```typescript
// Mark a task as done
await client.memory.memorize({
    content: JSON.stringify({
        title: 'Send feature cost breakdown to Sarah',
        status: 'done',
        owner: 'jane.doe',
        outcome: 'Sent breakdown email. Sarah confirmed receipt and said she will share with finance this week.',
        completedAt: new Date().toISOString(),
    }),
    email: 'sarah@acme.com',
    enhanced: true,
    tags: ['workspace:tasks', 'source:jane.doe', 'status:done'],
});
```

---

## Reading from the Workspace

### Full Workspace Digest

The most common read pattern — get everything compiled into a narrative:

```typescript
const digest = await client.memory.smartDigest({
    email: 'sarah@acme.com',
    type: 'Contact',
    token_budget: 3000,          // Adjust based on context window needs
    include_properties: true,     // Include structured properties (context, etc.)
    include_memories: true,       // Include all workspace entries
});

const workspaceState = digest.data?.compiledContext;
// Returns a compiled narrative: current context, recent updates,
// open tasks, unresolved issues, key notes — everything in one string
```

### Filtered Recall

Query specific types of workspace entries:

```typescript
// Get all open tasks
const openTasks = await client.memory.smartRecall({
    query: 'open tasks pending action items',
    email: 'sarah@acme.com',
    limit: 20,
    mode: 'fast',
    include_property_values: true,
});

// Get all issues for this entity
const issues = await client.memory.smartRecall({
    query: 'issues problems risks blockers',
    email: 'sarah@acme.com',
    limit: 10,
    mode: 'fast',
});

// Get notes from a specific contributor
const agentNotes = await client.memory.smartRecall({
    query: 'sales intelligence analysis workspace notes',
    email: 'sarah@acme.com',
    limit: 10,
    mode: 'fast',
});
```

> **Note:** Use `smartRecall()` for workspace reads — it supports `limit`, `mode`, and `include_property_values`. The simpler `recall()` only accepts `query`, `email`, `record_id`, `website_url`, and `filters`.

### Cross-Entity Queries

Query across all entities (e.g., "all accounts with open critical issues"):

```typescript
const criticalIssues = await client.memory.smartRecall({
    query: 'critical severity issues open unresolved',
    limit: 50,
    min_score: 0.3,
    mode: 'fast',
});
```

---

## Tagging Conventions

Consistent tagging makes the workspace queryable:

| Tag | Purpose | Example |
|---|---|---|
| `workspace:updates` | Entry type: timeline event | Filter for updates only |
| `workspace:tasks` | Entry type: action item | Filter for tasks only |
| `workspace:notes` | Entry type: knowledge/observation | Filter for notes only |
| `workspace:issues` | Entry type: problem/risk | Filter for issues only |
| `source:<name>` | Contributor attribution | `source:cs-health-agent`, `source:jane.doe` |
| `status:<state>` | Current status (for mutable entries) | `status:done`, `status:resolved` |
| `priority:<level>` | Task priority | `priority:high`, `priority:urgent` |
| `severity:<level>` | Issue severity | `severity:critical` |

---

## Agent Loop Patterns

### Scheduled Agent (Cron/Pulse)

An agent that runs on a schedule and contributes to the workspace:

```typescript
async function agentPulse(email: string) {
    // 1. READ — get current workspace state
    const digest = await client.memory.smartDigest({
        email,
        type: 'Contact',
        token_budget: 3000,
        include_properties: true,
        include_memories: true,
    });

    // 2. GOVERN — get rules for this agent's role
    const governance = await client.ai.smartGuidelines({
        message: 'customer success health monitoring guidelines',
        mode: 'fast',
    });

    // 3. ACT — analyze and decide
    const context = [
        governance.data?.compiledContext || '',
        digest.data?.compiledContext || '',
    ].join('\n\n---\n\n');

    const analysis = await client.ai.prompt({
        context,
        instructions: [
            { prompt: 'Analyze this account workspace. What has changed? Are there open issues? Overdue tasks? New risks?', maxSteps: 3 },
            { prompt: 'Based on your analysis, what workspace contributions should you make? List: updates to add, tasks to create, issues to raise, notes to record. Output as JSON array.', maxSteps: 3 },
        ],
    });

    // 4. RECORD — write contributions to workspace
    const contributions = JSON.parse(String(analysis.data || '[]'));
    for (const contribution of contributions) {
        await client.memory.memorize({
            content: JSON.stringify(contribution.entry),
            email,
            enhanced: true,
            tags: [`workspace:${contribution.type}`, 'source:cs-health-agent'],
            timestamp: new Date().toISOString(),
        });
    }
}
```

### Event-Driven Agent

An agent triggered by external events (webhooks, CRM updates):

```typescript
// Webhook handler: new support ticket filed
app.post('/webhooks/support-ticket', async (req, res) => {
    const { contactEmail, ticketId, subject, priority } = req.body;

    // Record the event as a workspace update
    await client.memory.memorize({
        content: JSON.stringify({
            author: 'support-webhook',
            type: 'change',
            summary: `New support ticket: ${subject} (${priority})`,
            details: `Ticket #${ticketId}: ${subject}. Priority: ${priority}.`,
            timestamp: new Date().toISOString(),
        }),
        email: contactEmail,
        enhanced: true,
        tags: ['workspace:updates', 'source:support-webhook'],
    });

    // If high priority, also raise an issue
    if (priority === 'critical' || priority === 'high') {
        await client.memory.memorize({
            content: JSON.stringify({
                title: `High-priority support ticket: ${subject}`,
                description: `Ticket #${ticketId} filed with ${priority} priority. Subject: ${subject}. Investigate and track resolution.`,
                severity: priority === 'critical' ? 'critical' : 'high',
                status: 'open',
                raisedBy: 'support-webhook',
                timestamp: new Date().toISOString(),
            }),
            email: contactEmail,
            enhanced: true,
            tags: ['workspace:issues', 'source:support-webhook', `severity:${priority}`],
        });
    }

    res.json({ ok: true });
});
```

---

## Human Contribution Flows

### Via MCP (Claude Desktop, Cursor, etc.)

Humans using AI tools with MCP can contribute naturally:

> "Add a note to Sarah Chen's workspace: After our call today, I think she's leaning toward renewal but needs executive air cover. Her VP is the real blocker — we should get our VP to reach out."

The AI tool translates this into a `memory_store_pro` call with the right tags and structure.

### Via SDK (Custom UI)

Build a simple contribution UI:

```typescript
// POST /api/workspace/:email/contribute
app.post('/api/workspace/:email/contribute', async (req, res) => {
    const { email } = req.params;
    const { type, entry, author } = req.body;

    await client.memory.memorize({
        content: JSON.stringify({ ...entry, author, timestamp: new Date().toISOString() }),
        email,
        enhanced: true,
        tags: [`workspace:${type}`, `source:${author}`],
    });

    res.json({ ok: true });
});
```

---

## Progressive Autonomy

The workspace supports increasing agent independence without schema changes:

### Level 1: Report Only

Agents observe and report. Humans decide and act.

```
Agent: adds notes (observations, analysis)
Agent: adds updates (what it detected)
Human: creates tasks, resolves issues, makes decisions
```

### Level 2: Suggest

Agents suggest actions. Humans approve.

```
Agent: creates tasks with status "pending" and detailed reasoning
Agent: raises issues with recommended actions
Human: reviews, approves (changes status to "in_progress"), or dismisses
```

### Level 3: Act and Log

Agents execute and record. Humans review outcomes.

```
Agent: creates and completes tasks autonomously
Agent: adds updates documenting every action taken
Agent: escalates only critical issues to humans
Human: reviews workspace periodically, audits decisions
```

### Level 4: Full Autonomy with Governance

Agents operate within governance boundaries. Humans audit by reading.

```
Agent: full autonomous cycle — observe, decide, act, record
Agent: follows smartGuidelines() governance for all decisions
Agent: workspace is the complete transparency layer
Human: reads workspace digest to verify quality and alignment
```

**The schema is the same at every level.** Only the contributor behavior changes. Start at Level 1 and move up as trust builds.
