# Personize SDK Method Reference (@personize/sdk)

## Canonical Methods (v1.1)

### Memory
| Method | Description |
|--------|-------------|
| `client.memory.save(options)` | AI-powered memory write |
| `client.memory.saveBatch(options)` | Batch memory import |
| `client.memory.retrieve(options)` | AI-powered retrieval (modes: fast/deep/auto) |
| `client.memory.retrieveDigest(options)` | Compiled context bundle |

### Context
| Method | Description |
|--------|-------------|
| `client.context.list(options?)` | List context docs (filter by type, tags, recordId) |
| `client.context.create(payload)` | Create context doc |
| `client.context.update(id, payload)` | Update context doc (replace, append, section modes) |
| `client.context.delete(id)` | Delete context doc |
| `client.context.getStructure(id)` | Get heading tree (TOC) |
| `client.context.getSection(id, options)` | Get section by header |
| `client.context.history(id, options?)` | Version history (max 50) |
| `client.context.retrieve(options)` | AI-powered doc routing (SmartDocs) |
| `client.context.save(options)` | AI-powered doc evolution (SmartUpdate) |
| `client.context.listAttachments(docId)` | List attachments on a context doc |
| `client.context.getAttachment(docId, attachmentId)` | Get attachment metadata + download URL |
| `client.context.deleteAttachment(docId, attachmentId)` | Delete attachment |

---



| Namespace | Methods | Purpose |
|-----------|---------|---------|
| client.memory | 19 | Store, recall, search, update, delete, keys |
| client.guidelines | 12 | CRUD, smart-update, attachments |
| client.collections | 5 | CRUD, history |
| client.ai | 3 | smartGuidelines, prompt, promptStream |
| client.responses | 1 | Step-driven orchestration |
| client.chat.completions | 1 | OpenAI-compatible |
| client.agents | 3 | List, get, run |
| client.rag | 8 | External + embedded RAG |
| client.multimodal | 3 | Image/media memorize, search, status |
| client.evaluate | 1 | Memorization accuracy |
| client (top-level) | 3 | test, me, smartRecallUnified |
| client.organizations | 3 | Get, create, update |
| client.members | 5 | Invite, list, remove, role, invitations |
| client.entityTypes | 4 | List, get, update, archive |
| client.mcps | 8 | Test, CRUD, refresh, tools |
| client.destinations | 7 | CRUD, test, logs |
| client.analytics | 5 | Overview, memory, history, credits, operations |
| client.notifications | 7 | Send, broadcast, list, unread, read, dismiss, action |

---

## Initialization

```ts
import { Personize } from '@personize/sdk';

const client = new Personize({
  secretKey: 'pz_...',
  baseURL: 'https://agent.personize.ai',  // optional
  timeout: 30000,     // ms, default
  maxRetries: 3,      // auto-retry on 429/5xx
  retryDelay: 1000,   // base delay for exponential backoff
});
```

---

## Top-Level Methods

### `client.test()`
Verify API key validity. Returns timestamp, IP, userId, organizationId.

### `client.me()`
Get current context: organization, user, key scope, plan details and limits.

### `client.smartRecallUnified(options)`
Unified memory retrieval. Server classifies intent and orchestrates the query.
```ts
await client.smartRecallUnified({
  message: 'contacts in Victoria',
  identifiers: { emails: ['john@acme.com'] },
  session_id: 's1',
  output_format: 'structured',
});
```

---

## client.memory

