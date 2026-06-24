# Personize CRM Passthrough — Reference

> **API surface:** CRM passthrough currently lives on **`/api/v1/crm/{provider}/passthrough`** only — v1.1 does not yet expose a CRM surface (`src/modules/api/api.v1_1.router.ts` has no `crm` mount). The v1 path continues to be the canonical surface until v1.1 catches up; the `/api/v1/*` deprecation sunset (2026-07-15) does **not** apply to CRM passthrough.
>
> **Tested against:** `@personize/sdk@0.12.0` (`client.hubspot.*`, `client.salesforce.*`, `client.hubspot.request`, `client.salesforce.request`) and `@personize/cli@0.5.0`. All typed wrappers return `CrmPassthroughResult<T>` = `{ status, headers, body, meta: { provider, durationMs, rateLimit? } }`.

Call HubSpot and Salesforce REST APIs through Personize using your org's connected integration. You authenticate once with your Personize key — Personize resolves the OAuth token, refreshes it, and forwards your request to the CRM.

**You need zero CRM credentials in your scripts.** Connect HubSpot or Salesforce once in the Personize dashboard (Integrations → Connect), then use your `sk_live_` key for everything.

---

## When This Is Activated

Use when the developer wants to:
- Fetch contacts, companies, deals, tasks, or notes from HubSpot
- Create or update CRM records (contacts, deals, tasks, notes, accounts, leads)
- Run a SOQL query against Salesforce
- Automate CRM workflows without managing OAuth tokens
- Write scripts that interact with HubSpot or Salesforce using the Personize SDK or CLI

**Not this skill if:**
- Developer wants to sync CRM data into Personize memory → use **memory.memorizeBatch**
- Developer wants to set up a recurring data pipeline → use **personize-code** (Trigger.dev)
- Developer wants a no-code workflow → use **personize-code** (n8n)

---

## How It Works

```
Your script  →  POST /api/v1/crm/{provider}/passthrough  →  Personize backend
                 { method, path, query?, body? }              ↓
                                                    Resolves org's OAuth token
                                                              ↓
                                                    Forwards to HubSpot / Salesforce
                                                              ↓
                 { status, headers, body, meta }  ←  Returns provider response
```

**Key properties:**
- Org isolation: the Personize key determines which CRM connection is used. No cross-org access possible.
- Provider tokens never leave the backend — your script never sees OAuth credentials.
- HubSpot: uses native OAuth connection. Salesforce: uses Nango-managed connection.
- Upstream rate-limit headers are forwarded back so your script can react to them.

---

## Setup

```bash
npm install @personize/sdk
```

```typescript
import { Personize } from '@personize/sdk';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
```

Set env var:
```
PERSONIZE_SECRET_KEY=sk_live_...
```

Connect your CRM once at **personize.ai → Integrations → Connect**.

---

## HubSpot

### Typed wrappers (recommended)

```typescript
// List contacts
const page = await client.hubspot.contacts.list({ limit: 10, properties: ['email', 'firstname', 'lastname'] });
for (const contact of page.body.results) {
  console.log(contact.properties.email);
}

// Get a contact by ID
const contact = await client.hubspot.contacts.get('123', ['email', 'firstname']);

// Find by email
const match = await client.hubspot.contacts.searchByEmail('jane@example.com');

// Create a contact
const created = await client.hubspot.contacts.create({
  email: 'jane@example.com',
  firstname: 'Jane',
  lastname: 'Smith',
  company: 'Acme',
});

// Update a contact
await client.hubspot.contacts.update('123', { jobtitle: 'VP Sales' });

// List deals
const deals = await client.hubspot.deals.list({ limit: 25, properties: ['dealname', 'amount', 'dealstage'] });

// Create a task
await client.hubspot.tasks.create({
  subject: 'Follow up on pricing call',
  body: 'Discussed enterprise tier. Send proposal by Friday.',
  dueAt: new Date('2026-06-01'),
  status: 'NOT_STARTED',
});

// Create a note
await client.hubspot.notes.create({ body: 'Called, left voicemail. Will retry tomorrow.' });
```

### Raw passthrough (any HubSpot endpoint)

```typescript
// Call any HubSpot REST path not yet covered by typed wrappers
const owners = await client.hubspot.request({
  method: 'GET',
  path: '/owners/v2/owners',
});

// Paginate all deals
let after: string | undefined;
do {
  const page = await client.hubspot.deals.list({ limit: 100, after });
  for (const deal of page.body.results) processDeal(deal);
  after = page.body.paging?.next?.after;
} while (after);
```

### HubSpot path allowlist

Requests are restricted to these path prefixes (SSRF protection):
`/crm/`, `/marketing/`, `/cms/`, `/automation/`, `/files/`, `/communication-preferences/`, `/properties/`, `/owners/`, `/oauth/`

---

## Salesforce

### SOQL query

```typescript
// Single page
const result = await client.salesforce.query<{ Id: string; Name: string }>(
  'SELECT Id, Name FROM Account WHERE Industry = \'Technology\' LIMIT 10'
);
console.log(result.body.records);

// Auto-paginate all results
for await (const account of client.salesforce.queryAll<{ Id: string; Name: string }>(
  'SELECT Id, Name FROM Account'
)) {
  console.log(account.Name);
}
```

