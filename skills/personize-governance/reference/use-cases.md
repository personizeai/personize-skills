# Reference: Use Cases & Deployment Patterns

Three deployment patterns beyond conversational editing, plus context engineering best practices.

---

## Use Case 1: IDE-Integrated Guidelines (Claude Code, Codex, Cursor, Gemini, Copilot)

> **Recipe:** `recipes/ide-governance-bridge.ts`
> **Template:** `templates/project-governance-setup.md`

Developers using AI-powered IDEs can read and write centralized guidelines without leaving their editor. This creates a **bidirectional bridge** between the codebase and organizational knowledge.

### How Developers Benefit

```
Developer asks Claude Code:
  "What are our API authentication standards?"
      ↓
  Claude Code calls smartGuidelines
      ↓
  Returns guideline: engineering-standards → ## Authentication
      ↓
  Developer gets the canonical answer, not a hallucination
```

### Reading Governance (Fetch the Latest)

```typescript
// In any script, CLAUDE.md instruction, or agent workflow
const guidelines = await client.ai.smartGuidelines({
    message: 'API authentication standards and best practices',
    tags: ['engineering'],
});
// guidelines.data.compiledContext contains the relevant guidelines
```

### Writing Governance (Push Learnings Back)

```typescript
// After fixing a bug, discovering a pattern, or solving an issue
await client.guidelines.update(variableId, {
    value: '\n\n### Connection Pool Exhaustion\n\n**Symptom:** 503 errors under load...\n**Root Cause:** Missing connection.release() in error paths...\n**Fix:** Always use try/finally for connection cleanup.\n',
    updateMode: 'appendToSection',
    sectionHeader: '## Known Issues & Solutions',
    historyNote: 'Added connection pool exhaustion pattern — discovered during incident #247',
});
```

### Setting Up a Project for Governance

Add this to your project's `CLAUDE.md` (or `.cursorrules`, `agent.md`, `.github/copilot-instructions.md`):

```markdown
## Guidelines

Before writing code, fetch organizational guidelines:

- Use `client.ai.smartGuidelines({ message: '<topic>' })` from `@personize/sdk`
- Always check guidelines for: coding standards, API patterns, naming conventions,
  security requirements, deployment procedures
- After fixing bugs or discovering patterns, update guidelines so the whole team benefits
- See `governance/templates/project-governance-setup.md` for full setup
```

### Why Developers Love This

- No more "how do we do X here?" Slack questions — the answer is in the guidelines
- No more copy-pasting conventions between repos — one source, always current
- Every bug fix benefits the whole org, not just the one codebase
- AI assistants give consistent answers across all projects

---

## Use Case 2: Autonomous Guidelines Learning

> **Recipe:** `recipes/auto-learning-loop.ts`

LLMs can automatically update guidelines with new developments, bug fixes, patterns discovered, and solutions identified. This turns guidelines into a **living knowledge base** that grows smarter with every interaction.

### How It Works

```
Code change / incident / conversation
      ↓
  LLM analyzes: "What did we learn?"
      ↓
  Extracts: pattern, bug fix, best practice, or policy update
      ↓
  Checks existing guidelines for overlap
      ↓
  Proposes update (admin approval or auto-apply)
      ↓
  Guidelines updated → all agents benefit immediately
```

### Example: Post-Incident Learning

```typescript
// After resolving an incident, extract and persist the learning
const learning = {
    category: 'incident-resolution',
    title: 'Redis Connection Timeout Under Load',
    symptom: 'API latency spikes to 30s+ during peak hours',
    rootCause: 'Default Redis timeout (5s) too low for connection pool size',
    solution: 'Set timeout to 30s, increase pool size to 50, add circuit breaker',
    preventionRule: 'All cache connections must configure: timeout >= 30s, pool >= 20, circuit breaker enabled',
};

// Find or create the right guideline
const variables = await client.guidelines.list();
const runbook = (variables.data?.actions || []).find(v => v.payload.name === 'incident-patterns');

if (runbook) {
    await client.guidelines.update(runbook.id, {
        value: `\n\n### ${learning.title}\n\n**Symptom:** ${learning.symptom}\n**Root Cause:** ${learning.rootCause}\n**Solution:** ${learning.solution}\n**Prevention:** ${learning.preventionRule}\n`,
        updateMode: 'appendToSection',
        sectionHeader: '## Cache & Redis Issues',
        historyNote: `Auto-learning: added ${learning.title} from incident resolution`,
    });
}
```

### Example: Code Review Pattern Extraction

```typescript
// When a code review reveals a recurring pattern
const pattern = {
    name: 'Always validate webhook signatures',
    context: 'Third-party webhook endpoints',
    rule: 'Every webhook handler must verify the signature header before processing. Use crypto.timingSafeEqual for comparison.',
    bad: 'app.post("/webhook", (req, res) => { processEvent(req.body); })',
    good: 'app.post("/webhook", verifyWebhookSignature, (req, res) => { processEvent(req.body); })',
};

