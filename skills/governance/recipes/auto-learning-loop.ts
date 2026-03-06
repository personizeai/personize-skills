/**
 * Autonomous Governance Learning Loop
 *
 * Automatically extracts learnings from commits/incidents and persists them as
 * guideline updates.
 *
 * Default behavior (safe by default):
 * - scan-git writes proposals JSON only. No guidelines are mutated unless you
 *   explicitly opt in with --auto-apply.
 *
 * Flags:
 * - --auto-apply: apply extracted learnings directly (opt-in, off by default)
 * - --require-approval: writes proposals JSON, no mutations (default behavior)
 * - --dry-run: no mutations, no file writes
 * - --min-confidence 0.65: skip low-confidence extractions
 * - --max-updates 10: cap writes per run
 * - --proposals-file <path>: where proposals are written
 */

import 'dotenv/config';
import { Personize } from '@personize/sdk';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

interface LearningRoute {
    variableName: string;
    sectionHeader: string;
    tags: string[];
    createDescription: string;
}

const LEARNING_ROUTES: Record<string, LearningRoute> = {
    'bug-fix': {
        variableName: 'known-bugs-and-workarounds',
        sectionHeader: '## Bug Fixes & Workarounds',
        tags: ['engineering', 'governance', 'bugs'],
        createDescription: 'Known bugs, workarounds, and fixes discovered by the team',
    },
    security: {
        variableName: 'security-standards',
        sectionHeader: '## Security Patterns',
        tags: ['engineering', 'governance', 'security'],
        createDescription: 'Security standards, patterns, and requirements',
    },
    performance: {
        variableName: 'performance-guidelines',
        sectionHeader: '## Performance Patterns',
        tags: ['engineering', 'governance', 'performance'],
        createDescription: 'Performance optimization guidelines and benchmarks',
    },
    pattern: {
        variableName: 'engineering-standards',
        sectionHeader: '## Code Patterns & Conventions',
        tags: ['engineering', 'governance', 'standards'],
        createDescription: 'Engineering standards, code patterns, and conventions',
    },
    process: {
        variableName: 'team-processes',
        sectionHeader: '## Process Improvements',
        tags: ['governance', 'process'],
        createDescription: 'Team processes, workflows, and operational procedures',
    },
    'api-change': {
        variableName: 'api-migration-guide',
        sectionHeader: '## API Changes',
        tags: ['engineering', 'governance', 'api'],
        createDescription: 'API changes, migrations, and deprecations',
    },
    incident: {
        variableName: 'incident-patterns',
        sectionHeader: '## Incident Resolutions',
        tags: ['engineering', 'governance', 'incidents'],
        createDescription: 'Incident patterns, root causes, and resolution playbooks',
    },
};

interface Learning {
    type: string;
    source: string;
    title: string;
    content: string;
    variable?: string;
    section?: string;
    confidence?: number;
}

interface RunOptions {
    dryRun?: boolean;
}

interface ScanOptions {
    autoApply: boolean;
    requireApproval: boolean;
    dryRun: boolean;
    proposalsFile?: string;
    minConfidence: number;
    maxUpdates: number;
}

interface ExtractedLearning {
    type: string;
    title: string;
    content: string;
    confidence?: number;
}

