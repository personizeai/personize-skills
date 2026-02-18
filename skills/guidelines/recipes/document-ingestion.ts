/**
 * Document Folder Ingestion
 *
 * Reads a folder of existing documents (markdown, text, CSV) and extracts
 * guidelines from them. Ideal for migrating existing wikis, policy
 * documents, Notion exports, or Confluence dumps into centralized governance.
 *
 * Usage:
 *   # Dry run — show what would be created/updated (no changes applied)
 *   npx ts-node recipes/document-ingestion.ts --folder ./company-policies --dry-run
 *
 *   # Full ingestion with admin approval prompts
 *   npx ts-node recipes/document-ingestion.ts --folder ./company-policies
 *
 *   # Auto-apply without prompts (for CI/CD)
 *   npx ts-node recipes/document-ingestion.ts --folder ./company-policies --auto-apply
 *
 *   # Ingest with specific tags
 *   npx ts-node recipes/document-ingestion.ts --folder ./sales-docs --tags "sales,governance"
 *
 *   # Only process specific file types
 *   npx ts-node recipes/document-ingestion.ts --folder ./docs --extensions ".md,.txt"
 *
 * Supported formats:
 *   .md / .mdx   — Markdown (native, no conversion)
 *   .txt         — Plain text (auto-structured)
 *   .csv         — Tabular data (converted to markdown tables)
 *   .json        — Structured data (flattened into sections)
 *
 * Environment:
 *   PERSONIZE_SECRET_KEY=sk_live_...
 */

import 'dotenv/config';
import { Personize } from '@personize/sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

// ─── File Processing ─────────────────────────────────────────────────────────

interface SourceFile {
    name: string;
    path: string;
    extension: string;
    content: string;
    sizeKb: number;
}

function readFolder(folderPath: string, extensions: string[]): SourceFile[] {
    const absPath = path.resolve(folderPath);

    if (!fs.existsSync(absPath)) {
        console.error(`Folder not found: ${absPath}`);
        process.exit(1);
    }

    const files = fs.readdirSync(absPath)
        .filter(f => {
            const ext = path.extname(f).toLowerCase();
            return extensions.includes(ext);
        })
        .map(f => {
            const filePath = path.join(absPath, f);
            const content = fs.readFileSync(filePath, 'utf-8');
            return {
                name: path.basename(f, path.extname(f)),
                path: filePath,
                extension: path.extname(f).toLowerCase(),
                content,
                sizeKb: Math.round(content.length / 1024),
            };
        })
        .filter(f => f.content.trim().length > 0);

    return files;
}

// ─── Content Conversion ─────────────────────────────────────────────────────

function csvToMarkdown(csv: string): string {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return csv;

    const headers = lines[0].split(',').map(h => h.trim());
    const separator = headers.map(() => '---').join(' | ');
    const rows = lines.slice(1).map(line =>
        line.split(',').map(c => c.trim()).join(' | ')
    );

    return `| ${headers.join(' | ')} |\n| ${separator} |\n${rows.map(r => `| ${r} |`).join('\n')}`;
}

function jsonToMarkdown(json: string): string {
    try {
        const data = JSON.parse(json);
        if (Array.isArray(data)) {
            return data.map((item, i) => {
                const entries = Object.entries(item)
                    .map(([k, v]) => `- **${k}:** ${v}`)
                    .join('\n');
                return `### Item ${i + 1}\n\n${entries}`;
            }).join('\n\n');
        }
        return Object.entries(data)
            .map(([k, v]) => `## ${k}\n\n${typeof v === 'object' ? JSON.stringify(v, null, 2) : v}`)
            .join('\n\n');
    } catch {
        return json;
    }
}

function preprocessContent(file: SourceFile): string {
    switch (file.extension) {
        case '.csv': return csvToMarkdown(file.content);
        case '.json': return jsonToMarkdown(file.content);
        default: return file.content;
    }
}

// ─── Variable Name Generation ────────────────────────────────────────────────