### `memory.save(options: MemorySaveOptions)` — canonical v1.1 write
Store content with AI extraction (atoms + structured properties). Aliased under `client.v1_1.memory.save` with full shape discriminator.
```ts
await client.memory.save({
  content: 'Maya joined Orbit Climb as Director of Eng. She comes from Hyperion.',
  email: 'maya@orbitclimb.io',
  type: 'Contact',

  // Opt-in graph inference (defaults are all OFF — no behavior change if omitted):
  collectionGraph: true,  // Channel B: edges from extracted structured properties (async, billed)
  smartGraph: true,       // Channel C: edges from free-text memories via LLM (async, billed per input token)
  relations: [            // Channel A: caller-declared edges (sync, free)
    { relationType: 'works_at',
      toIdentity: { kind: 'websiteUrl', value: 'orbitclimb.io' },
      toEntityType: 'company' },
  ],
});
```
Graph fields are independent and combinable. See `Docs/memorize-graph-guide.md` for channel semantics, stub-creation rules, and pricing. The v1.1 surface (`client.v1_1.memory.save`) accepts the same three fields on `SaveRequest`.

### `memory.memorize(options: MemorizeOptions)` — deprecated, use `memory.save`
Store content with AI extraction. Extracts structured properties and freeform memories.
```ts
await client.memory.memorize({
  content: 'John is VP of Sales at Acme, budget $50k...',
  email: 'john@acme.com',
  tier: 'pro',           // basic | pro | pro_fast | ultra
  tags: ['sales_call'],
  collectionNames: ['Contact Properties'],
  extractionPrompt: 'Focus on budget and timeline',
  max_properties: 10,
  // Graph fields are also supported here for backward-compat:
  collectionGraph: true,
  smartGraph: true,
  relations: [/* DeclaredRelation[] */],
});
```

### `memory.smartRecall(options: SmartRecallOptions)`
Semantic recall with optional reflection loop and answer generation.
```ts
await client.memory.smartRecall({
  query: "What's John's budget?",
  email: 'john@acme.com',
  mode: 'deep',          // fast (~500ms) | deep (~10-20s)
  limit: 10,
  generate_answer: true,
  groupByRecord: true,
});
```

### `memory.recall(options: RecallOptions)`
Direct memory lookup without reflection. Auto-routes to smartRecall for legacy calls.
```ts
await client.memory.recall({
  query: 'latest interactions',
  email: 'john@acme.com',
  type: 'Contact',
});
```

### `memory.search(options: SearchOptions)`
Filter and search records by property conditions.
```ts
await client.memory.search({
  type: 'Contact',
  groups: [{ conditions: [{ property: 'deal_stage', operator: 'equals', value: 'qualified' }] }],
  pageSize: 50,
  returnRecords: true,
  includeMemories: true,
});
```

### `memory.memorizeBatch(options: BatchMemorizeOptions)`
Batch sync with per-property AI extraction control. Supports records shorthand.
```ts
await client.memory.memorizeBatch({
  tier: 'pro',
  records: [
    { email: 'a@co.com', content: 'Meeting notes...' },
    { email: 'b@co.com', content: 'Call transcript...' },
  ],
});
```

### `memory.smartDigest(options: SmartDigestOptions)`
Compiled context bundle for an entity (properties + memories, token-budgeted).
```ts
await client.memory.smartDigest({
  email: 'john@acme.com',
  token_budget: 2000,
  include_properties: true,
  include_memories: true,
});
```

### `memory.update(options: UpdatePropertyOptions)`
Update a single property or freeform memory. Supports array operations.
```ts
await client.memory.update({
  recordId: 'rec_...',
  propertyName: 'deal_stage',
  propertyValue: 'closed_won',
  expectedVersion: 5,    // optimistic concurrency
});
// Array push:
await client.memory.update({
  recordId: 'rec_...',
  propertyName: 'meeting_notes',
  arrayPush: { items: ['New note...'], unique: true },
});
```

### `memory.bulkUpdate(options: BulkUpdateOptions)`
Update multiple properties on a record in one request.
```ts
await client.memory.bulkUpdate({
  recordId: 'rec_...',
  updates: [
    { propertyName: 'stage', propertyValue: 'closed' },
    { propertyName: 'revenue', propertyValue: 50000 },
  ],
  expectedVersion: 5,
});
```

### `memory.delete(options: DeleteMemoriesOptions)`
Soft-delete memories (30-day recovery window).

### `memory.deleteRecord(options: DeleteRecordOptions)`
Soft-delete all memories for a record.

