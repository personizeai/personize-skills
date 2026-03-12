#!/usr/bin/env npx ts-node

/**
 * Recipe: Trigger.dev → Workspace Bridge
 *
 * Demonstrates a Trigger.dev pipeline that contributes analysis results
 * back to a shared workspace. This bridges two Personize skills:
 *
 *   - **GTM Workflows Builder** (Trigger.dev) — runs the pipeline
 *   - **Shared Workspace** — stores the collaboration state
 *
 * Pattern: A CRM lead-review task analyzes a contact, then writes its
 * findings (notes, tasks, issues) to the contact's workspace so other
 * agents and humans see what was discovered.
 *
 * Usage:
 *   Deploy as a Trigger.dev task and trigger via API or schedule.
 *
 * Prerequisites:
 *   - PERSONIZE_SECRET_KEY env var set
 *   - @personize/sdk installed
 *   - A workspace collection created for the entity type
 *
 * Cross-reference:
 *   - Skills/code-pipelines — pipeline scaffold
 *   - Skills/collaboration — workspace protocol
 */

import { Personize } from '@personize/sdk';
import { safeParseJSON, contributeEntry } from './helpers';

const client = new Personize({
    secretKey: process.env.PERSONIZE_SECRET_KEY!,
});

// ---------------------------------------------------------------------------
// Pipeline: Analyze a Lead and Write to Workspace
// ---------------------------------------------------------------------------

interface LeadReviewInput {
    email: string;
    source?: string; // e.g. 'hubspot', 'salesforce', 'csv-import'
}

async function reviewLeadAndContribute(input: LeadReviewInput) {
    const agentName = 'lead-review-pipeline';
    const { email } = input;

    // 1. READ — Get current workspace state + governance
    const [digest, governance] = await Promise.all([
        client.memory.smartDigest({
            email,
            type: 'Contact',
            token_budget: 2000,
            include_properties: true,
            include_memories: true,
        }),
        client.ai.smartGuidelines({
            message: 'lead qualification, ICP matching, sales intelligence',
            mode: 'fast',
        }),
    ]);

    const context = [
        governance.data?.compiledContext ? `## Guidelines\n\n${governance.data.compiledContext}` : '',
        digest.data?.compiledContext ? `## Workspace State\n\n${digest.data.compiledContext}` : '',
    ]
        .filter(Boolean)
        .join('\n\n---\n\n');

    // 2. ACT — Analyze the lead using Personize prompt
    const analysis = await client.ai.prompt({
        context,
        instructions: [
            {
                prompt:
                    'You are a lead qualification agent. Based on the workspace state and guidelines, analyze this lead. Determine: (1) ICP fit score (1-10), (2) key qualification signals, (3) recommended next actions. Output as JSON: { notes: [{content, category}], tasks: [{title, description, owner, priority}], issues: [{title, description, severity}], updates: [{type, summary}] }. Only include NEW insights not already in the workspace.',
                maxSteps: 5,
            },
        ],
    });

    // 3. RECORD — Write contributions to the workspace
    const contributions = safeParseJSON<{
        notes?: Array<{ content: string; category: string }>;
        tasks?: Array<{ title: string; description: string; owner: string; priority: string }>;
        issues?: Array<{ title: string; description: string; severity: string }>;
        updates?: Array<{ type: string; summary: string }>;
    }>(String(analysis.data));

    for (const note of contributions.notes || []) {
        await contributeEntry(
            client,
            email,
            { author: agentName, ...note, timestamp: new Date().toISOString() },
            'notes',
            agentName
        );
        console.log(`  [${agentName}] Added note: ${note.content?.slice(0, 60)}...`);
    }

    for (const task of contributions.tasks || []) {
        await contributeEntry(
            client,
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
        await contributeEntry(
            client,
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
        await contributeEntry(
            client,
            email,
            { author: agentName, ...update, timestamp: new Date().toISOString() },
            'updates',
            agentName
        );
        console.log(`  [${agentName}] Added update: ${update.summary}`);
    }

    console.log(`[${agentName}] Pipeline complete for ${email}.`);
}

// ---------------------------------------------------------------------------
// Main — Run standalone or adapt as a Trigger.dev task
// ---------------------------------------------------------------------------

async function main() {
    const me = await client.me();
    if (!me.success) {
        console.error('Auth failed. Check PERSONIZE_SECRET_KEY.');
        process.exit(1);
    }
    console.log(`Authenticated: org=${me.data?.organization.id}\n`);

    // Example: review a lead and contribute findings to its workspace
    await reviewLeadAndContribute({
        email: 'lead@prospect.com',
        source: 'hubspot',
    });
}

main().catch((err) => {
    console.error('Fatal error:', err.message || err);
    process.exit(1);
});
