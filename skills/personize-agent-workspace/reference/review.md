# REVIEW — Audit Workspace Health

When the workspace is running, audit how well the collaboration is working. Detect stale records, silent contributors, orphaned tasks, and missed opportunities.

---

## Health Signals

### Signal 1: Stale Context

The Context property hasn't been updated recently. Contributors are reading outdated state.

**How to detect:**
```typescript
const digest = await client.memory.smartDigest({
    email: 'sarah@acme.com',
    type: 'Contact',
    token_budget: 500,
    include_properties: true,
});

// Check if context mentions recent dates or feels outdated
// A good context should reference recent events and current priorities
```

**What to do:** Identify which contributor should own the Context refresh cycle. Set up a scheduled agent to rewrite Context after each new batch of updates/notes/issues.

---

### Signal 2: Orphaned Tasks

Tasks created but never picked up — status stays `pending` past the due date.

**How to detect:**
```typescript
const tasks = await client.memory.smartRecall({
    query: 'tasks pending overdue not started',
    email: 'sarah@acme.com',
    limit: 20,
    mode: 'fast',
});

// Parse results — look for tasks with status "pending" and dueDate in the past
```

**What to do:** Either the task owner isn't checking the workspace, or the owner doesn't exist. Fix by: (a) notifying the owner, (b) reassigning, or (c) cancelling if no longer relevant.

---

### Signal 3: Unanswered Issues

Issues raised but no investigation or resolution — status stays `open`.

**How to detect:**
```typescript
const issues = await client.memory.smartRecall({
    query: 'issues open unresolved',
    email: 'sarah@acme.com',
    limit: 20,
    mode: 'fast',
});

// Look for issues with status "open" that are older than your SLA threshold
```

**What to do:** Route to the appropriate contributor. If severity is `high` or `critical`, escalate immediately. Consider adding **Alerts** property (GROW action) if issues consistently go unnoticed.

---

### Signal 4: Silent Contributors

An expected participant hasn't contributed recently. They may have stopped checking the workspace.

**How to detect:**
```typescript
// Check contributions by source
const agentContributions = await client.memory.smartRecall({
    query: 'workspace contribution from cs-health-agent',
    email: 'sarah@acme.com',
    limit: 5,
    mode: 'fast',
});

// If no recent results, the agent hasn't contributed
```

**What to do:** Check if the agent is running (cron/pulse still active). Check if the agent has data to work with. If human, check if they know the workspace exists and how to use it.

---

### Signal 5: Empty Workspaces

Entity has a workspace collection but no contributions. The workspace was set up but never activated.

**How to detect:**
```typescript
const digest = await client.memory.smartDigest({
    email: 'sarah@acme.com',
    type: 'Contact',
    token_budget: 500,
});

// If compiledContext is very short or says "no data available"
```

**What to do:** Either the entity doesn't need a workspace, or the contribution pipelines aren't connected. Check: are agents targeting this entity? Do humans know how to contribute?

---

### Signal 6: One-Sided Collaboration

Only one contributor writes to the workspace. The "collaboration" is really a monologue.

**How to detect:**
```typescript
// Recall all workspace entries and check author diversity
const allEntries = await client.memory.smartRecall({
    query: 'workspace updates tasks notes issues',
    email: 'sarah@acme.com',
    limit: 50,
    mode: 'fast',
    include_property_values: true,
});

// Parse results — count unique authors
// If only 1 author across all entries, it's one-sided
```

**What to do:** Ask why other expected contributors aren't writing. Common causes: they don't know the workspace exists, they don't have data to contribute, or the contribution format is too complex.

---

### Signal 7: Task Pile-Up

Many tasks created, few completed. The workspace generates more work than it resolves.

**How to detect:**
```typescript
const allTasks = await client.memory.smartRecall({
    query: 'tasks all statuses pending done cancelled',
    email: 'sarah@acme.com',
    limit: 50,
    mode: 'fast',
    include_property_values: true,
});

// Count by status: pending vs in_progress vs done vs cancelled
// Healthy ratio: done > pending. Unhealthy: pending >> done.
```

**What to do:** Tasks might be too granular, unrealistic, or assigned to the wrong people. Audit task quality — are descriptions actionable? Are priorities realistic? Are owners actually available?

---

## Review Workflow

### Step 1: Collect Data

For each entity (or a sample of entities), pull workspace metrics:

```typescript
async function reviewWorkspace(email: string) {
    const [digest, updates, tasks, notes, issues] = await Promise.all([
        client.memory.smartDigest({ email, type: 'Contact', token_budget: 2000 }),
        client.memory.smartRecall({ query: 'updates timeline', email, limit: 30, mode: 'fast' }),
        client.memory.smartRecall({ query: 'tasks action items', email, limit: 30, mode: 'fast' }),
        client.memory.smartRecall({ query: 'notes observations', email, limit: 30, mode: 'fast' }),
        client.memory.smartRecall({ query: 'issues problems', email, limit: 30, mode: 'fast' }),
    ]);

    return {
        contextPresent: !!(digest.data?.compiledContext?.length > 100),
        updateCount: updates.data?.length || 0,
        taskCount: tasks.data?.length || 0,
        noteCount: notes.data?.length || 0,
        issueCount: issues.data?.length || 0,
        // Parse for: unique authors, status distribution, recency
    };
}
```

