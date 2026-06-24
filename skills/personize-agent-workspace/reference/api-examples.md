# API Examples — Raw REST Endpoints for Workspace Operations

For users who prefer raw HTTP calls over the SDK or MCP. All endpoints use `https://agent.personize.ai` as the base URL.

**Authentication:** Include your API key as a Bearer token in the `Authorization` header.

**API version:** Examples use the v1.1 surface. Legacy v1 paths (`/api/v1/memorize`, `/api/v1/smart-recall`, …) still respond but emit RFC 8594 `Deprecation: true` and `Sunset: 2026-07-15` headers. Migrate to `/api/v1.1/memory/save`, `/api/v1.1/memory/retrieve`, etc.

---

## Memorize a Workspace Entry

Write a task to a contact's workspace:

```bash
curl -X POST https://agent.personize.ai/api/v1.1/memory/save \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "shape": "shortform",
    "content": "{\"title\":\"Schedule QBR prep call\",\"description\":\"Usage dropped 30% — need to understand why before renewal.\",\"status\":\"pending\",\"owner\":\"account-manager\",\"createdBy\":\"my-agent\",\"priority\":\"high\",\"timestamp\":\"2026-02-22T10:00:00Z\"}",
    "email": "sarah@acme.com",
    "tags": ["workspace:tasks", "source:my-agent", "priority:high"]
  }'
```

### fetch (TypeScript/JavaScript)

```typescript
const response = await fetch('https://agent.personize.ai/api/v1.1/memory/save', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${process.env.PERSONIZE_SECRET_KEY}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        shape: 'shortform', // v1.1: replaces the v1 `enhanced: true` flag
        content: JSON.stringify({
            title: 'Schedule QBR prep call',
            description: 'Usage dropped 30% — need to understand why before renewal.',
            status: 'pending',
            owner: 'account-manager',
            createdBy: 'my-agent',
            priority: 'high',
            timestamp: new Date().toISOString(),
        }),
        email: 'sarah@acme.com',
        tags: ['workspace:tasks', 'source:my-agent', 'priority:high'],
    }),
});
```

---

## Recall Workspace Entries (Smart Recall)

Retrieve workspace entries with semantic search and optional reflection:

```bash
curl -X POST https://agent.personize.ai/api/v1.1/memory/retrieve \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "open tasks pending action items",
    "email": "sarah@acme.com",
    "limit": 20,
    "mode": "fast",
    "include_property_values": true
  }'
```

> **Note:** Use `POST /api/v1.1/memory/retrieve` (MCP: `smartRecall`) for workspace reads — it supports `limit`, `minScore`, `mode`, and reflection. The simple direct-lookup endpoint (`GET /api/v1.1/memory/manage/:id`) is for known-id fetches and its `memory_retrieve` MCP tool is **hidden by default** in v1.1.

---

## Get Workspace Digest

Compiled context bundle for an entity — combines structured properties + free-form memories into a token-budgeted narrative:

```bash
curl -X POST https://agent.personize.ai/api/v1.1/memory/digest \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah@acme.com",
    "type": "Contact",
    "token_budget": 3000,
    "include_properties": true,
    "include_memories": true
  }'
```

### Response

```json
{
  "success": true,
  "data": {
    "compiledContext": "## sarah@acme.com\n\n### Properties\n...\n\n### Memories\n..."
  }
}
```

---

## Get Governance Guidelines

Fetch organizational rules relevant to a task:

```bash
curl -X POST https://agent.personize.ai/api/v1.1/ai/smart-guidelines \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "customer success health monitoring, churn prevention, workspace protocol",
    "mode": "fast"
  }'
```

---

## Run a Prompt with Workspace Context

Execute analysis using Personize's multi-step prompt API:

```bash
curl -X POST https://agent.personize.ai/api/v1.1/prompt \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "context": "## Guidelines\n\n...\n\n## Workspace State\n\n...",
    "instructions": [
      {
        "prompt": "Analyze this account workspace. Identify risks, opportunities, and recommended next actions. Output as JSON.",
        "maxSteps": 5
      }
    ]
  }'
```

---

## List Collections

Check that your workspace collection exists:

```bash
curl -X GET "https://agent.personize.ai/api/v1.1/collections?summary=true" \
  -H "Authorization: Bearer sk_live_YOUR_KEY"
```

---

## Create a Workspace Collection

Programmatically create a workspace schema:

