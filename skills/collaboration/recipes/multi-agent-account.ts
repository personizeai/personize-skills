#!/usr/bin/env npx ts-node

/**
 * Recipe: Multi-Agent Account Workspace
 *
 * Demonstrates three agents collaborating on a shared account workspace:
 *   1. Sales Intel Agent — extracts intelligence from calls and emails
 *   2. Product Analytics Agent — monitors usage patterns and adoption
 *   3. CS Health Agent — synthesizes all signals into health assessment
 *
 * Each agent follows the same loop: READ → GOVERN → ACT → RECORD.
 * No orchestrator. The workspace is the coordination substrate.
 *
 * Usage:
 *   npx ts-node recipes/multi-agent-account.ts
 *
 * Prerequisites:
 *   - PERSONIZE_SECRET_KEY env var set
 *   - @personize/sdk installed
 *   - A workspace collection with the 5 starter properties
 *   - Some base data memorized for the entity
 */

import { Personize } from '@personize/sdk';
import { safeParseJSON, contributeEntry } from './helpers';

const client = new Personize({
    secretKey: process.env.PERSONIZE_SECRET_KEY!,
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ENTITY_EMAIL = 'sarah@acme.com';
const ENTITY_TYPE = 'Contact';

// ---------------------------------------------------------------------------
// Shared: Read Workspace State
// ---------------------------------------------------------------------------

async function readWorkspace(email: string): Promise<string> {
    const digest = await client.memory.smartDigest({
        email,
        type: ENTITY_TYPE,
        token_budget: 2500,
        include_properties: true,
        include_memories: true,
    });
    return digest.data?.compiledContext || '';
}

async function getGovernance(topic: string): Promise<string> {
    const result = await client.ai.smartGuidelines({
        message: topic,
        mode: 'fast',
    });
    return result.data?.compiledContext || '';
}

function contribute(
    email: string,
    entry: Record<string, unknown>,
    type: string,
    agentName: string,
    extraTags: string[] = []
): Promise<void> {
    return contributeEntry(client, email, entry, type as any, agentName, extraTags);
}

// ---------------------------------------------------------------------------
// Agent 1: Sales Intel Agent
// ---------------------------------------------------------------------------

async function salesIntelAgent(email: string) {
    const agentName = 'sales-intel-agent';
    console.log(`\n[${agentName}] Starting pulse...`);

    // 1. READ
    const [workspace, governance] = await Promise.all([
        readWorkspace(email),
        getGovernance('sales intelligence gathering and account research'),
    ]);

    const context = [
        governance ? `## Guidelines\n\n${governance}` : '',
        workspace ? `## Workspace State\n\n${workspace}` : '',
    ]
        .filter(Boolean)
        .join('\n\n---\n\n');

    // 2. ACT — Analyze and generate contributions
    const analysis = await client.ai.prompt({
        context,
        instructions: [
            {
                prompt:
                    'You are a sales intelligence agent reviewing this account workspace. Based on the current state, identify: (1) any new intelligence worth noting, (2) any tasks for the sales team, (3) any risks or issues to flag. Focus on competitive intelligence, buying signals, and relationship dynamics. Output as JSON: { notes: [{content, category}], tasks: [{title, description, owner, priority}], issues: [{title, description, severity}], updates: [{type, summary}] }. Only include items that add NEW value — do not repeat what is already in the workspace.',
                maxSteps: 5,
            },
        ],
    });

    // 3. RECORD — Write contributions
    try {
        const contributions = safeParseJSON<{
            notes?: Array<{ content: string; category: string }>;
            tasks?: Array<{ title: string; description: string; owner: string; priority: string }>;
            issues?: Array<{ title: string; description: string; severity: string }>;
            updates?: Array<{ type: string; summary: string }>;
        }>(String(analysis.data));

        for (const note of contributions.notes || []) {
            await contribute(
                email,
                { author: agentName, ...note, timestamp: new Date().toISOString() },
                'notes',
                agentName
            );
            console.log(`  [${agentName}] Added note: ${note.content?.slice(0, 60)}...`);
        }

        for (const task of contributions.tasks || []) {
            await contribute(
                email,
                {
                    ...task,
                    status: 'pending',
                    createdBy: agentName,
                    timestamp: new Date().toISOString(),
                },
                'tasks',
                agentName,
                [`priority:${task.priority}`]
            );
            console.log(`  [${agentName}] Added task: ${task.title}`);
        }

        for (const issue of contributions.issues || []) {
            await contribute(
                email,
                {
                    ...issue,
                    status: 'open',
                    raisedBy: agentName,
                    timestamp: new Date().toISOString(),
                },
                'issues',
                agentName,
                [`severity:${issue.severity}`]
            );
            console.log(`  [${agentName}] Raised issue: ${issue.title}`);
        }

        for (const update of contributions.updates || []) {
            await contribute(
                email,
                { author: agentName, ...update, timestamp: new Date().toISOString() },
                'updates',
                agentName
            );
            console.log(`  [${agentName}] Added update: ${update.summary}`);
        }
    } catch (e) {
        console.log(`  [${agentName}] No structured contributions generated.`);
    }

    console.log(`[${agentName}] Pulse complete.`);
}

// ---------------------------------------------------------------------------
// Agent 2: Product Analytics Agent
// ---------------------------------------------------------------------------

async function productAnalyticsAgent(email: string) {
    const agentName = 'product-analytics-agent';
    console.log(`\n[${agentName}] Starting pulse...`);

    // 1. READ
    const [workspace, governance] = await Promise.all([
        readWorkspace(email),
        getGovernance('product usage analytics and adoption monitoring'),
    ]);

    const context = [
        governance ? `## Guidelines\n\n${governance}` : '',
        workspace ? `## Workspace State\n\n${workspace}` : '',
    ]
        .filter(Boolean)
        .join('\n\n---\n\n');

    // 2. ACT — Analyze usage patterns
    const analysis = await client.ai.prompt({
        context,
        instructions: [
            {
                prompt:
                    'You are a product analytics agent monitoring this account. Based on the workspace state, analyze: (1) usage trends and feature adoption, (2) engagement signals (positive or negative), (3) expansion or contraction signals. Output as JSON: { notes: [{content, category}], tasks: [{title, description, owner, priority}], issues: [{title, description, severity}], updates: [{type, summary}] }. Focus on data-driven observations. Only include NEW insights not already captured.',
                maxSteps: 5,
            },
        ],
    });

    // 3. RECORD
    try {
        const contributions = safeParseJSON<{
            notes?: Array<{ content: string; category: string }>;
            tasks?: Array<{ title: string; description: string; owner: string; priority: string }>;
            issues?: Array<{ title: string; description: string; severity: string }>;
            updates?: Array<{ type: string; summary: string }>;
        }>(String(analysis.data));

        for (const note of contributions.notes || []) {
            await contribute(
                email,
                { author: agentName, ...note, timestamp: new Date().toISOString() },
                'notes',
                agentName
            );
            console.log(`  [${agentName}] Added note: ${note.content?.slice(0, 60)}...`);
        }

        for (const issue of contributions.issues || []) {
            await contribute(
                email,
                {
                    ...issue,
                    status: 'open',
                    raisedBy: agentName,
                    timestamp: new Date().toISOString(),
                },
                'issues',
                agentName,
                [`severity:${issue.severity}`]
            );
            console.log(`  [${agentName}] Raised issue: ${issue.title}`);
        }

        for (const update of contributions.updates || []) {
            await contribute(
                email,
                { author: agentName, ...update, timestamp: new Date().toISOString() },
                'updates',
                agentName
            );
            console.log(`  [${agentName}] Added update: ${update.summary}`);
        }
    } catch (e) {
        console.log(`  [${agentName}] No structured contributions generated.`);
    }

    console.log(`[${agentName}] Pulse complete.`);
}

// ---------------------------------------------------------------------------
// Agent 3: CS Health Agent (Synthesizer)
// ---------------------------------------------------------------------------

async function csHealthAgent(email: string) {
    const agentName = 'cs-health-agent';
    console.log(`\n[${agentName}] Starting pulse...`);

    // 1. READ — This agent reads AFTER the other agents have contributed
    const [workspace, governance] = await Promise.all([
        readWorkspace(email),
        getGovernance(
            'customer success health monitoring and retention strategy'
        ),
    ]);

    const context = [
        governance ? `## Guidelines\n\n${governance}` : '',
        workspace ? `## Workspace State\n\n${workspace}` : '',
    ]
        .filter(Boolean)
        .join('\n\n---\n\n');

    // 2. ACT — Synthesize all signals into a health assessment
    const synthesis = await client.ai.prompt({
        context,
        instructions: [
            {
                prompt:
                    'You are a CS health agent that synthesizes signals from all workspace contributors (sales, product, support, humans) into a holistic health assessment. Based on everything in the workspace: (1) Write a new Context summary (1-2 paragraphs) covering current health, top risks, key opportunities, and recommended next actions. (2) Create any tasks for the account team. (3) Flag any issues that need escalation. Output as JSON: { context: "...", tasks: [{title, description, owner, priority}], issues: [{title, description, severity}], updates: [{type, summary}] }.',
                maxSteps: 5,
            },
        ],
    });

    // 3. RECORD — Rewrite context + add contributions
    try {
        const contributions = safeParseJSON<{
            context?: string;
            tasks?: Array<{ title: string; description: string; owner: string; priority: string }>;
            issues?: Array<{ title: string; description: string; severity: string }>;
            updates?: Array<{ type: string; summary: string }>;
        }>(String(synthesis.data));

        // Rewrite the Context property
        if (contributions.context) {
            await contribute(
                email,
                {
                    author: agentName,
                    context: contributions.context,
                    rewrittenAt: new Date().toISOString(),
                },
                'context',
                agentName
            );
            console.log(
                `  [${agentName}] Rewrote context: ${contributions.context.slice(0, 80)}...`
            );
        }

        for (const task of contributions.tasks || []) {
            await contribute(
                email,
                {
                    ...task,
                    status: 'pending',
                    createdBy: agentName,
                    timestamp: new Date().toISOString(),
                },
                'tasks',
                agentName,
                [`priority:${task.priority}`]
            );
            console.log(`  [${agentName}] Added task: ${task.title}`);
        }

        for (const issue of contributions.issues || []) {
            await contribute(
                email,
                {
                    ...issue,
                    status: 'open',
                    raisedBy: agentName,
                    timestamp: new Date().toISOString(),
                },
                'issues',
                agentName,
                [`severity:${issue.severity}`]
            );
            console.log(`  [${agentName}] Raised issue: ${issue.title}`);
        }

        // Log the synthesis as an update
        await contribute(
            email,
            {
                author: agentName,
                type: 'action',
                summary: 'Synthesized workspace signals into updated health assessment',
                timestamp: new Date().toISOString(),
            },
            'updates',
            agentName
        );
    } catch (e) {
        console.log(`  [${agentName}] No structured contributions generated.`);
    }

    console.log(`[${agentName}] Pulse complete.`);
}

// ---------------------------------------------------------------------------
// Orchestration: Run All Agents
// ---------------------------------------------------------------------------

async function main() {
    // 1. Verify auth
    const me = await client.me();
    if (!me.success) {
        console.error('Auth failed. Check PERSONIZE_SECRET_KEY.');
        process.exit(1);
    }
    console.log(`Authenticated: org=${me.data?.organization.id}`);
    console.log(`Target entity: ${ENTITY_EMAIL}`);
    console.log('Running 3-agent workspace collaboration...\n');

    // 2. Run intelligence agents first (they observe)
    //    These can run in parallel — they read the same state independently
    await Promise.all([
        salesIntelAgent(ENTITY_EMAIL),
        productAnalyticsAgent(ENTITY_EMAIL),
    ]);

    // 3. Run synthesis agent after (it reads what others contributed)
    //    This runs sequentially — it needs the other agents' contributions
    await csHealthAgent(ENTITY_EMAIL);

    // 4. Show the final workspace state
    console.log('\n=== FINAL WORKSPACE STATE ===\n');
    const finalDigest = await readWorkspace(ENTITY_EMAIL);
    console.log(finalDigest);
}

main().catch((err) => {
    console.error('Fatal error:', err.message || err);
    process.exit(1);
});