### Step 2: Score Health

Simple scoring model:

| Metric | Healthy | Warning | Unhealthy |
|---|---|---|---|
| Context freshness | Updated this week | Updated this month | Older than 1 month |
| Update frequency | Multiple per week | Weekly | Less than monthly |
| Task completion rate | > 70% done | 40-70% done | < 40% done |
| Issue resolution rate | > 80% resolved | 50-80% resolved | < 50% resolved |
| Contributor diversity | 3+ unique authors | 2 authors | 1 author |
| Response time (issues) | < 24 hours | < 1 week | > 1 week |

### Step 3: Report Findings

Structure the report as:

1. **What's working** — healthy signals, active contributors, good collaboration patterns
2. **What's stale** — old contexts, orphaned tasks, unresolved issues
3. **What's missing** — expected contributors not active, entity types without workspaces, gaps in coverage
4. **Recommendations** — specific actions: "Rewrite context for these 5 accounts", "Set up cs-health-agent to run weekly", "Add Alerts property to escalate critical issues"

### Step 4: Act on Findings

Use the GROW action to add properties if the review reveals structural gaps. Use the USE action to fix contribution patterns. Use the CREATE action to add workspaces to entity types that need them.

---

## Cross-Entity Review

Review workspace health across all entities of a type:

```typescript
// Get all entities with workspace activity
const allWorkspaceActivity = await client.memory.smartRecall({
    query: 'workspace updates tasks notes issues',
    limit: 100,
    mode: 'fast',
});

// Group by entity (email/website_url)
// Identify: most active workspaces, least active, anomalies
```

### What to Look For Across Entities

| Pattern | What it means |
|---|---|
| **High-activity cluster** | These entities are getting attention. Verify it's warranted (high-value accounts, not just noisy agents). |
| **Silent majority** | Most entities have empty or sparse workspaces. Either they don't need them, or contribution pipelines are broken. |
| **Consistent contributor** | One agent contributes across all entities. Good — it's doing its job. |
| **Inconsistent contributor** | An agent contributes to some entities but not others. Check filtering logic or data availability. |
| **No human activity** | Agents contribute but no humans do. The workspace might be invisible to the team. |

---

## Automating Reviews

Set up a review agent that runs weekly:

```typescript
async function weeklyWorkspaceReview() {
    // 1. Get all active entities using search
    const entities = await client.memory.search({
        type: 'Contact',
        returnRecords: true,
        pageSize: 100,
    });

    // 2. Review each workspace
    const results = [];
    for (const entity of entities.data?.records || []) {
        const health = await reviewWorkspace(entity.email);
        results.push({ email: entity.email, ...health });
    }

    // 3. Generate a summary report
    const unhealthy = results.filter(r =>
        !r.contextPresent || r.taskCount > 10 || r.issueCount > 5
    );

    // 4. Write the report to a workspace (meta!) or send via notification
    console.log(`Reviewed ${results.length} workspaces. ${unhealthy.length} need attention.`);
    for (const entity of unhealthy) {
        console.log(`  ⚠ ${entity.email}: context=${entity.contextPresent}, tasks=${entity.taskCount}, issues=${entity.issueCount}`);
    }
}
```

---

## Deduplication Limitations

The workspace's deduplication relies on **semantic search** via `smartRecall()`, which finds _similar_ entries but cannot guarantee _exact_ duplicate detection.

### What Works

- Agents that call `smartRecall()` before writing can check if a semantically similar entry already exists
- The "read before write" protocol (documented in the agent prompts) catches most obvious duplicates
- Unique identifier tags (`source:<agent>`, `priority:<level>`) help distinguish entries

### What Doesn't

- Two agents writing the same observation in different words may not detect each other's entries via semantic similarity alone
- There is no built-in unique constraint or exact-match deduplication at the storage level
- High-frequency agents (running every minute) may create overlapping entries before semantic search indexes update

### Recommended Mitigations

1. **Unique identifiers:** Include a `dedupKey` field in entries (e.g., `"dedupKey": "usage-drop-2026-02"`) so agents can check for exact matches before writing
2. **Rate limiting:** Schedule agents to run at reasonable intervals (hourly, not every minute) to allow indexing to complete
3. **Context rewriting:** The CS Health Agent's "context rewrite" pattern (see `multi-agent-account.ts`) naturally deduplicates by synthesizing all signals into one summary rather than appending
4. **Review audits:** Use the REVIEW action periodically to identify and clean up duplicate entries
