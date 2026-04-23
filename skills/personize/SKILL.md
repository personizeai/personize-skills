---
name: personize
description: "Complete Personize platform reference -- memory, governance, analytics, notifications, organizations, MCP servers, destinations, and more. Use this skill for ANY Personize-related task: storing/retrieving knowledge, managing guidelines, monitoring usage, sending notifications, configuring the platform, or building AI agent pipelines."
license: Apache-2.0
compatibility: "Requires @personize/sdk and a Personize API key (sk_live_...)"
metadata: {"author": "personize-ai", "version": "1.0", "homepage": "https://personize.ai"}
---

# Personize -- Complete Platform Reference

> **This is the only skill you need for Personize.** It covers every API endpoint, SDK method, and MCP tool. Specialized reference docs exist for deep dives but this skill is self-sufficient for 95% of tasks.

## Quick Start

```typescript
import { Personize } from '@personize/sdk';
const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
const me = await client.me(); // verify auth + see org info
```

## What Can You Do?

| # | Category | What | Jump To |
|---|----------|------|---------|
| 1 | **Set Up & Configure** | Organizations, Members, Entity Types, Collections, MCPs, Destinations, API Keys | [Section 1](#1-set-up--configure) |
| 2 | **Store & Retrieve Knowledge** | Memorize, Recall, Smart Recall, Search, Digest, Similar, Segment, Batch, Keys | [Section 2](#2-store--retrieve-knowledge) |
| 3 | **Govern & Guide** | Guidelines CRUD, Smart Context, Smart Update, Attachments | [Section 3](#3-govern--guide) |
| 4 | **Monitor & React** | Analytics, Notifications | [Section 4](#4-monitor--react) |
| 5 | **Build & Automate** | Responses, Chat Completions, Prompts, RAG, Agents, Evaluation | [Section 5](#5-build--automate) |

---

## 1. Set Up & Configure

| What | SDK Method | MCP Tool | Cost |
|------|-----------|----------|------|
| Get org info | `client.organizations.get()` | `organization_get` | Free |
| Create org | `client.organizations.create({ name })` | `organization_create` | Free |
| Update org | `client.organizations.update({ name })` | `organization_update` | Free |
| List members | `client.members.list()` | `members_list` | Free |
| Invite members | `client.members.invite({ emails })` | `members_invite` | Free |
| Remove member | `client.members.remove(userId)` | `members_remove` | Free |
| Update role | `client.members.updateRole(userId, { role })` | `members_update_role` | Free |
| List invitations | `client.members.listInvitations()` | -- | Free |
| Get entity type | `client.entityTypes.get(id)` | `entity_type_get` | Free |
| Update entity type | `client.entityTypes.update(id, opts)` | `entity_type_update` | Free |
| Archive entity type | `client.entityTypes.archive(id)` | `entity_type_archive` | Free |
| List collections | `client.collections.list()` | `collection_list` | Free |
| Create collection | `client.collections.create(opts)` | `collection_create` | Free |
| Update collection | `client.collections.update(id, opts)` | `collection_update` | Free |
| Delete collection | `client.collections.delete(id)` | `collection_delete` | Free |
| Collection history | `client.collections.history(id)` | `collection_history` | Free |
| Test MCP server | `client.mcps.test(opts)` | `mcp_test` | Free |
| Create MCP server | `client.mcps.create(opts)` | `mcp_create` | Free |
| List MCP servers | `client.mcps.list()` | `mcp_list` | Free |
| Get MCP server | `client.mcps.get(id)` | -- | Free |
| Update MCP server | `client.mcps.update(id, opts)` | `mcp_update` | Free |
| Delete MCP server | `client.mcps.delete(id)` | `mcp_delete` | Free |
| Refresh MCP tools | `client.mcps.refreshTools(id)` | -- | Free |
| Update MCP tools | `client.mcps.updateTools(id, opts)` | -- | Free |
| Create destination | `client.destinations.create(opts)` | `destination_create` | Free |
| List destinations | `client.destinations.list()` | `destination_list` | Free |
| Get destination | `client.destinations.get(id)` | `destination_get` | Free |
| Update destination | `client.destinations.update(id, opts)` | `destination_update` | Free |
| Delete destination | `client.destinations.delete(id)` | `destination_delete` | Free |
| Test destination | `client.destinations.test(id)` | `destination_test` | Free |
| Get delivery logs | `client.destinations.getLogs(id)` | -- | Free |

### Workflow: Set Up a New Organization

```typescript
// 1. Create org (returns admin API key -- store securely!)
const { organization, apiKey } = await client.organizations.create({ name: 'Acme Corp' });

// 2. Invite team members
await client.members.invite({ emails: ['alice@acme.com', 'bob@acme.com'] });

// 3. Connect an MCP server
const test = await client.mcps.test({
    serverUrl: 'https://mcp.acme.com/sse',
    transportType: 'sse', authType: 'bearer', apiKey: 'sk-...',
});
if (test.data.connected) {
    await client.mcps.create({
        name: 'Internal Tools',
        serverUrl: 'https://mcp.acme.com/sse',
        transportType: 'sse', authType: 'bearer', apiKey: 'sk-...',
    });
}

// 4. Set up webhook for events
const dest = await client.destinations.create({
    name: 'Event Webhook', type: 'webhook',
    config: { url: 'https://api.acme.com/events', secret: 'my-signing-secret' },
    events: ['prompt.completed', 'memorization.completed'],
});
await client.destinations.test(dest.data.id);
```

---

## 2. Store & Retrieve Knowledge

| What | SDK Method | MCP Tool | Cost |
|------|-----------|----------|------|
| Memorize (AI extraction) | `client.memory.memorize(opts)` | `memory_store_pro` | Tiered |
| Smart Recall (semantic) | `client.memory.smartRecall(opts)` | `smartRecall`, `memory_recall_pro` | Tiered |
| Recall (direct lookup) | `client.memory.recall(opts)` | -- | Free |
| Search / filter records | `client.memory.search(opts)` | `memory_search` | Free |
| Smart Digest (compiled) | `client.memory.smartDigest(opts)` | `memory_digest` | Tiered |
| Batch memorize | `client.memory.memorizeBatch(opts)` | `memory_batch_store` | Tiered |
| Update property | `client.memory.update(opts)` | `memory_update_property` | Free |
| Bulk update | `client.memory.bulkUpdate(opts)` | -- | Free |
| Get properties | `client.memory.properties(opts)` | `memory_get_properties` | Free |
| Property history | `client.memory.propertyHistory(opts)` | -- | Free |
| Query properties (LLM) | `client.memory.queryProperties(opts)` | -- | Tiered |
| Filter by property | `client.memory.filterByProperty(opts)` | -- | Free |
| Find similar records | `client.memory.similar(opts)` | `memory_find_similar` | Tiered |
| Segment records | `client.memory.segment(opts)` | `memory_segment` | Tiered |
| Delete memories | `client.memory.delete(opts)` | -- | Free |
| Delete record | `client.memory.deleteRecord(opts)` | -- | Free |
| Cancel deletion | `client.memory.cancelDeletion(opts)` | -- | Free |
| Update keys | `client.memory.updateKeys(opts)` | `update_keys` | Free |
| Update keys batch | `client.memory.updateKeysBatch(opts)` | -- | Free |
| List keys | `client.memory.listKeys(opts)` | `list_keys` | Free |
| Delete keys | `client.memory.deleteKeys(opts)` | `delete_keys` | Free |

### Memorize Intelligence Tiers

| Tier | Use Case | Default |
|------|----------|---------|
| `basic` | High-volume, cost-sensitive | |
| `pro` | Balanced quality and cost | Yes |
| `pro_fast` | Fast LLMs, lower latency | |
| `ultra` | Maximum extraction quality | |

### Workflow: Store Knowledge About a Contact

```typescript
await client.memory.memorize({
    content: 'Meeting notes: Alice is the CTO of Acme, interested in enterprise plan...',
    email: 'alice@acme.com',
    enhanced: true,
    tags: ['call-notes', 'sales'],
    tier: 'pro',
});
```

### Workflow: Recall Everything About a Record

```typescript
// Option A: Compiled digest (properties + memories as markdown)
const digest = await client.memory.smartDigest({
    email: 'alice@acme.com',
    type: 'Contact',
    token_budget: 2000,
    include_properties: true,
    include_memories: true,
});
console.log(digest.data.compiledContext);

// Option B: Semantic search for specific facts
const results = await client.memory.smartRecall({
    query: 'what pain points did this contact mention?',
    email: 'alice@acme.com',
    mode: 'fast',       // 'fast' = no reflection, 'deep' = full reflection
    include_property_values: true,
});

// Option C: Filtered export
const exported = await client.memory.search({
    type: 'Contact',
    returnRecords: true,
    groups: [{
        conditions: [
            { property: 'plan_tier', operator: 'EQ', value: 'enterprise' },
        ],
    }],
});
```

### Workflow: Batch Sync from CRM

```typescript
await client.memory.memorizeBatch({
    source: 'Hubspot',
    mapping: {
        entityType: 'contact',
        email: 'email',
        runName: 'hubspot-contact-sync',
        properties: {
            full_name:  { sourceField: 'firstname', collectionId: 'col_xxx', collectionName: 'Contacts', extractMemories: false },
            job_title:  { sourceField: 'jobtitle',  collectionId: 'col_xxx', collectionName: 'Contacts', extractMemories: false },
            last_notes: { sourceField: 'notes',     collectionId: 'col_xxx', collectionName: 'Contacts', extractMemories: true },
        },
    },
    rows: crmContacts,
    tier: 'pro',
});
// memorizeBatch() is async -- records land in ~1-2 minutes (EventBridge -> Lambda).
```

### Context Assembly Pattern

```typescript
// Combine all three layers before generating content
const [guidelines, digest, recall] = await Promise.all([
    client.ai.smartGuidelines({ message: 'cold email outreach rules', mode: 'fast' }),
    client.memory.smartDigest({ email: 'sarah@acme.com', type: 'Contact', token_budget: 1500 }),
    client.memory.smartRecall({ query: 'recent interactions and preferences', email: 'sarah@acme.com', mode: 'fast' }),
]);
// Use all three as context for your generation prompt
```

---

## 3. Govern & Guide

| What | SDK Method | MCP Tool | Cost |
|------|-----------|----------|------|
| List guidelines | `client.guidelines.list()` | `guideline_list` | Free |
| Read structure | `client.guidelines.getStructure(id)` | `guideline_read` (no header) | Free |
| Read section | `client.guidelines.getSection(id, { header })` | `guideline_read` (with header) | Free |
| Create guideline | `client.guidelines.create(opts)` | `guideline_create` | Free |
| Update guideline | `client.guidelines.update(id, opts)` | `guideline_update` | Free |
| Delete guideline | `client.guidelines.delete(id)` | `guideline_delete` | Free |
| Guideline history | `client.guidelines.history(id)` | -- | Free |
| Smart Guidelines | `client.ai.smartGuidelines(opts)` | `ai_smart_guidelines` | 0.1-0.5 cr |
| Smart Update | `client.context.save(opts)` | `context_save` | Tiered |
| List attachments | `client.guidelines.listAttachments(id)` | `guideline_attachment_list` | Free |
| Read attachment | `client.guidelines.getAttachmentContent(id, attachId)` | `guideline_attachment_read` | Free |
| Upload attachment | `client.guidelines.uploadAttachment(id, opts)` | `guideline_attachment_upload` | Free |
| Delete attachment | `client.guidelines.deleteAttachment(id, attachId)` | `guideline_attachment_delete` | Free |

### Smart Guidelines Modes

| Mode | How | Latency | Cost | When |
|------|-----|---------|------|------|
| `fast` | Embedding-only routing | ~200ms | 0.1 cr | Real-time agents, loops, high-volume |
| `deep` | LLM selects + composes | ~3s | 0.5 cr | First call, complex queries |

### Update Modes

| Mode | When |
|------|------|
| `section` | Modify one section |
| `appendToSection` | Add content to existing section |
| `append` | Add new section at end |
| `replace` | Full rewrite |

### Workflow: Create and Verify a Guideline

```typescript
// 1. Check for overlap
const existing = await client.guidelines.list();
// existing.data.actions -> array of guidelines

// 2. Create with proper structure
await client.guidelines.create({
    name: 'sales-playbook',
    value: '# Sales Playbook\n\n## Cold Outreach\n...\n\n## Follow-Up Cadence\n...',
    tags: ['sales', 'outbound'],
    description: 'Rules and templates for outbound sales sequences',
});

// 3. Verify agents can see it
const check = await client.ai.smartGuidelines({ message: 'cold outreach rules' });
console.log(check.data.compiledContext ? 'Visible' : 'Not visible yet');
```

---

## 4. Monitor & React

### Analytics

| What | SDK Method | MCP Tool | Cost |
|------|-----------|----------|------|
| Org overview | `client.analytics.overview()` | `analytics_overview` | Free |
| Memory metrics | `client.analytics.memory(opts)` | `analytics_memory` | Free |
| Memory history | `client.analytics.memoryHistory(opts)` | -- | Free |
| Credit balance | `client.analytics.credits()` | `analytics_credits` | Free |
| Operations log | `client.analytics.operations(opts)` | `analytics_operations` | Free |

Window options for `memory()` and `operations()`: `'1h'`, `'24h'`, `'7d'` (default), `'30d'`.

### Notifications

| What | SDK Method | MCP Tool | Cost |
|------|-----------|----------|------|
| Send to users | `client.notifications.send(opts)` | `notification_send` | Free |
| Broadcast to role | `client.notifications.broadcast(opts)` | `notification_broadcast` | Free |
| List my notifications | `client.notifications.list()` | `notification_list` | Free |
| Unread count | `client.notifications.unreadCount()` | `notification_unread_count` | Free |
| Mark read | `client.notifications.markRead(id)` | -- | Free |
| Dismiss | `client.notifications.dismiss(id)` | -- | Free |
| Execute action | `client.notifications.executeAction(id, actionId)` | -- | Free |

### Workflow: Monitor Platform Health

```typescript
const credits = await client.analytics.credits();
const memory = await client.analytics.memory({ window: '7d' });
const overview = await client.analytics.overview();
console.log(`Credits: ${credits.data.balance}/${credits.data.included}`);
console.log(`Memorize success rate: ${memory.data.memorize.successRate}`);
console.log(`Active MCPs: ${overview.data.activeMcps}`);
```

### Workflow: AI Agent Sends Approval to Human

```typescript
const members = await client.members.list();
const userId = members.data.members[0].userId;

await client.notifications.send({
    recipients: [userId],
    title: 'Batch ready for review',
    body: '42 leads enriched overnight',
    priority: 'urgent',
    actions: [
        { type: 'callback', label: 'Approve', callbackUrl: 'https://agent.acme.com/approve', callbackPayload: { batchId: '42' } },
        { type: 'link', label: 'View Leads', url: '/records?filter=new' },
        { type: 'dismiss', label: 'Skip' },
    ],
});
```

---

## 5. Build & Automate

| What | SDK Method | MCP Tool | Cost |
|------|-----------|----------|------|
| Step-driven orchestration | `client.responses.create(opts)` | `ai_responses_create` | Tiered |
| Chat completions (OpenAI-compat) | `client.chat.completions.create(opts)` | `ai_chat_completions` | Tiered |
| AI prompt | `client.ai.prompt(opts)` | -- | Tiered |
| AI prompt (streaming) | `client.ai.promptStream(opts)` | -- | Tiered |
| List agents | `client.agents.list()` | -- | Free |
| Get agent | `client.agents.get(id)` | -- | Free |
| Run agent | `client.agents.run(id, opts)` | -- | Tiered |
| RAG ingest | `client.rag.ingest(opts)` | -- | Tiered |
| RAG search | `client.rag.searchProject(opts)` | -- | Tiered |
| RAG list projects | `client.rag.listProjects()` | -- | Free |
| RAG delete docs | `client.rag.deleteDocuments(opts)` | -- | Free |
| RAG delete project | `client.rag.deleteProject(opts)` | -- | Free |
| Evaluate memorization | `client.evaluate.memorizationAccuracy(opts)` | -- | Tiered |

### Generation Tiers (Responses, Chat Completions, Prompt)

| Tier | Best For |
|------|----------|
| `basic` | High-volume, cost-sensitive (default) |
| `pro` | Balanced quality and cost |
| `ultra` | Maximum quality, complex reasoning |

### BYOK (Bring Your Own Key)

Supported providers: `openai`, `anthropic`, `google`, `deepseek`, `xai`, `openrouter`.

```typescript
const result = await client.responses.create({
    model: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    llm_api_key: process.env.ANTHROPIC_API_KEY,
    steps: [{ prompt: 'Analyze this sales pipeline...' }],
});
```

### Workflow: Multi-Step Orchestration with Responses

```typescript
const result = await client.responses.create({
    steps: [
        {
            prompt: 'Research the company Acme Corp. Find their industry and recent news.',
            tools: ['web_search', 'memory_recall_pro'],
            max_steps: 5,
        },
        {
            prompt: 'Draft a personalized outreach email based on the research above.',
        },
    ],
    personize: {
        governance: { guideline_ids: ['gdl_brand_voice'], mode: 'fast' },
        memory: { record_id: 'rec_abc123', recall: true },
        memorize: { record_id: 'rec_abc123', capture_tool_results: true },
        outputs: [
            { key: 'subject', type: 'string' },
            { key: 'body', type: 'string' },
        ],
    },
    tier: 'pro',
});
console.log(result.outputs); // { subject: '...', body: '...' }
```

### Workflow: Client-Executed Tools

```typescript
const result = await client.responses.create({
    steps: [{ prompt: 'Look up the customer and draft a renewal email.' }],
    tools: [{
        type: 'function',
        function: {
            name: 'lookup_customer',
            description: 'Look up a customer by email.',
            parameters: {
                type: 'object',
                properties: { email: { type: 'string' } },
                required: ['email'],
            },
            execute: async (args: { email: string }) => {
                const customer = await db.customers.findByEmail(args.email);
                return { name: customer.name, plan: customer.plan };
            },
        },
    }],
});
```

### Workflow: OpenAI-Compatible Drop-In

```typescript
const result = await client.chat.completions.create({
    messages: [
        { role: 'system', content: 'You are a helpful sales assistant.' },
        { role: 'user', content: 'Draft a cold email for a VP of Engineering.' },
    ],
    personize: {
        governance: { guideline_ids: ['gdl_brand_voice'] },
        memory: { record_id: 'rec_abc123', recall: true },
    },
});
console.log(result.choices[0].message.content);
```

---

## MCP Tool Reference

Complete mapping of every MCP tool to its SDK method.

| MCP Tool | SDK Method | Category |
|----------|-----------|----------|
| `smartRecall` | `client.memory.smartRecall()` | Memory |
| `memory_store_pro` | `client.memory.memorize()` | Memory |
| `memory_recall_pro` | `client.memory.smartRecall()` | Memory |
| `memory_digest` | `client.memory.smartDigest()` | Memory |
| `memory_get_properties` | `client.memory.properties()` | Memory |
| `memory_update_property` | `client.memory.update()` | Memory |
| `memory_search` | `client.memory.search()` | Memory |
| `memory_batch_store` | `client.memory.memorizeBatch()` | Memory |
| `memory_find_similar` | `client.memory.similar()` | Memory |
| `memory_segment` | `client.memory.segment()` | Memory |
| `update_keys` | `client.memory.updateKeys()` | Memory |
| `list_keys` | `client.memory.listKeys()` | Memory |
| `delete_keys` | `client.memory.deleteKeys()` | Memory |
| `ai_smart_guidelines` | `client.ai.smartGuidelines()` | Governance |
| `guideline_list` | `client.guidelines.list()` | Governance |
| `guideline_read` | `client.guidelines.getStructure()` / `.getSection()` | Governance |
| `guideline_create` | `client.guidelines.create()` | Governance |
| `guideline_update` | `client.guidelines.update()` | Governance |
| `guideline_delete` | `client.guidelines.delete()` | Governance |
| `context_save` | `client.context.save()` | Governance |
| `guideline_attachment_list` | `client.guidelines.listAttachments()` | Governance |
| `guideline_attachment_read` | `client.guidelines.getAttachmentContent()` | Governance |
| `guideline_attachment_upload` | `client.guidelines.uploadAttachment()` | Governance |
| `guideline_attachment_delete` | `client.guidelines.deleteAttachment()` | Governance |
| `organization_get` | `client.organizations.get()` | Platform |
| `organization_create` | `client.organizations.create()` | Platform |
| `organization_update` | `client.organizations.update()` | Platform |
| `members_list` | `client.members.list()` | Platform |
| `members_invite` | `client.members.invite()` | Platform |
| `members_remove` | `client.members.remove()` | Platform |
| `members_update_role` | `client.members.updateRole()` | Platform |
| `entity_type_get` | `client.entityTypes.get()` | Platform |
| `entity_type_update` | `client.entityTypes.update()` | Platform |
| `entity_type_archive` | `client.entityTypes.archive()` | Platform |
| `collection_list` | `client.collections.list()` | Platform |
| `collection_create` | `client.collections.create()` | Platform |
| `collection_update` | `client.collections.update()` | Platform |
| `collection_delete` | `client.collections.delete()` | Platform |
| `collection_history` | `client.collections.history()` | Platform |
| `mcp_list` | `client.mcps.list()` | Platform |
| `mcp_test` | `client.mcps.test()` | Platform |
| `mcp_create` | `client.mcps.create()` | Platform |
| `mcp_update` | `client.mcps.update()` | Platform |
| `mcp_delete` | `client.mcps.delete()` | Platform |
| `destination_list` | `client.destinations.list()` | Platform |
| `destination_create` | `client.destinations.create()` | Platform |
| `destination_get` | `client.destinations.get()` | Platform |
| `destination_update` | `client.destinations.update()` | Platform |
| `destination_delete` | `client.destinations.delete()` | Platform |
| `destination_test` | `client.destinations.test()` | Platform |
| `analytics_overview` | `client.analytics.overview()` | Analytics |
| `analytics_memory` | `client.analytics.memory()` | Analytics |
| `analytics_credits` | `client.analytics.credits()` | Analytics |
| `analytics_operations` | `client.analytics.operations()` | Analytics |
| `notification_send` | `client.notifications.send()` | Notifications |
| `notification_broadcast` | `client.notifications.broadcast()` | Notifications |
| `notification_list` | `client.notifications.list()` | Notifications |
| `notification_unread_count` | `client.notifications.unreadCount()` | Notifications |
| `personize_context` | -- (bootstrapping) | System |
| `personize_skill` | -- (skill loader) | System |
| `list_organizations` | -- (org switcher) | System |
| `select_organization` | -- (org switcher) | System |

---

## Key Constraints

1. **API keys are strictly scoped to one org** -- one key = one org. Multi-org setups need one key per org.
2. **Owner protection** -- the org owner cannot be removed, have their role changed, or be targeted via API.
3. **System entity types** (Contact, Company) cannot be archived or have their slug changed.
4. **SSRF protection** -- all user-provided URLs (MCP serverUrl, destination webhookUrl, notification callbackUrl) are validated. Private/internal addresses are blocked.
5. **Soft deletes** -- destinations use soft-delete (isActive=false). Memory delete has 30-day recovery. Entity type delete = archive.
6. **Notification callbacks expire** after 7 days. Rate limit: 50 notifications/org/hour.
7. **Signing secrets** for destinations are returned only on create (never again). Store securely.
8. **Analytics credits endpoint is always free** -- agents can always check their balance.
9. **`extractMemories` defaults to `false`** in batch memorize -- you MUST set it to `true` on rich text fields or no semantic memories are created.
10. **Always tag memorize calls** -- tags boost property extraction accuracy and enable filtering.
11. **Always call `mcps.test()` before `mcps.create()`** -- misconfigured MCPs fail silently during agent runs.
12. **Always call `destinations.test()` after creating** -- verify delivery before going live.
13. **Verify webhook signatures server-side** -- `X-Personize-Signature` is HMAC-SHA256 of the raw body.
14. **Responses max 20 steps** per request. Max 20 tool roundtrips. Max 200 conversation messages.
15. **BYOK requires both `model` and `provider`** -- no tier-based defaults with your own key.

---

## Diagnostics

Two modes: **VERIFY** (proactive, run after setup) and **FIX** (reactive, jump to the symptom).

### Smoke Test

```typescript
// 1. Auth
const me = await client.me();
console.log(`Auth OK: ${me.data.organization.name}`);

// 2. Memory round-trip
await client.memory.memorize({
    email: 'test@example.com',
    content: 'Test: VP Engineering at Acme Corp.',
    enhanced: true,
});
const recall = await client.memory.smartRecall({
    query: 'Who works at Acme?',
    email: 'test@example.com',
    mode: 'fast',
});
console.log(`Memory: ${recall.data.memories?.length > 0 ? 'OK' : 'indexing (wait 1-2 min)'}`);

// 3. Governance
const guidelines = await client.ai.smartGuidelines({ message: 'test' });
console.log(`Guidelines: ${guidelines.data.compiledContext ? 'OK' : 'none set up'}`);
```

MUST run the smoke test or appropriate VERIFY action after every setup — because untested setups create false confidence. MUST run diagnostic steps before suggesting fixes. SHOULD use real queries that match the actual use case, not generic test strings.

### VERIFY Actions

Run after setting up a capability to prove it works.

| Action | When to Use | Reference |
|---|---|---|
| **VERIFY-MEMORY** | After memorizing data — confirm stored and recallable | `reference/diagnostics/verify-memory.md` |
| **VERIFY-GOVERNANCE** | After setting up guidelines — confirm agents can see them | `reference/diagnostics/verify-governance.md` |
| **VERIFY-PIPELINE** | After wiring a pipeline — run one record end-to-end | `reference/diagnostics/verify-pipeline.md` |
| **VERIFY-WORKSPACE** | After setting up a shared workspace | `reference/diagnostics/verify-workspace.md` |
| **HEALTH-CHECK** | Ongoing quality, performance, and coverage check | `reference/diagnostics/health-check.md` |

### FIX Actions

Jump to the action that matches the symptom.

| Symptom | Action | Reference |
|---|---|---|
| Recall returns irrelevant / empty / noisy | **BAD-RECALL** | `reference/diagnostics/bad-recall.md` |
| Memorized data not extracted correctly | **BAD-EXTRACTION** | `reference/diagnostics/bad-extraction.md` |
| Guidelines not reaching agents | **GOVERNANCE-MISS** | `reference/diagnostics/governance-miss.md` |
| 429 errors or partial batch syncs | **RATE-LIMITS** | `reference/diagnostics/rate-limits.md` |
| Trigger.dev / n8n workflow failing | **PIPELINE-FAILURE** | `reference/diagnostics/pipeline-failure.md` |
| Workspace going stale / agents not contributing | **WORKSPACE-STALE** | `reference/diagnostics/workspace-stale.md` |

---

## Deep Dive References

For edge cases, advanced patterns, and full parameter tables, load the specialized skill:

| Topic | Specialized Skill | Reference Docs |
|-------|------------------|----------------|
| Memory deep dive | `personize-memory` | `reference/memorize.md`, `reference/recall.md`, `reference/crud-operations.md` |
| Governance deep dive | `personize-governance` | `reference/operations.md`, `reference/smart-update.md`, `reference/governance-attachments.md` |
| Solution architecture | `personize-solution-architect` | `reference/architecture.md` |
| Pipelines (code + n8n) | `personize-code` | `reference/triggers.md`, `reference/n8n-reference.md` |
| Workspaces | `personize-agent-workspace` | `reference/architecture.md` |
