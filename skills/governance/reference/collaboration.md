# Reference: Team Collaboration

Patterns for managing guidelines when multiple developers, agents, or team members work simultaneously.

---

## Version History

Every guideline update is automatically tracked. Use `client.guidelines.history(id)` (SDK) or `guideline_history` (MCP) to review what changed, who changed it, and why.

**Important:** Each history entry includes the **full variable content snapshot** at that point in time (`entry.payload.value`). This can be very large. Always start with `limit: 1` and let the user decide whether to go deeper.

### Incremental History Pattern (Recommended)

```typescript
// Step 1: Fetch only the most recent change
const history = await client.guidelines.history(variableId, { limit: 1 });
const latest = history.data?.history?.[0];

if (latest) {
    // Show metadata to user — NOT the full content
    console.log(`Last change: ${latest.timestamp}`);
    console.log(`By: ${latest.modifiedByEmail}`);
    console.log(`Note: ${latest.note}`);
    // Don't show latest.payload.value unless the user asks for it
}

// Step 2: If user wants to see more history, increase the limit
const deeper = await client.guidelines.history(variableId, { limit: 3 });
// Show each entry's metadata, let user pick which snapshot to inspect
```

### Conversation Flow for History

```
User: "What changed in our sales playbook recently?"
Agent:
  1. Fetch history with limit: 1
  2. Show: "Last change was 2 hours ago by alice@acme.com — 'Updated pricing: 2→3 tiers'"
  3. Ask: "Want to see the previous version or look further back?"

User: "Show me the one before that"
Agent:
  1. Fetch history with limit: 2
  2. Show the 2nd entry metadata
  3. If user wants to compare, show the diff between entry[0].payload.value and entry[1].payload.value

User: "That's enough" → stop loading history
```

### When to Check History

- **Before editing** — See if someone recently changed the same section. Avoid overwriting their work.
- **After a teammate reports an issue** — Find when and why the content changed.
- **During audits** — Review the change log incrementally.
- **After automated updates** — Confirm auto-learning pushed the right content.

---

## Conflict Avoidance

Governance uses **last-write-wins** — there is no merge conflict UI. Use these practices to minimize overwrites:

1. **Prefer section-level updates** — `updateMode: 'section'` or `appendToSection` scopes your change to a single `## Section`. Two people can safely update different sections of the same variable concurrently.
2. **Read before writing** — Always call `getSection()` or `getStructure()` before updating. If the content changed since you last read it, re-read and adjust your edit.
3. **Use descriptive historyNotes** — If a conflict does occur, good history notes make it easy to reconstruct the intended state.
4. **Assign ownership by tag or variable** — Use your team tags (e.g., `sales-*` variables owned by sales team, `engineering-*` by engineering) to reduce cross-team edits on the same variable.
5. **Don't use `replace` mode unless necessary** — Full replace overwrites everything. Section-level edits are scoped and safer for team workflows.

---

## Attribution

Every update records **who** made the change (`modifiedBy`, `modifiedByEmail`) and **why** (`historyNote`). For team-managed guidelines, write attribution-rich history notes:

**Good team historyNotes:**
- `"Updated pricing section: 2 → 3 tiers (requested by @alice in #sales-channel)"`
- `"Auto-learning: added connection pool fix from incident #247 — reviewed by @bob"`
- `"Audit: updated refund window 30→14 days across all mentions — per policy change approved by legal"`

**Include in your note:**
- What changed (the diff summary)
- Why it changed (the trigger — request, incident, audit, new policy)
- Who requested it (if applicable)

---

## Team Workflow Patterns

### Pattern 1: Centralized Owner

One person (or small team) owns all guidelines. Others propose changes via conversation.

```
Developer finds outdated policy → tells guidelines owner
    → Owner reads current guideline
    → Drafts update → applies with historyNote
    → Verifies via smartGuidelines
```

Best for: small teams, early-stage setup, sensitive content (legal, security).

### Pattern 2: Department-Owned Guidelines

Each department owns their guidelines (tagged by department). Anyone on the team can edit their department's guidelines.

```
Sales team owns: sales-playbook, icp-definitions, objection-handling (tag: sales)
Eng team owns: engineering-standards, known-bugs, api-patterns (tag: engineering)
```

Best for: mid-size teams, cross-functional orgs, scaling guidelines.

### Pattern 3: Agent-Assisted with Human Review

Agents auto-discover learnings and draft updates. A human reviews before publishing.

```
Agent detects learning (bug fix, pattern, incident)
    → Drafts guideline update
    → Shows draft to team member: "I found this pattern — should I add it?"
    → On approval → applies with historyNote
```

Best for: autonomous learning loops, high-volume teams, continuous improvement.

---

## Reviewing Changes Across the Team

```typescript
// Weekly guidelines summary — fetch limit: 1 per guideline to keep response minimal
const all = await client.guidelines.list();

for (const variable of all.actions ?? []) {
    const history = await client.guidelines.history(variable.id, { limit: 1 });
    const latest = history.data?.history?.[0];

    if (latest && new Date(latest.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
        // Only show metadata — never dump full payload.value in a summary
        console.log(`${variable.payload.name}: last changed ${latest.timestamp} by ${latest.modifiedByEmail} — "${latest.note}"`);
    }
}
// If user wants to dig into a specific variable, fetch more history for just that one
```
