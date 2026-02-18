#!/usr/bin/env npx ts-node

/**
 * Recipe: Batch Data Sync
 *
 * Syncs records from a CRM or database into Personize memory with
 * validation, chunking, error handling, and progress reporting.
 *
 * Usage:
 *   npx ts-node recipes/data-sync.ts
 *
 * Prerequisites:
 *   - PERSONIZE_SECRET_KEY env var set
 *   - @personize/sdk installed
 */

import { Personize } from '@personize/sdk';

const client = new Personize({
    secretKey: process.env.PERSONIZE_SECRET_KEY!,
});

// ---------------------------------------------------------------------------
// Configuration — edit these for your use case
// ---------------------------------------------------------------------------

const SOURCE = 'Hubspot';
const ENTITY_TYPE = 'contact';
const EMAIL_FIELD = 'email';
const CHUNK_SIZE = 10;
const DRY_RUN = process.argv.includes('--dry-run');

// Define property mappings
// extractMemories: true  → AI extracts facts + creates vector embeddings
// extractMemories: false → stored as structured data only (faster, cheaper)
function buildMapping(collectionId: string) {
    return {
        entityType: ENTITY_TYPE,
        email: EMAIL_FIELD,
        runName: `${SOURCE.toLowerCase()}-${ENTITY_TYPE}-sync-${Date.now()}`,
        properties: {
            full_name: {
                sourceField: 'firstname',
                collectionId,
                collectionName: 'Contacts',
                extractMemories: false,
            },
            last_name: {
                sourceField: 'lastname',
                collectionId,
                collectionName: 'Contacts',
                extractMemories: false,
            },
            job_title: {
                sourceField: 'jobtitle',
                collectionId,
                collectionName: 'Contacts',
                extractMemories: false,
            },
            company: {
                sourceField: 'company',
                collectionId,
                collectionName: 'Contacts',
                extractMemories: false,
            },
            lifecycle_stage: {
                sourceField: 'lifecyclestage',
                collectionId,
                collectionName: 'Contacts',
                extractMemories: false,
            },
            last_notes: {
                sourceField: 'notes_last_updated',
                collectionId,
                collectionName: 'Contacts',
                extractMemories: true, // Rich text → AI extraction
            },
        },
    };
}

// ---------------------------------------------------------------------------
// Replace this with your actual data source
// ---------------------------------------------------------------------------

async function fetchSourceData(): Promise<Record<string, unknown>[]> {
    // Example: fetch from HubSpot API, database query, CSV file, etc.
    // Return an array of objects where keys match the sourceField names above.
    return [
        {
            email: 'sarah.chen@initech.com',
            firstname: 'Sarah',
            lastname: 'Chen',
            jobtitle: 'VP Engineering',
            company: 'Initech',
            lifecyclestage: 'opportunity',
            notes_last_updated: 'Evaluating SOC2 tools. Budget approved for Q2. Main pain: manual audit prep.',
        },
        // ... more rows
    ];
}

// ---------------------------------------------------------------------------
// Main sync logic
// ---------------------------------------------------------------------------

async function main() {
    // 1. Verify auth
    const me = await client.me();
    if (!me.success || !me.data) {
        console.error('Auth failed. Check PERSONIZE_SECRET_KEY.');
        process.exit(1);
    }
    console.log(`Authenticated: org=${me.data.organization.id}`);
    console.log(`Plan: ${me.data.plan.name} (${me.data.plan.limits.maxApiCallsPerMonth} calls/month)\n`);

    // 2. Get collection ID
    const collections = await client.collections.list();
    const contactsCol = collections.data?.actions?.find(
        (c) => c.payload.collectionName === 'Contacts'
    );
    if (!contactsCol) {
        console.error('No "Contacts" collection found. Create one in the Personize web app first.');
        process.exit(1);
    }
    const collectionId = contactsCol.payload.collectionId;
    console.log(`Using collection: ${contactsCol.payload.collectionName} (${collectionId})\n`);

    // 3. Fetch source data
    const rows = await fetchSourceData();
    console.log(`Source records: ${rows.length}`);

    if (rows.length === 0) {
        console.log('No records to sync.');
        return;
    }

    // 4. Build mapping
    const mapping = buildMapping(collectionId);

    // 5. Dry run first
    if (DRY_RUN) {
        console.log('\n[DRY RUN] Validating without writing...\n');
        const dryResult = await client.memory.memorizeBatch({
            source: SOURCE,
            mapping,
            rows: rows.slice(0, Math.min(5, rows.length)), // Test with first 5
            dryRun: true,
        });
        console.log('Dry run result:', JSON.stringify(dryResult, null, 2));
        return;
    }

    // 6. Sync in chunks
    let synced = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const chunkLabel = `rows ${i + 1}-${i + chunk.length}`;

        try {
            await client.memory.memorizeBatch({
                source: SOURCE,
                mapping,
                rows: chunk,
                chunkSize: CHUNK_SIZE,
            });
            synced += chunk.length;
            console.log(`  OK  ${chunkLabel} (${synced}/${rows.length})`);
        } catch (err: any) {
            failed += chunk.length;
            console.error(`  FAIL  ${chunkLabel}: ${err.message}`);
        }
    }

    // 7. Summary
    console.log(`\nSync complete: ${synced} synced, ${failed} failed, ${rows.length} total`);

    // 8. Verify with a sample recall
    if (synced > 0 && rows[0]?.email) {
        const email = rows[0].email as string;
        console.log(`\nVerifying: smartDigest for ${email}...`);
        const digest = await client.memory.smartDigest({
            email,
            type: 'Contact',
            token_budget: 500,
        });
        if (digest.data?.compiledContext) {
            console.log('Verification OK — digest preview:');
            console.log(digest.data.compiledContext.slice(0, 300) + '...');
        }
    }
}

main().catch((err) => {
    console.error('Fatal error:', err.message || err);
    process.exit(1);
});
