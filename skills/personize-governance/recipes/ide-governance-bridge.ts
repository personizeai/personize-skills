/**
 * IDE Governance Bridge
 *
 * Bidirectional bridge between your IDE/codebase and centralized governance.
 * Developers fetch organizational guidelines before coding and push learnings
 * back after fixing bugs, discovering patterns, or solving issues.
 *
 * Works with: Claude Code, Codex, Cursor, Gemini, Copilot, or any AI-powered IDE.
 *
 * Usage:
 *   # Fetch governance context for a topic
 *   npx ts-node recipes/ide-governance-bridge.ts fetch "API authentication standards"
 *
 *   # Push a learning back to governance
 *   npx ts-node recipes/ide-governance-bridge.ts learn \
 *     --variable "engineering-standards" \
 *     --section "## Known Issues & Solutions" \
 *     --title "Connection Pool Exhaustion" \
 *     --content "Always use try/finally for connection cleanup..."
 *
 *   # Generate a local CLAUDE.md from governance
 *   npx ts-node recipes/ide-governance-bridge.ts generate-claude-md \
 *     --tags "engineering" \
 *     --output "./CLAUDE.md"
 *
 *   # List all guidelines (see what's available)
 *   npx ts-node recipes/ide-governance-bridge.ts list
 *
 *   # Show the structure of a specific variable
 *   npx ts-node recipes/ide-governance-bridge.ts structure "engineering-standards"
 *
 * Environment:
 *   PERSONIZE_SECRET_KEY=sk_live_...
 */

import 'dotenv/config';
import { Personize } from '@personize/sdk';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

// ─── FETCH: Get governance context for a topic ───────────────────────────────

async function fetchGovernance(topic: string, tags?: string[]) {
    console.log(`\n📖 Fetching governance for: "${topic}"${tags ? ` [tags: ${tags.join(', ')}]` : ''}\n`);

    const result = await client.ai.smartGuidelines({
        message: topic,
        ...(tags ? { tags } : {}),
    });

    if (result.data?.compiledContext) {
        console.log('─── Governance Context ───────────────────────────────');
        console.log(result.data.compiledContext);
        console.log('─────────────────────────────────────────────────────');

        if (result.data.selection?.length) {
            console.log(`\nSources: ${result.data.selection.map((s: any) => s.name || s.id).join(', ')}`);
        }
    } else {
        console.log('No governance found for this topic. Consider creating a guideline.');
    }

    return result.data;
}

// ─── LEARN: Push a learning back to governance ───────────────────────────────

interface Learning {
    variable: string;       // variable name (e.g., "engineering-standards")
    section: string;        // section header (e.g., "## Known Issues")
    title: string;          // learning title
    content: string;        // learning content (markdown)
    historyNote?: string;   // optional custom history note
}

async function pushLearning(learning: Learning) {
    console.log(`\n📝 Pushing learning to governance...`);
    console.log(`   Variable: ${learning.variable}`);
    console.log(`   Section:  ${learning.section}`);
    console.log(`   Title:    ${learning.title}\n`);

    // Find the target variable
    const variables = await client.guidelines.list();
    const target = (variables.data?.actions || []).find(
        (v: any) => v.payload.name === learning.variable
    );

    if (!target) {
        console.error(`Variable "${learning.variable}" not found. Available variables:`);
        (variables.data?.actions || []).forEach((v: any) => console.log(`  - ${v.payload.name}`));
        process.exit(1);
    }

    // Format the learning as a markdown subsection
    const formattedContent = `\n\n### ${learning.title}\n\n${learning.content}`;

    // Append to the target section
    await client.guidelines.update(target.id, {
        value: formattedContent,
        updateMode: 'appendToSection',
        sectionHeader: learning.section,
        historyNote: learning.historyNote || `IDE learning: added "${learning.title}"`,
    });

    console.log(`✅ Learning pushed successfully.`);

    // Verify it surfaces
    const verify = await client.ai.smartGuidelines({ message: learning.title });
    if (verify.data?.compiledContext?.includes(learning.title)) {
        console.log(`✅ Verified: learning surfaces in smartGuidelines.`);
    } else {
        console.log(`⚠️  Learning saved but not yet surfacing in smartGuidelines. This may take a moment.`);
    }
}

// ─── LIST: Show all guidelines ─────────────────────────────────────

async function listVariables() {
    const variables = await client.guidelines.list();
    console.log(`\n📋 Governance Variables (${variables.data?.count ?? 0} total)\n`);

    for (const v of variables.data?.actions || []) {
        const tags = v.payload.tags?.length ? ` [${v.payload.tags.join(', ')}]` : '';
        const desc = v.payload.description ? ` — ${v.payload.description}` : '';
        console.log(`  ${v.payload.name}${tags}${desc}`);
    }
}

// ─── STRUCTURE: Show the TOC of a variable ───────────────────────────────────

