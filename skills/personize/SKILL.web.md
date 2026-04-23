---
name: personize
description: "Complete Personize platform reference -- memory, governance, analytics, notifications, organizations, MCP servers, destinations, and more. Use this skill for ANY Personize-related task."
---

# Personize -- Complete Platform Reference

> **Single skill for all Personize capabilities.** Covers every SDK method and MCP tool.

## Quick Start

```typescript
import { Personize } from '@personize/sdk';
const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
```

---

## 1. Set Up & Configure

| What | SDK Method | MCP Tool |
|------|-----------|----------|
| Get org | `client.organizations.get()` | `organization_get` |
| Create org | `client.organizations.create({ name })` | `organization_create` |
| Update org | `client.organizations.update({ name })` | `organization_update` |
| List members | `client.members.list()` | `members_list` |
| Invite members | `client.members.invite({ emails })` | `members_invite` |
| Remove member | `client.members.remove(userId)` | `members_remove` |
| Update role | `client.members.updateRole(userId, { role })` | `members_update_role` |
| Get entity type | `client.entityTypes.get(id)` | `entity_type_get` |
| Update entity type | `client.entityTypes.update(id, opts)` | `entity_type_update` |
| Archive entity type | `client.entityTypes.archive(id)` | `entity_type_archive` |
| List collections | `client.collections.list()` | `collection_list` |
| Create collection | `client.collections.create(opts)` | `collection_create` |
| Update collection | `client.collections.update(id, opts)` | `collection_update` |
| Delete collection | `client.collections.delete(id)` | `collection_delete` |
| Test MCP server | `client.mcps.test(opts)` | `mcp_test` |
| Create MCP server | `client.mcps.create(opts)` | `mcp_create` |
| List MCP servers | `client.mcps.list()` | `mcp_list` |
| Update MCP server | `client.mcps.update(id, opts)` | `mcp_update` |
| Delete MCP server | `client.mcps.delete(id)` | `mcp_delete` |
| Create destination | `client.destinations.create(opts)` | `destination_create` |
| List destinations | `client.destinations.list()` | `destination_list` |
| Get destination | `client.destinations.get(id)` | `destination_get` |
| Update destination | `client.destinations.update(id, opts)` | `destination_update` |
| Delete destination | `client.destinations.delete(id)` | `destination_delete` |
| Test destination | `client.destinations.test(id)` | `destination_test` |

### Example: New Organization Setup

```typescript
const { organization, apiKey } = await client.organizations.create({ name: 'Acme Corp' });
await client.members.invite({ emails: ['alice@acme.com'] });
await client.mcps.create({ name: 'Tools', serverUrl: 'https://mcp.acme.com/sse', transportType: 'sse', authType: 'bearer', apiKey: 'sk-...' });
```

---

## 2. Store & Retrieve Knowledge

| What | SDK Method | MCP Tool |
|------|-----------|----------|
| Memorize (AI extraction) | `client.memory.memorize(opts)` | `memory_store_pro` |
| Smart Recall (semantic) | `client.memory.smartRecall(opts)` | `smartRecall` |
| Recall (direct) | `client.memory.recall(opts)` | -- |
| Search / filter | `client.memory.search(opts)` | `memory_search` |
| Smart Digest | `client.memory.smartDigest(opts)` | `memory_digest` |
| Batch memorize | `client.memory.memorizeBatch(opts)` | `memory_batch_store` |
| Update property | `client.memory.update(opts)` | `memory_update_property` |
| Get properties | `client.memory.properties(opts)` | `memory_get_properties` |
| Find similar | `client.memory.similar(opts)` | `memory_find_similar` |
| Segment records | `client.memory.segment(opts)` | `memory_segment` |
| Delete memories | `client.memory.delete(opts)` | -- |
| Delete record | `client.memory.deleteRecord(opts)` | -- |
| Update keys | `client.memory.updateKeys(opts)` | `update_keys` |

### Memorize Tiers: `basic`, `pro` (default), `pro_fast`, `ultra`

### Example: Store and Recall

