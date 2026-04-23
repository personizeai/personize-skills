# Personize Integration Checklist

A quick "did I set this up right?" reference. Work through each section in order — later sections depend on earlier ones.

---

## 1. Connect — Pick Your Integration Path

Choose one or more:

- [ ] **Skills** — Installed Personize skills into your AI assistant (`npx skills add personizeai/personize-skills`)
- [ ] **SDK** — Installed `@personize/sdk` and initialized the client with your secret key
- [ ] **MCP** — Added the Personize MCP server to your agent's tool configuration (Claude Desktop, Cursor, ChatGPT, workflow tools). 13 tools available including `memory_get_properties`, `memory_update_property`, `memory_digest`
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

| Use Case | Endpoint | SDK Method |
|---|---|---|
| **Rich text with AI extraction** (notes, transcripts, emails) | `POST /api/v1/memorize` | `client.memory.memorize()` |
| **Batch sync from CRM/database** | `POST /api/v1/batch-memorize` | `client.memory.memorizeBatch()` |
| **Structured upsert, no AI needed** | `POST /api/v1/upsert` | `client.memory.upsert()` |

- [ ] `extractMemories: true` on all **free-form text** fields (notes, transcripts, emails, descriptions)
- [ ] `extractMemories: false` (or omitted) on **structured fields** (email, phone, dates, counts, IDs)
- [ ] **Not** pre-processing content with an LLM before memorizing — the extraction pipeline handles it
- [ ] Batch syncs use `chunkSize` and 429 retry logic
- [ ] Rate limits read from `client.me()`, not hardcoded

Verify: `client.memory.smartRecall({ query: "..." })` → `POST /api/v1/smart-recall` finds the data you stored.

---

## 4. Recall — Get Data Out

Retrieve entity data using the right method:

| Need | Endpoint | SDK Method |
|---|---|---|
| **Semantic search** — "what do we know about X?" | `POST /api/v1/smart-recall` | `client.memory.smartRecall()` |
| **Entity context bundle** — full picture of an entity | `POST /api/v1/smart-memory-digest` | `client.memory.smartDigest()` |
| **Property values with schema** — values + descriptions + update flag | `POST /api/v1/properties` | `client.memory.properties()` |
| **Direct lookup** — all stored data for a record | `POST /api/v1/recall` | `client.memory.recall()` |
| **Filter & export** — list records by conditions | `POST /api/v1/search` | `client.memory.search()` |

- [ ] Semantic recall returns relevant results for your actual use-case queries
- [ ] `smartRecall()` uses the right `mode`: `"fast"` (1 credit, ~500ms) for real-time lookups, `"deep"` (2 credits, ~10-20s, reflection + answer generation) for thorough analysis. Default is `"deep"`.
- [ ] `smartDigest()` compiles a useful context bundle for your primary entity type
- [ ] `properties()` returns property values with schema descriptions and `update` flag — useful for AI agents to know which properties are replaceable vs append-only
- [ ] Cross-entity context works — pulling company context when working on a contact

Supported entity identifiers: `email`, `websiteUrl`, `recordId`, `customKeyName`+`customKeyValue`, `phoneNumber`, `postalCode`, `deviceId`, `contentId`. Pass multiple for better matching.
- [ ] `smartRecall()` with `prefer_recent: true` surfaces recent activity and property changes — every property update automatically writes a searchable change summary to the vector store, so "what changed recently?" queries work without a dedicated history tool

Verify: Run a real query, not a test string. If results are poor, check property descriptions and `extractMemories` flags.

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
- [ ] n8n workflows using `POST /api/v1/batch-memorize` with correct `extractMemories` flags
- [ ] Webhook ingestion set up for real-time events → `POST /api/v1/memorize`

---

## 10. Production Readiness

- [ ] Context assembly pattern in place: `smartGuidelines()` + `smartDigest()` + `smartRecall()` — all three, every time
- [ ] Generated outputs memorized after delivery — closes the feedback loop
- [ ] Sensitive content (pricing, legal, medical) flagged for human review before delivery
- [ ] Rate limit retry logic in all batch operations
- [ ] Monitoring: periodic health checks on recall quality and guideline coverage
