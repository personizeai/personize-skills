# Project Governance Setup Guide

How to make any project governance-aware — so AI coding assistants (Claude Code, Codex, Cursor, Gemini, Copilot) fetch organizational guidelines before coding and push learnings back after solving problems.

---

## Quick Start (5 minutes)

### 1. Install the SDK

```bash
npm install @personize/sdk
```

### 2. Set your API key

```bash
# .env
PERSONIZE_SECRET_KEY=sk_live_your_key_here
```

### 3. Add governance to your project's AI instructions

Choose the file that matches your IDE:

| IDE / Tool | File | Location |
|---|---|---|
| Claude Code | `CLAUDE.md` | Project root |
| Cursor | `.cursorrules` | Project root |
| GitHub Copilot | `.github/copilot-instructions.md` | `.github/` |
| Codex | `AGENTS.md` | Project root |
| Generic | `agent.md` or `AI-INSTRUCTIONS.md` | Project root |

### 4. Paste this governance block into your AI instructions file

```markdown
## Organizational Governance

This project follows centralized governance via Personize.

### Before starting any task:
1. Identify the relevant domain (coding standards, security, API patterns, etc.)
2. Fetch the latest guidelines:
   ```typescript
   import { Personize } from '@personize/sdk';
   const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
   const context = await client.ai.smartGuidelines({ message: '<topic>' });
   ```
3. Follow the guidelines returned in `context.data.compiledContext`

### After completing a task:
If you discovered a bug fix, pattern, workaround, or best practice that others should know:
1. Fetch the relevant guideline
2. Append your learning to the appropriate section
3. Include a clear historyNote explaining what you learned

### Key governance topics for this project:
- Coding standards → `client.ai.smartGuidelines({ message: 'coding standards' })`
- Security requirements → `client.ai.smartGuidelines({ message: 'security standards' })`
- API patterns → `client.ai.smartGuidelines({ message: 'API patterns and conventions' })`
- Testing guidelines → `client.ai.smartGuidelines({ message: 'testing guidelines' })`
```

---

## IDE-Specific Setup

### Claude Code (`CLAUDE.md`)

Claude Code reads `CLAUDE.md` at the project root. This is the highest-leverage file for governance integration because Claude Code follows these instructions on every interaction.

```markdown
# Project: [Your Project Name]

## Governance

Before writing code, always check organizational governance:

- **Coding standards**: `npx ts-node sdk/skills/governance-manager/recipes/ide-governance-bridge.ts fetch "coding standards for [language]"`
- **Security**: `npx ts-node sdk/skills/governance-manager/recipes/ide-governance-bridge.ts fetch "security requirements"`
- **API design**: `npx ts-node sdk/skills/governance-manager/recipes/ide-governance-bridge.ts fetch "API design patterns"`

After fixing bugs or discovering patterns, push learnings:

```bash
npx ts-node sdk/skills/governance-manager/recipes/ide-governance-bridge.ts learn \
  --variable "engineering-standards" \
  --section "## Known Issues" \
  --title "Describe the issue" \
  --content "Describe the fix and prevention"
```

## Project Conventions

> These are project-specific rules that supplement (not replace) org governance.

- [Your project-specific rules here]
```

**Best practices for CLAUDE.md:**
- Keep it under 500 lines — AI models work best with focused context
- Put the most important rules first — they're weighted more heavily
- Use imperative mood ("Do X" not "X should be done")
- Include examples of good/bad patterns
- Reference governance topics by name so the AI knows what to search for

### Cursor (`.cursorrules`)

```markdown
# Cursor Rules

## Governance

This project follows centralized governance. Before writing code:
1. Check relevant governance via the Personize SDK
2. Follow coding standards from `smartGuidelines({ message: 'coding standards' })`
3. Follow security requirements from `smartGuidelines({ message: 'security' })`

## Code Style
[Project-specific rules]
```

### GitHub Copilot (`.github/copilot-instructions.md`)

```markdown
# Copilot Instructions

## Organizational Standards

When generating code, follow these organizational standards:
- Authentication: Always use JWT with refresh tokens (see governance: security-standards)
- Error handling: Use Result<T, E> pattern (see governance: engineering-standards)
- API responses: Follow JSON:API format (see governance: api-conventions)

## Governance Reference

For full guidelines, developers should run:
```bash
npx ts-node sdk/skills/governance-manager/recipes/ide-governance-bridge.ts fetch "<topic>"
```
```

### Codex (`AGENTS.md`)