### `memory.cancelDeletion(options: CancelDeletionOptions)`
Cancel pending soft-delete. Returns 409 if the 30-day window expired.

### `memory.propertyHistory(options: PropertyHistoryOptions)`
Query property change history. Supports time range and cursor pagination.

### `memory.queryProperties(options: QueryPropertiesOptions)`
LLM-powered search across property values by natural language.

### `memory.filterByProperty(options: FilterByPropertyOptions)`
Deterministic property filter (no LLM, no token cost).
```ts
await client.memory.filterByProperty({
  conditions: [{ propertyName: 'deal_stage', operator: 'equals', value: 'closed_won' }],
  logic: 'AND',
  limit: 100,
});
```

### `memory.properties(options: GetPropertiesOptions)`
Get record properties with collection schema descriptions.

### `memory.similar(options: SimilarOptions)`
Find records similar to a seed record. Returns ranked results with similarity tiers.

### `memory.segment(options: SegmentOptions)`
Bucket all records into similarity tiers. Supports record-based or text-based seeds.

### `memory.updateKeys(options: UpdateKeysOptions)`
Add keys (standard or custom) to a record.

### `memory.updateKeysBatch(options: UpdateKeysBatchOptions)`
Add keys across multiple records (max 100 records, 50 keys per record).

### `memory.listKeys(options: ListKeysOptions)`
List all keys (standard + custom) on a record.

### `memory.deleteKeys(options: DeleteKeysOptions)`
Delete specific key aliases. Blocks deletion if it would leave zero aliases.

---

## client.guidelines

### `guidelines.list(options?: ListOptions)`
List guidelines (paginated). Supports tags filter and summary mode.

### `guidelines.create(payload: GuidelineCreatePayload)`
Create a new guideline. Fields: name, value, description, tags, secure.

### `guidelines.update(id, payload: GuidelineUpdatePayload)`
Partial update. Supports updateMode: replace, append, section, appendToSection.

### `guidelines.delete(id)`
Delete a guideline.

### `guidelines.getStructure(id)`
Get guideline headings (TOC).

### `guidelines.getSection(id, { header })`
Get a specific section by header.

### `guidelines.history(id, options?)`
Get version history (limit default: 20, max: 50).

### `guidelines.smartUpdate(options: SmartUpdateOptions)`
AI-powered governance evolution. Analyzes instruction + material, returns change plan.
```ts
await client.guidelines.smartUpdate({
  type: 'guideline',
  instruction: 'Update our cold email policy with these new rules',
  material: 'New compliance rules...',
  strategy: 'suggest',   // suggest | safe | force
});
```

### `guidelines.listAttachments(guidelineId)`
List all attachments for a guideline.

### `guidelines.getAttachment(guidelineId, attachmentId)`
Get attachment metadata and signed download URL.

### `guidelines.updateAttachment(guidelineId, attachmentId, options)`
Update attachment metadata (description, usage, type, language, sectionHeader).

### `guidelines.deleteAttachment(guidelineId, attachmentId)`
Delete an attachment.

---

## client.context

> **Alias:** `client.agentdocs.*` is a stable alias for all `client.context.*` methods. Both namespaces are identical.

### Context types
- **guideline** -- Behavioral instructions for agents and processes
- **playbook** -- Step-by-step procedures and workflows
- **reference** -- Factual reference material (architecture, data dictionaries, etc.)
- **template** -- Reusable output templates
- **brief** -- Short-form summaries or situational context

### `context.list(options?)`
List context docs. Paginated.

Options: `type?: ContextType`, `tags?: string[]`, `recordId?: string`, `limit?`, `cursor?`

### `context.create(payload)`
Create a context doc.

Fields: `name` (required), `type?: ContextType`, `value?`, `description?`, `tags?`, `secure?`, `recordIds?`

```ts
// Create a reference doc
await client.context.create({
  name: 'API Architecture',
  type: 'reference',
  value: '# API Architecture\n...',
  description: 'System architecture docs',
  tags: ['architecture'],
});
```

