# Personize Integration Checklist

A quick "did I set this up right?" reference. Work through each section in order — later sections depend on earlier ones.

---

## 1. Connect — Pick Your Integration Path

Choose one or more:

- [ ] **Skills** — Installed Personize skills into your AI assistant (`npx skills add personizeai/personize-skills`)
- [ ] **SDK** — Installed `@personize/sdk` and initialized the client with your secret key
- [ ] **MCP** — Added the Personize MCP server to your agent's tool configuration (Claude Desktop, Cursor, ChatGPT, workflow tools). Default tool set includes `memory_save`, `smartRecall`, `memory_digest`, `memory_get_properties`, `memory_update_property`, `context_retrieve`, `context_save`. Tools hidden by default in v1.1: `memory_retrieve` (simple) + `memory_batch_store` — use `smartRecall` and `client.v1_1.memory.import()` / `personize v1.1 memory save-batch` instead.
- [ ] **CLI** — `personize v1.1` subcommand surface (`personize v1.1 memory save|save-batch|retrieve|manage list`, `personize v1.1 context doc-types list`). Older `personize memory ...` commands continue to work via v1.
- [ ] **Zapier** — Connected your Personize account via Zapier to memorize data from 8,000+ apps

Verify: `client.me()` → `GET /api/v1/me` returns your org name and plan.

---

## 2. Schema — Design Your Collections

Before memorizing anything, design the properties that define your entities.

- [ ] Created at least one **collection** with property definitions → `POST /api/v1/collections`
- [ ] Each property has a **clear description** — not just a name. The description tells the AI *what* to extract and *how* to measure it. Include examples for ambiguous fields.
- [ ] Property **display types** match the data (text, number, date, list, badge, etc.) — this affects both extraction and dashboard rendering
- [ ] Schema covers your primary entity types (contacts, companies, deals, tickets, etc.)

Verify: `client.collections.list()` → `GET /api/v1/collections` shows your collections with descriptions.

---

## 3. Memorize — Get Data In

Store entity data using the right endpoint for your use case:

| Use Case | Endpoint (v1.1) | SDK Method (v1.1) |
|---|---|---|
| **Rich text with AI extraction** (notes, transcripts, emails) | `POST /api/v1.1/memory/save` with `shape: 'shortform'` (default) | `client.v1_1.memory.save()` |
| **Typed document save** (guideline, playbook, reference, template, brief) | `POST /api/v1.1/memory/save` with `shape: 'document', type` | `client.v1_1.memory.save({ shape: 'document', type, ... })` or `client.v1_1.context.save(...)` |
| **Batch sync from CRM/database (ETL)** | `POST /api/v1.1/memory/import` (per-property `extract` flag) | `client.v1_1.memory.import()` |
| **Small batch save (≤100 records)** | `POST /api/v1.1/memory/save/batch` | `client.v1_1.memory.saveBatch()` |
| **Async bulk doc save (1-24h SLA, webhook on completion)** | `POST /api/v1.1/context/save/batch` | `client.v1_1.context.save.batch()` |

- [ ] `extract: true` on all **free-form text** fields in `import()` (notes, transcripts, emails, descriptions)
- [ ] `extract: false` (or omitted) on **structured fields** (email, phone, dates, counts, IDs)
- [ ] **Not** passing `skipDualWrite`, `skipStorage`, or `skipPropertySelection` — these are rejected by v1.1 with `400`
- [ ] **Not** pre-processing content with an LLM before saving — the extraction pipeline handles it
- [ ] Batch syncs use `chunkSize` and 429 retry logic
- [ ] Rate limits read from `client.me()`, not hardcoded

Verify: `client.v1_1.memory.retrieve({ query: "..." })` → `POST /api/v1.1/memory/retrieve` finds the data you stored.

---

## 4. Recall — Get Data Out

Retrieve entity data using the right method:

| Need | Endpoint (v1.1) | SDK Method (v1.1) |
|---|---|---|
| **Semantic search** — "what do we know about X?" | `POST /api/v1.1/memory/retrieve` | `client.v1_1.memory.retrieve()` |
| **Entity context bundle** — full picture of an entity | `POST /api/v1.1/memory/digest` | `client.v1_1.memory.smartDigest()` |
| **Property values with schema** — values + descriptions + update flag | `POST /api/v1.1/memory/filter-by-property` | `client.v1_1.memory.filterByProperty()` |
| **Direct lookup** — all stored data for a record | `GET /api/v1.1/memory/manage/:id` | `client.v1_1.memory.manage.get(id)` (the simple `memory_retrieve` MCP tool is hidden by default — use `smartRecall`) |
| **Filter & export** — list records by conditions | `POST /api/v1.1/memory/search` | `client.v1_1.memory.search()` |