```typescript
// Store
await client.memory.memorize({
    content: 'Alice is CTO of Acme, interested in enterprise plan.',
    email: 'alice@acme.com', enhanced: true, tags: ['sales'],
});

// Recall
const digest = await client.memory.smartDigest({
    email: 'alice@acme.com', type: 'Contact', token_budget: 2000,
});
```

---

## 3. Govern & Guide

| What | SDK Method | MCP Tool |
|------|-----------|----------|
| List guidelines | `client.guidelines.list()` | `guideline_list` |
| Read guideline | `client.guidelines.getStructure(id)` | `guideline_read` |
| Create guideline | `client.guidelines.create(opts)` | `guideline_create` |
| Update guideline | `client.guidelines.update(id, opts)` | `guideline_update` |
| Delete guideline | `client.guidelines.delete(id)` | `guideline_delete` |
| Smart Guidelines | `client.ai.smartGuidelines(opts)` | `ai_smart_guidelines` |
| Smart Update | `client.guidelines.smartUpdate(opts)` | `governance_smart_update` |
| Attachments | `.listAttachments()`, `.getAttachmentContent()`, `.uploadAttachment()`, `.deleteAttachment()` | `guideline_attachment_*` |

**Modes:** `fast` (embedding, ~200ms, 0.1 cr) | `deep` (LLM, ~3s, 0.5 cr)

### Example: Create Guideline

```typescript
await client.guidelines.create({
    name: 'sales-playbook',
    value: '# Sales Playbook\n\n## Cold Outreach\n...',
    tags: ['sales'], description: 'Outbound sales rules',
});
```

---

## 4. Monitor & React

| What | SDK Method | MCP Tool |
|------|-----------|----------|
| Org overview | `client.analytics.overview()` | `analytics_overview` |
| Memory metrics | `client.analytics.memory(opts)` | `analytics_memory` |
| Credit balance | `client.analytics.credits()` | `analytics_credits` |
| Operations | `client.analytics.operations(opts)` | `analytics_operations` |
| Send notification | `client.notifications.send(opts)` | `notification_send` |
| Broadcast | `client.notifications.broadcast(opts)` | `notification_broadcast` |
| List notifications | `client.notifications.list()` | `notification_list` |
| Unread count | `client.notifications.unreadCount()` | `notification_unread_count` |

### Example: Health Check

```typescript
const credits = await client.analytics.credits();
console.log(`Balance: ${credits.data.balance}/${credits.data.included}`);
```

---

## 5. Build & Automate

| What | SDK Method | MCP Tool |
|------|-----------|----------|
| Responses (orchestration) | `client.responses.create(opts)` | -- |
| Chat completions | `client.chat.completions.create(opts)` | -- |
| AI prompt | `client.ai.prompt(opts)` | -- |
| Agents | `client.agents.list()`, `.get(id)`, `.run(id, opts)` | -- |
| RAG | `client.rag.ingest()`, `.searchProject()`, `.listProjects()` | -- |

**Generation tiers:** `basic` (default), `pro`, `ultra`

**BYOK providers:** `openai`, `anthropic`, `google`, `deepseek`, `xai`, `openrouter`

### Example: Multi-Step Generation

```typescript
const result = await client.responses.create({
    steps: [
        { prompt: 'Research Acme Corp.', tools: ['web_search'] },
        { prompt: 'Draft outreach email based on research.' },
    ],
    personize: {
        governance: { guideline_ids: ['gdl_brand_voice'] },
        memory: { record_id: 'rec_abc', recall: true },
    },
    tier: 'pro',
});
```

---

## Key Constraints

1. One API key = one org. Multi-org needs one key per org.
2. Owner cannot be removed or role-changed via API.
3. System entity types (Contact, Company) cannot be archived.
4. `extractMemories` defaults to `false` in batch -- set `true` on text fields.
5. Always test MCPs before creating and destinations after creating.
6. Signing secrets returned only on create -- store immediately.
7. Notification callbacks expire after 7 days. Rate: 50/org/hour.
8. Responses: max 20 steps, max 20 tool roundtrips.
9. BYOK requires both `model` and `provider` params.
