/**
 * script-sync-org-guidelines.ts
 *
 * Bidirectional sync for your org's custom guidelines.
 *
 *   pull  — Download all org guidelines + attachments to a local directory.
 *           Hash-based: only fetches files that changed since last pull.
 *
 *   push  — Upload local changes back to Personize.
 *           Diffs against last pull state, shows what changed, requires confirmation.
 *           Detects server-side changes and aborts if conflict found (use --force to override).
 *
 * Usage:
 *   npx ts-node script-sync-org-guidelines.ts pull
 *   npx ts-node script-sync-org-guidelines.ts pull --output ./my-guidelines
 *
 *   npx ts-node script-sync-org-guidelines.ts push
 *   npx ts-node script-sync-org-guidelines.ts push --yes          # skip confirmation
 *   npx ts-node script-sync-org-guidelines.ts push --force        # push despite server conflicts
 *
 * Flags:
 *   --output <dir>   Local directory (default: ./org-guidelines)
 *   --api-key <key>  Personize API key (or set PERSONIZE_API_KEY env var)
 *   --yes            Skip confirmation prompt on push
 *   --force          Override conflict detection on push (last write wins)
 *   --dry-run        Show what would change without writing anything
 *
 * Local structure after pull:
 *   org-guidelines/
 *     {slug}/
 *       content.md               ← guideline body (edit this)
 *       meta.json                ← name, description, tags (edit this)
 *       attachments/
 *         {filename}             ← attachment files (add/edit/delete)
 *     .pull-state.json           ← tracks server state at last pull (DO NOT EDIT)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as readline from 'readline';
import * as crypto from 'crypto';

// ── CLI helpers ───────────────────────────────────────────────────────────────

function arg(flag: string, fallback?: string): string | undefined {
    const idx = process.argv.indexOf(flag);
    return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

function hasFlag(flag: string): boolean {
    return process.argv.includes(flag);
}

const COMMAND = process.argv[2] as 'pull' | 'push' | undefined;
const API_KEY = arg('--api-key') || process.env.PERSONIZE_API_KEY || '';
const OUTPUT_DIR = path.resolve(arg('--output') || './org-guidelines');
const YES = hasFlag('--yes');
const FORCE = hasFlag('--force');
const DRY_RUN = hasFlag('--dry-run');
const BASE_URL = process.env.PERSONIZE_BASE_URL || 'https://agent.personize.ai';

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function request(method: string, urlPath: string, body?: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const url = new URL(`${BASE_URL}${urlPath}`);
        const bodyStr = body ? JSON.stringify(body) : undefined;
        const opts = {
            hostname: url.hostname,
            port: url.port || (BASE_URL.startsWith('https') ? 443 : 80),
            path: url.pathname + url.search,
            method,
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
            },
        };
        const client = BASE_URL.startsWith('https') ? https : http;
        const req = client.request(opts, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (c: Buffer) => chunks.push(c));
            res.on('end', () => {
                const raw = Buffer.concat(chunks).toString();
                try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
                catch { resolve({ status: res.statusCode, body: raw }); }
            });
            res.on('error', reject);
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

function getDownloadUrl(urlPath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const client = urlPath.startsWith('https') ? https : http;
        client.get(urlPath, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return getDownloadUrl(res.headers.location!).then(resolve).catch(reject);
            }
            const chunks: Buffer[] = [];
            res.on('data', (c: Buffer) => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

// ── File utilities ────────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function slugify(name: string, id: string): string {
    const s = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return s || id.slice(0, 12);
}

function sha256(content: Buffer | string): string {
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function readPullState(): Record<string, any> {
    const p = path.join(OUTPUT_DIR, '.pull-state.json');
    if (!fs.existsSync(p)) return {};
    try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return {}; }
}

function writePullState(state: Record<string, any>): void {
    fs.writeFileSync(path.join(OUTPUT_DIR, '.pull-state.json'), JSON.stringify(state, null, 2));
}

async function confirm(question: string): Promise<boolean> {
    if (YES) return true;
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(`${question} [y/N] `, (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase() === 'y');
        });
    });
}

// ── Pull ──────────────────────────────────────────────────────────────────────

async function pull(): Promise<void> {
    console.log('=== Pull: Downloading org guidelines ===');
    console.log(`Output: ${OUTPUT_DIR}`);
    if (DRY_RUN) console.log('DRY RUN — no files will be written');
    console.log('');

    const res = await request('GET', '/api/v1/guidelines/download');
    if (res.status !== 200 || !res.body?.success) {
        if (res.status === 401) { console.error('Invalid API key.'); process.exit(1); }
        if (res.body?.count === 0) { console.log('No guidelines found for this org.'); return; }
        // Fallback: fetch guidelines list manually if download endpoint not yet deployed
        await pullManual();
        return;
    }

    const { url } = res.body;
    console.log('Downloading zip...');
    const zipBuffer = await getDownloadUrl(url);
    console.log(`Downloaded: ${(zipBuffer.length / 1024).toFixed(1)} KB`);

    const { parseZip } = await loadZipParser();
    const files = parseZip(zipBuffer);

    const pullState = readPullState();
    const newState: Record<string, any> = { pulledAt: new Date().toISOString(), guidelines: {} };

    ensureDir(OUTPUT_DIR);

    // Parse manifest from zip
    const manifestFile = files.find(f => f.name === 'manifest.json');
    const manifest = manifestFile ? JSON.parse(manifestFile.data.toString('utf-8')) : { guidelines: [] };

    for (const g of manifest.guidelines || []) {
        const slug = slugify(g.name, g.id);
        const dir = path.join(OUTPUT_DIR, slug);

        const contentFile = files.find(f => f.name === `guidelines/${slug}/content.md`);
        const metaFile = files.find(f => f.name === `guidelines/${slug}/meta.json`);

        const content = contentFile?.data.toString('utf-8') || '';
        const meta = metaFile ? JSON.parse(metaFile.data.toString('utf-8')) : g;

        const contentHash = sha256(content);
        const prevState = pullState.guidelines?.[g.id];

        let changed = false;
        if (!prevState || prevState.contentHash !== contentHash) {
            if (!DRY_RUN) {
                ensureDir(dir);
                fs.writeFileSync(path.join(dir, 'content.md'), content);
                fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({
                    id: meta.id, name: meta.name, description: meta.description || '', tags: meta.tags || [],
                    updatedAt: meta.updatedAt,
                }, null, 2));
            }
            console.log(`  ✓ ${g.name} (${slug}/content.md)`);
            changed = true;
        } else {
            console.log(`  = ${g.name} (unchanged)`);
        }

        // Attachments
        const attDir = path.join(dir, 'attachments');
        const attFiles = files.filter(f => f.name.startsWith(`guidelines/${slug}/attachments/`));
        const attachmentHashes: Record<string, string> = {};

        for (const att of attFiles) {
            const filename = path.basename(att.name);
            const hash = sha256(att.data);
            attachmentHashes[filename] = hash;

            if (!prevState?.attachments?.[filename] || prevState.attachments[filename] !== hash) {
                if (!DRY_RUN) {
                    ensureDir(attDir);
                    fs.writeFileSync(path.join(attDir, filename), att.data);
                }
                if (changed) console.log(`    ✓ attachment: ${filename}`);
            }
        }

        newState.guidelines![g.id] = { slug, name: g.name, contentHash, updatedAt: meta.updatedAt, attachments: attachmentHashes };
    }

    if (!DRY_RUN) writePullState(newState);

    console.log('');
    console.log(`=== Pull complete — ${Object.keys(newState.guidelines || {}).length} guidelines ===`);
}

// Fallback manual pull when zip endpoint is not available
async function pullManual(): Promise<void> {
    console.log('(Using manual pull — fetching guidelines individually)');

    const listRes = await request('GET', '/api/v1/guidelines');
    if (listRes.status !== 200) { console.error('Failed to list guidelines:', listRes.body); process.exit(1); }
    const guidelines = listRes.body?.data?.actions || listRes.body?.data || [];

    const _pullState = readPullState();
    const newState: Record<string, any> = { pulledAt: new Date().toISOString(), guidelines: {} };
    ensureDir(OUTPUT_DIR);

    for (const g of guidelines) {
        const p = g.payload || g;
        const slug = slugify(p.name || g.id, g.id);
        const dir = path.join(OUTPUT_DIR, slug);
        const content = p.value || '';
        const contentHash = sha256(content);

        if (!DRY_RUN) {
            ensureDir(dir);
            fs.writeFileSync(path.join(dir, 'content.md'), content);
            fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({
                id: g.id, name: p.name, description: p.description || '', tags: p.tags || [],
                updatedAt: g.updatedAt || g.createdAt,
            }, null, 2));
        }
        console.log(`  ✓ ${p.name}`);

        // Attachments
        const attRes = await request('GET', `/api/v1/guidelines/${g.id}/attachments`);
        const attachments = attRes.body?.data || [];
        const attachmentHashes: Record<string, string> = {};

        for (const att of attachments) {
            const attDetail = await request('GET', `/api/v1/guidelines/${g.id}/attachments/${att.id}`);
            if (attDetail.body?.downloadUrl) {
                const content = await getDownloadUrl(attDetail.body.downloadUrl);
                const hash = sha256(content);
                attachmentHashes[att.filename] = hash;
                if (!DRY_RUN) {
                    ensureDir(path.join(dir, 'attachments'));
                    fs.writeFileSync(path.join(dir, 'attachments', att.filename), content);
                }
            }
        }

        newState.guidelines![g.id] = { slug, name: p.name, contentHash, updatedAt: g.updatedAt, attachments: attachmentHashes };
    }

    if (!DRY_RUN) writePullState(newState);
    console.log(`\n=== Pull complete — ${guidelines.length} guidelines ===`);
}

// ── Push ──────────────────────────────────────────────────────────────────────

async function push(): Promise<void> {
    console.log('=== Push: Uploading local changes to Personize ===');
    if (DRY_RUN) console.log('DRY RUN — no changes will be sent');
    if (FORCE) console.log('FORCE — server-side conflicts will be overwritten');
    console.log('');

    const pullState = readPullState();
    if (!pullState.guidelines) {
        console.error('No pull state found. Run `pull` first before pushing.');
        process.exit(1);
    }

    // Scan local guideline dirs
    const dirs = fs.readdirSync(OUTPUT_DIR).filter(d => {
        const p = path.join(OUTPUT_DIR, d);
        return fs.statSync(p).isDirectory() && !d.startsWith('.');
    });

    const changes: Array<{ id: string; slug: string; type: 'update'; fields: Record<string, any>; description: string }> = [];

    for (const slug of dirs) {
        const dir = path.join(OUTPUT_DIR, slug);
        const metaPath = path.join(dir, 'meta.json');
        const contentPath = path.join(dir, 'content.md');

        if (!fs.existsSync(metaPath) || !fs.existsSync(contentPath)) continue;

        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        const content = fs.readFileSync(contentPath, 'utf-8');
        const contentHash = sha256(content);

        const id = meta.id;
        const prev = pullState.guidelines[id];

        if (!prev) {
            console.warn(`  ⚠  ${slug}: no pull state found (was this created locally?). Skipping — use the Personize UI to create new guidelines.`);
            continue;
        }

        // Check for server-side changes (conflict detection)
        if (!FORCE) {
            const serverRes = await request('GET', `/api/v1/guidelines/${id}/structure`);
            if (serverRes.status === 200) {
                const serverUpdatedAt = serverRes.body?.data?.updatedAt || serverRes.body?.updatedAt;
                if (serverUpdatedAt && prev.updatedAt && serverUpdatedAt > prev.updatedAt) {
                    console.error(`  ✗ CONFLICT: ${meta.name} — server was updated after your last pull.`);
                    console.error(`    Server: ${serverUpdatedAt}  |  Your pull: ${prev.updatedAt}`);
                    if (!FORCE) {
                        console.error('    Run pull first to get the latest, or use --force to overwrite.');
                        continue;
                    }
                }
            }
        }

        const fields: Record<string, any> = {};
        let hasChanges = false;

        if (prev.contentHash !== contentHash) {
            fields.value = content;
            hasChanges = true;
        }

        // Check meta changes
        const prevMeta = pullState.guidelines[id];
        if (JSON.stringify({ name: meta.name, description: meta.description, tags: meta.tags }) !==
            JSON.stringify({ name: prevMeta.name, description: prevMeta.description, tags: prevMeta.tags })) {
            fields.name = meta.name;
            fields.description = meta.description;
            fields.tags = meta.tags;
            hasChanges = true;
        }

        if (hasChanges) {
            const parts = [];
            if (fields.value !== undefined) parts.push('content');
            if (fields.name !== undefined) parts.push('name/description/tags');
            changes.push({ id, slug, type: 'update', fields, description: `${meta.name} — changed: ${parts.join(', ')}` });
        }
    }

    if (changes.length === 0) {
        console.log('No local changes detected. Nothing to push.');
        return;
    }

    // Show diff summary
    console.log(`Found ${changes.length} change(s):\n`);
    for (const c of changes) {
        console.log(`  • ${c.description}`);
    }
    console.log('');

    if (!await confirm(`Push ${changes.length} change(s) to Personize?`)) {
        console.log('Push cancelled.');
        return;
    }

    if (DRY_RUN) {
        console.log('DRY RUN — skipping actual writes.');
        return;
    }

    let pushed = 0;
    let failed = 0;

    for (const c of changes) {
        const res = await request('PATCH', `/api/v1/guidelines/${c.id}`, c.fields);
        if (res.status < 300) {
            console.log(`  ✓ ${c.description}`);
            // Update pull state with new content hash
            pullState.guidelines[c.id].contentHash = sha256(c.fields.value || pullState.guidelines[c.id].contentHash);
            pullState.guidelines[c.id].updatedAt = new Date().toISOString();
            pushed++;
        } else {
            console.error(`  ✗ ${c.description} — HTTP ${res.status}: ${JSON.stringify(res.body?.error || res.body)}`);
            failed++;
        }
    }

    writePullState(pullState);

    console.log('');
    console.log(`=== Push complete — ${pushed} pushed, ${failed} failed ===`);
    if (failed > 0) process.exit(1);
}

// ── Inline zip parser (same as platform script — no external deps) ─────────────

async function loadZipParser(): Promise<{ parseZip: (buf: Buffer) => Array<{ name: string; data: Buffer }> }> {
    const { inflateRawSync } = require('zlib');
    return {
        parseZip(buffer: Buffer) {
            const files: Array<{ name: string; data: Buffer }> = [];
            let i = 0;
            while (i < buffer.length - 4) {
                if (buffer.readUInt32LE(i) !== 0x04034b50) { i++; continue; }
                const flags = buffer.readUInt16LE(i + 6);
                const method = buffer.readUInt16LE(i + 8);
                const compressedSize = buffer.readUInt32LE(i + 18);
                const nameLen = buffer.readUInt16LE(i + 26);
                const extraLen = buffer.readUInt16LE(i + 28);
                const name = buffer.slice(i + 30, i + 30 + nameLen).toString('utf-8');
                const dataStart = i + 30 + nameLen + extraLen;
                const compData = buffer.slice(dataStart, dataStart + compressedSize);
                if (!name.endsWith('/')) {
                    try {
                        files.push({ name, data: method === 0 ? compData : inflateRawSync(compData) });
                    } catch { /* skip */ }
                }
                i = dataStart + compressedSize;
                if (flags & 0x08) i += 16;
            }
            return files;
        },
    };
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    if (!API_KEY) {
        console.error('API key required. Set PERSONIZE_API_KEY env var or pass --api-key <key>');
        process.exit(1);
    }

    if (COMMAND === 'pull') {
        await pull();
    } else if (COMMAND === 'push') {
        await push();
    } else {
        console.log('Usage:');
        console.log('  npx ts-node script-sync-org-guidelines.ts pull   [--output <dir>] [--dry-run]');
        console.log('  npx ts-node script-sync-org-guidelines.ts push   [--yes] [--force] [--dry-run]');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
});