### `context.update(id, payload)`
Update a context doc. Supports targeted section edits without rewriting the whole document.

Fields: `value?`, `description?`, `tags?`, `type?`, `updateMode?` (`'replace'` | `'append'` | `'section'` | `'appendToSection'`), `sectionHeader?`, `separator?`, `historyNote?`, `recordIds?`

```ts
// Full content replace
await client.context.update(docId, { value: 'new content' });

// Section update -- replaces only the matched section
await client.context.update(docId, {
  value: 'Updated dependencies list',
  updateMode: 'section',
  sectionHeader: '## Dependencies',
});
```

### `context.delete(id)`
Delete a context doc.

### `context.getStructure(id)`
Get the heading tree (TOC) of a context doc. Useful for navigating large docs before fetching a section.

### `context.getSection(id, options)`
Get a section by its header text.

Options: `header` (required)

### `context.history(id, options?)`
Get version history for a context doc.

Options: `limit?` (default 20, max 50), `cursor?`

### `context.retrieve(options)`
AI-powered retrieval. Routes the query across context docs and returns the most relevant content (canonical SmartDocs). This is the preferred retrieval path -- prefer it over `list()` + manual filtering.

Options: `message` (required), `types?: ContextType[]`, `maxContentTokens?`, `contextIds?`, `contextNames?`

```ts
const result = await client.context.retrieve({
  message: 'How does authentication work?',
  types: ['reference', 'guideline'],
  maxContentTokens: 8000,
});
```

### `context.save(options)`
AI-powered doc evolution (SmartUpdate). Analyzes an instruction and source material, then evolves the most appropriate existing doc or creates a new one.

### `context.listAttachments(docId)`
List all attachments for a context doc.

### `context.getAttachment(docId, attachmentId)`
Get attachment metadata and a signed download URL.

### `context.deleteAttachment(docId, attachmentId)`
Delete an attachment from a context doc.

> **Gap:** `uploadAttachment` is currently only available on `client.guidelines.uploadAttachment()`. There is no `client.context.uploadAttachment()` yet. Use the guidelines namespace if you need to upload attachments, or contact the team if this is a blocker.

### REST API mapping

| SDK Method | REST Endpoint |
|---|---|
| `context.list(options?)` | `GET /api/v1/context` |
| `context.create(payload)` | `POST /api/v1/context` |
| `context.update(id, payload)` | `PATCH /api/v1/context/:id` (body: `{ payload: { ... } }`) |
| `context.delete(id)` | `DELETE /api/v1/context/:id` |
| `context.getStructure(id)` | `GET /api/v1/context/:id/structure` |
| `context.getSection(id, options)` | `GET /api/v1/context/:id/section` |
| `context.history(id, options?)` | `GET /api/v1/context/:id/history` |
| `context.retrieve(options)` | `POST /api/v1/context/retrieve` |
| `context.listAttachments(docId)` | `GET /api/v1/context/:id/attachments` |
| `context.getAttachment(docId, attachmentId)` | `GET /api/v1/context/:id/attachments/:attachmentId` |
| `context.deleteAttachment(docId, attachmentId)` | `DELETE /api/v1/context/:id/attachments/:attachmentId` |

### Async bulk save (`client.v1_1.context.saveBatch`)

v1.1-only namespace for seeding many context docs at once. Returns an `eventId`; actual upserts happen in a background state machine.

```ts
// Validate first (dry-run)
const check = await client.v1_1.context.validateSaveBatch({
    defaults: { type: 'playbook', tags: ['onboarding'] },
    documents: [
        { name: 'Cold outreach playbook', value: '...' },
        { name: 'Reply handling playbook', value: '...' },
        { name: 'Demo follow-up playbook', value: '...' },
    ],
});

// Submit
const submit = await client.v1_1.context.saveBatch({
    defaults: { type: 'playbook', tags: ['onboarding'] },
    documents: [ /* same shape */ ],
});
const { eventId } = submit.data!;

// Poll until terminal
let status: string;
do {
    await new Promise(r => setTimeout(r, 2000));
    const poll = await client.v1_1.context.getSaveBatchStatus(eventId);
    status = (poll as any).data?.status;
} while (status === 'received' || status === 'processing');
```

