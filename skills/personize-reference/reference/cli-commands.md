# Personize CLI Reference (@personize/cli)

## Canonical Commands (v1.1)

### memory
| Command | Description |
|---------|-------------|
| `memory save` | Save memories (AI extraction) |
| `memory retrieve <query>` | Retrieve memories (--mode fast/deep/auto) |

### context-docs
| Command | Description |
|---------|-------------|
| `context-docs retrieve <topic>` | Find relevant context docs |
| `context-docs save` | AI-powered doc evolution |

---



| Command Group | Commands | Purpose |
|---------------|----------|---------|
| auth | login, logout, status | Authentication |
| memory | memorize, recall, smart-recall, smart-recall-unified, digest, search, similar, segment, batch, update, bulk-update, delete, delete-record, cancel-deletion, properties, property-history, query-properties, update-keys, list-keys | Memory operations (19) |
| guidelines | list, create, update, delete, attachments | Governance |
| collections | list, create, update, delete | Schema management |
| context | guidelines | SmartContext queries |
| context-docs | list, create, structure, section, delete, fetch | Context doc management (agentdocs alias) |
| entities | list, create, update, delete | Entity management |
| evaluate | memorization-accuracy | Quality testing |
| analytics | overview | Org analytics |
| organizations | list, create | Org management |
| members | list, invite | Member management |
| Other | agents, chat, doctor, filter, mcp, notifications, destinations, prompt, responses, schema, setup | Platform tools |

---

## Global Flags

All commands support these flags:

