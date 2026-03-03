# Advanced Patterns

## Incremental Sync Pattern

Avoid re-syncing all records every run. Track the last sync timestamp:

```typescript
import * as fs from 'fs';

const STATE_FILE = '.sync-state.json';

function loadState(): { lastSyncedAt?: string } {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); }
    catch { return {}; }
}

function saveState(state: { lastSyncedAt: string }) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// In your fetchRecords function, filter by lastModifiedDate > lastSyncedAt
const state = loadState();
const records = await fetchRecords({ modifiedAfter: state.lastSyncedAt });
// ... sync records ...
saveState({ lastSyncedAt: new Date().toISOString() });
```

Add `.sync-state.json` to `.gitignore`.

---

## Adding More Syncs

Each source should be its own file: `src/sync-<source>.ts`. They all share the same `src/personize.ts` client.

```
src/
├── personize.ts              # shared Personize client
├── sync-hubspot-contacts.ts  # HubSpot contacts sync
├── sync-hubspot-deals.ts     # HubSpot deals sync
├── sync-salesforce.ts        # Salesforce sync
└── sync-postgres-users.ts    # Postgres users sync
```

Create a `src/sync-all.ts` entry point that runs them sequentially or in parallel:

```typescript
import './sync-hubspot-contacts';
import './sync-salesforce';
```

---

## Batch Export / Recall

Use `client.memory.search()` to query memorized data back out with filter conditions:

```typescript
// Find all contacts at a specific company
const results = await client.memory.search({
    groups: [{
        id: 'g1',
        logic: 'AND',
        conditions: [
            { field: 'Company', operator: 'EQ', value: 'Acme Corp' },
        ],
    }],
    type: 'Contact',
    returnRecords: true,
    pageSize: 50,
});

// Paginate through results
let page = 1;
let allRecords: any[] = [];
while (true) {
    const res = await client.memory.search({ ...opts, page });
    allRecords.push(...(res.data?.recordIds || []));
    if (page >= (res.data?.totalPages || 1)) break;
    page++;
}
```

### Filter operators

| Operator | Description |
|---|---|
| `EQ` | Equals |
| `NEQ` | Not equals |
| `CONTAINS` | Contains substring |
| `GT` / `LT` | Greater / less than |
| `GTE` / `LTE` | Greater/less than or equal |
| `IS_SET` | Field has a value |
| `IS_NOT_SET` | Field is empty |
| `IN` | Value in array |

---

## Complete Example: `src/sync.ts`

A full end-to-end sync script combining all steps. Copy and adapt for your source system.

```typescript
import { Personize, BatchMemorizeMapping } from '@personize/sdk';
import 'dotenv/config';
import * as fs from 'fs';

// --- Config ---
const STATE_FILE = '.sync-state.json';

function loadState(): { lastSyncedAt?: string } {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); }
    catch { return {}; }
}
function saveState(state: { lastSyncedAt: string }) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// --- Main ---
async function main() {
    const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

    // Step 2: Verify auth + read rate limits
    const { data: me } = await client.me();
    if (!me) throw new Error('Auth failed — check PERSONIZE_SECRET_KEY');
    const perMinute = me.plan.limits.maxApiCallsPerMinute;
    const batchSize = Math.floor(perMinute * 0.9);
    console.log(`Plan: ${me.plan.name} — ${perMinute}/min`);

    // Step 4: Discover collections
    const collections = await client.collections.list();
    const cols = collections.data?.actions || [];
    console.log(`Collections: ${cols.map(c => c.payload.collectionId).join(', ')}`);
    // Use the actual IDs below — these are examples:
    const stdCol = cols[0]?.payload.collectionId || 'col_standard';
    const stdColName = cols[0]?.payload.collectionName || 'Contacts Standard Schema';
    const genCol = cols[1]?.payload.collectionId || 'col_generated';
    const genColName = cols[1]?.payload.collectionName || 'Generated Content';

    // Step 5: Build mapping
    const mapping: BatchMemorizeMapping = {
        entityType: 'contact',
        email: 'email',
        runName: `crm-sync-${Date.now()}`,
        properties: {
            email:      { sourceField: 'email',      collectionId: stdCol, collectionName: stdColName },
            first_name: { sourceField: 'firstname',  collectionId: stdCol, collectionName: stdColName },
            last_name:  { sourceField: 'lastname',   collectionId: stdCol, collectionName: stdColName },
            company:    { sourceField: 'company',    collectionId: stdCol, collectionName: stdColName },
            phone:      { sourceField: 'phone',      collectionId: stdCol, collectionName: stdColName },
            notes: {
                sourceField: 'notes',
                collectionId: genCol,
                collectionName: genColName,
                extractMemories: true,
            },
        },
    };

    // Step 3: Fetch rows from your source (replace with your actual fetch function)
    const state = loadState();
    const rows = await fetchRows(state.lastSyncedAt);
    console.log(`Fetched ${rows.length} rows${state.lastSyncedAt ? ` (modified after ${state.lastSyncedAt})` : ''}`);

    if (rows.length === 0) {
        console.log('Nothing to sync.');
        return;
    }

    // Step 6: Batch sync with rate-limit awareness
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

        if (i + batchSize < rows.length) {
            console.log('Waiting 62s for rate limit window...');
            await new Promise(r => setTimeout(r, 62_000));
        }
    }

    // Save sync state
    saveState({ lastSyncedAt: new Date().toISOString() });

    // Step 7: Verify
    const exported = await client.memory.search({ type: 'Contact', returnRecords: true, pageSize: 5 });
    console.log(`\nVerification: ${exported.data?.totalMatched} total records in Personize`);
    console.log('Done!');
}

// --- Replace this with your actual data source ---
async function fetchRows(modifiedAfter?: string): Promise<Record<string, any>[]> {
    // Example: return hardcoded rows for testing
    return [
        { email: 'john@acme.com', firstname: 'John', lastname: 'Smith', company: 'Acme Corp', phone: '+1-555-0123', notes: 'VP of Sales, interested in enterprise plan' },
        { email: 'jane@techstart.com', firstname: 'Jane', lastname: 'Doe', company: 'TechStart', phone: null, notes: 'CTO, needs 99.9% uptime SLA' },
    ];
}

main().catch(err => {
    console.error('Fatal:', err.message || err);
    process.exit(1);
});
```

---

## Using Memories via MCP

After syncing, the user's AI tools (ChatGPT, Claude, Cursor) can access the data through the Personize MCP server — no extra code needed. The MCP tools `memory_store_pro` and `memory_recall_pro` query the same RAG store that memorized data is written to. Upserted (structured) data is available through export and filter queries.
