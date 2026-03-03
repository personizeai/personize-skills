# VERIFY-WORKSPACE — Confirm Agents Can Read/Write

## Pre-conditions

- `PERSONIZE_SECRET_KEY` is set
- A shared workspace schema has been applied to at least one entity
- See the `collaboration` skill for setup instructions

## Steps

### Step 1: Write to the Workspace

```typescript
// Add an Update entry
await client.memory.memorize({
  email: '<entity-email>',
  content: JSON.stringify({
    type: 'Update',
    contributor: 'verify-test',
    summary: 'Verification test — confirming workspace write access.',
    timestamp: new Date().toISOString(),
  }),
  tags: ['workspace', 'updates'],
});
```

### Step 2: Read from the Workspace

```typescript
// Recall workspace entries
const workspace = await client.memory.recall({
  query: 'workspace updates',
  email: '<entity-email>',
  tags: ['workspace'],
});
console.log('Workspace entries:', workspace.data.memories.length);

// Check for our test entry
const found = workspace.data.memories.some(m =>
  m.content.includes('verify-test')
);
console.log(`Test entry: ${found ? '✅ found' : '❌ not found'}`);
```

### Step 3: Verify Multiple Contributors

If multiple agents/humans contribute, verify each can write and read:

```typescript
// Agent A writes
await client.memory.memorize({
  email: '<entity-email>',
  content: JSON.stringify({
    type: 'Note',
    contributor: 'agent-a',
    content: 'Agent A observation',
    timestamp: new Date().toISOString(),
  }),
  tags: ['workspace', 'notes'],
});

// Agent B reads Agent A's entry
const notes = await client.memory.recall({
  query: 'Agent A observation',
  email: '<entity-email>',
  tags: ['workspace', 'notes'],
});
console.log(`Cross-agent read: ${notes.data.memories.length > 0 ? '✅' : '❌'}`);
```

### Step 4: Verify smartDigest Includes Workspace

```typescript
const digest = await client.memory.smartDigest({
  email: '<entity-email>',
  include_properties: true,
  include_memories: true,
});
const hasWorkspace = digest.data.compiledContext.includes('workspace') ||
  digest.data.compiledContext.includes('Update') ||
  digest.data.compiledContext.includes('Note');
console.log(`Workspace in digest: ${hasWorkspace ? '✅' : '❌'}`);
```

## Common Failure Modes

| Symptom | Likely Cause | Fix |
|---|---|---|
| Write succeeds but read returns empty | Tags don't match or query is too specific | Use consistent tags; broaden recall query |
| Cross-agent read fails | Different email used or tags mismatch | Ensure all agents use the same entity email and tag conventions |
| Workspace not in digest | Memories tagged differently than expected | Check tag consistency; verify `include_memories: true` |
| Duplicate entries | No deduplication in memorize flow | Use timestamp + contributor for uniqueness; check before writing |

## Success Criteria

- [ ] Can write workspace entries (Updates, Tasks, Notes, Issues)
- [ ] Can read back entries by tag and query
- [ ] Multiple contributors can read each other's entries
- [ ] `smartDigest()` includes workspace content in compiled context
