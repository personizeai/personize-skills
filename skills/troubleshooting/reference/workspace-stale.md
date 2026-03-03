# WORKSPACE-STALE — Agents Not Contributing or Workspace Going Stale

## Symptoms

- Workspace has no recent entries (last entry > 7 days old)
- Only one agent/contributor is writing; others are silent
- Entries are all the same type (e.g., only Updates, no Tasks or Notes)
- Agents are working on the entity but not recording their work
- `smartDigest()` shows outdated workspace information

## Diagnostic Steps

### Step 1: Check Workspace Activity

```typescript
const workspace = await client.memory.recall({
  query: 'recent updates tasks notes issues',
  email: '<entity-email>',
  tags: ['workspace'],
  limit: 20,
});

console.log('Total workspace entries:', workspace.data.memories.length);
workspace.data.memories.forEach(m => {
  try {
    const entry = JSON.parse(m.content);
    console.log(`  ${entry.type || 'unknown'} by ${entry.contributor || 'unknown'} at ${entry.timestamp || 'no timestamp'}`);
  } catch {
    console.log(`  Raw: ${m.content.substring(0, 100)}`);
  }
});
```

### Step 2: Check Which Contributors Are Active

```typescript
const contributors = new Set<string>();
workspace.data.memories.forEach(m => {
  try {
    const entry = JSON.parse(m.content);
    if (entry.contributor) contributors.add(entry.contributor);
  } catch {}
});
console.log('Active contributors:', [...contributors]);
// Compare against expected contributors
```

### Step 3: Check Agent Configuration

For each agent that should be contributing:
- Does it have the workspace schema in its instructions?
- Does it call `memorize()` with the correct tags after acting?
- Does it know the entity email?

### Step 4: Check Entry Freshness

```typescript
const now = Date.now();
const entries = workspace.data.memories.map(m => {
  try {
    const entry = JSON.parse(m.content);
    const age = now - new Date(entry.timestamp).getTime();
    return { type: entry.type, contributor: entry.contributor, ageDays: Math.round(age / 86400000) };
  } catch { return null; }
}).filter(Boolean);

console.log('Entry ages:');
entries.forEach(e => console.log(`  ${e.type} by ${e.contributor}: ${e.ageDays} days ago`));
```

## Common Root Causes (ranked by likelihood)

1. **Agents don't know about the workspace** — workspace schema isn't in agent instructions/prompts
2. **Missing memorize step** — agent acts but doesn't record the interaction
3. **Wrong tags** — agent writes with different tags than workspace reads expect
4. **Wrong email** — agent uses a different identifier for the entity
5. **Agent not triggered** — the agent's trigger (schedule, webhook, event) isn't firing
6. **One-sided contributions** — only the setup agent writes; operational agents don't

## Fixes

| Root Cause | Fix |
|---|---|
| Agents don't know | Add workspace schema to every agent's system prompt or instructions |
| Missing memorize | Add a memorize step at the end of every agent action (use the collaboration skill's template) |
| Wrong tags | Standardize on `['workspace', '<entry-type>']` tags across all agents |
| Wrong email | Ensure all agents resolve to the same canonical email for each entity |
| Agent not triggered | Check schedules, webhooks, and event listeners; verify the agent is deployed |
| One-sided | Design each agent's workflow to include a "record what I did" step |

### Template: Agent Workspace Write Step

```typescript
// Add this at the end of every agent action
await client.memory.memorize({
  email: entityEmail,
  content: JSON.stringify({
    type: 'Update',  // or 'Task', 'Note', 'Issue'
    contributor: 'agent-name',
    summary: 'What the agent did and what it found',
    details: { /* structured data */ },
    timestamp: new Date().toISOString(),
  }),
  tags: ['workspace', 'updates'],
});
```

## Prevention

- Include the workspace write step in every agent template
- Run weekly health checks to catch stale workspaces early (see **verify-setup** skill)
- Set up alerts for workspaces with no activity in 7+ days
- Document the expected contributor list for each workspace entity type