function toVariableName(filename: string): string {
    return filename
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .replace(/-{2,}/g, '-');
}

// ─── Ingestion Engine ────────────────────────────────────────────────────────

interface IngestionPlan {
    creates: Array<{
        name: string;
        source: string;
        value: string;
        tags: string[];
        description: string;
    }>;
    updates: Array<{
        id: string;
        name: string;
        source: string;
        value: string;
        updateMode: string;
        historyNote: string;
    }>;
    skipped: Array<{
        source: string;
        reason: string;
    }>;
}

async function buildIngestionPlan(
    files: SourceFile[],
    defaultTags: string[],
): Promise<IngestionPlan> {
    const plan: IngestionPlan = { creates: [], updates: [], skipped: [] };

    // Fetch existing variables
    const existing = await client.variables.list();
    const existingByName = new Map(
        existing.actions.map((v: any) => [v.payload.name, v])
    );

    for (const file of files) {
        const content = preprocessContent(file);
        const variableName = toVariableName(file.name);

        // Check if too small to be useful
        if (content.length < 50) {
            plan.skipped.push({
                source: file.name,
                reason: `Too small (${content.length} chars) — likely not a policy document`,
            });
            continue;
        }

        // Check for existing variable with same name
        const existingVar = existingByName.get(variableName);

        if (existingVar) {
            // Propose update (merge content)
            plan.updates.push({
                id: existingVar.id,
                name: variableName,
                source: file.name,
                value: content,
                updateMode: 'replace',
                historyNote: `Document ingestion: re-imported from ${file.path}`,
            });
        } else {
            // Propose creation
            const hasH1 = content.startsWith('# ');
            const value = hasH1 ? content : `# ${file.name}\n\n${content}`;

            // Extract a description from the first paragraph
            const firstParagraph = content
                .split('\n\n')
                .find(p => p.trim() && !p.startsWith('#'));
            const description = firstParagraph
                ? firstParagraph.substring(0, 150).trim() + (firstParagraph.length > 150 ? '...' : '')
                : `Imported from ${file.name}`;

            plan.creates.push({
                name: variableName,
                source: file.name,
                value,
                tags: defaultTags,
                description,
            });
        }
    }

    return plan;
}

// ─── Interactive Approval ────────────────────────────────────────────────────

async function askConfirmation(question: string): Promise<boolean> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(`${question} (y/n): `, answer => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}

// ─── Execute Plan ────────────────────────────────────────────────────────────

