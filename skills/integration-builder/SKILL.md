---
name: integration-builder
description: "Builds data sync integrations that pull records from CRMs and databases into Personize memory using the @personize/sdk. Scaffolds connectors for Salesforce, HubSpot, Postgres, and any data source with batch memorization, per-property AI extraction, rate-limit handling, and scheduled deployment. Use when connecting a data source to Personize."
license: Apache-2.0
compatibility: "Requires @personize/sdk, Node.js 18+, and a Personize API key (sk_live_...)"
metadata: {"author": "personize-ai", "version": "1.0", "homepage": "https://personize.ai", "openclaw": {"emoji": "\U0001F50C", "requires": {"env": ["PERSONIZE_SECRET_KEY"], "bins": ["node"]}}}
---

# Skill: Integration Builder

Build data sync integrations that pull records from CRMs and databases into Personize memory using the `@personize/sdk`. The user provides their source system and filters; you scaffold the connector, batch-memorize records, and deploy on a schedule.

---

## Prerequisites

- Node.js 18+ and npm/pnpm
- A Personize secret key (`sk_live_...`) — set as `PERSONIZE_SECRET_KEY` in `.env`
- Credentials for the source system (Salesforce, HubSpot, Postgres, etc.)

---

## SDK Quick Reference

```typescript
import { Personize } from '@personize/sdk';
const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
```

| Method | Description |
|---|---|
| `client.me()` | Get org, user, plan, and rate limits |
| `client.memory.memorize(opts)` | Store content in RAG memory (AI extraction + vectors) — single item |
| `client.memory.memorizeBatch(opts)` | Unified batch sync — per-property `extractMemories` flag controls AI vs structured |
| `client.memory.upsert(opts)` | Structured upsert — store properties without AI extraction (legacy) |
| `client.memory.upsertBatch(opts)` | Batch structured upsert — memories array format (legacy) |
| `client.memory.recall(opts)` | Semantic search across memories |
| `client.memory.export(opts)` | Filter/export records with conditions |
| `client.memory.smartDigest(opts)` | Get compiled context bundle for an entity (properties + memories) |
| `client.ai.smartContext(opts)` | Get relevant context variables for a message |
| `client.ai.prompt(opts)` | Execute a prompt with tools |
| `client.variables.list()` | List all governance variables |
| `client.variables.create(payload)` | Create a variable |
| `client.variables.update(id, payload)` | Update a variable |
| `client.variables.delete(id)` | Delete a variable |
| `client.variables.getStructure(id)` | Get variable headings |
| `client.variables.getSection(id, opts)` | Get a section by header |
| `client.collections.list/create/update/delete()` | Manage property collections (full CRUD) |
| `client.agents.list()` | List available agents |
| `client.agents.run(id, opts)` | Run an agent |

---

## The `extractMemories` Flag — Per-Property AI Control

When syncing records, each property in the mapping has an optional `extractMemories` flag:

- **`extractMemories: true`** → AI extraction + vector embeddings (LanceDB) + structured storage (DynamoDB). Use for unstructured content that benefits from semantic search.
- **`extractMemories: false`** (or omitted) → Structured storage only (DynamoDB). Use for structured fields like emails, phone numbers, IDs, dates.

This is a **per-property** decision, all handled in a single `client.memory.memorizeBatch()` call:

```typescript
await client.memory.memorizeBatch({
    source: 'Hubspot',
    mapping: {
        entityType: 'contact',
        email: 'email',               // source field name containing email
        website: 'company_website',    // source field name containing website
        runName: 'hubspot-contact-sync',
        properties: {
            // Structured fields — no AI
            email:      { sourceField: 'email',      collectionId: 'col_standard', collectionName: 'Contacts Standard' },
            first_name: { sourceField: 'firstname',  collectionId: 'col_standard', collectionName: 'Contacts Standard' },
            last_name:  { sourceField: 'lastname',   collectionId: 'col_standard', collectionName: 'Contacts Standard' },
            phone:      { sourceField: 'phone',      collectionId: 'col_standard', collectionName: 'Contacts Standard' },
            company:    { sourceField: 'company',     collectionId: 'col_standard', collectionName: 'Contacts Standard' },
            // Unstructured content — AI extraction + vectors
            personalization_notes: {
                sourceField: 'research_report',
                collectionId: 'col_generated',
                collectionName: 'Generated Content',
                extractMemories: true,
            },
            email_1_body: {
                sourceField: 'email_body_1',
                collectionId: 'col_generated',
                collectionName: 'Generated Content',
                extractMemories: true,
            },
            call_script: {
                sourceField: 'call_script_1',
                collectionId: 'col_generated',
                collectionName: 'Generated Content',
                extractMemories: true,
            },
        },
    },
    rows: [
        { email: 'john@acme.com', firstname: 'John', lastname: 'Smith', phone: '+1-555-0123', company: 'Acme Corp', research_report: 'VP of Sales, interested in enterprise plan...', email_body_1: '<p>Hi John...</p>', call_script_1: null },
        { email: 'jane@techstart.com', firstname: 'Jane', lastname: 'Doe', phone: null, company: 'TechStart', research_report: 'CTO, needs 99.9% uptime SLA...', email_body_1: '<p>Hi Jane...</p>', call_script_1: 'Opening: mention their recent Series B...' },
    ],
    chunkSize: 1,
});
```

