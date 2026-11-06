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
| save | `--shape text\|property\|identifiers\|document`, `--items-file <f>` | Write memory |
| retrieve | scout, brief, filter, fetch, similar | Read memory |
| delete | `<type> --yes` (add `--hard` for type record) | Delete memory data |
| memory | segment (legacy: list-keys, delete-keys, hidden; use `retrieve fetch --fetch-identifiers` and `delete identifier`) | Other memory operations |
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

### `personize save`
Write memory. `--shape` selects the form: `text` (AI extraction), `property` (structured values, no AI extraction), `identifiers`, `document`. API: `POST /api/v1.1/memory/save`.

| Flag | Description |
|------|-------------|
| `--shape <shape>` | `text`, `property`, `identifiers` or `document` |
| `--items-file <f>` | JSON file with `items[]` for a shortform/freeform/document batch save (not for property or identifiers: one call per record) |

### `personize retrieve <mode>`
Read memory. Modes: `scout` (multi-source recall), `brief` (synthesized answer), `filter` (property conditions), `fetch` (by ids, e.g. `--record-id <id>`), `similar` (lookalikes). API: `POST /api/v1.1/memory/retrieve`.

### `personize memory segment`
Segment/rank all records by similarity tiers.

| Flag | Description |
|------|-------------|
| `--seed-email <email>` | Seed email |
| `--seed-text <text>` | Text-based seed description |
| `--dimensions <dims>` | Comparison dimensions |

Batch writes and property updates use `personize save --items-file <f>` and `personize save --shape property`.

### `personize memory delete`
Legacy; the canonical form is `personize delete record`. Soft-delete memories (30-day recovery window).

| Flag | Description |
|------|-------------|
| `--ids <ids>` | Comma-separated memory UUIDs |
| `--record-id <id>` | Scope by record |
| `--older-than <date>` | Delete older than ISO date |

### `personize delete record --record-id <id> --entity-type <type> --yes`
Soft-delete all memories for a record (30-day restore). Canonical form of the legacy `personize memory delete-record`.

| Flag | Description |
|------|-------------|
| `--record-id <id>` | Record to delete (required for a soft delete) |
| `--entity-type <type>` | Entity type, e.g. `contact` (required for a soft delete) |
| `--hard` | Hard delete; takes `--record-id` or `--ids` (not both), no `--entity-type` needed |
| `--yes` | Confirm |

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

### Property history
Use `personize retrieve fetch --fetch-file <f>` (API: `retrieve mode=fetch fetch.propertyHistory`). The file holds `{ "propertyHistory": [{ "recordId": "...", "propertyName": "..." }] }`. Bare `retrieve fetch --record-id` sends an empty `fetch` and is rejected.

### Querying properties
Use `personize retrieve filter` for exact-match property conditions, or `personize retrieve scout` with filters. The old LLM-ranked query was replaced by exact match.

### Adding keys
Add keys (standard or custom) to a record with `personize save --shape identifiers`, one call per record.

### Listing and deleting keys
List keys: `personize retrieve fetch --record-id <id> --entity-type <type> --fetch-identifiers`. Delete keys: `personize delete identifier --record-id <id> --entity-type <type> --property-names <a,b> --yes`.

### Legacy (still works)
`personize memory delete-record`, `property-history`, `query-properties`, `list-keys` and `delete-keys` translate to the canonical commands above. See `Docs/generated/migration-table.json`.

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

Provision an empty org's schema + governance from a declarative kit manifest. New orgs start empty - install a kit to seed collections, entity types, and guidelines in one shot. Built-in kits: `personize-starter`, `engineering-memory`.

### `personize kits list`
List available kits (built-in + custom).

### `personize kits install <id>`
Install a kit into the current org. Async - prints an `installId` to poll. Pass a built-in kit id (`personize-starter`, `engineering-memory`) or `--manifest @kit.json` for an inline manifest.

### `personize kits status <installId>`
Poll install progress by `installId`. Reports terminal status when provisioning completes.

---

## crm

Call HubSpot and Salesforce REST APIs through the org's Personize-managed OAuth connection - no provider credentials needed.

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

**Response shape:** every command outputs the upstream `{ status, headers, body, meta }` envelope. Personize returns HTTP 200 when the upstream call completes - inspect `status` for the provider's outcome. Error codes: `connection_not_found`, `connection_disconnected`, `invalid_path`, `invalid_method`, `upstream_timeout`, `rate_limited`.