```bash
curl -X POST https://agent.personize.ai/api/v1.1/collections \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "collectionName": "Account Workspace",
    "definition": "Shared workspace for multi-agent collaboration on account records",
    "entityType": "Contact",
    "properties": [
      {
        "propertyName": "Context",
        "type": "text",
        "description": "Current state summary — what is happening now, priorities, next actions"
      },
      {
        "propertyName": "Updates",
        "type": "array",
        "description": "Timeline of events — who did what, when"
      },
      {
        "propertyName": "Tasks",
        "type": "array",
        "description": "Action items — what needs to happen, who owns it, status"
      },
      {
        "propertyName": "Notes",
        "type": "array",
        "description": "Knowledge and observations — analysis, ideas, intel"
      },
      {
        "propertyName": "Issues",
        "type": "array",
        "description": "Problems and risks — what is wrong, severity, status"
      }
    ]
  }'
```

---

## Get Property Values

Read property values for an entity, including schema descriptions and the `update` flag (replaceable vs append-only):

### SDK

```typescript
const properties = await client.memory.properties({
    email: 'sarah@acme.com',
    type: 'Contact',
});

// properties.data contains property values with schema metadata
// Each property includes `update: true` (replaceable) or `update: false` (append-only)
```

### REST

```bash
curl -X POST https://agent.personize.ai/api/v1.1/memory/filter-by-property \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah@acme.com",
    "type": "Contact"
  }'
```

---

## Update a Property

Set, push, remove, or patch a property value. The `update` flag on the property schema controls which operations are allowed (`update: false` properties only accept `push`):

```bash
curl -X POST https://agent.personize.ai/api/v1.1/memory/manage/:id \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah@acme.com",
    "propertyName": "pending_tasks",
    "operation": "set",
    "value": [{"taskId": "t_001", "title": "Schedule QBR", "status": "pending"}]
  }'
```

**Operations:** `set` (replace value), `push` (append to array), `remove` (remove from array), `patch` (merge into object).

> **MCP equivalent:** `memory_update_property` tool.

---

## Search Records by Property Conditions

Find all entities with specific workspace states:

```bash
curl -X POST https://agent.personize.ai/api/v1.1/memory/search \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Contact",
    "returnRecords": true,
    "includeMemories": false,
    "pageSize": 50
  }'
```

---

## Endpoint Reference (v1.1)

| Operation | Endpoint (v1.1) | Method | MCP tool |
|---|---|---|---|
| Save memory (write) | `/api/v1.1/memory/save` | POST | `memory_save` |
| Save typed document | `/api/v1.1/memory/save` *(with `shape: 'document', type`)* | POST | `context_save` |
| Retrieve (semantic + reflection) | `/api/v1.1/memory/retrieve` | POST | `smartRecall` |
| Direct lookup by id | `/api/v1.1/memory/manage/:id` | GET | *(`memory_retrieve` hidden by default — use `smartRecall`)* |
| Smart Digest (compiled context) | `/api/v1.1/memory/digest` | POST | `memory_digest` |
| Get Properties (filter-by-property) | `/api/v1.1/memory/filter-by-property` | POST | `memory_get_properties` |
| Update Property | `/api/v1.1/memory/manage/:id` | PATCH | `memory_update_property` |
| Delete Memory | `/api/v1.1/memory/manage/:id` | DELETE | — |
| Bulk Import (ETL) | `/api/v1.1/memory/import` | POST | *(SDK / CLI / HTTP — `memory_batch_store` hidden by default)* |
| Save batch (small, sync) | `/api/v1.1/memory/save/batch` | POST | — |
| Async doc-save batch | `/api/v1.1/context/save/batch` | POST | — |
| Doc-types registry | `/api/v1.1/context/manage/doc-types` | GET/POST/PATCH/DELETE | — |
| Smart Guidelines (governance) | `/api/v1.1/ai/smart-guidelines` | POST | `ai_smart_guidelines` |
| Context save / retrieve | `/api/v1.1/context/save` / `/api/v1.1/context/retrieve` | POST | `context_save` / `context_retrieve` |
| Prompt (AI execution) | `/api/v1.1/prompt` | POST | — |
| List Collections | `/api/v1.1/collections` | GET | — |
| Create Collection | `/api/v1.1/collections` | POST | — |
| Update Collection | `/api/v1.1/collections/:id` | PATCH | — |
| Search Records | `/api/v1.1/memory/search` | POST | — |

v1 endpoints (`/api/v1/memorize`, `/api/v1/smart-recall`, …) still respond and emit `Deprecation: true` + `Sunset: 2026-07-15`. Migrate to v1.1 at your convenience.