### Per-Property Decision Guide

| Source Field | `extractMemories` | Reason |
|---|---|---|
| Email, Phone, Address | omit (false) | Structured, no AI needed |
| Name, Title, Company | omit (false) | Structured lookup fields |
| Research Reports, Notes | `true` | Unstructured, benefits from semantic search |
| Email Bodies, Call Scripts | `true` | Generated content, AI extracts facts |
| Revenue, Employee Count | omit (false) | Numeric, filter/sort only |
| Dates (DOB, Created) | omit (false) | Structured date fields |

### Single-Item Memorize

For ad-hoc single-item AI memorization (outside a batch sync), use `client.memory.memorize()`:

```typescript
await client.memory.memorize({
    content: 'John mentioned interest in enterprise plan during our call on March 15th.',
    speaker: 'Sales Call',
    enhanced: true,
    tags: ['crm-sync'],
    email: 'john@acme.com',
});
```

---

## Integration Pattern (Step-by-Step)

Follow these steps when the user asks to connect a data source to Personize.

### Step 1: Initialize the project

```bash
mkdir personize-sync && cd personize-sync
npm init -y
npm install @personize/sdk dotenv
npm install -D typescript ts-node @types/node
```

Create `tsconfig.json`:
```json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "commonjs",
        "outDir": "dist",
        "rootDir": "src",
        "strict": true,
        "esModuleInterop": true,
        "resolveJsonModule": true,
        "declaration": true
    },
    "include": ["src"]
}
```

Create `.env`:
```
PERSONIZE_SECRET_KEY=sk_live_...
# Add source-specific credentials below
```

Create `src/personize.ts` (shared client):
```typescript
import { Personize } from '@personize/sdk';
import 'dotenv/config';

export const client = new Personize({
    secretKey: process.env.PERSONIZE_SECRET_KEY!,
});
```

### Step 2: Check auth and read rate limits

Always start every sync script by verifying the key and reading plan limits:

```typescript
const { data } = await client.me();
const perMinute = data!.plan.limits.maxApiCallsPerMinute;
const perMonth = data!.plan.limits.maxApiCallsPerMonth;
const batchSize = Math.floor(perMinute * 0.9); // leave headroom
console.log(`Plan: ${data!.plan.name} — ${perMinute}/min, ${perMonth}/month`);
```

### Step 3: Connect to the source and fetch rows

Install the source-specific client library and write a `fetchRows()` function that returns **flat key-value objects** — each row is a plain object whose keys match the `sourceField` names you'll use in the mapping (Step 5).

See the template files for source-specific fetch patterns:

- **Salesforce**: See `templates/salesforce.md`
- **HubSpot**: See `templates/hubspot.md`
- **Postgres/MySQL**: See `templates/postgres.md`

Example output shape (keys match CRM field names):
```typescript
const rows = [
    { email: 'john@acme.com', firstname: 'John', lastname: 'Smith', phone: '+1-555-0123', company: 'Acme Corp', notes: 'VP of Sales, interested in enterprise plan...' },
    { email: 'jane@techstart.com', firstname: 'Jane', lastname: 'Doe', phone: null, company: 'TechStart', notes: 'CTO, needs 99.9% uptime SLA...' },
];
```

**Important:** The row keys must exactly match the `sourceField` values in the mapping. Do not transform the data — pass the raw CRM field values.

### Step 4: Discover collections

Before building the property mapping, fetch the available collections from the user's account:

```typescript
const collections = await client.collections.list();
for (const col of collections.data?.actions || []) {
    console.log(`${col.payload.collectionId} — ${col.payload.collectionName}`);
}
```

Use the actual `collectionId` and `collectionName` values from this output in the mapping below. Do **not** use placeholder IDs.

### Step 5: Build the property mapping

Define which source fields map to which Personize properties, and which should have AI extraction. Use `extractMemories: true` for unstructured content. See the "`extractMemories` Flag" section above.