**`ContextSaveBatchDocument` shape:** `{ id?, name?, externalId?, value, type?, aiExtraction?, tags?, categories?, recordIds? }`. Top-level `defaults` applies to every doc unless overridden — saves keystrokes when 100 docs share a `type` and tag set.

**`ContextSaveBatchResponse`:** `{ success, data: { eventId, trackingId, status: 'received'|'processing'|'completed'|'partial'|'failed', receivedAt, organizationId, stateMachineStarted, estimatedCompletionWindow, itemCount } }`.

**REST endpoints:**

| SDK Method | REST Endpoint |
|---|---|
| `v1_1.context.saveBatch(req)` | `POST /api/v1.1/context/save/batch` |
| `v1_1.context.validateSaveBatch(req)` | `POST /api/v1.1/context/save/batch/validate` |
| `v1_1.context.getSaveBatchStatus(eventId)` | `GET /api/v1.1/context/save/batch/:eventId/status` |

**No MCP tool or CLI command yet** — only the SDK + REST surface. For single-doc saves, the synchronous `client.context.create()` / `context_save` MCP tool / `personize context-docs create` CLI are still the right path.

---

## client.collections

### `collections.list(options?: ListOptions)` -- Paginated list
### `collections.create(payload: CollectionCreatePayload)` -- Create with properties
### `collections.update(id, payload: CollectionUpdatePayload)` -- Incremental update
### `collections.delete(id)` -- Delete
### `collections.history(id, options?)` -- Version history (mode: full | diff)

---

## client.ai

### `ai.smartGuidelines(options: SmartGuidelinesOptions)`
Smart guideline routing. Modes: fast (~200ms), deep (~3s), auto.

### `ai.prompt(options: PromptOptions)`
Execute prompt with tools, outputs extraction, evaluation, and auto-memorize. **Dual-mode**: pass `prompt` (single shot) OR `instructions` (multi-step) — mutually exclusive.

```ts
interface PromptOptions {
  // Mode (mutually exclusive)
  prompt?: string;
  instructions?: Array<string | { prompt: string; maxSteps?: number }>;

  // Streaming + model selection
  stream?: boolean;
  model?: string;            // BYOK only
  provider?: string;         // BYOK only
  tier?: 'basic' | 'pro' | 'ultra';
  openrouterApiKey?: string;

  // Inputs
  context?: string;
  sessionId?: string;
  attachments?: PromptAttachment[];   // max 10, 20MB each, 50MB total

  // Server-side features
  evaluate?: PromptEvaluateConfig;
  evaluationCriteria?: string;
  memorize?: PromptMemorizeConfig;
  outputs?: PromptOutputDefinition[];
  metadata?: { recordId?: string };
  mcpTools?: McpToolSelection[];

  // Governed-memory + native-search flags
  governedMemory?: boolean;
  agentTools?: boolean;
  autoRecall?: boolean;
  autoGuidelines?: boolean;
  webSearch?: boolean | PromptWebSearchConfig;
  mcps?: boolean | string[];
}
```

For full schema (PromptMemorizeConfig, PromptEvaluateConfig, PromptOutputDefinition, PromptAttachment, McpToolSelection, PromptWebSearchConfig + ResponsesCreateOptions + ChatCompletionsOptions) see attachment **`prompt-options-schema.md`**.

### `ai.promptStream(options: PromptStreamOptions)`
Stream prompt as SSE. Same options as `ai.prompt` (minus `stream`, forced true) plus `streamTimeout` and `signal`. Yields: text, output, step_complete, done, error events.

---

## client.responses