async function showStructure(variableName: string) {
    const variables = await client.guidelines.list();
    const target = (variables.data?.actions || []).find(
        (v: any) => v.payload.name === variableName
    );

    if (!target) {
        console.error(`Variable "${variableName}" not found.`);
        process.exit(1);
    }

    const structure = await client.guidelines.getStructure(target.id);
    console.log(`\n📑 Structure of "${variableName}"\n`);

    for (const heading of structure.data.headings) {
        const indent = heading.startsWith('###') ? '    ' : heading.startsWith('##') ? '  ' : '';
        console.log(`${indent}${heading}`);
    }
}

// ─── GENERATE: Create a local CLAUDE.md from governance ──────────────────────

async function generateClaudeMd(tags?: string[], outputPath: string = './GOVERNANCE-CONTEXT.md') {
    console.log(`\n🔨 Generating governance context file...`);

    // Prevent path traversal: resolve the output path and ensure it stays
    // within the current working directory.
    const pathModule = await import('path');
    const resolvedOutput = pathModule.resolve(outputPath);
    const cwd = process.cwd();
    if (!resolvedOutput.startsWith(cwd + pathModule.sep) && resolvedOutput !== cwd) {
        console.error(`Error: --output path must be inside the current directory.\n  Resolved: ${resolvedOutput}\n  Allowed:  ${cwd}`);
        process.exit(1);
    }
    // Only allow .md and .txt output files
    const ext = pathModule.extname(resolvedOutput).toLowerCase();
    if (ext !== '.md' && ext !== '.txt') {
        console.error(`Error: --output must be a .md or .txt file (got "${ext}").`);
        process.exit(1);
    }

    const variables = await client.guidelines.list();
    const filtered = tags
        ? (variables.data?.actions || []).filter((v: any) => v.payload.tags?.some((t: string) => tags.includes(t)))
        : variables.data?.actions || [];

    let content = `# Organizational Governance\n\n`;
    content += `> Auto-generated from centralized governance. Do not edit directly.\n`;
    content += `> Re-generate with: npx ts-node recipes/ide-governance-bridge.ts generate-claude-md${tags ? ` --tags "${tags.join(',')}"` : ''}\n\n`;
    content += `---\n\n`;

    for (const v of filtered) {
        content += `## ${v.payload.name}\n\n`;
        if (v.payload.description) {
            content += `> ${v.payload.description}\n\n`;
        }
        content += `${v.payload.value}\n\n---\n\n`;
    }

    const fs = await import('fs');
    fs.writeFileSync(resolvedOutput, content, 'utf-8');
    console.log(`✅ Written to ${resolvedOutput} (${filtered.length} variables)`);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

async function main() {
    const [command, ...args] = process.argv.slice(2);

    switch (command) {
        case 'fetch': {
            const topic = args[0];
            if (!topic) { console.error('Usage: fetch "<topic>"'); process.exit(1); }
            const tagsIdx = args.indexOf('--tags');
            const tags = tagsIdx >= 0 ? args[tagsIdx + 1]?.split(',') : undefined;
            await fetchGovernance(topic, tags);
            break;
        }

        case 'learn': {
            const getArg = (flag: string) => {
                const idx = args.indexOf(flag);
                return idx >= 0 ? args[idx + 1] : undefined;
            };
            const variable = getArg('--variable');
            const section = getArg('--section');
            const title = getArg('--title');
            const content = getArg('--content');
            if (!variable || !section || !title || !content) {
                console.error('Usage: learn --variable "<name>" --section "## Section" --title "Title" --content "Content"');
                process.exit(1);
            }
            await pushLearning({ variable, section, title, content, historyNote: getArg('--note') });
            break;
        }

        case 'list':
            await listVariables();
            break;

        case 'structure': {
            const name = args[0];
            if (!name) { console.error('Usage: structure "<variable-name>"'); process.exit(1); }
            await showStructure(name);
            break;
        }

        case 'generate-claude-md': {
            const tagsIdx = args.indexOf('--tags');
            const tags = tagsIdx >= 0 ? args[tagsIdx + 1]?.split(',') : undefined;
            const outIdx = args.indexOf('--output');
            const output = outIdx >= 0 ? args[outIdx + 1] : undefined;
            await generateClaudeMd(tags, output);
            break;
        }

        default:
            console.log(`
IDE Governance Bridge — Bidirectional sync between your IDE and centralized governance.

Commands:
  fetch "<topic>"                         Fetch governance context for a topic
  learn --variable --section --title --content   Push a learning to governance
  list                                    List all guidelines
  structure "<variable-name>"             Show the structure (TOC) of a variable
  generate-claude-md [--tags] [--output]  Generate a local governance file

Examples:
  npx ts-node recipes/ide-governance-bridge.ts fetch "cold email best practices"
  npx ts-node recipes/ide-governance-bridge.ts fetch "API security" --tags "engineering"
  npx ts-node recipes/ide-governance-bridge.ts learn \\
    --variable "engineering-standards" \\
    --section "## Known Issues" \\
    --title "Memory Leak in Worker Threads" \\
    --content "Always call worker.terminate() in finally blocks."
  npx ts-node recipes/ide-governance-bridge.ts list
  npx ts-node recipes/ide-governance-bridge.ts generate-claude-md --tags "engineering,security"
`);
    }
}

main().catch(err => {
    console.error('Error:', err.message || err);
    process.exit(1);
});
