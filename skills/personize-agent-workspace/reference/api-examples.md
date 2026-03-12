# API Examples — Raw REST Endpoints for Workspace Operations

For users who prefer raw HTTP calls over the SDK or MCP. All endpoints use `https://agent.personize.ai` as the base URL.

**Authentication:** Include your API key as a Bearer token in the `Authorization` header.

---

## Memorize a Workspace Entry

Write a task to a contact's workspace:

```bash
curl -X POST https://agent.personize.ai/api/v1/memorize \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "{\"title\":\"Schedule QBR prep call\",\"description\":\"Usage dropped 30% — need to understand why before renewal.\",\"status\":\"pending\",\"owner\":\"account-manager\",\"createdBy\":\"my-agent\",\"priority\":\"high\",\"timestamp\":\"2026-02-22T10:00:00Z\"}",
    "email": "sarah@acme.com",
    "enhanced": true,
    "tags": ["workspace:tasks", "source:my-agent", "priority:high"]
  }'
```

### fetch (TypeScript/JavaScript)

```typescript
const response = await fetch('https://agent.personize.ai/api/v1/memorize', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${process.env.PERSONIZE_SECRET_KEY}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
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
        enhanced: true,
        tags: ['workspace:tasks', 'source:my-agent', 'priority:high'],
    }),
});
```

---

## Recall Workspace Entries (Smart Recall)

Retrieve workspace entries with semantic search and optional reflection:

```bash
curl -X POST https://agent.personize.ai/api/v1/smart-recall \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "open tasks pending action items",
    "email": "sarah@acme.com",
    "limit": 20,
    "fast_mode": true,
    "include_property_values": true
  }'
```

> **Note:** Use `/api/v1/smart-recall` for workspace reads. The simpler `/api/v1/recall` endpoint only supports `query`, `email`, `record_id`, `website_url`, and `filters` — it does not have `limit`, `minScore`, or `fast_mode`.

---

## Get Workspace Digest

Compiled context bundle for an entity — combines structured properties + free-form memories into a token-budgeted narrative:

```bash
curl -X POST https://agent.personize.ai/api/v1/smart-memory-digest \
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
curl -X POST https://agent.personize.ai/api/v1/ai/smart-guidelines \
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
curl -X POST https://agent.personize.ai/api/v1/prompt \
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
curl -X GET "https://agent.personize.ai/api/v1/collections?summary=true" \
  -H "Authorization: Bearer sk_live_YOUR_KEY"
```

---

## Create a Workspace Collection

Programmatically create a workspace schema:

```bash
curl -X POST https://agent.personize.ai/api/v1/collections \
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

## Search Records by Property Conditions

Find all entities with specific workspace states:

```bash
curl -X POST https://agent.personize.ai/api/v1/search \
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

## Endpoint Reference

| Operation | Endpoint | Method |
|---|---|---|
| Memorize (write) | `/api/v1/memorize` | POST |
| Smart Recall (read with reflection) | `/api/v1/smart-recall` | POST |
| Recall (simple read) | `/api/v1/recall` | POST |
| Smart Digest (compiled context) | `/api/v1/smart-memory-digest` | POST |
| Smart Guidelines (governance) | `/api/v1/ai/smart-guidelines` | POST |
| Prompt (AI execution) | `/api/v1/prompt` | POST |
| List Collections | `/api/v1/collections` | GET |
| Create Collection | `/api/v1/collections` | POST |
| Update Collection | `/api/v1/collections/:id` | PATCH |
| Search Records | `/api/v1/search` | POST |