async function processLearning(learning: Learning, options: RunOptions = {}): Promise<void> {
    const route = learning.type === 'custom'
        ? {
            variableName: learning.variable!,
            sectionHeader: learning.section!,
            tags: ['governance'],
            createDescription: '',
        }
        : LEARNING_ROUTES[learning.type];

    if (!route) {
        console.error(`Unknown learning type: "${learning.type}". Valid types: ${Object.keys(LEARNING_ROUTES).join(', ')}, custom`);
        process.exit(1);
    }

    console.log(`\nProcessing learning: "${learning.title}"`);
    console.log(`  Type:   ${learning.type}`);
    console.log(`  Source: ${learning.source}`);
    console.log(`  Target: ${route.variableName} -> ${route.sectionHeader}`);

    const variables = await client.guidelines.list();
    let target = (variables.data?.actions || []).find((v: any) => v.payload.name === route.variableName);

    if (!target) {
        console.log(`  Variable "${route.variableName}" not found. Creating it...`);

        const template = `# ${route.variableName.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}\n\nOrganizational knowledge base - auto-populated from team learnings.\n\n${route.sectionHeader}\n\n_No entries yet._\n`;

        if (!options.dryRun) {
            await client.guidelines.create({
                name: route.variableName,
                value: template,
                tags: route.tags,
                description: route.createDescription,
            });
        } else {
            console.log('  [DRY RUN] Would create variable.');
        }

        const refreshed = await client.guidelines.list();
        target = (refreshed.data?.actions || []).find((v: any) => v.payload.name === route.variableName);
    }

    if (!target) {
        console.error(`Failed to find or create variable "${route.variableName}"`);
        process.exit(1);
    }

    if ((target.payload.value || '').includes(`### ${learning.title}`)) {
        console.log(`  Duplicate title "${learning.title}" already exists. Skipping.`);
        return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const formattedContent = [
        '',
        '',
        `### ${learning.title}`,
        '',
        `> Source: ${learning.source} | Added: ${timestamp}`,
        '',
        learning.content,
    ].join('\n');

    if (!options.dryRun) {
        await client.guidelines.update(target.id, {
            value: formattedContent,
            updateMode: 'appendToSection',
            sectionHeader: route.sectionHeader,
            historyNote: `Auto-learning [${learning.type}]: "${learning.title}" from ${learning.source}`,
        });
        console.log('  Learning persisted to governance.');

        const verify = await client.ai.smartGuidelines({ message: learning.title });
        const surfaced = verify.data?.compiledContext?.includes(learning.title);
        console.log(`  ${surfaced ? 'Verified' : 'Pending'}: ${surfaced ? 'surfacing in smartGuidelines' : 'may take a moment to surface'}`);
    } else {
        console.log(`  [DRY RUN] Would append to ${route.variableName} -> ${route.sectionHeader}`);
    }
}

async function processBatch(filePath: string, options: RunOptions = {}): Promise<void> {
    const fs = await import('fs');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    const learnings: Learning[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.proposals)
            ? parsed.proposals
            : [];

    if (learnings.length === 0) {
        console.error(`No learnings found in ${filePath}. Expected either an array or { proposals: [...] }.`);
        process.exit(1);
    }

    console.log(`\nProcessing batch of ${learnings.length} learnings from ${filePath}\n`);

    let success = 0;
    let failed = 0;

    for (const learning of learnings) {
        try {
            await processLearning(learning, options);
            success++;
        } catch (err: any) {
            console.error(`  Failed: ${err.message}`);
            failed++;
        }
    }

    console.log(`\nBatch complete: ${success} applied, ${failed} failed`);
}

async function scanGitCommits(since: string, options: ScanOptions): Promise<void> {
    const { spawnSync } = await import('child_process');
    const fs = await import('fs');
    const path = await import('path');

    console.log(`\nScanning git commits since "${since}"...\n`);

    // Use spawnSync with an args array to prevent shell injection — never
    // interpolate user-controlled values into a shell command string.
    const result = spawnSync(
        'git',
        ['log', `--since=${since}`, '--format=%H%x1e%s%x1e%b%x00', '--no-merges'],
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error(`git log failed: ${result.stderr}`);
    }
    const log = result.stdout;

    const commits = log
        .split('\0')
        .map(r => r.trim())
        .filter(Boolean)
        .map(record => {
            const [hash, subject, ...bodyParts] = record.split('\x1e');
            return { hash, subject: subject ?? '', body: bodyParts.join('') };
        });

    console.log(`  Found ${commits.length} commits.`);

    const learningCommits = commits.filter(c => {
        const msg = `${c.subject} ${c.body}`.toLowerCase();
        return msg.includes('fix') || msg.includes('bug') || msg.includes('security')
            || msg.includes('perf') || msg.includes('pattern') || msg.includes('refactor')
            || msg.includes('workaround') || msg.includes('incident');
    });

    if (learningCommits.length === 0) {
        console.log('  No learning-worthy commits found.');
        return;
    }

    console.log(`  ${learningCommits.length} commits look learning-worthy.\n`);

    const candidates: Array<{ extracted: ExtractedLearning; source: string }> = [];

    for (const commit of learningCommits) {
        try {
            const result = await client.ai.prompt({
                prompt: `Analyze this git commit and extract a governance learning if applicable. Return JSON with: { type, title, content, confidence } or null if not worth persisting.

Types: bug-fix, security, performance, pattern, process, api-change, incident

Commit: ${commit.subject}
Body: ${commit.body}`,
                instructions: [
                    {
                        prompt: 'Extract a structured learning. The content should be 2-5 sentences explaining the issue and solution in a way that helps future developers. Include confidence as a number from 0 to 1. Return valid JSON only.',
                        maxSteps: 1,
                    },
                ],
            });

            const responseText = typeof result === 'string' ? result : JSON.stringify(result);
            const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
            if (!jsonMatch) continue;

            const extracted = JSON.parse(jsonMatch[0]) as ExtractedLearning;
            if (extracted && extracted.type && extracted.title) {
                candidates.push({
                    extracted,
                    source: `git:${commit.hash.substring(0, 7)}`,
                });
            }
        } catch (err: any) {
            console.log(`  Skipped commit ${commit.hash.substring(0, 7)}: ${err.message}`);
        }
    }

    const filtered = candidates
        .filter(c => (c.extracted.confidence ?? 0.5) >= options.minConfidence)
        .slice(0, Math.max(0, options.maxUpdates));

    console.log(`  Candidates extracted: ${candidates.length}`);
    console.log(`  Candidates after guardrails: ${filtered.length}`);

    if (!options.autoApply || options.requireApproval || options.dryRun) {
        const proposalPath = options.proposalsFile || 'governance-learning-proposals.json';
        const dir = path.dirname(proposalPath);
        if (dir && dir !== '.') fs.mkdirSync(dir, { recursive: true });

        const payload = {
            generatedAt: new Date().toISOString(),
            since,
            options: {
                autoApply: options.autoApply,
                requireApproval: options.requireApproval,
                dryRun: options.dryRun,
                minConfidence: options.minConfidence,
                maxUpdates: options.maxUpdates,
            },
            proposals: filtered.map(c => ({
                type: c.extracted.type,
                title: c.extracted.title,
                content: c.extracted.content || c.extracted.title,
                confidence: c.extracted.confidence ?? 0.5,
                source: c.source,
            })),
        };

        fs.writeFileSync(proposalPath, JSON.stringify(payload, null, 2), 'utf-8');
        console.log(`\nGuardrail mode enabled: wrote ${filtered.length} proposals to ${proposalPath}`);
        return;
    }

    for (const c of filtered) {
        await processLearning({
            type: c.extracted.type,
            source: c.source,
            title: c.extracted.title,
            content: c.extracted.content || c.extracted.title,
            confidence: c.extracted.confidence,
        });
    }
}

async function main() {
    const [command, ...args] = process.argv.slice(2);
    const getArg = (flag: string) => {
        const idx = args.indexOf(flag);
        return idx >= 0 ? args[idx + 1] : undefined;
    };
    const hasFlag = (flag: string) => args.includes(flag);

    switch (command) {
        case 'learn': {
            const type = getArg('--type') || 'pattern';
            const source = getArg('--source') || 'manual';
            const title = getArg('--title');
            const content = getArg('--content');
            if (!title || !content) {
                console.error('Usage: learn --type "<type>" --source "<source>" --title "<title>" --content "<content>"');
                process.exit(1);
            }
            await processLearning({
                type,
                source,
                title,
                content,
                variable: getArg('--variable'),
                section: getArg('--section'),
            }, { dryRun: hasFlag('--dry-run') });
            break;
        }

        case 'batch': {
            const file = getArg('--file');
            if (!file) {
                console.error('Usage: batch --file <path>');
                process.exit(1);
            }
            await processBatch(file, { dryRun: hasFlag('--dry-run') });
            break;
        }

        case 'scan-git': {
            const since = getArg('--since') || '7 days ago';
            // Safe by default: auto-apply is OFF unless explicitly requested.
            // Developers must pass --auto-apply to mutate governance variables.
            const autoApply = hasFlag('--auto-apply');
            const requireApproval = !autoApply || hasFlag('--require-approval');
            const dryRun = hasFlag('--dry-run');
            const proposalsFile = getArg('--proposals-file');
            const minConfidence = Number(getArg('--min-confidence') || '0');
            const maxUpdates = Number(getArg('--max-updates') || `${Number.MAX_SAFE_INTEGER}`);

            await scanGitCommits(since, {
                autoApply,
                requireApproval,
                dryRun,
                proposalsFile,
                minConfidence: Number.isFinite(minConfidence) ? minConfidence : 0,
                maxUpdates: Number.isFinite(maxUpdates) ? maxUpdates : Number.MAX_SAFE_INTEGER,
            });
            break;
        }

        default:
            console.log(`
Autonomous Governance Learning Loop - Automatically extract and persist learnings.

Commands:
  learn --type --source --title --content   Process a single learning
  batch --file <path.json>                  Process a batch of learnings from JSON
  scan-git [--since "7 days ago"]           Extract learnings from recent git commits

Flags:
  --auto-apply                              Apply learnings directly (opt-in — off by default)
  --dry-run                                 Propose only, never mutate guidelines or write files
  --require-approval                        Write proposals file instead of applying (default)
  --proposals-file <path>                   Path for proposal JSON (default: governance-learning-proposals.json)
  --min-confidence <0..1>                   Skip low-confidence AI extractions
  --max-updates <N>                         Cap number of updates per run
`);
    }
}

main().catch(err => {
    console.error('Error:', err.message || err);
    process.exit(1);
});
