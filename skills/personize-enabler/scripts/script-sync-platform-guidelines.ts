/**
 * script-sync-platform-guidelines.ts
 *
 * Download Personize platform guidelines (agent-core, architect, reference, enabler)
 * to a local directory. Re-run at any time — only files that changed are updated.
 * Uses manifest.json content hashes to detect changes.
 *
 * Useful when working offline, in CI environments, or when you prefer local search
 * over the personize_skill MCP tool.
 *
 * Usage:
 *   npx ts-node script-sync-platform-guidelines.ts
 *   npx ts-node script-sync-platform-guidelines.ts --output ./my-guidelines
 *   npx ts-node script-sync-platform-guidelines.ts --output ./guidelines --force
 *
 * Flags:
 *   --output <dir>   Directory to write guidelines into (default: ./personize-guidelines)
 *   --force          Re-download everything even if hashes match
 *   --api-key <key>  Personize API key (or set PERSONIZE_API_KEY env var)
 *
 * Output structure:
 *   personize-guidelines/
 *     agent-core/SKILL.md
 *     agent-core/reference/workspace-patterns.md
 *     agent-core/reference/cheat-*.md
 *     architect/SKILL.md
 *     architect/reference/*.md
 *     reference/SKILL.md
 *     enabler/SKILL.md
 *     enabler/scripts/*.ts
 *     enabler/presets/*.json
 *     manifest.json          ← content hashes for change detection
 *     .last-synced           ← timestamp of last successful sync
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// ── CLI helpers ───────────────────────────────────────────────────────────────

function arg(flag: string, fallback?: string): string | undefined {
    const idx = process.argv.indexOf(flag);
    return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

function hasFlag(flag: string): boolean {
    return process.argv.includes(flag);
}

// ── Config ────────────────────────────────────────────────────────────────────

const API_KEY = arg('--api-key') || process.env.PERSONIZE_API_KEY || '';
const OUTPUT_DIR = path.resolve(arg('--output') || './personize-guidelines');
const FORCE = hasFlag('--force');
const BASE_URL = process.env.PERSONIZE_BASE_URL || 'https://agent.personize.ai';
const _DOWNLOAD_URL = `${BASE_URL}/api/v1/guidelines/download?scope=platform`;

// ── Utilities ─────────────────────────────────────────────────────────────────

function get(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return get(res.headers.location!).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }
            const chunks: Buffer[] = [];
            res.on('data', (c: Buffer) => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

function apiGet(path: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const url = new URL(`${BASE_URL}${path}`);
        const opts = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname + url.search,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        };
        const client = BASE_URL.startsWith('https') ? https : http;
        const req = client.request(opts, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (c: Buffer) => chunks.push(c));
            res.on('end', () => {
                try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
                catch { reject(new Error('Invalid JSON response')); }
            });
            res.on('error', reject);
        });
        req.on('error', reject);
        req.end();
    });
}

function ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readLocalManifest(): Record<string, string> {
    const p = path.join(OUTPUT_DIR, 'manifest.json');
    if (!fs.existsSync(p)) return {};
    try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return {}; }
}

function daysSince(isoDate: string): number {
    return Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
}

// ── Unzip (pure Node.js — no external deps) ───────────────────────────────────

interface ZipFile { name: string; data: Buffer }

function parseZip(buffer: Buffer): ZipFile[] {
    const files: ZipFile[] = [];
    let i = 0;
    while (i < buffer.length - 4) {
        if (buffer.readUInt32LE(i) !== 0x04034b50) { i++; continue; }
        const flags = buffer.readUInt16LE(i + 6);
        const method = buffer.readUInt16LE(i + 8);
        const compressedSize = buffer.readUInt32LE(i + 18);
        const _uncompressedSize = buffer.readUInt32LE(i + 22);
        const nameLen = buffer.readUInt16LE(i + 26);
        const extraLen = buffer.readUInt16LE(i + 28);
        const name = buffer.slice(i + 30, i + 30 + nameLen).toString('utf-8');
        const dataStart = i + 30 + nameLen + extraLen;
        const compressedData = buffer.slice(dataStart, dataStart + compressedSize);

        if (!name.endsWith('/')) { // skip directory entries
            if (method === 0) {
                // STORED
                files.push({ name, data: compressedData });
            } else if (method === 8) {
                // DEFLATE
                const { inflateRawSync } = require('zlib');
                try {
                    files.push({ name, data: inflateRawSync(compressedData) });
                } catch { /* skip corrupted entry */ }
            }
        }

        i = dataStart + compressedSize;
        // Check for data descriptor (bit 3 of flags)
        if (flags & 0x08) i += 16;
    }
    return files;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    console.log('=== Personize Platform Guidelines Sync ===');
    console.log(`Output: ${OUTPUT_DIR}`);
    console.log(`Force: ${FORCE}`);
    console.log('');

    // Check staleness of existing sync
    const lastSyncedPath = path.join(OUTPUT_DIR, '.last-synced');
    if (fs.existsSync(lastSyncedPath) && !FORCE) {
        const lastSynced = fs.readFileSync(lastSyncedPath, 'utf-8').trim();
        const days = daysSince(lastSynced);
        if (days > 7) {
            console.log(`⚠  Last synced ${days} days ago (${lastSynced}). Guidelines may be outdated.`);
        } else {
            console.log(`Last synced: ${lastSynced} (${days} day(s) ago)`);
        }
    }

    // Fetch presigned download URL
    console.log('Fetching download URL...');
    let downloadUrl: string;
    try {
        const res = await apiGet('/api/v1/guidelines/download?scope=platform');
        if (!res.success || !res.url) {
            console.error('Failed to get download URL:', res.error || 'No URL in response');
            console.error('Ensure the seed script has been run: npx ts-node scripts/seed-platform-guidelines.ts');
            process.exit(1);
        }
        downloadUrl = res.url;
    } catch (err) {
        console.error('Failed to reach Personize API:', (err as Error).message);
        process.exit(1);
    }

    // Download zip
    console.log('Downloading platform guidelines zip...');
    let zipBuffer: Buffer;
    try {
        zipBuffer = await get(downloadUrl);
        console.log(`Downloaded: ${(zipBuffer.length / 1024).toFixed(1)} KB`);
    } catch (err) {
        console.error('Failed to download zip:', (err as Error).message);
        process.exit(1);
    }

    // Parse zip
    const zipFiles = parseZip(zipBuffer);
    console.log(`Zip contains ${zipFiles.length} files`);

    // Read local manifest for change detection
    const localManifest = FORCE ? {} : readLocalManifest();
    const newManifest: Record<string, string> = {};

    let written = 0;
    let unchanged = 0;

    ensureDir(OUTPUT_DIR);

    for (const file of zipFiles) {
        const content = file.data;
        const hash = require('crypto').createHash('sha256').update(content).digest('hex').slice(0, 16);
        newManifest[file.name] = hash;

        if (!FORCE && localManifest[file.name] === hash) {
            unchanged++;
            continue;
        }

        const outPath = path.join(OUTPUT_DIR, file.name);
        ensureDir(path.dirname(outPath));
        fs.writeFileSync(outPath, content);
        written++;
        console.log(`  ✓ ${file.name}`);
    }

    // Write updated manifest + timestamp
    fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(newManifest, null, 2));
    const now = new Date().toISOString();
    fs.writeFileSync(lastSyncedPath, now);

    console.log('');
    console.log('=== Done ===');
    console.log(`Written: ${written} files`);
    console.log(`Unchanged: ${unchanged} files`);
    console.log(`Synced at: ${now}`);
    console.log('');
    if (written > 0) {
        console.log(`Guidelines available at: ${OUTPUT_DIR}`);
    }
}

main().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
});
