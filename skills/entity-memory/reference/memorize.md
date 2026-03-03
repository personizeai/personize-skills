# Reference: Memorize

Complete guide to storing data in Personize memory — method signatures, decision trees, source-specific recipes, batch strategies, error handling, and the feedback loop.

---

## Method Overview

| Method | When | AI Extraction | Batch |
|---|---|---|---|
| `memory.memorize()` | Rich text — notes, transcripts, emails | Yes (`enhanced: true`) | No |
| `memory.memorizeBatch()` | CRM/DB sync — per-property control | Per-property | Yes |
| `memory.upsert()` | Structured key-value pairs | No | No |
| `memory.upsertBatch()` | Multiple structured items | No | Yes |

---

## `memory.memorize()` — Single Item with AI Extraction

Best for: call notes, support tickets, email threads, meeting transcripts, any free-form text where AI should extract facts and create vector embeddings.

### Full Signature

```typescript
interface MemorizeProOptions {
    content: string;           // The text to memorize (required)
    speaker?: string;          // Who said/wrote it
    timestamp?: string;        // When it happened (ISO 8601)
    email?: string;            // Match to contact by email
    website_url?: string;      // Match to company by website
    record_id?: string;        // Match to record by ID
    enhanced?: boolean;        // Enable AI extraction (default: false)
    tags?: string[];           // Categorization tags
    max_properties?: number;   // Max properties to extract
    schema?: Record<string, unknown>; // Extraction schema hint
    actionId?: string;         // Target collection ID
}
```

### Entity Matching Priority

The system resolves the target record in this order:

1. `record_id` — exact match (fastest, most reliable)
2. `email` — match to Contact record
3. `website_url` — match to Company record
4. No identifier — creates an orphan memory (avoid this)

**Always provide at least one identifier.** Orphan memories are harder to retrieve and won't appear in `smartDigest`.

### Examples

```typescript
// Call notes — AI extracts facts about the contact
await client.memory.memorize({
    content: 'Call with Sarah Chen (VP Eng, Initech). She mentioned they are evaluating SOC2 compliance tools. Main pain point: manual audit prep taking 2 weeks per quarter. Budget approved for Q2.',
    speaker: 'Sales Team',
    email: 'sarah.chen@initech.com',
    enhanced: true,
    tags: ['call-notes', 'sales', 'source:manual'],
});

// Support ticket — AI extracts technical details
await client.memory.memorize({
    content: 'Customer reported CSV imports failing for files > 50MB. Error: timeout after 30s. They process 200k-row files weekly. Workaround: split into 50k chunks. Escalated to engineering.',
    speaker: 'Support Agent',
    email: 'sarah.chen@initech.com',
    enhanced: true,
    tags: ['support-ticket', 'bug', 'source:zendesk'],
    timestamp: new Date().toISOString(),
});

// AI-generated email — store your own output (feedback loop)
await client.memory.memorize({
    content: emailBody,
    speaker: 'AI Agent',
    email: 'sarah.chen@initech.com',
    enhanced: true,
    tags: ['ai-output', 'email', 'type:cold-outreach'],
});

// Using a schema hint to guide extraction
await client.memory.memorize({
    content: meetingTranscript,
    email: 'sarah.chen@initech.com',
    enhanced: true,
    schema: {
        pain_points: 'List of pain points mentioned',
        budget: 'Budget amount or status',
        timeline: 'Decision timeline',
        competitors: 'Competitor products mentioned',
    },
    tags: ['meeting-transcript', 'source:fireflies'],
});
```

---

## `memory.memorizeBatch()` — Batch Sync from CRM/DB

Best for: syncing data from HubSpot, Salesforce, databases, or any system with multiple records and mixed data types. The key feature is **per-property `extractMemories` control**.

### Full Signature

```typescript
interface BatchMemorizeOptions {
    source: string;            // Source system label ('Hubspot', 'Salesforce')
    mapping: {
        entityType: string;    // 'contact', 'company'
        email?: string;        // Source field name for email (e.g., 'email')
        website?: string;      // Source field name for website (e.g., 'company_website_url')
        runName?: string;      // Tracking label for this sync run
        properties: Record<string, {
            sourceField: string;       // Source field name in row data
            collectionId: string;      // Target collection ID
            collectionName: string;    // Target collection name
            extractMemories?: boolean; // AI extraction for this property
        }>;
    };
    rows: Record<string, unknown>[]; // Source data rows
    dryRun?: boolean;          // Validate without writing (default: false)
    chunkSize?: number;        // Rows per chunk (default: 1)
}
```

### The `extractMemories` Decision Tree

This is the most important decision for every property:

```
Is the value structured data (email, name, ID, count, date, flag)?
  → extractMemories: false (already structured, no AI needed)

Is the value free-form text that needs interpretation?
  → extractMemories: true (AI extracts facts + creates vectors)

Is the value an AI-generated output you want to remember?
  → extractMemories: true (enables the feedback loop)

Is the value a URL, binary flag, or machine-generated ID?
  → extractMemories: false (no semantic content)
```

