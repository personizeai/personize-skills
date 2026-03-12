#!/usr/bin/env npx ts-node

/**
 * Recipe: Contribute to a Shared Workspace
 *
 * Demonstrates how to write all 5 workspace entry types:
 *   - Updates (timeline events)
 *   - Tasks (action items)
 *   - Notes (knowledge/observations)
 *   - Issues (problems/risks)
 *   - Context (current state rewrite)
 *
 * Usage:
 *   npx ts-node recipes/contribute.ts
 *
 * Prerequisites:
 *   - PERSONIZE_SECRET_KEY env var set
 *   - @personize/sdk installed
 *   - A workspace collection created (see reference/create.md)
 */

import { Personize } from '@personize/sdk';

const client = new Personize({
    secretKey: process.env.PERSONIZE_SECRET_KEY!,
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ENTITY_EMAIL = 'sarah@acme.com'; // Target entity
const CONTRIBUTOR = 'cs-health-agent'; // Who is contributing

// ---------------------------------------------------------------------------
// Workspace Contribution Helpers
// ---------------------------------------------------------------------------

async function addUpdate(
    email: string,
    update: {
        type: 'observation' | 'action' | 'change' | 'milestone';
        summary: string;
        details?: string;
    }
): Promise<void> {
    await client.memory.memorize({
        content: JSON.stringify({
            author: CONTRIBUTOR,
            ...update,
            timestamp: new Date().toISOString(),
        }),
        email,
        enhanced: true,
        tags: ['workspace:updates', `source:${CONTRIBUTOR}`],
        timestamp: new Date().toISOString(),
    });
}

async function addTask(
    email: string,
    task: {
        title: string;
        description: string;
        status: 'pending' | 'in_progress' | 'done' | 'cancelled';
        owner: string;
        priority: 'low' | 'medium' | 'high' | 'urgent';
        dueDate?: string;
        outcome?: string;
    }
): Promise<void> {
    await client.memory.memorize({
        content: JSON.stringify({
            ...task,
            createdBy: CONTRIBUTOR,
            timestamp: new Date().toISOString(),
        }),
        email,
        enhanced: true,
        tags: ['workspace:tasks', `source:${CONTRIBUTOR}`, `priority:${task.priority}`],
        timestamp: new Date().toISOString(),
    });
}

async function addNote(
    email: string,
    note: {
        content: string;
        category: 'observation' | 'analysis' | 'idea' | 'reference' | 'question';
    }
): Promise<void> {
    await client.memory.memorize({
        content: JSON.stringify({
            author: CONTRIBUTOR,
            ...note,
            timestamp: new Date().toISOString(),
        }),
        email,
        enhanced: true,
        tags: ['workspace:notes', `source:${CONTRIBUTOR}`],
        timestamp: new Date().toISOString(),
    });
}

async function raiseIssue(
    email: string,
    issue: {
        title: string;
        description: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
    }
): Promise<void> {
    await client.memory.memorize({
        content: JSON.stringify({
            ...issue,
            status: 'open',
            raisedBy: CONTRIBUTOR,
            timestamp: new Date().toISOString(),
        }),
        email,
        enhanced: true,
        tags: [
            'workspace:issues',
            `source:${CONTRIBUTOR}`,
            `severity:${issue.severity}`,
        ],
        timestamp: new Date().toISOString(),
    });
}

async function rewriteContext(
    email: string,
    context: string
): Promise<void> {
    await client.memory.memorize({
        content: JSON.stringify({
            author: CONTRIBUTOR,
            context,
            rewrittenAt: new Date().toISOString(),
        }),
        email,
        enhanced: true,
        tags: ['workspace:context', `source:${CONTRIBUTOR}`],
        timestamp: new Date().toISOString(),
    });
}

// ---------------------------------------------------------------------------
// Demo: Contribute All Entry Types
// ---------------------------------------------------------------------------

async function main() {
    // 1. Verify auth
    const me = await client.me();
    if (!me.success) {
        console.error('Auth failed. Check PERSONIZE_SECRET_KEY.');
        process.exit(1);
    }
    console.log(`Authenticated: org=${me.data?.organization.id}\n`);

    // 2. Add an update (timeline event)
    console.log('Adding update...');
    await addUpdate(ENTITY_EMAIL, {
        type: 'observation',
        summary: 'Login frequency dropped 40% over the past 2 weeks',
        details:
            'Average daily logins went from 12 to 7. Feature usage of Reports module dropped from 8x/week to 2x/week. Dashboard usage unchanged.',
    });
    console.log('  Update added.');

    // 3. Add a task
    console.log('Adding task...');
    await addTask(ENTITY_EMAIL, {
        title: 'Schedule check-in call with Sarah',
        description:
            'Usage declining — need to understand if this is seasonal, a product issue, or a churn signal. Prepare talking points around the Reports module drop.',
        status: 'pending',
        owner: 'account-manager',
        priority: 'high',
        dueDate: '2026-03-01',
    });
    console.log('  Task added.');

    // 4. Add a note
    console.log('Adding note...');
    await addNote(ENTITY_EMAIL, {
        content:
            'Acme Corp recently posted 3 job listings for data engineers. Combined with their increased API usage last quarter, this suggests they are building internal data infrastructure. Our integration capabilities could be a retention lever.',
        category: 'analysis',
    });
    console.log('  Note added.');

    // 5. Raise an issue
    console.log('Raising issue...');
    await raiseIssue(ENTITY_EMAIL, {
        title: 'Churn risk: declining engagement + budget review',
        description:
            'Three signals converging: (1) login frequency down 40%, (2) budget review mentioned in last call, (3) support tickets up 50% in past month. Renewal in 60 days.',
        severity: 'high',
    });
    console.log('  Issue raised.');

    // 6. Rewrite context
    console.log('Rewriting context...');
    await rewriteContext(
        ENTITY_EMAIL,
        'At-risk account. Usage declining (logins down 40%, Reports module adoption dropping). Budget review in progress — Sarah mentioned finance is reviewing all vendor contracts. Support volume up 50%. Renewal in 60 days. Immediate priority: schedule check-in to understand root cause. Retention lever: position integration capabilities as "build with us" given their data engineering hiring.'
    );
    console.log('  Context rewritten.');

    console.log('\nAll contributions added to workspace.');
}

main().catch((err) => {
    console.error('Fatal error:', err.message || err);
    process.exit(1);
});
