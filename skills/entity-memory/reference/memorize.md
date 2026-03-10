# Reference: Memorize

Complete guide to storing data in Personize memory — method signatures, decision trees, source-specific recipes, batch strategies, error handling, and the feedback loop.

---

## Method Overview

| Method | When | AI Extraction | Batch |
|---|---|---|---|
| `memory.memorize()` | Rich text — notes, transcripts, emails | Yes (`enhanced: true`) | No |
| `memory.memorizeBatch()` | CRM/DB sync — per-property control | Per-property (`extractMemories` flag) | Yes |

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
    type?: string;             // Entity type (e.g. 'Contact', 'Student', 'Webpage')
    customKeyName?: string;    // Custom key name (e.g. 'studentNumber', 'linkedinUrl')
    customKeyValue?: string;   // Custom key value (e.g. 'S-2024-1234')
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
4. `customKeyName` + `customKeyValue` — match by any domain-specific identifier
5. No identifier — creates an orphan memory (avoid this)

**Always provide at least one identifier.** Orphan memories are harder to retrieve and won't appear in `smartDigest`.

### Custom Keys — Bring Your Own Identifier

Use `customKeyName` and `customKeyValue` when `email` or `website_url` don't apply to your entity type. The recordId is generated deterministically from `orgId + type + key` — same key always resolves to the same record. No registration or entity type setup required.

```typescript
// Student identified by student number
await client.memory.memorize({
    content: 'Enrolled in Advanced AI. GPA 3.8, Dean\'s List.',
    type: 'Student',
    customKeyName: 'studentNumber',
    customKeyValue: 'S-2024-1234',
    enhanced: true,
});

// Person identified by LinkedIn URL
await client.memory.memorize({
    content: 'VP of Engineering at Acme Corp. Focus on AI/ML infrastructure.',
    type: 'Person',
    customKeyName: 'linkedinUrl',
    customKeyValue: 'https://linkedin.com/in/johndoe',
    enhanced: true,
});

// Web page identified by URL
await client.memory.memorize({
    content: pageContent,
    type: 'Webpage',
    customKeyName: 'pageUrl',
    customKeyValue: 'https://docs.example.com/api/authentication',
    enhanced: true,
});

// Recall by the same custom key
const result = await client.memory.smartRecall({
    query: 'What courses is this student taking?',
    type: 'Student',
    customKeyName: 'studentNumber',
    customKeyValue: 'S-2024-1234',
    fast_mode: true,
});
```

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
        entityType: string;    // Entity type: 'contact', 'company', or any custom type ('Student', 'Product', 'Webpage', ...)
        // Identifier fields — value is the key name in your row objects
        // e.g., email: 'email' → look for row['email'] as the contact identifier
        // e.g., email: 'email_address' → look for row['email_address'] instead
        // Use email for Contact records, website for Company records, or recordId for direct ID.
        // For custom entity types, use customKeyName + customKey instead.
        email?: string;        // Source field name for email (key name in each row)
        website?: string;      // Source field name for website (key name in each row)
        recordId?: string;     // Source field name for record ID (key name in each row)
        customKeyName?: string; // The identifier name for custom types (e.g. 'studentNumber', 'sku', 'linkedinUrl')
        customKey?: string;     // Source field name in each row holding the custom key value (e.g. 'student_id')
        runName?: string;      // Tracking label for this sync run
        properties: Record<string, {
            sourceField: string;       // Key name in row data (e.g., 'firstname', 'notes')
            collectionId: string;      // Target collection ID
            collectionName: string;    // Target collection name
            extractMemories?: boolean; // Default: false. Set true on rich text fields for AI extraction + vectors.
        }>;
    };
    rows: Record<string, unknown>[]; // Source data rows
    dryRun?: boolean;          // Validate without writing (default: false)
    chunkSize?: number;        // Rows per chunk (default: 1)
}
```

### The `extractMemories` Decision Tree

`extractMemories` defaults to **`false`**. You **must** set `extractMemories: true` on rich text fields to get AI extraction and semantic search. Without it, data is stored as structured properties only — no memories, no vectors.

```
Is the value free-form text (notes, transcripts, emails, descriptions)?
  → extractMemories: true  ← YOU MUST SET THIS or no memories are created

