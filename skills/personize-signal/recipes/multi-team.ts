/**
 * Recipe: Signal Multi-Team — Product + Sales + Marketing
 *
 * Shows how multiple teams contribute events and workspace context
 * to the same entity. Signal's AI sees the combined cross-team picture
 * when making notification decisions.
 *
 * Usage:
 *   PERSONIZE_SECRET_KEY=sk_live_... npx ts-node recipes/multi-team.ts
 */

import { Personize } from '@personize/sdk';
import {
    Signal,
    ManualSource,
    ConsoleChannel,
} from '@personize/signal';
import type { SignalEvent } from '@personize/signal';

async function main() {
    const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

    const { data: me } = await client.me();
    if (!me) throw new Error('Auth failed');
    console.log(`Connected to org: ${me.organization.name}\n`);

    const manual = new ManualSource();

    const signal = new Signal({
        client,
        channels: [new ConsoleChannel()],
        sources: [manual],
        engine: {
            workspaceUpdates: true,
            memorize: true,
            dailyCap: 10,
        },
    });

    await signal.start();

    const email = 'vp-engineering@bigcorp.com';

    // ──────────────────────────────────────────────
    // PRODUCT TEAM — Usage events and milestones
    // ──────────────────────────────────────────────

    console.log('=== Product Team Events ===\n');

    // Add product context to workspace
    await signal.workspace.addNote(email, {
        content: 'Power user: 200+ API calls/day, using advanced memory features and governance.',
        tags: ['product', 'usage-profile'],
    });

    const productResult = await signal.trigger(makeEvent(email, 'usage.milestone', 'product', {
        milestone: '1000_api_calls',
        daysActive: 14,
        topFeatures: ['memorize', 'smartDigest', 'smartRecall'],
    }));

    console.log(`usage.milestone → ${productResult.action} (score: ${productResult.score})`);
    console.log(`Reasoning: ${productResult.reasoning}\n`);

    // ──────────────────────────────────────────────
    // SALES TEAM — Deal events and call notes
    // ──────────────────────────────────────────────

    console.log('=== Sales Team Events ===\n');

    // Sales adds workspace context
    await signal.workspace.addTask(email, {
        title: 'Prepare renewal proposal — contract expires in 45 days',
        priority: 'high',
        assignee: 'sarah@yourteam.com',
    });

    await signal.workspace.addNote(email, {
        content: 'Budget approved for expansion. Decision maker is CTO. Prefers technical depth over slides.',
        tags: ['sales', 'intel'],
    });

    const salesResult = await signal.trigger(makeEvent(email, 'deal.stage_changed', 'sales', {
        stage: 'negotiation',
        previousStage: 'proposal',
        rep: 'sarah',
        contractValue: 120000,
    }));

    console.log(`deal.stage_changed → ${salesResult.action} (score: ${salesResult.score})`);
    console.log(`Reasoning: ${salesResult.reasoning}\n`);

    // ──────────────────────────────────────────────
    // MARKETING TEAM — Engagement events
    // ──────────────────────────────────────────────

    console.log('=== Marketing Team Events ===\n');

    await signal.workspace.addUpdate(email,
        '[Marketing] Opened 3 of 5 recent emails. Downloaded enterprise case study.');

    const marketingResult = await signal.trigger(makeEvent(email, 'content.engaged', 'marketing', {
        content: 'Enterprise Architecture Guide',
        action: 'downloaded',
        campaign: 'Q1-enterprise',
        previousEngagements: 3,
    }));

    console.log(`content.engaged → ${marketingResult.action} (score: ${marketingResult.score})`);
    console.log(`Reasoning: ${marketingResult.reasoning}\n`);

    // ──────────────────────────────────────────────
    // VIEW COMBINED WORKSPACE
    // ──────────────────────────────────────────────

    console.log('=== Combined Workspace Digest ===\n');

    const digest = await signal.workspace.getDigest(email, 3000);

    console.log('The AI sees ALL of this when making any notification decision:');
    console.log('─'.repeat(60));
    console.log(typeof digest === 'string' ? digest : JSON.stringify(digest, null, 2));
    console.log('─'.repeat(60));

    await signal.stop();
}

function makeEvent(
    email: string,
    type: string,
    team: string,
    data: Record<string, unknown>,
): SignalEvent {
    return {
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type,
        email,
        data,
        timestamp: new Date().toISOString(),
        metadata: { team },
    };
}

main().catch(err => {
    console.error('Error:', err.message || err);
    process.exit(1);
});