await client.guidelines.update(securityStandardsId, {
    value: `\n\n### ${pattern.name}\n\n**When:** ${pattern.context}\n**Rule:** ${pattern.rule}\n\n**Bad:**\n\`\`\`typescript\n${pattern.bad}\n\`\`\`\n\n**Good:**\n\`\`\`typescript\n${pattern.good}\n\`\`\`\n`,
    updateMode: 'appendToSection',
    sectionHeader: '## Security Patterns',
    historyNote: `Auto-learning: added "${pattern.name}" from code review feedback`,
});
```

### What LLMs Can Automatically Learn and Publish

- Bug fixes → `known-bugs-and-workarounds`
- Security findings → `security-standards`
- Performance optimizations → `performance-guidelines`
- API changes → `api-migration-guide`
- New tool adoption → `tooling-standards`
- Process improvements → `team-processes`

### Production-Hard Guardrails (Optional)

For shared environments, prefer a two-stage flow:

1. Propose only

```bash
npx ts-node recipes/auto-learning-loop.ts scan-git \
  --since "7 days ago" \
  --require-approval \
  --proposals-file "./governance-learning-proposals.json" \
  --min-confidence 0.65 \
  --max-updates 15
```

2. Apply after review (manual or approved automation)

```bash
npx ts-node recipes/auto-learning-loop.ts batch \
  --file "./governance-learning-proposals.json"
```

Notes:
- Guardrails are opt-in and not enabled by default.
- `--dry-run` can be used in any stage for zero-write validation.

---

## Use Case 3: Document Folder Ingestion

> **Recipe:** `recipes/document-ingestion.ts`

Organizations have folders of existing documents — wikis, Google Docs exports, Notion dumps, policy PDFs, Confluence exports — that contain policies, guidelines, and best practices. This recipe reads those files and extracts guidelines from them.

### How It Works

```
Folder of documents (.md, .txt, .docx, .pdf)
      ↓
  Read each file
      ↓
  LLM analyzes: "What policies/guidelines/rules are in here?"
      ↓
  Groups extracted content by topic
      ↓
  Matches to existing guidelines (avoid duplicates)
      ↓
  Creates new / updates existing variables
      ↓
  Admin reviews batch of proposed changes
      ↓
  Apply all → centralized guidelines are populated
```

### Example: Processing a Folder of Policy Docs

```typescript
import { Personize } from '@personize/sdk';
import * as fs from 'fs';
import * as path from 'path';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

