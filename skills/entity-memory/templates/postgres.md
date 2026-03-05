# Postgres / MySQL Integration Template

## Setup

```bash
# Postgres
npm install pg

# MySQL
npm install mysql2
```

Add to `.env`:
```
DATABASE_URL=postgresql://user:password@host:5432/database
```

## Connect (Postgres)

```typescript
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

## Fetch Rows

Returns flat key-value objects ready for `memorizeBatch()`. Postgres `SELECT *` already returns flat row objects — the column names become the `sourceField` values in the mapping.

```typescript
async function fetchRows(modifiedAfter?: string): Promise<Record<string, any>[]> {
    let query = 'SELECT id, email, first_name, last_name, company, phone, notes FROM customers';
    const params: any[] = [];

    if (modifiedAfter) {
        query += ' WHERE updated_at > $1';
        params.push(modifiedAfter);
    }

    query += ' ORDER BY updated_at ASC LIMIT 1000';

    const result = await pool.query(query, params);
    return result.rows; // Already flat key-value objects
}
```

## Example Mapping + Sync

```typescript
import { BatchMemorizeMapping } from '@personize/sdk';

const mapping: BatchMemorizeMapping = {
    entityType: 'contact',
    email: 'email',           // column name containing email
    runName: `postgres-customer-sync-${Date.now()}`,
    properties: {
        // Structured fields — no AI extraction
        email:      { sourceField: 'email',      collectionId: 'col_YOURS', collectionName: 'Contacts Standard Schema' },
        first_name: { sourceField: 'first_name', collectionId: 'col_YOURS', collectionName: 'Contacts Standard Schema' },
        last_name:  { sourceField: 'last_name',  collectionId: 'col_YOURS', collectionName: 'Contacts Standard Schema' },
        company:    { sourceField: 'company',    collectionId: 'col_YOURS', collectionName: 'Contacts Standard Schema' },
        phone:      { sourceField: 'phone',      collectionId: 'col_YOURS', collectionName: 'Contacts Standard Schema' },
        // Unstructured fields — AI extraction + vectors
        notes: {
            sourceField: 'notes',
            collectionId: 'col_YOURS_GEN',
            collectionName: 'Generated Content',
            extractMemories: true,
        },
    },
};

const rows = await fetchRows();
await client.memory.memorizeBatch({
    source: 'Postgres',
    mapping,
    rows,
    chunkSize: 1,
});
```

## Cursor Pagination (large tables)

For tables with millions of rows, use cursor-based pagination and sync each batch:

```typescript
async function* fetchAllRows(batchSize = 1000) {
    let lastId = 0;

    while (true) {
        const result = await pool.query(
            'SELECT id, email, first_name, last_name, company, phone, notes FROM customers WHERE id > $1 ORDER BY id ASC LIMIT $2',
            [lastId, batchSize],
        );

        if (result.rows.length === 0) break;

        yield result.rows;
        lastId = result.rows[result.rows.length - 1].id;
    }
}

// Usage with memorizeBatch
for await (const batch of fetchAllRows()) {
    await client.memory.memorizeBatch({
        source: 'Postgres',
        mapping,
        rows: batch,
        chunkSize: 1,
    });
}
```

## MySQL Variant

```typescript
import mysql from 'mysql2/promise';

const pool = mysql.createPool(process.env.DATABASE_URL!);

async function fetchRows(modifiedAfter?: string): Promise<Record<string, any>[]> {
    let query = 'SELECT id, email, first_name, last_name, company, phone, notes FROM customers';
    const params: any[] = [];

    if (modifiedAfter) {
        query += ' WHERE updated_at > ?';
        params.push(modifiedAfter);
    }

    query += ' ORDER BY updated_at ASC LIMIT 1000';

    const [rows] = await pool.query(query, params);
    return rows as any[];
}
```

## Notes

- Always use parameterized queries (`$1`, `?`) — never interpolate user input into SQL.
- For the `updated_at` column, ensure it has an index for efficient incremental sync.
- The cursor pagination pattern avoids loading the entire table into memory.
- Close the pool when done: `await pool.end()`.
- Replace `col_YOURS` with actual collection IDs from `client.collections.list()`.
