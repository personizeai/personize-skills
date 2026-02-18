/**
 * Recipe: Meeting Prep Brief
 *
 * Generates a one-page meeting prep brief for a specific contact before a call or meeting.
 * Uses: RECALL → REASON → GENERATE (no OBSERVE or ACT — on-demand, not scheduled).
 *
 * Usage:
 *   PERSONIZE_SECRET_KEY=sk_live_... npx ts-node recipes/meeting-prep-brief.ts john@acme.com
 *   PERSONIZE_SECRET_KEY=sk_live_... npx ts-node recipes/meeting-prep-brief.ts john@acme.com --output brief.md
 */

import { Personize } from '@personize/sdk';
import 'dotenv/config';
import * as fs from 'fs';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

async function generateBrief(email: string): Promise<string> {
    console.log(`Generating meeting prep brief for ${email}...\n`);

    // RECALL — assemble everything known about this contact
    const sections: string[] = [];

    // Governance variables — meeting prep guidelines
    const vars = await client.ai.smartContext({
        message: 'meeting preparation guidelines, talking points framework, sales methodology',
    });
    if (vars.data?.compiledContext) {
        sections.push('## Guidelines\n' + vars.data.compiledContext);
    }

    // Full entity digest
    const digest = await client.memory.smartDigest({
        email,
        type: 'Contact',
        token_budget: 3000,
        include_properties: true,
        include_memories: true,
    });
    if (digest.data?.compiledContext) {
        sections.push('## Contact Context\n' + digest.data.compiledContext);
    }

    // Specific recalls for different aspects
    const topics = [
        'past meetings, call notes, interactions',
        'objections, concerns, blockers mentioned',
        'deal stage, timeline, decision makers',
    ];

    for (const topic of topics) {
        const recalled = await client.memory.recall({
            query: topic,
            email,
            limit: 5,
            minScore: 0.4,
        });
        if (recalled.data && Array.isArray(recalled.data) && recalled.data.length > 0) {
            sections.push(`## Recalled: ${topic}\n` + recalled.data.map((m: any) =>
                `- ${m.text || m.content || JSON.stringify(m)}`
            ).join('\n'));
        }
    }

    const context = sections.join('\n\n---\n\n');

    // REASON + GENERATE — multi-step brief creation
    const result = await client.ai.prompt({
        context,
        instructions: [
            {
                prompt: `Create a meeting prep brief for ${email}. Structure it as:

## Contact Summary
Name, role, company, key facts.

## Relationship History
Past interactions, what we've discussed, current deal stage.

## Key Talking Points
3-5 specific topics to raise based on their needs and what we know.

## Landmines
Topics to avoid, known objections, sensitivities.

## Open Questions
Things we still need to learn about this contact.

## Meeting Goal
What we should aim to achieve in this meeting.

Use ONLY facts from the context — do not make anything up. If a section has no data, say "No data available" rather than guessing.`,
                maxSteps: 5,
            },
        ],
        evaluate: true,
        evaluationCriteria: 'Brief must only reference facts present in the provided context. No fabricated details.',
    });

    return String(result.data || 'No brief generated');
}

async function run() {
    const email = process.argv[2];
    if (!email || email.startsWith('--')) {
        console.error('Usage: npx ts-node recipes/meeting-prep-brief.ts <email> [--output <file>]');
        process.exit(1);
    }

    const outputIdx = process.argv.indexOf('--output');
    const outputFile = outputIdx !== -1 ? process.argv[outputIdx + 1] : null;

    const { data: me } = await client.me();
    if (!me) throw new Error('Auth failed');

    const brief = await generateBrief(email);

    if (outputFile) {
        fs.writeFileSync(outputFile, brief);
        console.log(`Brief written to ${outputFile}`);
    } else {
        console.log('\n' + '='.repeat(60));
        console.log(brief);
        console.log('='.repeat(60));
    }
}

run().catch(err => { console.error('Fatal:', err.message || err); process.exit(1); });