async function ingestFolder(folderPath: string) {
    // 1. Read all markdown files from the folder
    const files = fs.readdirSync(folderPath)
        .filter(f => f.endsWith('.md') || f.endsWith('.txt'))
        .map(f => ({
            name: f,
            content: fs.readFileSync(path.join(folderPath, f), 'utf-8'),
        }));

    // 2. Get existing guidelines
    const existing = await client.guidelines.list();

    // 3. For each file, use the AI to extract guideline content
    for (const file of files) {
        // Use AI to analyze the document and produce structured output
        const result = await client.ai.prompt({
            prompt: `Analyze this document and extract policies, guidelines, rules, or best practices.
Return a JSON block with: { "name": "kebab-case-variable-name", "value": "# Title\\n\\n## Section...", "tags": ["governance", ...] }`,
            context: file.content,
        });

        // Parse the AI response to extract the suggested variable
        const responseText = (result.data as any)?.response ?? '';
        const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) {
            console.log(`SKIP: ${file.name} — could not extract guideline structure`);
            continue;
        }
        const extracted = JSON.parse(jsonMatch[0]) as { name: string; value: string; tags?: string[] };

        // 4. Check for existing overlap
        const overlap = (existing.data?.actions || []).find(v =>
            v.payload.name === extracted.name
        );

        if (overlap) {
            console.log(`UPDATE: ${file.name} → merging into existing "${overlap.payload.name}"`);
            // Update existing variable with new content
        } else {
            console.log(`CREATE: ${file.name} → new variable "${extracted.name}"`);
            // Create new guideline
            await client.guidelines.create({
                name: extracted.name,
                value: extracted.value,
                tags: extracted.tags,
            });
        }
    }
}
```

### Supported Source Formats

- `.md` / `.mdx` — Markdown files (native, no conversion needed)
- `.txt` — Plain text (auto-structured into sections)
- `.csv` — Tabular data (converted to markdown tables)
- `.json` — Structured data (flattened into readable sections)
- Company wikis — Export to markdown, then ingest
- Google Docs — Export as `.md` or `.txt`, then ingest
- Notion — Export workspace as markdown, then ingest

---

## Context Engineering Best Practices

> **Full guide:** `templates/context-engineering-guide.md`

### Writing Guidelines for AI Consumption

Guidelines are consumed by LLMs via `smartGuidelines`. Write them so AI agents find and apply them correctly:

1. **Headers match search intent** — If an agent asks "how to handle refunds", your guideline should have `## Refund Policy` not `## Section 4.2.1`
2. **Rules are explicit** — "Maximum refund: $500 without manager approval" not "refunds should generally be reasonable"
3. **Examples are concrete** — Show good/bad examples with code, templates, or exact wording
4. **Structure is consistent** — Every guideline follows the same pattern so agents know where to find what
5. **Cross-references are clear** — "See `pricing-rules` for discount tiers" not "see the other document"

### Layered Context Architecture

```
┌───────────────────────────────────────┐
│  Layer 1: Organization Guidelines     │  ← Personize variables (this skill)
│  Brand voice, policies, standards     │     Available to ALL agents
├───────────────────────────────────────┤
│  Layer 2: Team / Department Rules     │  ← Tag-filtered variables
│  Sales playbook, eng standards        │     Available via tags: ['sales']
├───────────────────────────────────────┤
│  Layer 3: Project CLAUDE.md           │  ← Local file in each repo
│  Repo-specific patterns, conventions  │     Available to IDE agents
├───────────────────────────────────────┤
│  Layer 4: Task Context                │  ← Runtime: code, errors, user input
│  Current file, error message, prompt  │     Ephemeral per request
└───────────────────────────────────────┘
```

- **Layer 1** = Guidelines (this skill). Org-wide truth.
- **Layer 2** = Same guidelines, filtered by tags. `smartGuidelines({ tags: ['engineering'] })` only returns engineering guidelines.
- **Layer 3** = Each project's `CLAUDE.md` / `.cursorrules` / `agent.md`. Can reference Layer 1 ("fetch guidelines before coding").
- **Layer 4** = What the user just typed, the file they're editing, the error they got. Ephemeral.

### Making Your CLAUDE.md Guidelines-Aware

Add this block to any project's `CLAUDE.md` to connect it to centralized guidelines:

```markdown
## Organizational Guidelines

This project follows centralized guidelines managed via Personize.
Before starting any task, fetch relevant guidelines:

\`\`\`typescript
import { Personize } from '@personize/sdk';
const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

// Fetch guidelines relevant to the current task
const context = await client.ai.smartGuidelines({
    message: '<describe what you need guidelines for>',
});
// Use context.data.compiledContext as your guidelines
\`\`\`

### What to fetch guidelines for:
- Before writing new features → coding standards, architecture patterns
- Before writing emails/content → brand voice, messaging guidelines
- Before handling customer data → data handling policy, compliance rules
- Before deploying → deployment checklist, incident response procedures
- After fixing bugs → check if the fix should be added to known-issues guidelines

### Contributing back to guidelines:
When you discover a new pattern, fix a recurring bug, or identify a best practice:
1. Fetch existing guidelines for the topic
2. Draft an update (new section or amendment)
3. Apply via SDK with a clear historyNote
4. Verify the update surfaces correctly via smartGuidelines
```