| Flag | Description |
|------|-------------|
| `--key <key>` | API key (overrides PERSONIZE_API_KEY env var) |
| `--base-url <url>` | API base URL (default: https://agent.personize.ai) |
| `--json` | Output raw JSON response |
| `--verbose` | Show debug information |

---

## auth

### `personize auth login`
Authenticate with the Personize platform. Opens browser for OAuth or accepts API key.

### `personize auth logout`
Clear stored credentials.

### `personize auth status`
Show current authentication status, organization, and plan.

---

## memory

### `personize memory memorize`
Store content with AI extraction.

| Flag | Description |
|------|-------------|
| `--content <text>` | Content to memorize (required) |
| `--email <email>` | Contact email identifier |
| `--website-url <url>` | Company website identifier |
| `--type <type>` | Entity type (Contact, Company, etc.) |
| `--tier <tier>` | Extraction tier: basic, pro, pro_fast, ultra |
| `--tags <tags>` | Comma-separated tags |
| `--collection <name>` | Target collection name |
| `--extraction-prompt <text>` | Focus instructions for extraction |
| `--speaker <name>` | Speaker label for transcripts |
| `--timestamp <iso>` | Content timestamp |

### `personize memory upsert`
Structured create/upsert — write known field values directly with NO AI extraction (single or batch). Canonical create/upsert path. Maps to `POST /api/v1.1/memory/upsert`.

| Flag | Description |
|------|-------------|
| `--file <path>` | JSON file with `records[]` (each: email/website-url/record-id + type + properties) |
| `--email <email>` | Contact email identifier (single-record shorthand) |
| `--website-url <url>` | Company website identifier (single-record shorthand) |
| `--type <type>` | Entity type |
| `--properties <json>` | JSON object of property:value pairs (single-record shorthand) |

### `personize memory recall`
Direct memory lookup.

| Flag | Description |
|------|-------------|
| `--query <text>` | Search query (required) |
| `--email <email>` | Contact email |
| `--type <type>` | Entity type |
| `--limit <n>` | Max results |

### `personize memory smart-recall`
Semantic recall with reflection and answer generation.

| Flag | Description |
|------|-------------|
| `--query <text>` | Natural language query (required) |
| `--email <email>` | Contact email |
| `--website-url <url>` | Company website |
| `--mode <mode>` | fast (~500ms) or deep (~10-20s) |
| `--limit <n>` | Max results |
| `--generate-answer` | Generate synthesized answer |
| `--group-by-record` | Group results by record |

### `personize memory smart-recall-unified`
Unified retrieval -- server classifies intent and orchestrates.

| Flag | Description |
|------|-------------|
| `--message <text>` | Natural language query (required) |
| `--emails <emails>` | Comma-separated emails for scoping |
| `--session-id <id>` | Session ID for follow-up queries |

### `personize memory digest`
Get compiled entity context digest.

| Flag | Description |
|------|-------------|
| `--email <email>` | Contact email |
| `--website-url <url>` | Company website |
| `--token-budget <n>` | Max tokens (default: 1000) |
| `--type <type>` | Entity type |

### `personize memory search`
Filter and search records by property conditions.

| Flag | Description |
|------|-------------|
| `--type <type>` | Entity type |
| `--query <text>` | Semantic search query |
| `--email <email>` | Scope to entity by email |
| `--page-size <n>` | Results per page |
| `--return-records` | Include property values |
| `--include-memories` | Include freeform memories |

### `personize memory similar`
Find records similar to a seed record.

| Flag | Description |
|------|-------------|
| `--email <email>` | Seed record email |
| `--record-id <id>` | Seed record ID |
| `--dimensions <dims>` | Comparison dimensions |
| `--limit <n>` | Max results |

### `personize memory segment`
Segment/rank all records by similarity tiers.

| Flag | Description |
|------|-------------|
| `--seed-email <email>` | Seed email |
| `--seed-text <text>` | Text-based seed description |
| `--dimensions <dims>` | Comparison dimensions |

### `personize memory batch`
Batch memorize from file or stdin.

| Flag | Description |
|------|-------------|
| `--file <path>` | JSON file with records array |
| `--tier <tier>` | Extraction tier |
| `--source <label>` | Source system label |
| `--dry-run` | Validate without writing |

### `personize memory update`
Update a single property or freeform memory.

| Flag | Description |
|------|-------------|
| `--record-id <id>` | Target record (required) |
| `--property <name>` | Property to update |
| `--value <value>` | New property value |
| `--memory-id <id>` | Freeform memory UUID (alternative) |
| `--text <text>` | New freeform text (with memory-id) |

### `personize memory bulk-update`
Update multiple properties on a record.

| Flag | Description |
|------|-------------|
| `--record-id <id>` | Target record (required) |
| `--updates <json>` | JSON array of {propertyName, propertyValue} |

### `personize memory delete`
Soft-delete memories (30-day recovery window).

| Flag | Description |
|------|-------------|
| `--ids <ids>` | Comma-separated memory UUIDs |
| `--record-id <id>` | Scope by record |
| `--older-than <date>` | Delete older than ISO date |

### `personize memory delete-record`
Soft-delete all memories for a record.

| Flag | Description |
|------|-------------|
| `--record-id <id>` | Record to delete (required) |
| `--type <type>` | Entity type (required) |
| `--reason <text>` | Deletion reason |

### `personize memory cancel-deletion`
Cancel a pending soft-delete within the 30-day window.

| Flag | Description |
|------|-------------|
| `--record-id <id>` | Record to restore (required) |
| `--type <type>` | Entity type |

### `personize memory properties`
Get record properties with schema descriptions.

| Flag | Description |
|------|-------------|
| `--email <email>` | Contact email |
| `--record-id <id>` | Record ID |
| `--type <type>` | Entity type |
| `--non-empty` | Only non-empty properties |

### `personize memory property-history`
Query property change history.

| Flag | Description |
|------|-------------|
| `--record-id <id>` | Record (required) |
| `--property <name>` | Filter to specific property |
| `--from <date>` | Start date (ISO) |
| `--to <date>` | End date (ISO) |
| `--limit <n>` | Max entries |

### `personize memory query-properties`
LLM-powered search across property values.

| Flag | Description |
|------|-------------|
| `--property <name>` | Property to search (required) |
| `--query <text>` | Natural language query (required) |
| `--type <type>` | Entity type |
| `--limit <n>` | Max results |

### `personize memory update-keys`
Add keys (standard or custom) to a record.

| Flag | Description |
|------|-------------|
| `--record-id <id>` | Target record |
| `--type <type>` | Entity type (required) |
| `--keys <json>` | JSON object of key:value pairs |

### `personize memory list-keys`
List all keys on a record.

| Flag | Description |
|------|-------------|
| `--record-id <id>` | Target record |
| `--email <email>` | Or by email |
| `--type <type>` | Entity type (required) |

---

## guidelines

### `personize guidelines list`
List all guidelines. Flags: `--tags`, `--limit`, `--summary`.

### `personize guidelines create`
Create a guideline. Flags: `--name`, `--value`, `--description`, `--tags`.

### `personize guidelines update`
Update a guideline. Flags: `--id`, `--name`, `--value`, `--update-mode`.

### `personize guidelines delete`
Delete a guideline. Flags: `--id`.

### `personize guidelines attachments`
Manage guideline attachments. Subcommands: list, get, delete.

---

## context-docs

### context-docs
| Command | Description |
|---------|-------------|
| `context-docs list` | List context docs (--type, --tags) |
| `context-docs create` | Create (--name, --type, --file) |
| `context-docs structure <id>` | Show heading tree |
| `context-docs section <id>` | Get section (--header) |
| `context-docs delete <id>` | Delete |
| `context-docs fetch <topic>` | Smart-fetch (--types, --record-id) |

> The old `agentdocs` command remains as a stable alias for `context-docs`.

---

## collections

### `personize collections list` -- List collections
### `personize collections create` -- Create (--name, --definition, --entity-type)
### `personize collections update` -- Update (--id, --properties)
### `personize collections delete` -- Delete (--id)

---

## context

### `personize context guidelines`
Query SmartContext for relevant guidelines. Flags: `--message`, `--mode`.

---

## entities

### `personize entities list` -- List entity types
### `personize entities create` -- Create entity type
### `personize entities update` -- Update entity type
### `personize entities delete` -- Archive entity type

---

## evaluate

### `personize evaluate memorization-accuracy`
Run memorization accuracy evaluation. Flags: `--collection-id`, `--input`, `--stream`.

---

## Other Commands

### `personize agents list|run` -- List or run agents
### `personize chat` -- Interactive chat session
### `personize doctor` -- Diagnose setup issues
### `personize filter` -- Filter records by property
### `personize mcp` -- MCP server management
### `personize notifications list|send` -- Notification management
### `personize destinations list|create` -- Webhook destinations
### `personize prompt` -- Execute a prompt
### `personize responses` -- Step-driven orchestration
### `personize schema` -- Schema/collection management
### `personize setup` -- Initial setup wizard (detects IDE)
### `personize analytics overview` -- Org analytics
### `personize organizations list|create` -- Org management
### `personize members list|invite` -- Member management

---

## schedules

Recurring or one-time `run_prompt` / `send_notification` tasks. Maps to `/api/v1/schedules` + the SDK `client.schedules.*` surface.

### `personize schedules create`
Create a new schedule. Flags: `--name <kebab-case>`, `--task-type run_prompt|send_notification`, `--payload <json-file-or-string>`, `--recurring`, `--pattern <rate|cron>`, `--run-at <iso8601>`, `--timezone <tz>`, `--description <text>`. Use `--payload @schedule-payload.json` to load from a file.

### `personize schedules list`
List schedules with filters. Flags: `--record-id`, `--email`, `--website-url`, `--task-type`, `--limit`, `--next-token`.

### `personize schedules get <id-or-name>`
Get one schedule. Accepts ULID or kebab-case name.

### `personize schedules update <id-or-name>`
Partial update. `--enabled false` to pause, `--enabled true` to resume. `--payload @file.json` for a full taskPayload replacement.

### `personize schedules delete <id-or-name>`
Soft delete (90-day retention).

### `personize schedules executions <id-or-name>`
List execution history. Flags: `--limit`, `--next-token`.

---

## kits

Provision an empty org's schema + governance from a declarative kit manifest. New orgs start empty — install a kit to seed collections, entity types, and guidelines in one shot. Built-in kits: `personize-starter`, `engineering-memory`.

### `personize kits list`
List available kits (built-in + custom).

### `personize kits install <id>`
Install a kit into the current org. Async — prints an `installId` to poll. Pass a built-in kit id (`personize-starter`, `engineering-memory`) or `--manifest @kit.json` for an inline manifest.

### `personize kits status <installId>`
Poll install progress by `installId`. Reports terminal status when provisioning completes.

---

## crm

Call HubSpot and Salesforce REST APIs through the org's Personize-managed OAuth connection — no provider credentials needed.

### `personize crm hubspot`

```bash
personize crm hubspot contacts list --limit 10 --properties email,firstname
personize crm hubspot contacts get <id>
personize crm hubspot contacts search-by-email user@example.com
personize crm hubspot contacts create --email x@co.com --firstname Jane --lastname Smith
personize crm hubspot contacts update <id> --data '{"jobtitle":"VP Sales"}'
personize crm hubspot deals list --limit 25
personize crm hubspot tasks create --subject "Follow up" --due 2026-06-01
personize crm hubspot notes create --body "Called, left voicemail"
personize crm hubspot request --method GET --path /owners/v2/owners
```

Path allowlist: `/crm/`, `/marketing/`, `/cms/`, `/automation/`, `/files/`, `/communication-preferences/`, `/properties/`, `/owners/`, `/oauth/`.

### `personize crm salesforce`

```bash
personize crm salesforce query "SELECT Id, Name FROM Account LIMIT 10"
personize crm salesforce sobject Account get <id> --fields Name,Industry
personize crm salesforce sobject Account create --data '{"Name":"Acme Corp"}'
personize crm salesforce sobject Lead upsert Email jane@example.com --data '{"LastName":"Smith"}'
personize crm salesforce sobject Account update <id> --data '{"Industry":"Technology"}'
personize crm salesforce request --method GET --path /services/data/v60.0/limits
```

Path allowlist: `/services/data/`, `/services/apexrest/`.

**Response shape:** every command outputs the upstream `{ status, headers, body, meta }` envelope. Personize returns HTTP 200 when the upstream call completes — inspect `status` for the provider's outcome. Error codes: `connection_not_found`, `connection_disconnected`, `invalid_path`, `invalid_method`, `upstream_timeout`, `rate_limited`.