### `responses.create(options: ResponsesCreateOptions)`
Step-driven orchestration. Auto-handles tool execution loop when execute functions provided.
```ts
const result = await client.responses.create({
  steps: [{ prompt: 'Research this company', order: 1 }],
  tools: {
    search_web: {
      description: 'Search the web',
      parameters: { ... },
      execute: async (args) => { ... },
    },
  },
  personize: { governance: { mode: 'deep' } },
});
```

---

## client.chat.completions

### `chat.completions.create(options: ChatCompletionsOptions)`
OpenAI-compatible chat completion endpoint.

---

## client.agents

### `agents.list(options?)` -- List available agents (paginated)
### `agents.get(id)` -- Get agent details and expectedInputs
### `agents.run(id, options?: AgentRunOptions)` -- Run an agent with inputs

---

## client.rag

### `rag.configure(options)` -- Configure external RAG source
### `rag.search(options)` -- Search external RAG
### `rag.test()` -- Test external RAG connectivity
### `rag.ingest(options)` -- Ingest documents into a project
### `rag.searchProject(options)` -- Search a project
### `rag.listProjects()` -- List projects for org
### `rag.deleteDocuments(options)` -- Delete documents from a project
### `rag.deleteProject(projectId)` -- Delete an entire project

---

## client.multimodal

### `multimodal.memorize(options)` -- Memorize image/media content
### `multimodal.search(options)` -- Search multimodal content
### `multimodal.status()` -- Check multimodal feature status

---

## client.evaluate

### `evaluate.memorizationAccuracy(options)`
Three-phase evaluation: extraction, analysis, schema optimization.

---

## client.organizations

### `organizations.get()` -- Get current organization
### `organizations.create(options)` -- Create new organization
### `organizations.update(options)` -- Update organization name

---

## client.members

### `members.invite(options)` -- Invite members (emails[], role)
### `members.list(options?)` -- List all members
### `members.listInvitations()` -- List pending invitations
### `members.remove(userId)` -- Remove a member
### `members.updateRole(userId, options)` -- Update member role

---

## client.entityTypes

### `entityTypes.list()` -- List all entity types
### `entityTypes.get(id)` -- Get entity type by ID
### `entityTypes.update(id, options)` -- Update entity type
### `entityTypes.archive(id)` -- Archive entity type

---

## client.mcps

### `mcps.test(options)` -- Test MCP server connection
### `mcps.list()` -- List all MCP servers
### `mcps.create(options)` -- Create MCP server
### `mcps.get(id)` -- Get MCP server
### `mcps.update(id, options)` -- Update MCP server
### `mcps.delete(id)` -- Delete MCP server
### `mcps.refreshTools(id)` -- Refresh tool list
### `mcps.updateTools(id, options)` -- Update enabled/disabled tools

---

## client.destinations

### `destinations.create(options)` -- Create webhook destination
### `destinations.list()` -- List all destinations
### `destinations.get(id)` -- Get destination
### `destinations.update(id, options)` -- Update destination
### `destinations.delete(id)` -- Delete destination
### `destinations.test(id)` -- Send test event
### `destinations.getLogs(id)` -- Get delivery logs

---

## client.analytics

### `analytics.overview()` -- High-level org stats
### `analytics.memory(options?)` -- Memory operation metrics
### `analytics.memoryHistory(options?)` -- Historical memory metrics
### `analytics.credits()` -- Credit balance and usage
### `analytics.operations(options?)` -- Operations and token usage

---

## client.notifications

### `notifications.send(options)` -- Send to specific recipients
### `notifications.broadcast(options)` -- Broadcast to a role group

```ts
await client.notifications.broadcast({
  recipientGroup: 'admins',   // 'all' | 'admins' | 'owners'
  title: 'Q2 Report Ready',
  body: 'The analysis is complete and ready for review.',
  priority: 'normal',         // 'normal' | 'urgent'
  actions: [
    { type: 'link', label: 'View Report', url: 'https://...' },
    { type: 'dismiss', label: 'Dismiss' },
  ],
});
```

---

## client.schedules

Recurring or one-time `run_prompt` / `send_notification` tasks. Mirrors POST/GET/PATCH/DELETE `/api/v1/schedules`. Schedules live on v1 only (not on v1.1).