| Data Type | `extractMemories` | Example |
|---|---|---|
| Email, name, phone | `false` | `john@acme.com`, `John Doe` |
| Job title, company name | `false` | `VP of Sales`, `Acme Corp` |
| Plan tier, status, stage | `false` | `enterprise`, `active`, `qualified` |
| Dates, counts, amounts | `false` | `2025-01-15`, `42`, `$50,000` |
| Call notes, descriptions | `true` | `"Discussed budget concerns..."` |
| Email body, transcripts | `true` | `"Hi Sarah, following up on..."` |
| AI-generated summaries | `true` | `"Key takeaway: they need SOC2..."` |

### Source-Specific Recipes

#### HubSpot Contacts

```typescript
// Fetch collections first to get IDs
const collections = await client.collections.list();
const contactsCol = collections.data?.actions?.find(
    c => c.payload.collectionName === 'Contacts'
);
const colId = contactsCol?.payload?.collectionId || 'col_xxx';

await client.memory.memorizeBatch({
    source: 'Hubspot',
    mapping: {
        entityType: 'contact',
        email: 'email',
        runName: `hubspot-contact-sync-${Date.now()}`,
        properties: {
            full_name:       { sourceField: 'firstname',     collectionId: colId, collectionName: 'Contacts', extractMemories: false },
            last_name:       { sourceField: 'lastname',      collectionId: colId, collectionName: 'Contacts', extractMemories: false },
            job_title:       { sourceField: 'jobtitle',      collectionId: colId, collectionName: 'Contacts', extractMemories: false },
            company:         { sourceField: 'company',       collectionId: colId, collectionName: 'Contacts', extractMemories: false },
            lifecycle_stage: { sourceField: 'lifecyclestage', collectionId: colId, collectionName: 'Contacts', extractMemories: false },
            last_notes:      { sourceField: 'notes_last_updated', collectionId: colId, collectionName: 'Contacts', extractMemories: true },
        },
    },
    rows: hubspotContacts,
});
```

#### Salesforce Accounts

```typescript
await client.memory.memorizeBatch({
    source: 'Salesforce',
    mapping: {
        entityType: 'company',
        website: 'Website',
        runName: `sfdc-account-sync-${Date.now()}`,
        properties: {
            company_name: { sourceField: 'Name',        collectionId: colId, collectionName: 'Companies', extractMemories: false },
            industry:     { sourceField: 'Industry',    collectionId: colId, collectionName: 'Companies', extractMemories: false },
            employee_count: { sourceField: 'NumberOfEmployees', collectionId: colId, collectionName: 'Companies', extractMemories: false },
            annual_revenue: { sourceField: 'AnnualRevenue',    collectionId: colId, collectionName: 'Companies', extractMemories: false },
            description:  { sourceField: 'Description', collectionId: colId, collectionName: 'Companies', extractMemories: true },
        },
    },
    rows: salesforceAccounts,
});
```

#### Database / CSV Import

```typescript
import * as fs from 'fs';
import * as csv from 'csv-parse/sync';

const raw = fs.readFileSync('contacts.csv', 'utf-8');
const rows = csv.parse(raw, { columns: true });

await client.memory.memorizeBatch({
    source: 'CSV Import',
    mapping: {
        entityType: 'contact',
        email: 'email_address',
        runName: `csv-import-${Date.now()}`,
        properties: {
            full_name:  { sourceField: 'name',    collectionId: colId, collectionName: 'Contacts', extractMemories: false },
            department: { sourceField: 'dept',    collectionId: colId, collectionName: 'Contacts', extractMemories: false },
            bio:        { sourceField: 'bio',     collectionId: colId, collectionName: 'Contacts', extractMemories: true },
        },
    },
    rows,
    chunkSize: 10,
});
```

#### Webhook Data (Real-Time)

```typescript
// In your webhook handler (Express, Fastify, etc.)
app.post('/webhooks/intercom', async (req, res) => {
    const event = req.body;

    if (event.type === 'conversation.closed') {
        await client.memory.memorize({
            content: event.conversation_parts.map((p: any) => p.body).join('\n'),
            speaker: event.assignee?.name || 'Support Agent',
            email: event.user?.email,
            enhanced: true,
            tags: ['support', 'intercom', 'conversation-closed'],
            timestamp: new Date(event.created_at * 1000).toISOString(),
        });
    }

    res.sendStatus(200);
});
```

---

## `memory.upsert()` — Structured Storage (No AI)

Best for: exact key-value pairs where you don't need AI extraction — email, plan tier, login count, last activity date.

### Full Signature

```typescript
interface UpsertOptions {
    type: string;              // Entity type ('Contact', 'Company')
    properties: Record<string, {
        value: PropertyValue;          // string | number | boolean | null
        collectionId?: string;
        collectionName?: string;
    }>;
    matchKeys?: {
        email?: string;
        websiteUrl?: string;
    };
    source?: string;           // Source label ('CRM Sync', 'Webhook')
}
```

### Example

