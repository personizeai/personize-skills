#!/usr/bin/env npx ts-node

/**
 * Recipe: Context Assembly
 *
 * Demonstrates the three-layer context assembly pattern:
 *   Layer 1: smartGuidelines()  → organizational rules and guidelines
 *   Layer 2: smartDigest()   → entity-level context (who is this person?)
 *   Layer 3: recall()        → task-specific facts from memory
 *
 * Usage:
 *   npx ts-node recipes/context-assembly.ts
 *
 * Prerequisites:
 *   - PERSONIZE_SECRET_KEY env var set
 *   - @personize/sdk installed
 *   - Some data already memorized (run data-sync.ts first)
 */

import { Personize } from '@personize/sdk';

const client = new Personize({
    secretKey: process.env.PERSONIZE_SECRET_KEY!,
});

// ---------------------------------------------------------------------------
// Core: Three-Layer Context Assembly
// ---------------------------------------------------------------------------

interface AssembledContext {
    governance: string | null;
    entity: string | null;
    facts: string | null;
    combined: string;
    tokenEstimate: number;
}

/**
 * Assemble complete context for a generation task.
 *
 * Fetches three layers in parallel for speed:
 *   1. Governance (smartGuidelines) — rules, guidelines, tone
 *   2. Entity (smartDigest) — everything about this person/company
 *   3. Facts (recall) — task-specific memories
 *
 * @param email - Contact email to build context for
 * @param task - What you're generating (e.g., "cold outreach email about SOC2")
 * @param options - Optional overrides for token budgets and thresholds
 */
async function assembleContext(
    email: string,
    task: string,
    options?: {
        entityTokenBudget?: number;
        recallLimit?: number;
        recallMinScore?: number;
        governanceTags?: string[];
        skipGovernance?: boolean;
        skipEntity?: boolean;
        skipRecall?: boolean;
    }
): Promise<AssembledContext> {
    const {
        entityTokenBudget = 2000,
        recallLimit = 10,
        recallMinScore = 0.3,
        governanceTags,
        skipGovernance = false,
        skipEntity = false,
        skipRecall = false,
    } = options || {};

    // Fetch all layers in parallel
    const [governanceResult, digestResult, recallResult] = await Promise.all([
        skipGovernance
            ? Promise.resolve(null)
            : client.ai.smartGuidelines({
                  message: `${task} — guidelines, tone, constraints`,
                  tags: governanceTags,
              }),
        skipEntity
            ? Promise.resolve(null)
            : client.memory.smartDigest({
                  email,
                  type: 'Contact',
                  token_budget: entityTokenBudget,
                  include_properties: true,
                  include_memories: true,
              }),
        skipRecall
            ? Promise.resolve(null)
            : client.memory.smartRecall({
                  query: task,
                  email,
                  limit: recallLimit,
                  min_score: recallMinScore,
                  mode: 'fast',
              }),
    ]);

    // Extract content from each layer
    const governance = governanceResult?.data?.compiledContext || null;
    const entity = digestResult?.data?.compiledContext || null;

    let facts: string | null = null;
    if (
        recallResult?.data?.results &&
        Array.isArray(recallResult.data.results) &&
        recallResult.data.results.length > 0
    ) {
        facts = recallResult.data.results
            .map((m: any) => `- ${m.text || m.content || JSON.stringify(m)}`)
            .join('\n');
    }

    // Combine into sections
    const sections: string[] = [];
    if (governance) sections.push('## Guidelines\n\n' + governance);
    if (entity) sections.push('## Recipient Context\n\n' + entity);
    if (facts) sections.push('## Relevant Facts\n\n' + facts);

    const combined = sections.join('\n\n---\n\n');

    // Rough token estimate (1 token ≈ 4 chars)
    const tokenEstimate = Math.ceil(combined.length / 4);

    return { governance, entity, facts, combined, tokenEstimate };
}

// ---------------------------------------------------------------------------
// Store Generated Output (Feedback Loop)
// ---------------------------------------------------------------------------

/**
 * After generating content, store it back into memory so the AI
 * knows what it already said/did for this contact.
 */
async function storeGeneratedOutput(
    email: string,
    output: string,
    metadata: {
        type: string; // e.g., 'cold-outreach', 'follow-up', 'report'
        subject?: string;
        tags?: string[];
    }
): Promise<void> {
    const content = metadata.subject
        ? `Subject: ${metadata.subject}\n\n${output}`
        : output;

    await client.memory.memorize({
        content,
        speaker: 'AI Agent',
        email,
        enhanced: true,
        tags: [
            'ai-output',
            `type:${metadata.type}`,
            ...(metadata.tags || []),
        ],
        timestamp: new Date().toISOString(),
    });
}

// ---------------------------------------------------------------------------
// Demo: End-to-End Pipeline
// ---------------------------------------------------------------------------

async function main() {
    const EMAIL = 'sarah.chen@initech.com';
    const TASK = 'write a follow-up email about SOC2 compliance tools';

    // 1. Verify auth
    const me = await client.me();
    if (!me.success) {
        console.error('Auth failed. Check PERSONIZE_SECRET_KEY.');
        process.exit(1);
    }
    console.log(`Authenticated: org=${me.data?.organization.id}\n`);

    // 2. Assemble context
    console.log(`Assembling context for: ${EMAIL}`);
    console.log(`Task: ${TASK}\n`);

    const context = await assembleContext(EMAIL, TASK, {
        entityTokenBudget: 2000,
        recallLimit: 10,
        recallMinScore: 0.3,
    });

    console.log('--- ASSEMBLED CONTEXT ---\n');
    console.log(context.combined);
    console.log(`\n--- END (≈${context.tokenEstimate} tokens) ---\n`);

    // 3. Show what's available per layer
    console.log('Layers:');
    console.log(`  Governance: ${context.governance ? 'yes' : 'none'}`);
    console.log(`  Entity:     ${context.entity ? 'yes' : 'none'}`);
    console.log(`  Facts:      ${context.facts ? 'yes' : 'none'}`);

    // 4. Example: store a generated output back into memory
    // (uncomment to actually store)
    //
    // const generatedEmail = 'Hi Sarah, following up on our conversation about SOC2...';
    // await storeGeneratedOutput(EMAIL, generatedEmail, {
    //     type: 'follow-up',
    //     subject: 'SOC2 Compliance — Next Steps',
    //     tags: ['source:pipeline'],
    // });
    // console.log('\nStored generated output back into memory.');
}

main().catch((err) => {
    console.error('Fatal error:', err.message || err);
    process.exit(1);
});
