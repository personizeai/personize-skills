#!/usr/bin/env node
/**
 * sync-skills.mjs - refresh skills/ from the two upstream repos.
 *
 * Why this exists: publishing used to be a manual copy-paste, so the catalogue
 * drifted ten weeks behind its sources without anyone noticing. Provenance is
 * one-to-one (see the table below), so the copy is fully mechanical.
 *
 *   node scripts/sync-skills.mjs --check     # report drift, change nothing (CI-friendly)
 *   node scripts/sync-skills.mjs             # apply, then review `git diff`
 *
 * Exit codes: 0 clean / in sync, 1 drift found in --check mode, 2 setup error.
 *
 * This script NEVER commits, pushes, or publishes. It only writes into skills/.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEST = path.join(ROOT, 'skills');

/**
 * Where each published skill actually comes from.
 *
 * `agentdocs` entries are read from a git ref, not the working tree, because
 * local checkouts of that repo are frequently parked on stale feature branches
 * (this is exactly what produced a false "orphaned files" diagnosis once).
 * Reading `origin/dev` means the result does not depend on what anyone has
 * checked out locally.
 */
const SOURCES = [
    // Skills 2.0 personas - from ai-fargate-agentdocs @ origin/dev
    { name: 'personize-agent-core',          repo: 'agentdocs', ref: 'origin/dev', from: 'Skills-2.0/personize-agent-core' },
    { name: 'personize-enabler',             repo: 'agentdocs', ref: 'origin/dev', from: 'Skills-2.0/personize-enabler' },
    { name: 'personize-reference',           repo: 'agentdocs', ref: 'origin/dev', from: 'Skills-2.0/personize-reference' },
    { name: 'personize-solution-architect',  repo: 'agentdocs', ref: 'origin/dev', from: 'Skills-2.0/personize-solution-architect' },

    // Legacy feature skills - from ai-fargate working tree
    { name: 'personize',                     repo: 'fargate', from: 'Skills-Optimized/personize' },
    { name: 'personize-memory',              repo: 'fargate', from: 'Skills-Optimized/personize-memory' },
    { name: 'personize-governance',          repo: 'fargate', from: 'Skills-Optimized/personize-governance' },
    { name: 'personize-code',                repo: 'fargate', from: 'Skills-Optimized/personize-code' },
    { name: 'personize-agent-workspace',     repo: 'fargate', from: 'Skills-Optimized/personize-agent-workspace' },
];

/** Never publish these: build inputs, web-variant sources, editor cruft. */
const EXCLUDE = new Set(['web.config.json', 'SKILL.web.md', '.gitkeep', '.DS_Store', 'Thumbs.db', 'desktop.ini']);

const REPOS = {
    fargate: process.env.AI_FARGATE_PATH || path.resolve(ROOT, '..', 'ai-fargate'),
    agentdocs: process.env.AI_FARGATE_AGENTDOCS_PATH || path.resolve(ROOT, '..', 'ai-fargate-agentdocs'),
};

const checkOnly = process.argv.includes('--check');

function fail(msg) {
    console.error(`error: ${msg}`);
    process.exit(2);
}

