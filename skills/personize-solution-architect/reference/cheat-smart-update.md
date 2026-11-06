# Document Save Quick Reference (`memory_save shape=document`)

## One Tool, Four Intents

Guidelines, playbooks, references and other documents are written with `memory_save shape=document`. (`personize_md` is read-only: session/bootstrap/manifest.)

| Intent | How | AI? | Credits | Pick when |
|--------|-----|-----|---------|-----------|
| Create (AI) | `memory_save shape=document`, `type`, `name`, `content` (default `options.enrich: true`) | Yes | Per-token | Raw notes, decisions, rules; let AI structure the doc |
| Create (direct) | Same, with `options.enrich: false` | No | 0 | Quick import of pre-written content as-is |
| Update (targeted) | `targetIds: [docId]` + `updateMode` (`append`, `replace`, `section`, `appendToSection`) + `sectionHeader` | No | 0 | You have the doc id and want a deterministic edit |
| Restore | `restoreVersionId` + `targetIds` | No | 0 | Roll back to an earlier version |

**Rule of thumb:** Use the default (AI) form when the user drops text at you and expects smart handling. Use `options.enrich: false` or `targetIds` + `updateMode` when you know exactly what you want to write and where it goes.

## Two Modes (`memory_save shape=document`)

| Mode | Parameter | Credits | Use When |
|------|-----------|---------|----------|
| AI (default) | `options.enrich: true` | Per-token | Raw material needs analysis and structuring |
| Direct | `options.enrich: false` | 0 | Import docs, templates, pre-written content as-is |

## Usage

```typescript
// Create a guideline (AI mode, default)
client.memory.save({
  shape: 'document',
  type: 'guideline',
  name: 'compliance-rules',
  content: '...',
  tags: ['domain:compliance'],
  options: { tier: 'pro' },
});

// Direct mode -- import as-is, 0 credits
client.memory.save({
  shape: 'document',
  type: 'playbook',
  name: 'Sales Playbook Q4',
  content: '## Step 1: Research\n...',
  options: { enrich: false },
});

// Targeted update of a known doc
client.memory.save({
  shape: 'document',
  type: 'guideline',
  targetIds: ['<docId>'],
  updateMode: 'appendToSection',
  sectionHeader: 'Escalation',
  content: '...',
});
```

MCP tool: `memory_save` with `shape=document`

## Key Parameters

| Parameter | Type | Default | Notes |
|-----------|------|---------|-------|
| shape | string | shortform | `document` for guidelines, playbooks, references |
| type (or `docType`) | string | required | e.g. guideline, playbook, reference |
| content | string | required | Document content |
| name | string | | Doc title |
| tags | string[] | | Tags for routing and filtering |
| instruction | string | | Per-call instruction for how the content is processed |
| targetIds | string[] | | Existing doc ids to update |
| updateMode | enum | | append, replace, section, appendToSection |
| sectionHeader | string | | Section to edit with `section` / `appendToSection` |
| restoreVersionId | string | | Restore a prior version (with `targetIds`) |
| status | string | | Doc status |
| options.enrich | boolean | true | false = 0 credits, direct storage |
| options.tier | enum | | basic, pro, pro_fast, ultra |
| options.collectionIds | string[] | | Collections to extract properties from (max bounded) |

`attachments`, `file` and `visibility` are not supported on `shape=document` yet and are ignored with a warning.