Is the value structured data (email, name, ID, count, date, flag)?
  → extractMemories: false (default — already structured, no AI needed)
```

| Data Type | `extractMemories` | Example |
|---|---|---|
| Call notes, descriptions | **`true`** (set explicitly) | `"Discussed budget concerns..."` |
| Email body, transcripts | **`true`** (set explicitly) | `"Hi Sarah, following up on..."` |
| AI-generated summaries | **`true`** (set explicitly) | `"Key takeaway: they need SOC2..."` |
| Email, name, phone | `false` (default) | `john@acme.com`, `John Doe` |
| Job title, company name | `false` (default) | `VP of Sales`, `Acme Corp` |
| Plan tier, status, stage | `false` (default) | `enterprise`, `active`, `qualified` |
| Dates, counts, amounts | `false` (default) | `2025-01-15`, `42`, `$50,000` |

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
        email: 'email',           // 'email' = the key name in each row object (row.email)
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

## Structured Storage Without AI

For exact key-value pairs where you don't need AI extraction (email, plan tier, login count), use `memorizeBatch()` with `extractMemories: false` on the property mapping. See the `memorizeBatch()` section above for full details and examples.
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

## Extraction Hints — Ensure Completeness for Identity Fields

Personize extraction shows high precision across a wide range of content types (see our [white paper](https://www.personize.ai/white-paper) for benchmark results). The property selector uses embedding similarity to pick the most relevant schema properties for each piece of content — and it works well. This isn't about fixing accuracy. It's about **ensuring completeness** for identity and demographic fields.

Properties like first name, company name, job title, and location are **always worth capturing** when mentioned — but they're content-agnostic. A call transcript about SOC2 compliance naturally matches properties like "pain points" or "security requirements" with high similarity, but "first name" scores low because it matches *everything* weakly. The property selector still picks 15+ properties based on the content — this pattern just makes sure identity fields are in that mix.

### The Pattern: Prepend Extraction Hints

Prepend a short line to your `content` listing the identity/demographic properties you want captured. This doesn't limit the selector — it still picks all content-relevant properties. The hint just ensures the fields you always care about are included.

```typescript
// Call transcript — ensure identity fields are captured alongside content-relevant ones
await client.memory.memorize({
    content: `Also extract First Name, Last Name, Company Name, and Job Title if mentioned.\n\n${callTranscript}`,
    email: 'sarah.chen@initech.com',
    enhanced: true,
    tags: ['call-notes', 'source:fireflies'],
});
```

**Why this works (two effects):**
1. **Selection boost** — the content embedding now includes "first name", "company name" tokens, increasing cosine similarity with those property definitions so they get selected alongside the 15+ content-relevant properties
2. **Extraction boost** — the LLM sees an explicit instruction in the content itself, reinforcing extraction of those fields

**Best practices:**
- **Keep hints short** — just property names, not descriptions. Content is truncated to 1000 words for property selection; long prefixes eat into actual content.
- **Only hint identity/demographic fields** — the selector already does a great job on content-relevant properties. Hint only for fields that are always worth checking: name, company, title, location, email, phone.
- **Best used when fields may be empty** — if you already have someone's name stored, the hint is harmless but unnecessary. The biggest value is on first memorization for a record.

### When to Use Hints vs. When Not To

| Scenario | Use Hints? | Why |
|---|---|---|
| First memorization for a new contact | **Yes** | Identity fields are empty — maximize capture |
| Ongoing call notes for a known contact | **Optional** | Identity is already stored; selector handles content-relevant props |
| Batch sync from CRM with `memorizeBatch()` | **No** | Identity fields come as structured data (`extractMemories: false`) |
| Webhook with raw transcript/email body | **Yes** | Fresh content, identity might be mentioned |
| Storing AI-generated output (feedback loop) | **No** | You control the content; identity is already known |

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
