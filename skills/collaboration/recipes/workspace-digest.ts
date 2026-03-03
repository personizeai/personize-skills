#!/usr/bin/env npx ts-node

/**
 * Recipe: Workspace Digest
 *
 * Demonstrates how to read and compile workspace state for any participant.
 * Shows three patterns:
 *   1. Full digest — everything compiled into a narrative
 *   2. Filtered recall — query specific entry types
 *   3. Cross-entity query — find patterns across all workspaces
 *
 * Usage:
 *   npx ts-node recipes/workspace-digest.ts
 *
 * Prerequisites:
 *   - PERSONIZE_SECRET_KEY env var set
 *   - @personize/sdk installed
 *   - Some workspace contributions already made (run contribute.ts first)
 */

import { Personize } from '@personize/sdk';

const client = new Personize({
    secretKey: process.env.PERSONIZE_SECRET_KEY!,
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ENTITY_EMAIL = 'sarah@acme.com';
const ENTITY_TYPE = 'Contact';

// ---------------------------------------------------------------------------
// Pattern 1: Full Workspace Digest
// ---------------------------------------------------------------------------

async function fullDigest(email: string): Promise<string> {
    const digest = await client.memory.smartDigest({
        email,
        type: ENTITY_TYPE,
        token_budget: 3000,
        include_properties: true,
        include_memories: true,
    });

    return digest.data?.compiledContext || 'No workspace data found.';
}

// ---------------------------------------------------------------------------
// Pattern 2: Filtered Recall by Entry Type
// ---------------------------------------------------------------------------

async function getOpenTasks(email: string): Promise<any[]> {
    const result = await client.memory.smartRecall({
        query: 'tasks pending in progress action items not completed',
        email,
        limit: 20,
        fast_mode: true,
    });
    return result.data || [];
}

async function getOpenIssues(email: string): Promise<any[]> {
    const result = await client.memory.smartRecall({
        query: 'issues problems risks open unresolved',
        email,
        limit: 20,
        fast_mode: true,
    });
    return result.data || [];
}

async function getRecentUpdates(email: string): Promise<any[]> {
    const result = await client.memory.smartRecall({
        query: 'recent updates observations actions changes milestones',
        email,
        limit: 10,
        fast_mode: true,
    });
    return result.data || [];
}

async function getNotesByContributor(
    email: string,
    contributor: string
): Promise<any[]> {
    const result = await client.memory.smartRecall({
        query: `notes observations analysis from ${contributor}`,
        email,
        limit: 10,
        fast_mode: true,
    });
    return result.data || [];
}

// ---------------------------------------------------------------------------
// Pattern 3: Cross-Entity Queries
// ---------------------------------------------------------------------------

async function getAllCriticalIssues(): Promise<any[]> {
    const result = await client.memory.smartRecall({
        query: 'critical severity issues open unresolved urgent',
        limit: 50,
        min_score: 0.3,
        fast_mode: true,
    });
    return result.data || [];
}

async function getAllHighPriorityTasks(): Promise<any[]> {
    const result = await client.memory.smartRecall({
        query: 'high priority urgent tasks pending',
        limit: 50,
        min_score: 0.3,
        fast_mode: true,
    });
    return result.data || [];
}

// ---------------------------------------------------------------------------
// Pattern 4: Workspace State for Agent Context
// ---------------------------------------------------------------------------

/**
 * Assemble workspace context for an agent's contribution cycle.
 * Combines: workspace digest + governance rules.
 */
async function assembleAgentContext(
    email: string,
    agentRole: string
): Promise<string> {
    const [digest, governance] = await Promise.all([
        client.memory.smartDigest({
            email,
            type: ENTITY_TYPE,
            token_budget: 2500,
            include_properties: true,
            include_memories: true,
        }),
        client.ai.smartGuidelines({
            message: `${agentRole} workspace contribution guidelines`,
            mode: 'fast',
        }),
    ]);

    const sections: string[] = [];

    if (governance.data?.compiledContext) {
        sections.push('## Governance\n\n' + governance.data.compiledContext);
    }

    if (digest.data?.compiledContext) {
        sections.push('## Workspace State\n\n' + digest.data.compiledContext);
    }

    return sections.join('\n\n---\n\n');
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

async function main() {
    // 1. Verify auth
    const me = await client.me();
    if (!me.success) {
        console.error('Auth failed. Check PERSONIZE_SECRET_KEY.');
        process.exit(1);
    }
    console.log(`Authenticated: org=${me.data?.organization.id}\n`);

    // 2. Full digest
    console.log('=== FULL WORKSPACE DIGEST ===\n');
    const digest = await fullDigest(ENTITY_EMAIL);
    console.log(digest);
    console.log('\n');

    // 3. Filtered queries
    console.log('=== OPEN TASKS ===\n');
    const tasks = await getOpenTasks(ENTITY_EMAIL);
    console.log(`Found ${tasks.length} open tasks.`);
    for (const task of tasks) {
        console.log(`  - ${task.text || task.content || JSON.stringify(task)}`);
    }
    console.log('');

    console.log('=== OPEN ISSUES ===\n');
    const issues = await getOpenIssues(ENTITY_EMAIL);
    console.log(`Found ${issues.length} open issues.`);
    for (const issue of issues) {
        console.log(`  - ${issue.text || issue.content || JSON.stringify(issue)}`);
    }
    console.log('');

    console.log('=== RECENT UPDATES ===\n');
    const updates = await getRecentUpdates(ENTITY_EMAIL);
    console.log(`Found ${updates.length} recent updates.`);
    for (const update of updates) {
        console.log(`  - ${update.text || update.content || JSON.stringify(update)}`);
    }
    console.log('');

    // 4. Agent context assembly
    console.log('=== AGENT CONTEXT (for CS health agent) ===\n');
    const agentContext = await assembleAgentContext(
        ENTITY_EMAIL,
        'customer success health monitoring'
    );
    console.log(agentContext);
    console.log('');

    // 5. Cross-entity queries
    console.log('=== CROSS-ENTITY: ALL CRITICAL ISSUES ===\n');
    const criticalIssues = await getAllCriticalIssues();
    console.log(`Found ${criticalIssues.length} critical issues across all entities.`);
    for (const issue of criticalIssues) {
        console.log(`  - ${issue.text || issue.content || JSON.stringify(issue)}`);
    }
}

main().catch((err) => {
    console.error('Fatal error:', err.message || err);
    process.exit(1);
});
