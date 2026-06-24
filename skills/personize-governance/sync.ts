#!/usr/bin/env npx ts-node

/**
 * Governance Sync — Sync local .md files to Personize variables.
 *
 * Usage:
 *   npx ts-node sync.ts [directory] [--dry-run] [--delete] [--pull]
 *
 * Examples:
 *   npx ts-node sync.ts --dry-run
 *   npx ts-node sync.ts governance/variables
 *   npx ts-node sync.ts --pull
 *   npx ts-node sync.ts --delete
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ALLOW_DELETE = args.includes('--delete');
const PULL = args.includes('--pull');
const DIR = args.find(a => !a.startsWith('--')) || 'governance/variables';

// ---------------------------------------------------------------------------
// Frontmatter parser (no external deps)
// ---------------------------------------------------------------------------
interface ParsedFile {
    name: string;
    value: string;
    tags: string[];
    description: string;
}

function parseFrontmatter(raw: string): { meta: Record<string, any>; body: string } {
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) return { meta: {}, body: raw };

    const metaBlock = match[1];
    const body = match[2];
    const meta: Record<string, any> = {};

    for (const line of metaBlock.split(/\r?\n/)) {
        const kv = line.match(/^(\w+):\s*(.+)$/);
        if (!kv) continue;
        const [, key, val] = kv;
        // Parse array syntax: [a, b, c]
        const arrMatch = val.match(/^\[(.+)\]$/);
        if (arrMatch) {
            meta[key] = arrMatch[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
        } else {
            meta[key] = val.trim();
        }
    }

    return { meta, body };
}

function readLocalVariables(dir: string): ParsedFile[] {
    if (!fs.existsSync(dir)) {
        console.log(`Directory not found: ${dir}`);
        return [];
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') && !f.startsWith('_'));
    return files.map(file => {
        const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
        const { meta, body } = parseFrontmatter(raw);
        return {
            name: path.basename(file, '.md'),
            value: body.trim(),
            tags: Array.isArray(meta.tags) ? meta.tags : [],
            description: typeof meta.description === 'string' ? meta.description : '',
        };
    });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    // Dynamic import — works both as standalone npm project and within the SDK monorepo
    let Personize: any;
    try {
        ({ Personize } = await import('@personize/sdk'));
    } catch {
        // Fallback for running from within the SDK source tree
        ({ Personize } = await import('../../src/index'));
    }

    const secretKey = process.env.PERSONIZE_SECRET_KEY;
    if (!secretKey) {
        console.error('Error: PERSONIZE_SECRET_KEY env var is required');
        process.exit(1);
    }

    const client = new Personize({ secretKey });

    // Verify auth
    const me = await client.me();
    if (!me.success || !me.data) {
        console.error('Error: Failed to authenticate. Check your PERSONIZE_SECRET_KEY.');
        process.exit(1);
    }
    console.log(`Authenticated as org ${me.data.organization.id}\n`);

    if (PULL) {
        return pullMode(client);
    }
    return pushMode(client);
}

// ---------------------------------------------------------------------------
// Push mode: local -> remote
// ---------------------------------------------------------------------------
async function pushMode(client: any) {
    const local = readLocalVariables(DIR);
    console.log(`Local variables: ${local.length} files in ${DIR}/`);

    const remoteRes = await client.guidelines.list();
    const remoteVars: Array<{ id: string; payload: { name: string; value: string; tags?: string[] } }> =
        remoteRes.data?.actions || [];
    console.log(`Remote variables: ${remoteVars.length}\n`);

    // Build lookup by name
    const remoteByName = new Map(remoteVars.map(v => [v.payload.name, v]));

    let created = 0, updated = 0, deleted = 0, unchanged = 0;

    // Create / Update
    for (const file of local) {
        const remote = remoteByName.get(file.name);

        if (!remote) {
            // CREATE
            console.log(`  + CREATE  ${file.name}`);
            if (!DRY_RUN) {
                await client.guidelines.create({
                    name: file.name,
                    value: file.value,
                    tags: file.tags,
                    description: file.description,
                });
            }
            created++;
        } else {
            // Compare values (trimmed)
            const remoteValue = (remote.payload.value || '').trim();
            if (file.value !== remoteValue) {
                console.log(`  ~ UPDATE  ${file.name}`);
                if (!DRY_RUN) {
                    await client.guidelines.update(remote.id, {
                        value: file.value,
                        tags: file.tags.length > 0 ? file.tags : undefined,
                        description: file.description || undefined,
                    });
                }
                updated++;
            } else {
                unchanged++;
            }
            remoteByName.delete(file.name);
        }
    }

    // Delete (remote-only)
    for (const [name, remote] of remoteByName) {
        if (ALLOW_DELETE) {
            console.log(`  - DELETE  ${name}`);
            if (!DRY_RUN) {
                await client.guidelines.delete(remote.id);
            }
            deleted++;
        } else {
            console.log(`  ? REMOTE-ONLY  ${name} (use --delete to remove)`);
        }
    }

    console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Summary: Created=${created} Updated=${updated} Deleted=${deleted} Unchanged=${unchanged}`);
}

// ---------------------------------------------------------------------------
// Pull mode: remote -> local
// ---------------------------------------------------------------------------
async function pullMode(client: any) {
    const remoteRes = await client.guidelines.list();
    const remoteVars: Array<{ id: string; payload: { name: string; value: string; tags?: string[]; description?: string } }> =
        remoteRes.data?.actions || [];
    console.log(`Remote variables: ${remoteVars.length}`);

    // Ensure directory exists
    if (!fs.existsSync(DIR)) {
        fs.mkdirSync(DIR, { recursive: true });
    }

    let written = 0, skipped = 0;

    for (const v of remoteVars) {
        const name = v.payload.name || v.id;
        const filename = `${name}.md`;
        const filepath = path.join(DIR, filename);

        if (fs.existsSync(filepath)) {
            console.log(`  SKIP  ${filename} (already exists)`);
            skipped++;
            continue;
        }

        // Build file content with frontmatter
        let content = '';
        const tags = v.payload.tags || [];
        const description = v.payload.description || '';
        if (tags.length > 0 || description) {
            content += '---\n';
            if (tags.length > 0) content += `tags: [${tags.join(', ')}]\n`;
            if (description) content += `description: ${description}\n`;
            content += '---\n\n';
        }
        content += v.payload.value || '';

        if (!DRY_RUN) {
            fs.writeFileSync(filepath, content, 'utf-8');
        }
        console.log(`  + WRITE  ${filename}`);
        written++;
    }

    console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Summary: Written=${written} Skipped=${skipped}`);
}

main().catch(err => {
    console.error('Fatal error:', err.message || err);
    process.exit(1);
});
