# context.retrieve — Parameters Reference

`POST /api/v1/context/retrieve` · `client.context.retrieve()` · MCP: `context_retrieve`

## Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `message` | string | required | Natural-language query describing what you need |
| `types` | string[] | all | Filter by doc type: `guideline`, `playbook`, `reference`, `template`, `brief` |
| `tags` | string[] | — | Filter by tags |
| `mode` | `fast` \| `deep` \| `auto` | `auto` | Retrieval depth: `fast` (embedding-only, ~200ms), `deep` (LLM-composed, ~3s) |
| `match` | `balanced` \| `strict` \| `broad` | `balanced` | Result precision mode (see below) |
| `topK` | integer 1–100 | 20 | Max sections returned. Only applies when `match: 'broad'`. |
| `recordId` | string | — | Boost docs linked to a specific record |
| `autoInferFilters` | boolean | false | Use LLM to infer types/tags from the query when not provided |
| `maxContentTokens` | number | 10000 | Token budget for returned content |

## match Modes

### `balanced` (default)

Standard semantic scoring. Returns a flat list of matching guidelines ordered by relevance.

```typescript
const result = await client.context.retrieve({
    message: 'cold email tone and length constraints',
});
// result.data.selection -> flat array of matching docs/sections
```

Use this in most cases. Equivalent to omitting `match`.

### `strict`

Applies an abstention threshold — if no candidate scores above the confidence bar, the call returns an empty selection. `alwaysOn` guidelines bypass the threshold and are always included.

```typescript
const result = await client.context.retrieve({
    message: 'cold email tone',
    match: 'strict',
});

if (result.data.selection.length === 0) {
    // No guidelines matched with sufficient confidence — safe to skip injection
}
// alwaysOn guidelines are present regardless
```

**When to use:** Auto-injecting guidelines into LLM system prompts without human review. Strict prevents low-confidence noise from polluting the context.

### `broad`

Returns a hierarchical response: each matching document exposes individual sections. Higher recall, lower precision. `topK` limits the total number of sections returned across all documents.

```typescript
const result = await client.context.retrieve({
    message: 'everything about our email and outreach standards',
    match: 'broad',
    topK: 40,
});

for (const doc of result.data.selection) {
    console.log(doc.name);              // document title
    for (const section of doc.sections ?? []) {
        console.log('  -', section.header, section.content.slice(0, 200));
    }
}
```

**When to use:** Research, summarization, surfacing related content for display, building a full knowledge digest.

## Decision Guide

```
Need to inject into system prompt without review?
  → match: 'strict'

Need maximum recall for surfacing related content?
  → match: 'broad', topK: 30-50

Default retrieval for an agent or pipeline?
  → match: 'balanced' (or omit)
```

## CLI

```bash
# Balanced (default)
personize context-docs retrieve "cold email constraints"

# Strict — abstains if nothing is confident enough
personize context-docs retrieve "cold email constraints" --match strict

# Broad — hierarchical, up to 30 sections
personize context-docs retrieve "email standards" --match broad --top-k 30
```

## Response Shape Differences

**`balanced` / `strict`** — flat selection array:
```json
{
  "selection": [
    { "id": "gdl_123", "name": "Email Guidelines", "content": "...", "priority": "critical" }
  ]
}
```

**`broad`** — hierarchical with sections:
```json
{
  "selection": [
    {
      "id": "gdl_123",
      "name": "Email Guidelines",
      "score": 0.87,
      "sections": [
        { "header": "Tone", "content": "..." },
        { "header": "Length", "content": "..." }
      ]
    }
  ]
}
```
