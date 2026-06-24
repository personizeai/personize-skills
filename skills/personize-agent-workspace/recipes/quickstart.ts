#!/usr/bin/env npx ts-node

/**
 * Recipe: Hello Workspace — Quickstart
 *
 * The smallest possible workspace cycle:
 *   1. Authenticate
 *   2. Memorize one task entry
 *   3. Recall it back
 *   4. Print it
 *
 * Usage:
 *   npx ts-node recipes/quickstart.ts
 *
 * Prerequisites:
 *   - PERSONIZE_SECRET_KEY env var set
 *   - @personize/sdk installed
 */

import { Personize } from '@personize/sdk';

const client = new Personize({
    secretKey: process.env.PERSONIZE_SECRET_KEY!,
});

const ENTITY_EMAIL = 'demo@example.com';

async function main() {
    // 1. Verify auth
    const me = await client.me();
    if (!me.success) {
        console.error('Auth failed. Check PERSONIZE_SECRET_KEY.');
        process.exit(1);
    }
    console.log(`Authenticated: org=${me.data?.organization.id}\n`);

    // 2. Write one task to the workspace
    console.log('Writing a task to the workspace...');
    await client.memory.memorize({
        content: JSON.stringify({
            title: 'Review onboarding feedback',
            description: 'New user submitted feedback during onboarding — review and respond.',
            status: 'pending',
            owner: 'account-manager',
            createdBy: 'quickstart-demo',
            priority: 'medium',
            timestamp: new Date().toISOString(),
        }),
        email: ENTITY_EMAIL,
        enhanced: true,
        tags: ['workspace:tasks', 'source:quickstart-demo', 'priority:medium'],
    });
    console.log('  Task written.\n');

    // 3. Read it back via smartRecall
    console.log('Recalling workspace tasks...');
    const results = await client.memory.smartRecall({
        query: 'open tasks pending action items',
        email: ENTITY_EMAIL,
        limit: 5,
        mode: 'fast',
    });
    console.log('  Results:', JSON.stringify(results.data, null, 2));

    // 4. Get the full workspace digest
    console.log('\nFull workspace digest:');
    const digest = await client.memory.smartDigest({
        email: ENTITY_EMAIL,
        type: 'Contact',
        token_budget: 1000,
        include_properties: true,
        include_memories: true,
    });
    console.log(digest.data?.compiledContext || '(empty workspace)');
}

main().catch((err) => {
    console.error('Fatal error:', err.message || err);
    process.exit(1);
});