function git(repo, args) {
    return execFileSync('git', args, { cwd: REPOS[repo], encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/**
 * Materialise a source directory into a temp dir, from a ref or the working tree.
 *
 * For refs this reads each blob with `git show` rather than piping `git archive`
 * into `tar`: on Windows, GNU tar parses a `C:\...` destination as a remote host
 * ("Cannot connect to C: resolve failed"). Per-file is slower but portable, and
 * these trees are small.
 */
function materialise(src, tmpRoot) {
    const out = path.join(tmpRoot, src.name);
    fs.mkdirSync(out, { recursive: true });

    if (src.ref) {
        let listing;
        try {
            listing = git(src.repo, ['ls-tree', '-r', '--name-only', src.ref, `${src.from}/`]);
        } catch {
            fail(`cannot read ${src.ref}:${src.from} in ${REPOS[src.repo]}\n` +
                 `  try: git -C ${REPOS[src.repo]} fetch origin`);
        }
        const files = listing.split('\n').map((l) => l.trim()).filter(Boolean);
        if (files.length === 0) fail(`${src.ref}:${src.from} is empty - wrong ref or path?`);

        for (const full of files) {
            const rel = full.slice(src.from.length + 1);
            if (rel.split('/').some((seg) => EXCLUDE.has(seg))) continue;
            const dest = path.join(out, rel);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            // encoding:'buffer' so binary assets survive the round trip intact.
            fs.writeFileSync(dest, execFileSync('git', ['show', `${src.ref}:${full}`], {
                cwd: REPOS[src.repo], maxBuffer: 64 * 1024 * 1024,
            }));
        }
    } else {
        const abs = path.join(REPOS[src.repo], src.from);
        if (!fs.existsSync(abs)) fail(`source not found: ${abs}`);
        copyTree(abs, out);
    }
    return out;
}

function copyTree(from, to) {
    fs.mkdirSync(to, { recursive: true });
    for (const e of fs.readdirSync(from, { withFileTypes: true })) {
        if (EXCLUDE.has(e.name)) continue;
        const s = path.join(from, e.name);
        const d = path.join(to, e.name);
        if (e.isDirectory()) copyTree(s, d);
        else fs.copyFileSync(s, d);
    }
}

function walk(dir, base = '') {
    const out = [];
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (EXCLUDE.has(e.name)) continue;
        const rel = base ? `${base}/${e.name}` : e.name;
        if (e.isDirectory()) out.push(...walk(path.join(dir, e.name), rel));
        else out.push(rel);
    }
    return out;
}

/**
 * Compare ignoring line endings only. The two upstream repos are checked out
 * with different autocrlf settings, so a byte comparison reports every file as
 * changed and tells you nothing.
 */
function sameContent(a, b) {
    const norm = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
    try { return norm(a) === norm(b); } catch { return false; }
}

// --- preflight -------------------------------------------------------------

for (const [key, dir] of Object.entries(REPOS)) {
    if (!fs.existsSync(dir)) {
        fail(`repo "${key}" not found at ${dir}\n` +
             `  set AI_FARGATE_PATH / AI_FARGATE_AGENTDOCS_PATH to override.`);
    }
}

// A stale `origin/dev` silently publishes old content, which is the exact failure
// this script exists to prevent. We cannot know if it is current without hitting
// the network, so surface its age and let the operator judge.
//
// Note this reads the REMOTE-TRACKING ref, so local branches and uncommitted work
// in the agentdocs checkout are invisible here BY DESIGN: nothing publishes until
// it is merged and pushed to dev.
try {
    const tip = git('agentdocs', ['log', '-1', '--format=%h %cr', 'origin/dev']).trim();
    console.log(`agentdocs origin/dev: ${tip}`);
    console.log(`  (if that looks old: git -C ${REPOS.agentdocs} fetch origin)\n`);
} catch {
    fail(`agentdocs has no origin/dev ref at ${REPOS.agentdocs}\n  run: git -C ${REPOS.agentdocs} fetch origin`);
}

// --- run -------------------------------------------------------------------

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personize-skills-sync-'));
let changed = 0, added = 0, removed = 0;

try {
    for (const src of SOURCES) {
        const staged = materialise(src, tmpRoot);
        const dest = path.join(DEST, src.name);

        const srcFiles = new Set(walk(staged));
        const dstFiles = new Set(walk(dest));

        for (const rel of srcFiles) {
            const s = path.join(staged, rel);
            const d = path.join(dest, rel);
            if (!dstFiles.has(rel)) {
                added++;
                console.log(`  + ${src.name}/${rel}`);
                if (!checkOnly) { fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(s, d); }
            } else if (!sameContent(s, d)) {
                changed++;
                console.log(`  ~ ${src.name}/${rel}`);
                if (!checkOnly) fs.copyFileSync(s, d);
            }
        }
        for (const rel of dstFiles) {
            if (srcFiles.has(rel)) continue;
            removed++;
            console.log(`  - ${src.name}/${rel}  (gone upstream)`);
            if (!checkOnly) fs.rmSync(path.join(dest, rel), { force: true });
        }
    }
} finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
}

const total = added + changed + removed;
if (total === 0) {
    console.log('in sync: skills/ matches both upstreams.');
    process.exit(0);
}

console.log(`\n${added} added, ${changed} changed, ${removed} removed.`);
if (checkOnly) {
    console.log('drift found (--check made no changes).');
    process.exit(1);
}
console.log('applied. Review `git diff`, then commit and push as usual.');
