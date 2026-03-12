# Salesforce Integration Template

## Setup

```bash
npm install jsforce
```

Add to `.env`:
```
SF_LOGIN_URL=https://login.salesforce.com
SF_USERNAME=your-username@example.com
SF_PASSWORD=your-password
SF_SECURITY_TOKEN=your-security-token
```

## Connect

```typescript
import jsforce from 'jsforce';

async function connectSalesforce() {
    const conn = new jsforce.Connection({
        loginUrl: process.env.SF_LOGIN_URL,
    });
    await conn.login(
        process.env.SF_USERNAME!,
        process.env.SF_PASSWORD! + process.env.SF_SECURITY_TOKEN!,
    );
    return conn;
}
```

## Fetch Contact Rows

Returns flat key-value objects ready for `memorizeBatch()`. The keys become the `sourceField` values in the mapping.

```typescript
async function fetchContactRows(conn: jsforce.Connection, modifiedAfter?: string): Promise<Record<string, any>[]> {
    let soql = `
        SELECT Id, FirstName, LastName, Email, Title, Phone, Account.Name, Description
        FROM Contact
    `;
    if (modifiedAfter) {
        soql += ` WHERE LastModifiedDate > ${modifiedAfter}`;
    }
    soql += ' ORDER BY LastModifiedDate ASC LIMIT 2000';

    const result = await conn.query(soql);
    return (result.records as any[]).map(r => ({
        // Flat row — keys match sourceField names in the mapping
        sf_id: r.Id,
        firstname: r.FirstName || '',
        lastname: r.LastName || '',
        email: r.Email,
        title: r.Title,
        phone: r.Phone,
        company: r.Account?.Name,
        description: r.Description,
    }));
}
```

## Example Mapping + Sync

```typescript
import { BatchMemorizeMapping } from '@personize/sdk';

const mapping: BatchMemorizeMapping = {
    entityType: 'contact',
    email: 'email',             // source field containing email
    runName: `salesforce-contact-sync-${Date.now()}`,
    properties: {
        // Structured fields — no AI extraction
        first_name: { sourceField: 'firstname', collectionId: 'col_YOURS', collectionName: 'Contacts Standard Schema' },
        last_name:  { sourceField: 'lastname',  collectionId: 'col_YOURS', collectionName: 'Contacts Standard Schema' },
        email:      { sourceField: 'email',     collectionId: 'col_YOURS', collectionName: 'Contacts Standard Schema' },
        title:      { sourceField: 'title',     collectionId: 'col_YOURS', collectionName: 'Contacts Standard Schema' },
        phone:      { sourceField: 'phone',     collectionId: 'col_YOURS', collectionName: 'Contacts Standard Schema' },
        company:    { sourceField: 'company',   collectionId: 'col_YOURS', collectionName: 'Contacts Standard Schema' },
        // Unstructured fields — AI extraction + vectors
        notes: {
            sourceField: 'description',
            collectionId: 'col_YOURS_GEN',
            collectionName: 'Generated Content',
            extractMemories: true,
        },
    },
};

const conn = await connectSalesforce();
const rows = await fetchContactRows(conn);
await client.memory.memorizeBatch({
    source: 'Salesforce',
    mapping,
    rows,
    chunkSize: 1,
});
```

## Fetch Account Rows (Companies)

```typescript
async function fetchAccountRows(conn: jsforce.Connection, modifiedAfter?: string): Promise<Record<string, any>[]> {
    let soql = `
        SELECT Id, Name, Website, Industry, Phone, Description, BillingCity, BillingCountry
        FROM Account
    `;
    if (modifiedAfter) {
        soql += ` WHERE LastModifiedDate > ${modifiedAfter}`;
    }
    soql += ' ORDER BY LastModifiedDate ASC LIMIT 2000';

    const result = await conn.query(soql);
    return (result.records as any[]).map(r => ({
        sf_id: r.Id,
        name: r.Name,
        website: r.Website,
        industry: r.Industry,
        phone: r.Phone,
        description: r.Description,
        location: r.BillingCity ? `${r.BillingCity}, ${r.BillingCountry || ''}`.trim() : null,
    }));
}
```

## Notes

- SOQL `LIMIT 2000` is the Salesforce per-query max. For larger datasets, use `queryMore()` to paginate.
- For OAuth2 (production), use `jsforce.OAuth2` with `clientId`, `clientSecret`, and `redirectUri` instead of username/password.
- Salesforce returns ISO timestamps for `LastModifiedDate`, compatible with the incremental sync pattern.
- Replace `col_YOURS` with actual collection IDs from `client.collections.list()`.