```typescript
await client.memory.upsert({
    type: 'Contact',
    matchKeys: { email: 'sarah.chen@initech.com' },
    properties: {
        plan_tier:    { value: 'enterprise', collectionId: 'col_xxx', collectionName: 'Contacts' },
        login_count:  { value: 42,           collectionId: 'col_xxx', collectionName: 'Contacts' },
        last_login:   { value: '2025-02-10', collectionId: 'col_xxx', collectionName: 'Contacts' },
        is_champion:  { value: true,         collectionId: 'col_xxx', collectionName: 'Contacts' },
    },
    source: 'Product Analytics',
});
```

---

## `memory.upsertBatch()` — Batch Structured Storage

Best for: storing multiple structured items for the same record at once.

### Full Signature

```typescript
interface UpsertBatchOptions {
    type: string;              // Entity type
    memories: Array<{
        memoryName: string;
        result: PropertyValue | Record<string, unknown>;
        collection?: string;
        collectionId?: string;
    }>;
    email?: string;
    websiteUrl?: string;
    source?: string;
}
```

### Example

```typescript
await client.memory.upsertBatch({
    type: 'Contact',
    email: 'sarah.chen@initech.com',
    source: 'Enrichment Service',
    memories: [
        { memoryName: 'linkedin_url', result: 'https://linkedin.com/in/sarahchen', collectionId: 'col_xxx' },
        { memoryName: 'company_size', result: '500-1000',                          collectionId: 'col_xxx' },
        { memoryName: 'funding_stage', result: 'Series B',                         collectionId: 'col_xxx' },
    ],
});
```

---

## Batch Strategies

### Chunk Size

- `chunkSize: 1` (default) — safest, one record at a time. Use for first sync or when data quality is uncertain.
- `chunkSize: 5-10` — good for recurring syncs with clean data.
- `chunkSize: 50+` — use with caution, only for high-volume structured data with `extractMemories: false` on all properties.

### Dry Run

Always run `dryRun: true` before the first real sync:

```typescript
const result = await client.memory.memorizeBatch({
    ...options,
    dryRun: true,
});
console.log('Dry run result:', result);
// Check for errors before running for real
```

### Pre-Flight Validation

```typescript
// 1. Verify auth and plan limits
const me = await client.me();
console.log('Plan:', me.data?.plan?.name);
console.log('API calls/month:', me.data?.plan?.limits?.maxApiCallsPerMonth);

// 2. Verify collections exist
const collections = await client.collections.list();
console.log('Available collections:', collections.data?.actions?.map(c => c.payload.collectionName));

// 3. Dry run first
const dryResult = await client.memory.memorizeBatch({ ...options, dryRun: true });

// 4. Real sync
const result = await client.memory.memorizeBatch(options);
```

---

## Error Handling

The SDK retries automatically on 429 (rate limit) and 5xx errors with exponential backoff. For batch operations, handle errors per-chunk:

```typescript
const CHUNK_SIZE = 10;
const rows = allRows;

for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    try {
        await client.memory.memorizeBatch({
            source: 'CRM',
            mapping,
            rows: chunk,
        });
        console.log(`Synced rows ${i + 1}-${i + chunk.length}`);
    } catch (err: any) {
        console.error(`Failed on rows ${i + 1}-${i + chunk.length}:`, err.message);
        // Log failed chunk for retry, don't stop the whole sync
    }
}
```

---

## The Feedback Loop

One of the most powerful patterns: **store AI-generated outputs back into memory** so the AI knows what it already said or did.

```
User data → memorize() → Memory → recall()/smartDigest() → AI generates output → memorize() output → Memory
                                                                    ↑                                    │
                                                                    └────────────────────────────────────┘
```

### Why This Matters

- **No duplicate emails** — AI checks if it already emailed this contact
- **Consistent messaging** — AI sees what tone/angle was used before
- **Learning from outcomes** — store engagement results alongside the original output
- **Audit trail** — everything the AI did is recorded

### Example

```typescript
// 1. Generate an email using memory context
const context = await client.memory.smartDigest({
    email: 'sarah.chen@initech.com',
    type: 'Contact',
    token_budget: 2000,
    include_properties: true,
    include_memories: true,
});

const emailBody = await generateEmail(context.data?.compiledContext);

// 2. Store the generated email back into memory
await client.memory.memorize({
    content: `Subject: ${subject}\n\n${emailBody}`,
    speaker: 'AI Agent',
    email: 'sarah.chen@initech.com',
    enhanced: true,
    tags: ['ai-output', 'email', 'type:follow-up'],
    timestamp: new Date().toISOString(),
});
```

---

## Tagging Best Practices

Tags enable filtering on recall. Use a consistent scheme:

| Prefix | Purpose | Examples |
|---|---|---|
| `source:` | Where the data came from | `source:hubspot`, `source:zendesk`, `source:manual` |
| `type:` | What kind of data | `type:interaction`, `type:profile`, `type:ai-output` |
| `team:` | Who owns it | `team:sales`, `team:support`, `team:engineering` |
| No prefix | General category | `call-notes`, `support-ticket`, `meeting` |

```typescript
tags: ['source:hubspot', 'type:interaction', 'team:sales', 'call-notes']
```