```markdown
# Agent Instructions

## Governance

Before writing or modifying code:
1. Fetch relevant governance using the Personize SDK
2. Identify which guidelines apply to the current task
3. Follow all rules and patterns from governance

After completing tasks:
- If you fixed a bug, document the pattern in governance
- If you discovered a better approach, propose a governance update
- Always include historyNote when updating governance

## Environment

- SDK: @personize/sdk
- Auth: PERSONIZE_SECRET_KEY environment variable
```

---

## CI/CD Integration

### GitHub Actions: Governance Check

Run a governance validation step in your CI pipeline to ensure code follows guidelines:

```yaml
name: Governance Check
on: [pull_request]

jobs:
  governance-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Fetch governance context
        env:
          PERSONIZE_SECRET_KEY: ${{ secrets.PERSONIZE_SECRET_KEY }}
        run: |
          npx ts-node sdk/skills/governance-manager/recipes/ide-governance-bridge.ts \
            generate-claude-md --tags "engineering" --output ./GOVERNANCE-SNAPSHOT.md

      - name: Verify governance is current
        run: |
          echo "Governance snapshot generated. Review in PR artifacts."

      - uses: actions/upload-artifact@v4
        with:
          name: governance-snapshot
          path: GOVERNANCE-SNAPSHOT.md
```

### GitHub Actions: Post-Merge Learning Extraction

After PRs merge, scan for learnings and update governance:

```yaml
name: Governance Learning
on:
  push:
    branches: [main]

jobs:
  extract-learnings:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 10  # Get recent commits

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Scan commits for learnings
        env:
          PERSONIZE_SECRET_KEY: ${{ secrets.PERSONIZE_SECRET_KEY }}
        run: |
          npx ts-node sdk/skills/governance-manager/recipes/auto-learning-loop.ts \
            scan-git --since "1 day ago"
```

---

## Governance-Aware Development Workflow

### Daily workflow for developers

```
1. Start task
   └─ AI assistant fetches governance for the domain
       ├─ "What are our API authentication standards?"
       ├─ "How should I structure error responses?"
       └─ "What's our testing policy for new endpoints?"

2. Write code
   └─ AI follows governance guidelines automatically
       ├─ Uses approved patterns
       ├─ Follows naming conventions
       └─ Includes required security checks

3. Fix bug / discover pattern
   └─ AI proposes governance update
       ├─ "This connection pool pattern caused issues, should I add it to known-bugs?"
       └─ Developer approves → governance updated

4. Code review
   └─ Reviewer checks governance compliance
       ├─ "Does this follow our API patterns?"
       └─ AI verifies against governance automatically

5. Merge
   └─ CI extracts learnings from commit messages
       └─ Governance grows smarter with every merge
```

### The feedback loop

```
 Governance ──────→ Developer writes better code
     ▲                          │
     │                          │
     │    Learnings flow back   │
     │                          ▼
 Governance ◄────── Developer fixes bug / discovers pattern
```

Every developer benefits from every other developer's experience. The governance layer is the shared brain.

---

## Folder Structure

Recommended project structure with governance integration:

```
your-project/
├── CLAUDE.md                    # AI instructions + governance reference
├── .cursorrules                 # Cursor-specific rules (if using Cursor)
├── .github/
│   ├── copilot-instructions.md  # Copilot instructions (if using Copilot)
│   └── workflows/
│       ├── governance-check.yml # CI governance validation
│       └── governance-learn.yml # Post-merge learning extraction
├── .env                         # PERSONIZE_SECRET_KEY
├── package.json                 # @personize/sdk dependency
└── src/
    └── ...
```

---

## Troubleshooting

### "smartGuidelines returns empty"
- Check that guidelines exist: `npx ts-node recipes/ide-governance-bridge.ts list`
- Check that variables have relevant content and tags
- Try a broader search query

### "AI assistant doesn't follow governance"
- Make sure governance fetch is in your CLAUDE.md / .cursorrules
- Keep guidelines concise and actionable — long prose gets ignored
- Use explicit rules ("Always do X") not suggestions ("Consider doing X")

### "Governance is stale"
- Set up the CI/CD learning extraction pipeline
- Encourage developers to push learnings after fixing bugs
- Run periodic governance audits: `client.guidelines.list()` → review each variable

### "Too many guidelines"
- Use tags to organize by department/domain
- Use `smartGuidelines({ tags: ['engineering'] })` to filter
- Merge related variables (prefer fewer, comprehensive variables over many small ones)