### SObject CRUD

```typescript
// Create
const created = await client.salesforce.sobject('Lead').create({
  FirstName: 'Jane',
  LastName: 'Smith',
  Email: 'jane@example.com',
  Company: 'Acme Corp',
});
console.log(created.body.id);

// Get
const account = await client.salesforce.sobject('Account').get('001xx000003GYnI', ['Name', 'Industry']);

// Update
await client.salesforce.sobject('Account').update('001xx000003GYnI', { Industry: 'Technology' });

// Upsert by external ID (idempotent)
await client.salesforce.sobject('Contact').upsert('Email', 'jane@example.com', {
  FirstName: 'Jane',
  LastName: 'Smith',
  Title: 'VP Sales',
});
```

### Raw passthrough

```typescript
// Call any Salesforce REST endpoint
const limits = await client.salesforce.request({
  method: 'GET',
  path: '/services/data/v60.0/limits',
});
```

### Salesforce path allowlist

Requests are restricted to: `/services/data/`, `/services/apexrest/`

---

## CLI Usage

```bash
# HubSpot
personize crm hubspot contacts list --limit 10 --properties email,firstname
personize crm hubspot contacts get <id>
personize crm hubspot contacts search-by-email user@example.com
personize crm hubspot contacts create --email x@co.com --firstname Jane --lastname Smith
personize crm hubspot deals list --limit 25
personize crm hubspot tasks create --subject "Follow up" --due 2026-06-01
personize crm hubspot notes create --body "Called, left voicemail"
personize crm hubspot request --method GET --path /owners/v2/owners

# Salesforce
personize crm salesforce query "SELECT Id, Name FROM Account LIMIT 10"
personize crm salesforce sobject Account get <id> --fields Name,Industry
personize crm salesforce sobject Account create --data '{"Name":"Acme Corp"}'
personize crm salesforce sobject Lead upsert Email jane@example.com --data '{"LastName":"Smith"}'
personize crm salesforce request --method GET --path /services/data/v60.0/limits
```

---

## Response Shape

Every passthrough call returns this wrapper:

```typescript
{
  status: number;          // upstream HTTP status (200, 201, 204, ...)
  headers: Record<string, string>;  // allowlisted upstream headers
  body: T;                 // upstream JSON body
  meta: {
    provider: 'hubspot' | 'salesforce';
    upstreamRequestId: string | null;
    durationMs: number;
    rateLimit?: { remaining: number };
  };
}
```

**Important:** Personize always returns HTTP `200` when the upstream call completed — inspect `result.body.status` for the provider's outcome (the typed wrappers surface this directly as `result.status`).

---

## Error Codes

| `error.code` | Meaning | Fix |
|---|---|---|
| `connection_not_found` | No active connection for this provider | Connect HubSpot/SF in dashboard → Integrations |
| `connection_disconnected` | OAuth token expired and refresh failed | Reconnect in dashboard |
| `invalid_path` | Path rejected by allowlist (SSRF protection) | Use a valid provider path |
| `invalid_method` | Method not in GET/POST/PATCH/PUT/DELETE | Fix the method |
| `upstream_timeout` | Provider didn't respond within timeout | Retry, or increase `timeoutMs` (max 60s) |
| `rate_limited` | Personize per-org QPS cap hit | Back off and retry; check `Retry-After` header |

---

## Common Patterns

### Fetch all HubSpot contacts with delta sync

```typescript
const lastSyncedAt = '2026-05-01T00:00:00Z'; // store this between runs

// HubSpot: search for modified contacts
const modified = await client.hubspot.request<{ results: any[] }>({
  method: 'POST',
  path: '/crm/v3/objects/contacts/search',
  body: {
    filterGroups: [{
      filters: [{ propertyName: 'lastmodifieddate', operator: 'GTE', value: new Date(lastSyncedAt).getTime().toString() }]
    }],
    properties: ['email', 'firstname', 'lastname', 'company', 'jobtitle'],
    limit: 100,
  },
});
```

### Sync HubSpot contacts into Personize memory

```typescript
// After fetching contacts via passthrough, store them in memory
const contacts = (await client.hubspot.contacts.list({ limit: 100 })).body.results;

await client.memory.memorizeBatch({
  records: contacts.map(c => ({
    email: c.properties.email,
    data: { text: `${c.properties.firstname} ${c.properties.lastname} at ${c.properties.company}` },
    mappings: [
      { targetField: 'firstname', sourceField: 'properties.firstname' },
      { targetField: 'lastname', sourceField: 'properties.lastname' },
      { targetField: 'company', sourceField: 'properties.company' },
    ],
  })),
});
```

### Create a HubSpot task after an agent action

```typescript
// After running an outreach agent, log a follow-up task
await client.hubspot.tasks.create({
  subject: `Follow up: ${contactName}`,
  body: `Agent sent email on ${new Date().toISOString()}. Follow up if no reply in 3 days.`,
  dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
});
```