```typescript
import { BatchMemorizeMapping } from '@personize/sdk';

const mapping: BatchMemorizeMapping = {
    entityType: 'contact',
    email: 'email',          // source field containing email
    website: 'website',      // source field containing website URL
    runName: `crm-sync-${Date.now()}`,
    properties: {
        // Structured fields — stored directly (use collectionId from Step 4)
        email:      { sourceField: 'email',     collectionId: 'col_YOUR_STANDARD', collectionName: 'Contacts Standard Schema' },
        first_name: { sourceField: 'firstname', collectionId: 'col_YOUR_STANDARD', collectionName: 'Contacts Standard Schema' },
        last_name:  { sourceField: 'lastname',  collectionId: 'col_YOUR_STANDARD', collectionName: 'Contacts Standard Schema' },
        company:    { sourceField: 'company',   collectionId: 'col_YOUR_STANDARD', collectionName: 'Contacts Standard Schema' },
        // Unstructured fields — AI extraction + vectors
        notes: {
            sourceField: 'notes',
            collectionId: 'col_YOUR_GENERATED',
            collectionName: 'Generated Content',
            extractMemories: true,
        },
    },
};
```

**Important:** Replace `col_YOUR_STANDARD` and `col_YOUR_GENERATED` with the actual `collectionId` values from Step 4. The `sourceField` values must match the keys in your row objects from Step 3.

### Step 6: Batch sync with rate-limit awareness

Send rows through `memorizeBatch()`. The API handles both structured storage and AI extraction in a single call based on each property's `extractMemories` flag.

```typescript
async function batchSync(rows: Record<string, any>[], mapping: BatchMemorizeMapping, batchSize: number) {
    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);

        try {
            const result = await client.memory.memorizeBatch({
                source: 'CRM Sync',
                mapping,
                rows: batch,
                chunkSize: 1,
            });

            console.log(`Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} rows — success: ${result.success}`);
        } catch (err: any) {
            if (err?.response?.status === 429) {
                const retryAfter = err.response.data?.retryAfterSeconds || 60;
                console.log(`Rate limited. Waiting ${retryAfter}s...`);
                await new Promise(r => setTimeout(r, retryAfter * 1000));
                i -= batchSize; // retry this batch
                continue;
            }
            throw err;
        }

        // Wait for rate limit window to reset before next batch
        if (i + batchSize < rows.length) {
            console.log('Waiting 62s for rate limit window...');
            await new Promise(r => setTimeout(r, 62_000));
        }
    }
}
```

### Step 7: Verify with export or recall

After syncing, verify the data landed correctly:

```typescript
// Semantic recall — find a specific record
const result = await client.memory.recall({
    query: 'What do we know about John Smith?',
    limit: 5,
});
console.log(result.data);

// Filter export — list all synced records
const exported = await client.memory.export({
    type: 'Contact',
    returnRecords: true,
    pageSize: 10,
});
console.log(`Found ${exported.data?.totalMatched} records`);
```

### Step 8: Deploy as a scheduled job

Add build scripts to `package.json`:
```json
{
    "scripts": {
        "build": "tsc",
        "sync": "node dist/sync.js",
        "sync:dev": "npx ts-node src/sync.ts"
    }
}
```

See the `deploy/` folder for deployment configs:
- **Render**: Use `deploy/render.yaml` — cron service with schedule
- **GitHub Actions**: Use `deploy/github-action.yml` — cron workflow
- **Docker**: Use `deploy/Dockerfile` — for any container platform

---

## Rate Limit Handling

When a rate limit is hit, the API returns HTTP 429:

```json
{
    "success": false,
    "error": "rate_limit_exceeded",
    "message": "Per-minute limit reached (60/min). Retry after 60 seconds.",
    "limit": 60,
    "current": 60,
    "window": "per_minute",
    "retryAfterSeconds": 60
}
```

Handle 429 errors with retry logic:

```typescript
async function memorizeWithRetry(data: any, maxRetries = 3) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await client.memory.memorize(data);
        } catch (err: any) {
            if (err?.response?.status === 429) {
                const retryAfter = err.response.data?.retryAfterSeconds || 60;
                console.log(`Rate limited. Retrying in ${retryAfter}s (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(r => setTimeout(r, retryAfter * 1000));
            } else {
                throw err;
            }
        }
    }
    throw new Error('Max retries exceeded');
}
```

### Plan limits reference

| Plan | Per Minute | Per Month |
|---|---|---|
| Free | 60 | 10,000 |
| Starter | 120 | 50,000 |
| Pro | 300 | 250,000 |
| Enterprise | 1,000 | 2,000,000 |

Always call `client.me()` first to get the actual limits for the user's plan.

---

## Advanced Patterns

For incremental sync, adding multiple sync sources, batch export/recall with filter operators, a complete end-to-end example script, and using memories via MCP — see [reference/advanced-patterns.md](reference/advanced-patterns.md).