### `schedules.create(options: CreateScheduleOptions)`
Create a new schedule. Returns `ScheduleRecord` directly (unwrapped).

```ts
await client.schedules.create({
  name: 'daily-followup-john',         // kebab-case, unique within org
  description: 'Draft a follow-up email for John each morning',
  taskType: 'run_prompt',
  taskPayload: {
    prompt: 'Draft a 2-line follow-up email for this contact.',
    tier: 'pro',
    memorize: { recordId: 'rec_abc', type: 'Contact' },
    governedMemory: true,
    outputs: [{ name: 'email_body', required: true }],
    mcps: ['gmail-int-1'],
    webSearch: true,
  },
  recurring: true,
  pattern: 'rate(1 day)',               // or 'cron(0 9 ? * MON-FRI *)'
  timezone: 'UTC',
});
```

For `send_notification` (no LLM call):
```ts
await client.schedules.create({
  name: 'remind-john-tuesday',
  taskType: 'send_notification',
  taskPayload: {
    contentMode: 'static',               // or 'smart' for AI-generated content
    title: 'Follow up with John',
    body: 'You said you would email him by today.',
    recipientUserId: 'user-1',
    channels: ['IN_APP', 'EMAIL'],
    priority: 'MEDIUM',
  },
  recurring: false,
  runAt: '2026-05-27T13:00:00Z',
  timezone: 'UTC',
});
```

### `schedules.list(options?: ListSchedulesOptions): Promise<ListSchedulesResponse>`
List schedules with filters. Response shape: `{ success, data: ScheduleRecord[], nextToken?, filtered?, rawCount? }`.

```ts
const { data } = await client.schedules.list({ recordId: 'rec_abc' });
// Filters: recordId, email, websiteUrl, taskType, limit, nextToken
```

### `schedules.get(idOrName: string): Promise<ScheduleRecord>`
Get a schedule by ULID id or kebab-case name.

### `schedules.update(idOrName, patch: UpdateScheduleOptions): Promise<ScheduleRecord>`
Partial update. Note: `PATCH taskPayload` is a full replacement of that field, validated against the existing taskType.

```ts
// Pause without deleting:
await client.schedules.update(scheduleId, { enabled: false });
// Resume:
await client.schedules.update(scheduleId, { enabled: true });
```

### `schedules.delete(idOrName: string): Promise<void>`
Soft delete (90-day retention).

### `schedules.executions(idOrName, options?: ListScheduleExecutionsOptions)`
Execution history (paginated). Use to poll the latest run's status if you don't have destinations wired.

**Server-enforced errors:** `SCHEDULE_CAP_EXCEEDED` (429), `RECORD_CAP_EXCEEDED` (429), `INSUFFICIENT_CREDITS` (402), `DUPLICATE_NAME` (409). Recurring `rate(...)` schedules with no user-supplied `startDate` get ±60s auto-jitter.

---

## client.hubspot

HubSpot REST passthrough via the org's connected OAuth integration. Your script never sees provider tokens; the path allowlist provides SSRF protection. v1-only surface.

### `hubspot.request<T>(opts: CrmPassthroughOptions): Promise<CrmPassthroughResult<T>>`
Raw passthrough — call any allowlisted HubSpot REST path. Allowlisted prefixes: `/crm/`, `/marketing/`, `/cms/`, `/automation/`, `/files/`, `/communication-preferences/`, `/properties/`, `/owners/`, `/oauth/`.

```ts
const owners = await client.hubspot.request({
  method: 'GET',
  path: '/owners/v2/owners',
});
// owners.status, owners.body, owners.meta.{ provider, durationMs, rateLimit? }
```

### Typed wrappers