- [ ] Semantic retrieve returns relevant results for your actual use-case queries
- [ ] `v1_1.memory.retrieve()` uses the right `mode`: `"fast"` (1 credit, ~500ms) for real-time lookups, `"deep"` (2 credits, ~10-20s, reflection + answer generation) for thorough analysis. Default is `"deep"`.
- [ ] `smartDigest()` compiles a useful context bundle for your primary entity type
- [ ] `filterByProperty()` returns property values with schema descriptions and `update` flag — useful for AI agents to know which properties are replaceable vs append-only
- [ ] Cross-entity context works — pulling company context when working on a contact

Supported entity identifiers: `email`, `websiteUrl`, `recordId`, `customKeyName`+`customKeyValue`, `phoneNumber`, `postalCode`, `deviceId`, `contentId`. Pass multiple for better matching.
- [ ] `retrieve()` with `prefer_recent: true` surfaces recent activity and property changes — every property update automatically writes a searchable change summary to the vector store, so "what changed recently?" queries work without a dedicated history tool

Verify: Run a real query, not a test string. If results are poor, check property descriptions and per-property `extract` flags.

---

## 5. Governance — Set the Rules

Create and maintain organizational guidelines that govern all AI agents.

| Operation | Endpoint | SDK Method |
|---|---|---|
| **Create/update guidelines** | `POST/PATCH /api/v1/guidelines` | `client.guidelines.create/update()` |
| **Fetch relevant guidelines** | `POST /api/v1/ai/smart-guidelines` | `client.ai.smartGuidelines()` |
| **Read a specific section** | `GET /api/v1/guidelines/:id/section` | `client.guidelines.getSection()` |

- [ ] At least one guideline created (brand voice, ICP definitions, sales playbook, compliance rules)
- [ ] Each guideline has `triggerKeywords` set — these drive retrieval scoring, not just content
- [ ] `smartGuidelines()` returns content for a sample task relevant to your use case
- [ ] Guidelines are **reviewed and updated** regularly — not set-and-forget
- [ ] Version history tracked for auditing → `GET /api/v1/actions/:id/history`
- [ ] Set `maxContentTokens` based on your LLM's context budget (default: 10,000 tokens). Long guidelines are auto-trimmed to sections. Demoted guidelines include `id` + `description` for follow-up via `getSection()`.

Verify: `client.ai.smartGuidelines({ message: "your real task" })` → returns the right guidelines.

---

## 6. Generate — Use /prompt

The AI generation endpoint combines memory + governance + multi-step instructions.

| Operation | Endpoint | SDK Method |
|---|---|---|
| **AI generation** | `POST /api/v1/prompt` | `client.ai.prompt()` |

- [ ] Using `instructions[]` for multi-step workflows (research → guidelines → generate)
- [ ] Built-in tools (recall, memorize, smart_guidelines) are available by default — no setup needed
- [ ] Structured outputs defined with `outputs: [{ name: "..." }]` for machine-readable results
- [ ] `memorize: { email, captureToolResults: true }` saves generated output back to memory
- [ ] `evaluate: true` for quality scoring on production runs
- [ ] External MCP tools connected via dashboard if needed (Tavily, HubSpot, etc.)

Verify: A single `prompt()` call produces the output you need with the right context.

---

## 7. Agents — Reusable Prompt Actions

Save and run repeatable prompt configurations.

| Operation | Endpoint | SDK Method |
|---|---|---|
| **List agents** | `GET /api/v1/agents` | `client.agents.list()` |
| **Get agent config** | `GET /api/v1/agents/:id` | `client.agents.get()` |
| **Run agent** | `POST /api/v1/agents/:id/run` | `client.agents.run()` |

- [ ] Common prompt patterns saved as agents (not copy-pasted across code)
- [ ] Agent input variables (`{{input}}`) documented for consumers
- [ ] Agents tested with real entity data, not test strings

---

## 8. Workspaces — Multi-Agent Coordination

Turn any entity record into a shared workspace where agents and humans collaborate.

- [ ] Workspace schema attached to entity types that need coordination (5-property starter: Context, Updates, Tasks, Notes, Issues)
- [ ] Agents **read** workspace state via `smartDigest()` / `smartRecall()` before acting
- [ ] Agents **write** contributions back via `memorize()` with workspace-tagged properties
- [ ] Human contributions flow through the same workspace (not a separate channel)

Verify: Two different agents can read each other's contributions on the same entity.

---

## 9. Zapier / No-Code — Memorize from Anywhere

- [ ] Zapier connected and storing data from external apps into Personize memory
- [ ] n8n workflows using `POST /api/v1.1/memory/import` with correct per-property `extract` flags
- [ ] Webhook ingestion set up for real-time events → `POST /api/v1.1/memory/save`

---

## 10. Production Readiness

- [ ] Context assembly pattern in place: `smartGuidelines()` + `smartDigest()` + `v1_1.memory.retrieve()` — all three, every time
- [ ] Generated outputs memorized after delivery — closes the feedback loop
- [ ] Sensitive content (pricing, legal, medical) flagged for human review before delivery
- [ ] Rate limit retry logic in all batch operations
- [ ] Monitoring: periodic health checks on recall quality and guideline coverage
