/**
 * Recipe: Signal Quickstart — Minimal Setup
 *
 * The simplest working Signal configuration:
 * - One source (ManualSource — push events programmatically)
 * - One channel (ConsoleChannel — prints decisions to stdout)
 * - No scheduler, no workspace, no digest
 *
 * Usage:
 *   PERSONIZE_SECRET_KEY=sk_live_... npx ts-node recipes/quickstart.ts
 */

import { Personize } from '@personize/sdk';
import { Signal, ConsoleChannel, ManualSource } from '@personize/signal';

async function main() {
    // 1. Initialize SDK client
    const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

    // Verify auth
    const { data: me } = await client.me();
    if (!me) throw new Error('Auth failed — check PERSONIZE_SECRET_KEY');
    console.log(`Connected to org: ${me.organization.name}\n`);

    // 2. Create source and channel
    const manual = new ManualSource();

    // 3. Initialize Signal
    const signal = new Signal({
        client,
        channels: [new ConsoleChannel()],
        sources: [manual],
        engine: {
            dailyCap: 5,
            memorize: true,
        },
    });

    await signal.start();

    // 4. Trigger a test event
    console.log('--- Triggering user.signup event ---\n');

    const result = await signal.trigger({
        id: `evt_${Date.now()}`,
        type: 'user.signup',
        email: 'test@example.com',
        data: {
            plan: 'trial',
            source: 'website',
            referrer: 'product-hunt',
        },
        timestamp: new Date().toISOString(),
        metadata: { team: 'product' },
    });

    // 5. Inspect the result
    console.log('\n--- Engine Result ---');
    console.log(`Action:    ${result.action}`);
    console.log(`Score:     ${result.score}/100`);
    console.log(`Reasoning: ${result.reasoning}`);
    console.log(`Priority:  ${result.priority || 'N/A'}`);
    console.log(`Channel:   ${result.channel || 'N/A'}`);
    console.log(`SDK calls: ${result.sdkCallsUsed}`);
    console.log(`Duration:  ${result.durationMs}ms`);

    if (result.content) {
        console.log(`\nGenerated content:`);
        console.log(`  Subject: ${result.content.subject}`);
        console.log(`  Body:    ${result.content.body?.substring(0, 200)}...`);
    }

    // 6. Test dedup — trigger same event again
    console.log('\n--- Triggering same event again (should be deduped) ---\n');

    const deduped = await signal.trigger({
        id: `evt_${Date.now()}`,
        type: 'user.signup',
        email: 'test@example.com',
        data: { plan: 'trial' },
        timestamp: new Date().toISOString(),
    });

    console.log(`Action:    ${deduped.action}`);
    console.log(`Reasoning: ${deduped.reasoning}`);
    console.log(`SDK calls: ${deduped.sdkCallsUsed} (should be 0 — pre-check skip)`);

    await signal.stop();
}

main().catch(err => {
    console.error('Error:', err.message || err);
    process.exit(1);
});