```ts
// Contacts
await client.hubspot.contacts.list({ limit: 10, properties: ['email', 'firstname'] });
await client.hubspot.contacts.get('123', ['email', 'firstname']);
await client.hubspot.contacts.searchByEmail('jane@example.com');   // returns first match or null
await client.hubspot.contacts.create({ email, firstname, lastname, company });
await client.hubspot.contacts.update('123', { jobtitle: 'VP Sales' });
await client.hubspot.contacts.delete('123');                       // archive

// Companies / Deals — same list/get/create/update/delete shape
await client.hubspot.companies.list({ limit: 25 });
await client.hubspot.deals.list({ limit: 25, properties: ['dealname', 'amount', 'dealstage'] });

// Tasks
await client.hubspot.tasks.create({
  subject: 'Follow up on pricing call',
  body: 'Discussed enterprise tier. Send proposal by Friday.',
  dueAt: new Date('2026-06-01'),       // Date or ISO string
  status: 'NOT_STARTED',
  ownerId: 'hubspot-owner-id',         // optional
});

// Notes
await client.hubspot.notes.create({
  body: 'Called, left voicemail. Will retry tomorrow.',
  timestamp: new Date(),
});
```

Every typed wrapper returns `CrmPassthroughResult<T>` = `{ status, headers, body, meta }`. `status` is the *upstream HubSpot* HTTP status. Personize always returns HTTP 200 when the upstream call completes.

**Error codes:** `connection_not_found`, `connection_disconnected`, `invalid_path`, `invalid_method`, `upstream_timeout`, `rate_limited`.

---

## client.salesforce

Salesforce REST passthrough via the org's Nango-managed connection. Same auth model as HubSpot. v1-only surface. Allowlisted prefixes: `/services/data/`, `/services/apexrest/`.

### `salesforce.request<T>(opts): Promise<CrmPassthroughResult<T>>`
Raw passthrough — call any Salesforce REST endpoint.

```ts
const limits = await client.salesforce.request({
  method: 'GET',
  path: '/services/data/v60.0/limits',
});
```

### `salesforce.query<T>(soql): Promise<CrmPassthroughResult<SalesforceQueryResult<T>>>`
Execute a SOQL query (single page).

```ts
const result = await client.salesforce.query<{ Id: string; Name: string }>(
  "SELECT Id, Name FROM Account WHERE Industry = 'Technology' LIMIT 10"
);
result.body.records;            // T[]
```

### `salesforce.queryAll<T>(soql): AsyncIterable<T>`
Execute SOQL and auto-paginate through all results. Yields individual records.

```ts
for await (const acct of client.salesforce.queryAll<{ Id: string; Name: string }>(
  'SELECT Id, Name FROM Account'
)) {
  console.log(acct.Name);
}
```

### `salesforce.sobject(objectType: string)`
Returns a CRUD object for the given SObject type.

```ts
// Create
const created = await client.salesforce.sobject('Lead').create({
  FirstName: 'Jane', LastName: 'Smith', Email: 'jane@example.com', Company: 'Acme Corp',
});
created.body.id;                       // Salesforce ID

// Get
const acct = await client.salesforce.sobject('Account').get('001xx000003GYnI', ['Name', 'Industry']);

// Update
await client.salesforce.sobject('Account').update('001xx000003GYnI', { Industry: 'Technology' });

// Upsert by external ID (idempotent)
await client.salesforce.sobject('Contact').upsert('Email', 'jane@example.com', {
  FirstName: 'Jane', LastName: 'Smith', Title: 'VP Sales',
});

// Delete
await client.salesforce.sobject('Account').delete('001xx000003GYnI');
```

Same `CrmPassthroughResult<T>` envelope as HubSpot.

Up to 5 actions per notification. Action types: `link` (URL button), `callback` (calls a URL with a payload), `dismiss`. If the file or report lives in S3/GCS or any external host, pass its URL as a `link` action -- the notification is the delivery mechanism.

### `notifications.list(options?)` -- List notifications for current user
### `notifications.unreadCount()` -- Get unread count
### `notifications.markRead(id)` -- Mark as read
### `notifications.dismiss(id)` -- Dismiss notification
### `notifications.executeAction(id, actionId)` -- Execute notification action
