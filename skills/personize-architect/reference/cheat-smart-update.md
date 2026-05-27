# Smart Update / Context Save Quick Reference

## Three Tools — Which One?

| Tool | What it does | AI? | Credits | Pick when |
|------|--------------|-----|---------|-----------|
| `context_save` (AI) | Analyzes raw material, proposes/applies changes or creates optimized docs | Yes | Per-token | Raw notes, decisions, rules; let AI route + structure |
| `context_save` (direct) | Stores content as-is into a new or existing doc | No | 0 | Quick import of pre-written content, no tag fuss |
| `context_manage_create` | Creates a new doc with explicit name, tags, type, description | No | 0 | You want full control over metadata on a new doc |
| `context_manage_update` | Targeted edit of a known doc (section/append/replace) | No | 0 | You have the `guidelineId` and want deterministic edits |

**Rule of thumb:** Use `context_save` when the user drops text at you and expects smart handling. Use `context_manage_*` when you know exactly what you want to write and where it goes.

## Two Modes (context_save)

| Mode | Parameter | Credits | Use When |
|------|-----------|---------|----------|
| AI (default) | `aiExtraction: true` | Per-token | Raw material needs analysis, routing, conflict detection |
| Direct | `aiExtraction: false` | 0 | Import docs, templates, pre-written content as-is |

## AI Mode Configurations

| Preset | Pipeline | Best For |
|--------|----------|----------|
| `fast` | No expand, no verify | Quick suggestions, real-time workflows |
| `standard` | Expand + verify + conflict | Most use cases (default when preset specified) |
| `thorough` | All + cross-encoder re-rank | Compliance, legal, critical policy updates |

## Type + Strategy Matrix

| Type | Strategy | Use When |
|------|----------|----------|
| agentdoc (guideline) | suggest | Review policy changes before applying |
| agentdoc (playbook) | safe | Auto-apply non-conflicting process updates |
| agentdoc (reference) | force | Trusted source, apply immediately |
| collection | suggest | Schema evolution from data patterns |
| collection | safe | Adding properties (backward-compatible) |

## Usage

```typescript
// AI mode -- analyze and suggest
client.context.save({
  type: 'agentdoc',
  agentDocType: 'guideline',
  instruction: 'Update compliance rules with new requirements',
  material: '...',
  strategy: 'suggest',
  pipelinePreset: 'standard',
  tier: 'pro',
});

// Direct mode -- import as-is, 0 credits
client.context.save({
  instruction: 'Sales Playbook Q4',
  material: '## Step 1: Research\n...',
  aiExtraction: false,
  type: 'agentdoc',
  agentDocType: 'playbook',
});
```

MCP tool: `context_save`

## Key Parameters

| Parameter | Type | Default | Notes |
|-----------|------|---------|-------|
| instruction | string | required | What to do / doc title (max 5K chars) |
| material | string | required | Content (max 800K chars) |
| type | enum | agentdoc | guideline, collection, agentdoc |
| agentDocType | enum | reference | guideline, playbook, reference, template, brief |
| strategy | enum | suggest | suggest, safe, force |
| aiExtraction | boolean | true | false = 0 credits, direct storage |
| tier | string | pro | basic, pro, ultra |
| pipelinePreset | string | fast | fast, standard, thorough |
| targetIds | string[] | -- | Specific doc IDs (max 50) |

## Versioning

- `context.manage.history(id)` -- full snapshots with diffs
- Always include historyNote on updates
- Rollback: read history, find target version, update with previous value
