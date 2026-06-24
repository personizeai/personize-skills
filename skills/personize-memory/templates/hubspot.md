# HubSpot Integration Template

## Setup

```bash
npm install @hubspot/api-client
```

Add to `.env`:
```
HUBSPOT_ACCESS_TOKEN=pat-na1-xxxxxxxx
```

## Connect

```typescript
import { Client } from '@hubspot/api-client';

const hubspot = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN! });
```

## Fetch Contact Rows

Returns flat key-value objects ready for `memorizeBatch()`. The keys become the `sourceField` values in the mapping.

```typescript
async function fetchContactRows(modifiedAfter?: string): Promise<Record<string, any>[]> {
    const rows: Record<string, any>[] = [];
    let after: string | undefined;
    const properties = [
        'firstname', 'lastname', 'email', 'phone', 'company', 'jobtitle',
        'hs_full_name_or_email', 'mobilephone',
        // Add any custom properties you want to sync:
        // 'personize_contact_research_report', 'personize_email_body_1',
    ];
    const filterGroups = modifiedAfter ? [{
        filters: [{
            propertyName: 'lastmodifieddate',
            operator: 'GTE' as const,
            value: new Date(modifiedAfter).getTime().toString(),
        }],
    }] : undefined;

    do {
        const response = filterGroups
            ? await hubspot.crm.contacts.searchApi.doSearch({
                filterGroups,
                properties,
                limit: 100,
                after: after ? parseInt(after) : 0,
                sorts: [{ propertyName: 'lastmodifieddate', direction: 'ASCENDING' as any }],
            })
            : await hubspot.crm.contacts.basicApi.getPage(100, after, properties);

        for (const contact of response.results) {
            // Return flat row — keys match sourceField names in the mapping
            rows.push({
                _hubspotId: contact.id,
                ...contact.properties,
            });
        }

        after = response.paging?.next?.after;
    } while (after);

    return rows;
}
```

## Example Mapping + Sync

```typescript
import { BatchMemorizeMapping } from '@personize/sdk';

const mapping: BatchMemorizeMapping = {
    entityType: 'contact',
    email: 'email',           // source field name containing email
    runName: `hubspot-contact-sync-${Date.now()}`,
    properties: {
        // Structured fields — no AI extraction
        full_name:    { sourceField: 'hs_full_name_or_email', collectionId: 'col_YOURS', collectionName: 'Contacts Standard Schema' },
        email:        { sourceField: 'email',                 collectionId: 'col_YOURS', collectionName: 'Contacts Standard Schema' },
        phone:        { sourceField: 'phone',                 collectionId: 'col_YOURS', collectionName: 'Contacts Standard Schema' },
        mobile_phone: { sourceField: 'mobilephone',           collectionId: 'col_YOURS', collectionName: 'Contacts Standard Schema' },
        company:      { sourceField: 'company',               collectionId: 'col_YOURS', collectionName: 'Contacts Standard Schema' },
        job_title:    { sourceField: 'jobtitle',              collectionId: 'col_YOURS', collectionName: 'Contacts Standard Schema' },
        // Unstructured fields — AI extraction + vectors
        // Uncomment if you have these custom properties:
        // personalization_notes: {
        //     sourceField: 'personize_contact_research_report',
        //     collectionId: 'col_YOURS_GEN',
        //     collectionName: 'Generated Content',
        //     extractMemories: true,
        // },
    },
};

// Sync
const rows = await fetchContactRows();
await client.memory.memorizeBatch({
    source: 'Hubspot',
    mapping,
    rows,
    chunkSize: 1,
});
```

## Fetch Companies

```typescript
async function fetchCompanyRows(modifiedAfter?: string): Promise<Record<string, any>[]> {
    const rows: Record<string, any>[] = [];
    let after: string | undefined;
    const properties = ['name', 'domain', 'industry', 'phone', 'city', 'country', 'description'];

    do {
        const response = await hubspot.crm.companies.basicApi.getPage(100, after, properties);

        for (const company of response.results) {
            rows.push({
                _hubspotId: company.id,
                ...company.properties,
                // Normalize website URL for the mapping.website field
                company_website: company.properties.domain ? `https://${company.properties.domain}` : null,
            });
        }

        after = response.paging?.next?.after;
    } while (after);

    return rows;
}
```

## Notes

- HubSpot's `basicApi.getPage()` returns up to 100 results per page. Use `paging.next.after` to paginate.
- For incremental sync, use `searchApi.doSearch()` with a `lastmodifieddate >= timestamp` filter.
- HubSpot uses millisecond timestamps in search filters.
- Private app tokens (`pat-...`) are recommended over API keys (deprecated by HubSpot).
- Replace `col_YOURS` with actual collection IDs from `client.collections.list()`.