async function executePlan(plan: IngestionPlan, autoApply: boolean): Promise<void> {
    let applied = 0;
    let skipped = 0;

    // Process creates
    for (const item of plan.creates) {
        console.log(`\n  📄 CREATE: "${item.name}" (from ${item.source})`);
        console.log(`     Tags: ${item.tags.join(', ')}`);
        console.log(`     Size: ${Math.round(item.value.length / 1024)}KB`);
        console.log(`     Description: ${item.description}`);

        const proceed = autoApply || await askConfirmation('     Apply?');
        if (proceed) {
            await client.variables.create({
                name: item.name,
                value: item.value,
                tags: item.tags,
                description: item.description,
            });
            console.log(`     ✅ Created.`);
            applied++;
        } else {
            console.log(`     ⏭️  Skipped.`);
            skipped++;
        }
    }

    // Process updates
    for (const item of plan.updates) {
        console.log(`\n  🔄 UPDATE: "${item.name}" (from ${item.source})`);
        console.log(`     Mode: ${item.updateMode}`);
        console.log(`     Size: ${Math.round(item.value.length / 1024)}KB`);

        const proceed = autoApply || await askConfirmation('     Apply?');
        if (proceed) {
            await client.variables.update(item.id, {
                value: item.value,
                updateMode: item.updateMode as any,
                historyNote: item.historyNote,
            });
            console.log(`     ✅ Updated.`);
            applied++;
        } else {
            console.log(`     ⏭️  Skipped.`);
            skipped++;
        }
    }

    console.log(`\n📊 Summary: ${applied} applied, ${skipped} skipped, ${plan.skipped.length} ineligible`);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2);
    const getArg = (flag: string) => {
        const idx = args.indexOf(flag);
        return idx >= 0 ? args[idx + 1] : undefined;
    };
    const hasFlag = (flag: string) => args.includes(flag);

    const folder = getArg('--folder');
    if (!folder) {
        console.log(`
Document Folder Ingestion — Batch-import policies from a folder of documents.

Usage:
  npx ts-node recipes/document-ingestion.ts --folder <path> [options]

Options:
  --folder <path>          Path to folder containing documents (required)
  --tags <csv>             Tags to apply (default: "governance,imported")
  --extensions <csv>       File extensions to process (default: ".md,.txt,.csv,.json")
  --dry-run                Show plan without applying changes
  --auto-apply             Apply all changes without prompts

Examples:
  npx ts-node recipes/document-ingestion.ts --folder ./company-policies --dry-run
  npx ts-node recipes/document-ingestion.ts --folder ./sales-docs --tags "sales,governance"
  npx ts-node recipes/document-ingestion.ts --folder ./wiki-export --auto-apply
`);
        process.exit(0);
    }

    const tags = (getArg('--tags') || 'governance,imported').split(',').map(t => t.trim());
    const extensions = (getArg('--extensions') || '.md,.txt,.csv,.json').split(',').map(e => e.trim());
    const dryRun = hasFlag('--dry-run');
    const autoApply = hasFlag('--auto-apply');

    console.log(`\n📂 Document Folder Ingestion`);
    console.log(`   Folder:     ${path.resolve(folder)}`);
    console.log(`   Extensions: ${extensions.join(', ')}`);
    console.log(`   Tags:       ${tags.join(', ')}`);
    console.log(`   Mode:       ${dryRun ? 'DRY RUN' : autoApply ? 'AUTO-APPLY' : 'INTERACTIVE'}\n`);

    // 1. Read files
    const files = readFolder(folder, extensions);
    console.log(`   Found ${files.length} files to process.\n`);

    if (files.length === 0) {
        console.log('   No files found matching the specified extensions.');
        process.exit(0);
    }

    for (const f of files) {
        console.log(`   ${f.extension.padEnd(6)} ${f.name} (${f.sizeKb}KB)`);
    }

    // 2. Build ingestion plan
    console.log(`\n🔍 Building ingestion plan...\n`);
    const plan = await buildIngestionPlan(files, tags);

    // 3. Show plan
    console.log(`\n📋 Ingestion Plan:`);
    console.log(`   CREATE: ${plan.creates.length} new variables`);
    console.log(`   UPDATE: ${plan.updates.length} existing variables`);
    console.log(`   SKIP:   ${plan.skipped.length} ineligible files`);

    if (plan.skipped.length > 0) {
        console.log(`\n   Skipped files:`);
        for (const s of plan.skipped) {
            console.log(`     - ${s.source}: ${s.reason}`);
        }
    }

    // 4. Execute (or just show plan for dry run)
    if (dryRun) {
        console.log(`\n🏁 Dry run complete. No changes applied.`);
        console.log(`   Remove --dry-run to apply changes.`);
    } else {
        await executePlan(plan, autoApply);

        // 5. Verify
        console.log(`\n🔍 Verifying governance visibility...\n`);
        const created = plan.creates.map(c => c.name);
        for (const name of created.slice(0, 3)) {
            const verify = await client.ai.smartContext({ message: name.replace(/-/g, ' ') });
            const found = verify.data?.compiledContext?.length > 0;
            console.log(`   ${found ? '✅' : '⏳'} ${name}: ${found ? 'visible' : 'pending'}`);
        }
        if (created.length > 3) {
            console.log(`   ... and ${created.length - 3} more.`);
        }
    }
}

main().catch(err => {
    console.error('Error:', err.message || err);
    process.exit(1);
});
