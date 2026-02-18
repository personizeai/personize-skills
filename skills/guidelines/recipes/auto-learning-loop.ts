/**
 * Autonomous Governance Learning Loop
 *
 * Automatically extracts learnings from various sources (incidents, code reviews,
 * conversations, documentation) and persists them as guideline updates.
 * This turns governance into a living knowledge base that grows smarter with every
 * interaction.
 *
 * Usage:
 *   # Process a single learning from stdin or argument
 *   npx ts-node recipes/auto-learning-loop.ts learn \
 *     --type "bug-fix" \
 *     --source "incident-247" \
 *     --content "Connection pool exhaustion caused by missing finally blocks..."
 *
 *   # Process a batch of learnings from a JSON file
 *   npx ts-node recipes/auto-learning-loop.ts batch --file learnings.json
 *
 *   # Run a scan of recent git commits to extract learnings
 *   npx ts-node recipes/auto-learning-loop.ts scan-git --since "7 days ago"
 *
 * Learning Types:
 *   bug-fix          → routes to known-bugs-and-workarounds
 *   security         → routes to security-standards
 *   performance      → routes to performance-guidelines
 *   pattern          → routes to engineering-standards
 *   process          → routes to team-processes
 *   api-change       → routes to api-migration-guide
 *   incident         → routes to incident-patterns
 *   custom           → specify --variable and --section manually
 *
 * Environment:
 *   PERSONIZE_SECRET_KEY=sk_live_...
 */

import 'dotenv/config';
import { Personize } from '@personize/sdk';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

// ─── Learning Type → Governance Variable Routing ─────────────────────────────

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
    'security': {
        variableName: 'security-standards',
        sectionHeader: '## Security Patterns',
        tags: ['engineering', 'governance', 'security'],
        createDescription: 'Security standards, patterns, and requirements',
    },
    'performance': {
        variableName: 'performance-guidelines',
        sectionHeader: '## Performance Patterns',
        tags: ['engineering', 'governance', 'performance'],
        createDescription: 'Performance optimization guidelines and benchmarks',
    },
    'pattern': {
        variableName: 'engineering-standards',
        sectionHeader: '## Code Patterns & Conventions',
        tags: ['engineering', 'governance', 'standards'],
        createDescription: 'Engineering standards, code patterns, and conventions',
    },
    'process': {
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
    'incident': {
        variableName: 'incident-patterns',
        sectionHeader: '## Incident Resolutions',
        tags: ['engineering', 'governance', 'incidents'],
        createDescription: 'Incident patterns, root causes, and resolution playbooks',
    },
};

// ─── Core: Process a single learning ─────────────────────────────────────────

interface Learning {
    type: string;
    source: string;
    title: string;
    content: string;
    variable?: string;       // override for type=custom
    section?: string;        // override for type=custom
    autoApply?: boolean;     // skip confirmation (for CI/CD pipelines)
}

async function processLearning(learning: Learning): Promise<void> {
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

    console.log(`\n📝 Processing learning: "${learning.title}"`);
    console.log(`   Type:     ${learning.type}`);
    console.log(`   Source:   ${learning.source}`);
    console.log(`   Target:   ${route.variableName} → ${route.sectionHeader}`);

    // Find the target variable
    const variables = await client.variables.list();
    let target = variables.actions.find(
        (v: any) => v.payload.name === route.variableName
    );

    // Create the variable if it doesn't exist
    if (!target) {
        console.log(`\n   Variable "${route.variableName}" doesn't exist. Creating it...`);

        const template = `# ${route.variableName.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}\n\nOrganizational knowledge base — auto-populated from team learnings.\n\n${route.sectionHeader}\n\n_No entries yet._\n`;

        const created = await client.variables.create({
            name: route.variableName,
            value: template,
            tags: route.tags,
            description: route.createDescription,
        });

        // Re-fetch to get the created variable
        const refreshed = await client.variables.list();
        target = refreshed.actions.find(
            (v: any) => v.payload.name === route.variableName
        );

        console.log(`   ✅ Created "${route.variableName}"`);
    }

    if (!target) {
        console.error(`Failed to find or create variable "${route.variableName}"`);
        process.exit(1);
    }

    // Check for duplicate titles in the existing content
    if (target.payload.value.includes(`### ${learning.title}`)) {
        console.log(`\n   ⚠️  A learning titled "${learning.title}" already exists in this variable.`);
        console.log(`   Skipping to avoid duplicates. Use a unique title or update manually.`);
        return;
    }

    // Format the learning
    const timestamp = new Date().toISOString().split('T')[0];
    const formattedContent = [
        `\n\n### ${learning.title}`,
        ``,
        `> Source: ${learning.source} | Added: ${timestamp}`,
        ``,
        learning.content,
    ].join('\n');

    // Apply the update
    await client.variables.update(target.id, {
        value: formattedContent,
        updateMode: 'appendToSection',
        sectionHeader: route.sectionHeader,
        historyNote: `Auto-learning [${learning.type}]: "${learning.title}" from ${learning.source}`,
    });

    console.log(`   ✅ Learning persisted to governance.`);

    // Verify
    const verify = await client.ai.smartContext({ message: learning.title });
    const surfaced = verify.data?.compiledContext?.includes(learning.title);
    console.log(`   ${surfaced ? '✅' : '⏳'} Verification: ${surfaced ? 'surfacing in smartContext' : 'may take a moment to surface'}`);
}

// ─── Batch: Process multiple learnings ───────────────────────────────────────

async function processBatch(filePath: string): Promise<void> {
    const fs = await import('fs');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const learnings: Learning[] = JSON.parse(raw);

    console.log(`\n📦 Processing batch of ${learnings.length} learnings from ${filePath}\n`);

    let success = 0;
    let skipped = 0;
    let failed = 0;

    for (const learning of learnings) {
        try {
            await processLearning(learning);
            success++;
        } catch (err: any) {
            if (err.message?.includes('already exists')) {
                skipped++;
            } else {
                console.error(`   ❌ Failed: ${err.message}`);
                failed++;
            }
        }
    }

    console.log(`\n📊 Batch complete: ${success} applied, ${skipped} skipped, ${failed} failed`);
}

// ─── Scan Git: Extract learnings from recent commits ─────────────────────────

async function scanGitCommits(since: string): Promise<void> {
    const { execSync } = await import('child_process');

    console.log(`\n🔍 Scanning git commits since "${since}"...\n`);

    // Get recent commit messages and diffs
    // Use NUL (%x00) as record separator and RS (%x1e) as field separator
    // to avoid conflicts with | or newlines in commit messages/bodies.
    const log = execSync(
        `git log --since="${since}" --format="%H%x1e%s%x1e%b%x00" --no-merges`,
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    const commits = log.split('\0').map(r => r.trim()).filter(Boolean).map(record => {
        const [hash, subject, ...bodyParts] = record.split('\x1e');
        return { hash, subject: subject ?? '', body: bodyParts.join('') };
    });

    console.log(`   Found ${commits.length} commits.\n`);

    // Use AI to classify commits and extract learnings
    const learningCommits = commits.filter(c => {
        const msg = `${c.subject} ${c.body}`.toLowerCase();
        return msg.includes('fix') || msg.includes('bug') || msg.includes('security')
            || msg.includes('perf') || msg.includes('pattern') || msg.includes('refactor')
            || msg.includes('workaround') || msg.includes('incident');
    });

    if (learningCommits.length === 0) {
        console.log('   No learning-worthy commits found.');
        return;
    }

    console.log(`   ${learningCommits.length} commits look learning-worthy.\n`);

    // For each relevant commit, use AI to extract a structured learning
    for (const commit of learningCommits) {
        try {
            const result = await client.ai.prompt({
                prompt: `Analyze this git commit and extract a governance learning if applicable. Return JSON with: { type, title, content } or null if not worth persisting.

Types: bug-fix, security, performance, pattern, process, api-change, incident

Commit: ${commit.subject}
Body: ${commit.body}`,
                instructions: [
                    {
                        prompt: 'Extract a structured learning. The content should be 2-5 sentences explaining the issue and solution in a way that helps future developers. Return valid JSON only.',
                        maxSteps: 1,
                    },
                ],
            });

            // Parse the AI response (basic extraction)
            const responseText = typeof result === 'string' ? result : JSON.stringify(result);
            const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
                const extracted = JSON.parse(jsonMatch[0]);
                if (extracted && extracted.type && extracted.title) {
                    await processLearning({
                        type: extracted.type,
                        source: `git:${commit.hash.substring(0, 7)}`,
                        title: extracted.title,
                        content: extracted.content || commit.subject,
                    });
                }
            }
        } catch (err: any) {
            console.log(`   ⚠️  Skipped commit ${commit.hash.substring(0, 7)}: ${err.message}`);
        }
    }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

async function main() {
    const [command, ...args] = process.argv.slice(2);
    const getArg = (flag: string) => {
        const idx = args.indexOf(flag);
        return idx >= 0 ? args[idx + 1] : undefined;
    };

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
            });
            break;
        }

        case 'batch': {
            const file = getArg('--file');
            if (!file) { console.error('Usage: batch --file <path>'); process.exit(1); }
            await processBatch(file);
            break;
        }

        case 'scan-git': {
            const since = getArg('--since') || '7 days ago';
            await scanGitCommits(since);
            break;
        }

        default:
            console.log(`
Autonomous Governance Learning Loop — Automatically extract and persist learnings.

Commands:
  learn --type --source --title --content   Process a single learning
  batch --file <path.json>                  Process a batch of learnings from JSON
  scan-git [--since "7 days ago"]           Extract learnings from recent git commits

Learning Types:
  bug-fix       → known-bugs-and-workarounds
  security      → security-standards
  performance   → performance-guidelines
  pattern       → engineering-standards
  process       → team-processes
  api-change    → api-migration-guide
  incident      → incident-patterns
  custom        → specify --variable and --section

Examples:
  npx ts-node recipes/auto-learning-loop.ts learn \\
    --type "bug-fix" \\
    --source "incident-247" \\
    --title "Redis Timeout Under Load" \\
    --content "Default timeout (5s) too low. Set to 30s with pool size ≥ 20."

  npx ts-node recipes/auto-learning-loop.ts scan-git --since "30 days ago"

Batch file format (JSON):
  [
    { "type": "bug-fix", "source": "PR-142", "title": "...", "content": "..." },
    { "type": "security", "source": "audit-q1", "title": "...", "content": "..." }
  ]
`);
    }
}

main().catch(err => {
    console.error('Error:', err.message || err);
    process.exit(1);
});
