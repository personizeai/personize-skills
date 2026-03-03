---
name: governance
description: "Manages organizational guidelines, policies, and best practices as governance variables accessible to all AI agents via SmartContext. Use when working with company rules, brand voice, compliance policies, playbooks, or when any task needs organizational context before proceeding."
license: Apache-2.0
compatibility: "Requires @personize/sdk or Personize MCP server and a Personize API key (sk_live_...)"
metadata: {"author": "personize-ai", "version": "1.0", "homepage": "https://personize.ai", "openclaw": {"emoji": "\U0001F4CB", "requires": {"env": ["PERSONIZE_SECRET_KEY"]}}}
---

# Skill: Governance

These are the rules, policies, and best practices that every AI agent in your organization must follow. **Always check Guidelines before generating content, making decisions, or taking actions.** One update here → every AI tool in your org gets smarter.

Guidelines are stored as markdown documents and are automatically available to all agents via `smartGuidelines`. Use this skill to read, create, update, and manage them.

> This skill supports **two workflows**: conversational editing (chat, SDK scripts, automated pipelines) and **GitOps sync** (`.md` files in a Git repo synced to the API). Both produce the same output: well-structured guidelines available to all agents via `smartGuidelines`.

---

## When NOT to Use This Skill

- Need to store data about contacts/companies → use **entity-memory**
- Need multi-agent coordination state (tasks, updates, issues) → use **collaboration**
- Need to generate personalized content → use **personalization**

---

## Actions

You have 6 actions available. Use whichever is appropriate for what the admin needs. They are not sequential — jump to the right action based on the conversation.

| Action | When to Use | Reference |
|---|---|---|
| **CREATE** | Admin shares content or wants a new guideline | `reference/operations.md` |
| **UPDATE** | Admin wants to modify an existing guideline (section, append, replace) | `reference/operations.md` |
| **IMPROVE** | Admin wants to clean up, restructure, or improve guideline quality | `reference/operations.md` |
| **AUDIT** | A factual change affects multiple guidelines (pricing, branding, policy) | `reference/operations.md` |
| **VERIFY** | Confirm agents can see the updated content via `smartGuidelines` | `reference/operations.md` |
| **ONBOARD** | First-time user with 0-2 guidelines — guide them through setup | `reference/onboarding.md` |

**Before each action:** Read the reference file for full workflows, conversation patterns, and code examples.

---

## Works With Both SDK and MCP — One Skill, Two Interfaces

This skill works identically whether the LLM accesses guidelines via the **SDK** (code, scripts, IDE agents) or via **MCP** (Claude Desktop, ChatGPT, Cursor MCP connection).

| Interface | How it works | Best for |
|---|---|---|
| **SDK** (`@personize/sdk`) | `client.guidelines.list()`, `client.guidelines.update()`, etc. | Scripts, CI/CD, IDE agents, recipes |
| **MCP** (Model Context Protocol) | `guideline_list`, `guideline_read`, `guideline_create`, `guideline_update`, `guideline_delete` tools | Claude Desktop, ChatGPT, Cursor, any MCP-compatible client |

**MCP tools map 1:1 to SDK methods:**

| SDK Method | MCP Tool | Purpose |
|---|---|---|
| `client.guidelines.list()` | `guideline_list` | List all guidelines (includes `governanceScope`) |
| `client.guidelines.getStructure(id)` | `guideline_read(guidelineId)` | Get section headings (TOC) + `governanceScope` |
| `client.guidelines.getSection(id, { header })` | `guideline_read(guidelineId, header)` | Get section content |
| `client.guidelines.create(payload)` | `guideline_create(name, value, tags, description)` | Create new guideline |
| `client.guidelines.update(id, payload)` | `guideline_update(guidelineId, value, updateMode, ...)` | Update guideline |
| `client.guidelines.delete(id)` | `guideline_delete(guidelineId)` | Delete guideline |
| `client.guidelines.history(id)` | `guideline_history(guidelineId)` | View change history |
| `client.ai.smartGuidelines({ message })` | `ai_smart_guidelines(message)` | Verify/fetch guidelines |

> **`governanceScope`** is a read-only field returned on `guideline_list` and `guideline_read` (structure mode). It contains `alwaysOn` (boolean) and `triggerKeywords` (string array) — auto-inferred at save time. See the "Governance Scope" section below for details.

**When reading this skill document:**
- If you're connected via **MCP**, use the MCP tool names (`guideline_list`, `guideline_update`, etc.)
- If you're running via **SDK**, use the `client.guidelines.*` methods
- All workflows, rules, and best practices apply equally to both interfaces

---

## Prerequisites

### SDK Mode
- `@personize/sdk` installed
- `PERSONIZE_SECRET_KEY` env var set to an `sk_live_...` key

```typescript
import { Personize } from '@personize/sdk';
const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
```

### MCP Mode
- Personize MCP server connected (SSE endpoint: `https://agent.personize.ai/mcp/sse`)
- API key provided via `?api_key=sk_live_...` or OAuth configured
- Tools `guideline_list`, `guideline_read`, `guideline_create`, `guideline_update`, `guideline_delete`, `guideline_history`, and `ai_smart_guidelines` are automatically available

---

## What Guidelines Are

Guidelines are organization-wide documents — policies, best practices, playbooks, checklists, technical manuals, how-tos — stored as markdown. Once saved, they are automatically available to **all agents** in the organization via `client.ai.smartGuidelines()`. When any agent asks smartGuidelines a question like "how should I write a cold email?", it retrieves the relevant guidelines and includes them as context.

**Examples:** `sales-playbook`, `brand-voice-guidelines`, `icp-definitions`, `data-handling-policy`, `engineering-standards`, `incident-response-runbook`, `known-bugs-and-workarounds`, `pricing-rules`

---

## Action Summaries

### CREATE — Draft a New Guideline

1. Ask admin for topic, audience, and source material
2. Check for overlap with existing variables (`client.guidelines.list()`)
3. Draft with proper markdown structure (H1 title, H2 sections, actionable content)
4. Propose kebab-case name, tags, description
5. **Show draft and ask for approval** → create → verify with `smartGuidelines`

### UPDATE — Modify Existing Guidelines

Choose the right update mode:

| Scope | Mode | When |
|---|---|---|
| Single section | `section` | "Update the Cold Email section" |
| Add to a section | `appendToSection` | "Add a new rule to the Email Rules section" |
| Add new section | `append` | "Add a GDPR section to the data policy" |
| Full rewrite | `replace` | "Completely rewrite this variable" |

Workflow: find variable → read structure → read target section → draft update → **show before/after** → apply with `historyNote`

### IMPROVE — Enhance Writing Quality

Read content → analyze structure/clarity/formatting/completeness → draft improved version → **show summary of changes** → apply

### AUDIT — Cross-Guideline Accuracy Scan

Admin reports a factual change → list ALL guidelines → search for old fact → draft corrections → **present batch of proposed changes** → apply each with `historyNote`

### VERIFY — Confirm Agent Visibility

After any create/update: call `smartGuidelines` with relevant query → confirm the updated content appears.

> **Full workflows, conversation patterns, and code:** Read `reference/operations.md`

---

## Constraints

> Keywords follow [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119): **MUST** = non-negotiable, **SHOULD** = strong default (override with stated reasoning), **MAY** = agent discretion.

1. **MUST** show the admin the proposed change before calling any mutating API -- because silent modifications erode trust and prevent catching errors before they reach production.
2. **MUST** include a descriptive `historyNote` on every update -- because change tracking enables audit trails, team collaboration, and rollback decisions.
3. **MUST** call `list()` and check for name/topic overlap before creating a new guideline -- because duplicate guidelines cause conflicting governance and confuse downstream agents.
4. **SHOULD** use section-level updates (`section` or `appendToSection` mode) over full `replace` -- because scoped edits reduce blast radius and allow concurrent editing; override only when structural reorganization requires full rewrite.
5. **MUST** call `smartGuidelines()` after any create or update to verify the change is visible to agents -- because the API call succeeding does not guarantee semantic retrievability.
6. **SHOULD** preserve the existing heading structure when updating a section -- because reorganizing adjacent sections creates unintended diffs and may break other agents' section-targeted queries.
7. **SHOULD** reuse existing tags before inventing new ones -- because inconsistent tagging fragments filtering and makes audit harder.
8. **MUST** write guideline content for agent consumption: explicit instructions, unambiguous language, headers that match likely `smartGuidelines` search queries -- because agents cannot infer intent from vague prose the way humans do.
9. **SHOULD** limit each guideline to a single concept or policy domain -- because mono-topic guidelines produce higher-relevance `smartGuidelines` matches and are easier to maintain.
10. **MUST** preserve the admin's voice and intent when improving structure or formatting -- because the admin owns the content; the agent is a writing assistant, not an editor-in-chief.
11. **SHOULD** check `history()` before editing and mention recent changes by others -- because concurrent edits without awareness cause overwrites in team environments.

---

## Guideline Quality at Scale

`smartGuidelines` uses hybrid semantic scoring (embeddings + keyword matching + governance scope boosts) to select the most relevant guidelines for each task. Its quality is directly affected by how guidelines are structured.

### Fewer, Richer Guidelines > Many Small Ones

The retrieval pipeline has **dynamic caps** on how many guidelines it returns per query (~7-12 critical, ~5-8 supplementary, scaling with total count). This means:

| Guideline count | Retrieval quality | Notes |
|---|---|---|
| 1-20 | Excellent | LLM-based routing sees everything |
| 20-50 | Very good | Embedding-based fast mode works well |
| 50-80 | Good | Quality starts to depend on naming/tagging discipline |
| 80+ | Requires care | Must follow all rules below to maintain quality |

**MUST** prefer consolidating related content into fewer, well-structured guidelines over creating many small ones — because each guideline competes for limited retrieval slots, and a single rich document with clear H2 sections is retrieved more reliably than five fragments. The section-level extraction in full mode already supports delivering only the relevant sections from a large guideline.

**Examples of consolidation:**

| Instead of these 5 guidelines... | Create 1 guideline with sections |
|---|---|
| `api-auth-rules`, `api-error-format`, `api-pagination`, `api-naming`, `api-versioning` | `api-conventions` with H2 sections: Auth, Errors, Pagination, Naming, Versioning |
| `bug-fix-process`, `known-bugs-list`, `debugging-tips` | `debugging-playbook` with H2 sections: Process, Known Issues, Tips & Patterns |
| `react-style-guide`, `react-testing`, `react-performance` | `react-standards` with H2 sections: Style, Testing, Performance |

### Writing for Maximum Retrievability

1. **Name = search query.** Name guidelines as a developer would search for them: `api-conventions` not `doc-v2-final`. The name is the highest-weight signal in scoring.
2. **Description = summary sentence.** Write the description as if answering "what is this?": `"REST API design rules: authentication, error handling, pagination, and naming conventions"`. Descriptions feed directly into embedding and keyword scoring.
3. **Tags = routing filters.** Use consistent tags (`engineering`, `security`, `sales`, `onboarding`). Agents can filter by tags to narrow the pool before scoring.
4. **H2 headers = section search targets.** In full mode, the LLM can select individual sections by header. Write headers that match how people describe the topic: `## Error Response Format` not `## Section 3.2`.
5. **Front-load key terms.** Put the most important terms in the first 1000 characters of content — this preview is included in the embedding for semantic matching.

### When to Split vs. Merge

**Split** when topics serve different audiences or are queried in completely different contexts (e.g., `sales-playbook` and `engineering-standards` should stay separate even if both are long).

**Merge** when topics are often needed together for the same task (e.g., API auth rules and API error formats are almost always needed together when building endpoints).

### Governance Scope: alwaysOn and triggerKeywords

Every guideline is automatically analyzed at save time to determine:

- **alwaysOn** — whether this guideline applies to virtually all tasks (e.g., core company values, universal compliance). alwaysOn guidelines are always included regardless of similarity score.
- **triggerKeywords** — action and domain words that trigger inclusion (e.g., "email", "pricing", "customer", "deploy"). Each matching keyword boosts the guideline's retrieval score.

These are inferred by LLM and stored automatically. Keep alwaysOn guidelines to a maximum of 2-3 — each one consumes a retrieval slot on every query.

---

## How It Works (Architecture)

```
┌─────────────────────────────────────────────────────┐
│                   GUIDELINES                         │
│              (Personize Variables)                   │
│                                                     │
│  sales-playbook    brand-voice    data-policy        │
│  icp-definitions   engineering-standards   ...       │
└────────┬─────────────────┬─────────────────┬────────┘
         │ smartGuidelines     │ SDK API          │ Sync
         ▼                 ▼                  ▼
┌────────────┐   ┌──────────────┐   ┌──────────────────┐
│ AI Agents  │   │ IDE/Dev Tool │   │ CI/CD Pipelines  │
│ (chat,     │   │ Claude Code  │   │ GitHub Actions   │
│  workflows │   │ Codex/Cursor │   │ Cron jobs        │
│  pipelines)│   │ Gemini/Copilot│  │ n8n workflows    │
└────────────┘   └──────────────┘   └──────────────────┘
```

Guidelines are one layer of the **three-layer agent operating model**. The complete model:

| Layer | What it provides | Skill |
|---|---|---|
| **Guidelines** (this skill) | Organizational rules — brand voice, policies, playbooks, compliance | `governance` |
| **Memory** | Entity knowledge — properties, facts, conversation history | `entity-memory` |
| **Workspace** | Coordination state — updates, tasks, notes, issues from all contributors | `collaboration` |

Every agent should call `smartGuidelines()` for rules, `smartDigest()`/`recall()` for entity knowledge, and `recall()` by workspace tags for coordination state — all before acting. Guidelines provide the governance that makes the other two layers safe to use autonomously.

> **Full architecture guide:** See the `collaboration` skill's `reference/architecture.md` for the complete three-layer model, composition patterns, and adoption path.

---

## Team Collaboration

When multiple people manage guidelines, follow these practices:

- **Version history:** Every update is tracked. Use `client.guidelines.history(id)` or `guideline_history` to review changes. Always start with `limit: 1`.
- **Conflict avoidance:** Use section-level updates (`updateMode: 'section'`) — two people can safely update different sections concurrently. Read before writing.
- **Attribution:** Write attribution-rich `historyNote` values — include what changed, why, and who requested it.
- **Ownership by tag:** `sales-*` variables owned by sales team, `engineering-*` by engineering.

> **Full guide:** Read `reference/collaboration.md` for version history patterns, conflict avoidance workflows, team patterns, and weekly review scripts.

---

## Production Guardrails (Recommended, Opt-in)

For shared/production deployments, add guardrails to autonomous learning. These are **recommendations** and are **off by default** so existing accounts keep working.

- `--require-approval`: write proposals JSON, do not mutate guidelines
- `--proposals-file`: persist proposals to a reviewable path/artifact
- `--min-confidence 0.60-0.75`: skip weak AI extractions
- `--max-updates N`: cap per-run blast radius
- `--dry-run`: test extraction/routing with zero writes
- `--no-auto-apply`: require an explicit promote/apply step

Recommended two-stage CI pattern:

1. Learn stage (non-mutating): run `scan-git --require-approval --proposals-file ...`
2. Apply stage (approved): run `batch --file ...` or re-run `scan-git --autoApply` with stricter bounds

This skill keeps auto-apply available for teams that want speed, but production defaults SHOULD include a review path.

---

## Use Cases & Deployment Patterns

This skill supports three deployment patterns beyond conversational editing:

| Use Case | What It Does | Reference |
|---|---|---|
| **IDE-Integrated Guidelines** | Developers read/write guidelines from Claude Code, Codex, Cursor, Copilot | `reference/use-cases.md` |
| **Autonomous Learning** | LLMs auto-extract learnings from incidents, code reviews, conversations | `reference/use-cases.md` |
| **Document Ingestion** | Batch-import policies from folders of docs (wikis, Notion, Google Docs) | `reference/use-cases.md` |

> **Full guide:** Read `reference/use-cases.md` for code examples, recipes, context engineering best practices, and layered context architecture.

---

## Available Resources

| Resource | Contents |
|---|---|
| `reference/operations.md` | Full workflows for CREATE, UPDATE, IMPROVE, AUDIT, VERIFY + conversation patterns + SDK code |
| `reference/collaboration.md` | Version history, conflict avoidance, attribution, team patterns, weekly review |
| `reference/onboarding.md` | First-time setup, starter templates (brand voice, ICP), handling existing content |
| `reference/use-cases.md` | IDE integration, autonomous learning, document ingestion, context engineering |
| `reference/team-setup.md` | Team onboarding runbook for SDK + Skills + MCP + governance CI guardrails |
| `recipes/ide-governance-bridge.ts` | Fetch guidelines from IDE, push learnings back |
| `recipes/auto-learning-loop.ts` | Automatically extract and persist learnings |
| `recipes/document-ingestion.ts` | Batch-import policies from a folder of documents |
| `templates/project-governance-setup.md` | Step-by-step guide for governance-aware projects |
| `templates/context-engineering-guide.md` | Deep dive on context engineering principles |
| `sync.ts` | GitOps sync script — push local `.md` files to Personize variables API |
| `github-action.yml` | GitHub Actions workflow for auto-syncing on push |

---

## Variables as Code (GitOps Sync)

For teams that prefer managing guidelines in Git, the included `sync.ts` script syncs local `.md` files to Personize variables. The filename becomes the guideline name, the file content becomes the value.

### Folder Convention

```
governance/
└── variables/
    ├── sales-playbook.md
    ├── icp-definitions.md
    ├── brand-voice-guidelines.md
    └── pricing-rules.md
```

**Rules:**
- **Filename** = variable name (without `.md`). Use kebab-case.
- **File content** = variable value (markdown body after optional frontmatter).
- **YAML frontmatter** (optional) = tags and description:

```markdown
---
tags: [sales, governance]
description: Sales team playbook and best practices
---
# Sales Playbook

Your content here...
```

- Files prefixed with `_` are ignored (e.g., `_draft-policy.md`).
- Subdirectories are not scanned — only files directly in `governance/variables/`.

### Sync Algorithm

1. **Read local files** — Scan `governance/variables/*.md`, parse frontmatter and body.
2. **Fetch remote state** — Call `client.guidelines.list()`.
3. **Diff by name** — Match local filenames to remote variable names:
   - **Local only** → **CREATE**
   - **Both exist, content differs** → **UPDATE**
   - **Both exist, content identical** → **SKIP**
   - **Remote only** → **DELETE** (only with `--delete` flag)
4. **Execute operations** — Create/update/delete via SDK.
5. **Print summary** — `Created: N, Updated: N, Deleted: N, Unchanged: N`

### CLI Usage

```bash
# Dry run — show what would change
npx ts-node sync.ts --dry-run

# Sync (create + update only, never delete)
npx ts-node sync.ts

# Sync with deletion of remote-only variables
npx ts-node sync.ts --delete

# Pull remote variables to local folder (bootstrap)
npx ts-node sync.ts --pull

# Custom variables directory
npx ts-node sync.ts ./my-variables/
```

| Flag | Default | Description |
|---|---|---|
| `--dry-run` | off | Show diff without executing changes |
| `--delete` | off | Delete remote variables with no matching local file |
| `--no-delete` | on | Never delete (safe default) |
| `--pull` | off | Download remote variables to local `.md` files |

### CI Integration

#### Auto-Sync on Push

Create `.github/workflows/governance-sync.yml` — triggers when anyone pushes changes to `governance/variables/`:

```yaml
name: Governance Sync

on:
  push:
    branches: [master, main]
    paths:
      - "governance/variables/**"
  workflow_dispatch: {}  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "18"

      - run: npm ci

      - name: Sync governance variables to Personize
        run: npx ts-node Skills/governance/sync.ts governance/variables
        env:
          PERSONIZE_SECRET_KEY: ${{ secrets.PERSONIZE_SECRET_KEY }}
```

**Setup:** Add `PERSONIZE_SECRET_KEY` as a GitHub repository secret (Settings → Secrets → Actions).

The CI workflow uses `--no-delete` by default. Add `--delete` to the run command to enable deletion on push.

#### Auto-Learn from Commits

Create `.github/workflows/governance-learn.yml` — scans source code commits and auto-extracts patterns into the right governance variables:

```yaml
name: Governance Auto-Learn

on:
  push:
    branches: [master, main]
    paths:
      - "src/**"
  workflow_dispatch:
    inputs:
      since:
        description: "How far back to scan (e.g., '7 days ago', '1 day ago')"
        required: false
        default: "1 day ago"

jobs:
  learn:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 50  # Need commit history for scan-git

      - uses: actions/setup-node@v4
        with:
          node-version: "18"

      - run: npm ci

      - name: Extract learnings from recent commits
        run: |
          SINCE="${{ github.event.inputs.since || '1 day ago' }}"
          npx ts-node Skills/governance/recipes/auto-learning-loop.ts scan-git \
            --since "$SINCE" \
            --autoApply
        env:
          PERSONIZE_SECRET_KEY: ${{ secrets.PERSONIZE_SECRET_KEY }}
```

**How it works:** The `auto-learning-loop.ts scan-git` command reads recent commit diffs, classifies each change (bug-fix → `known-bugs-and-workarounds`, security → `security-standards`, pattern → `engineering-standards`, etc.), and appends the learning to the right governance variable. Developers don't need to do anything — their commits teach the shared brain automatically.

### Safety

- **`--delete` is never implied.** Remote-only variables are only removed when explicitly requested.
- **`--dry-run` shows the full diff** before any changes.
- **Pull mode** (`--pull`) writes local files but never modifies remote variables.
- **Frontmatter tags** are preserved during update — only the value is compared.
- **Version history**: Every update is tracked with the commit message or a sync note.

### Pull Mode (Bootstrap)

```bash
npx ts-node sync.ts --pull
```

Downloads all remote variables as local `.md` files with frontmatter. Never overwrites existing local files.

### Example Workflow

1. Bootstrap: `npx ts-node sync.ts --pull`
2. Edit `governance/variables/sales-playbook.md`
3. Preview: `npx ts-node sync.ts --dry-run`
4. Push: `npx ts-node sync.ts`
5. Commit and push to Git — CI auto-syncs on merge to main

---

## Complete Team Setup: Shared Governance as a Service

This section walks through the full setup for using governance as a **shared knowledge layer** across a development team. Every developer contributes knowledge (via markdown files and git commits), and every AI agent consumes it (via `smartGuidelines`).

### How Knowledge Flows

```
┌─────────────────────────────────────────────────────────────┐
│                  HOW KNOWLEDGE FLOWS IN                      │
│                                                             │
│  Developer A          Developer B          CI/CD Pipeline   │
│  (Claude Code)        (Cursor/Copilot)     (GitHub Actions) │
│       │                    │                     │          │
│  writes code,         writes code,          merges PR,      │
│  fixes bugs,          adds patterns,        runs tests      │
│  learns things        learns things                         │
│       │                    │                     │          │
│       ▼                    ▼                     ▼          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           governance/variables/*.md                   │   │
│  │                  (in Git repo)                        │   │
│  │                                                      │   │
│  │  coding-standards.md    known-bugs.md                │   │
│  │  architecture-decisions.md   debugging-patterns.md   │   │
│  │  api-conventions.md     testing-playbook.md          │   │
│  │  module-map.md          security-standards.md        │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                   │
│                    git push / PR merge                       │
│                         │                                   │
│                         ▼                                   │
│              ┌─────────────────────┐                        │
│              │   GitHub Actions     │                        │
│              │   governance-sync    │ ← syncs .md to API    │
│              │   governance-learn   │ ← extracts from code  │
│              └──────────┬──────────┘                        │
│                         │                                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Personize Governance Layer                    │   │
│  │         (smartGuidelines API)                         │   │
│  │                                                      │   │
│  │  Every agent in your org can now query:               │   │
│  │  "What are our API conventions?"                      │   │
│  │  "How do we handle auth errors?"                      │   │
│  │  "What depends on the memory module?"                 │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                   │
│              HOW KNOWLEDGE FLOWS OUT                         │
│                         │                                   │
│       ┌─────────────────┼─────────────────┐                │
│       ▼                 ▼                 ▼                │
│  Developer A       Developer B       Any AI Agent          │
│  (auto-fetches     (auto-fetches     (calls smart          │
│   governance        governance        Guidelines            │
│   into CLAUDE.md)   into .cursorrules) before acting)      │
└─────────────────────────────────────────────────────────────┘
```

### Three Layers of Automation

| Layer | What | How | Developer effort |
|---|---|---|---|
| **1. GitOps Sync** | `.md` files in Git → Personize API | `governance-sync.yml` GitHub Action on push to `governance/variables/` | Edit a `.md` file, push. Done. |
| **2. Auto-Learning** | Git commits → governance updates | `governance-learn.yml` GitHub Action scans diffs, classifies changes, appends to right variable | Zero. Commits teach the shared brain. |
| **3. IDE Bridge** | Agents fetch governance before acting | `bridge.ts` CLI or MCP `ai_smart_guidelines` tool | Zero. Agent checks automatically. |

### Step-by-Step Setup

#### Step 1: Create the governance folder with seed files

```
governance/
├── variables/
│   ├── coding-standards.md          ← Code style, naming, patterns
│   ├── architecture-decisions.md    ← ADRs, why we chose X over Y
│   ├── api-conventions.md           ← Endpoint patterns, error handling
│   ├── testing-playbook.md          ← How/what/when to test
│   ├── debugging-patterns.md        ← Common issues & solutions
│   ├── known-bugs-and-workarounds.md ← Living bug knowledge base
│   ├── security-standards.md        ← Auth, input validation, secrets
│   ├── onboarding-guide.md          ← New developer quick-start
│   ├── pr-review-checklist.md       ← What to check in code reviews
│   ├── module-map.md                ← Every module's purpose, deps, danger zones
│   └── high-risk-changes.md         ← Cross-cutting concerns, approval rules
└── bridge.ts                        ← CLI wrapper for IDE use
```

Each `.md` file should have YAML frontmatter:

```markdown
---
tags: [engineering, standards, governance]
description: One-line summary for routing and search
---
# Title

## Section One
Content written for AI consumption: explicit rules, concrete examples, tables.

## Section Two
More content...
```

**Content guidelines:**
- Write for AI agents, not humans — explicit rules, no ambiguity
- Use H2 (`##`) sections — `smartGuidelines` can extract individual sections
- Front-load important terms in the first 1000 characters (included in embedding)
- Use tables for comparisons, bullet lists for rules
- Include "when to use" and "when NOT to use" guidance

#### Step 2: Add GitHub Actions

Create two workflows (see "CI Integration" section above for full YAML):

1. **`.github/workflows/governance-sync.yml`** — Syncs `governance/variables/` to Personize on push to main
2. **`.github/workflows/governance-learn.yml`** — Extracts learnings from `src/` commits on push to main

**Required secret:** `PERSONIZE_SECRET_KEY` (Settings → Secrets and variables → Actions)

#### Step 3: Create the IDE bridge

Create `governance/bridge.ts` as a thin CLI wrapper:

```typescript
/**
 * Governance Bridge — Local CLI wrapper for IDE governance integration.
 *
 * Usage:
 *   npx ts-node governance/bridge.ts fetch "how do we handle auth?"
 *   npx ts-node governance/bridge.ts learn "DynamoDB needs LastEvaluatedKey pagination"
 *   npx ts-node governance/bridge.ts list
 *   npx ts-node governance/bridge.ts structure <guidelineId>
 *   npx ts-node governance/bridge.ts generate-claude-md
 *
 * Requires: PERSONIZE_SECRET_KEY environment variable
 */
import { resolve } from 'path';
const recipePath = resolve(__dirname, '../Skills/governance/recipes/ide-governance-bridge.ts');
require(recipePath);
```

#### Step 4: Add governance to CLAUDE.md (or .cursorrules, or copilot instructions)

Add a governance block to the project's AI agent instructions so every agent checks shared knowledge first:

```markdown
## Governance — Check Before Acting

Before writing code, modifying a module, or making architectural decisions:

\`\`\`bash
npx ts-node governance/bridge.ts fetch "your question here"
\`\`\`

Key files in governance/variables/:
- module-map.md — Every module's purpose, dependencies, danger zones
- high-risk-changes.md — What needs approval, migration rules
- coding-standards.md — Naming, patterns, file structure
- api-conventions.md — Endpoints, response format, auth
- security-standards.md — Auth, PII, API key handling
```

For Cursor: add the same block to `.cursorrules`.
For Copilot: add to `.github/copilot-instructions.md`.

#### Step 5: Initial sync

```bash
# Set your API key
export PERSONIZE_SECRET_KEY=sk_live_...

# Dry run first
npx ts-node Skills/governance/sync.ts governance/variables --dry-run

# Sync to Personize
npx ts-node Skills/governance/sync.ts governance/variables

# Verify — should return relevant governance
npx ts-node governance/bridge.ts fetch "what are our coding standards?"
```

### Developer Experience

| Concern | Answer |
|---|---|
| "I don't want to learn a new tool" | It's just `.md` files in Git. Edit, commit, push. Done. |
| "I'll forget to contribute" | Auto-learning extracts from your commits automatically. |
| "How do I find what the team knows?" | Your AI agent queries `smartGuidelines` before every task. |
| "What if two people edit the same guideline?" | Section-level updates + Git merge = safe concurrent editing. |
| "How do I get started?" | `npx ts-node Skills/governance/sync.ts --pull` downloads everything locally. |
| "What if I'm offline?" | `generate-claude-md` creates a local snapshot for offline use. |

### Example Seed Variables for Engineering Teams

These are the most common governance variables for development teams:

| Variable | What it contains | Who maintains |
|---|---|---|
| `coding-standards` | Language, framework, naming, module structure | Tech lead |
| `architecture-decisions` | ADRs: why we chose X over Y | Tech lead + senior devs |
| `api-conventions` | Endpoint patterns, response format, auth, pagination | Backend team |
| `testing-playbook` | Framework, test types, how to run, what to test | QA / all devs |
| `debugging-patterns` | Debug flags, common issues, diagnostic commands | All devs (grows via auto-learn) |
| `known-bugs-and-workarounds` | Active bugs, recently fixed, open TODOs | All devs (grows via auto-learn) |
| `security-standards` | Auth patterns, PII redaction, key handling | Security / tech lead |
| `module-map` | Every module's purpose, deps, consumers, danger zones | Tech lead (grows via auto-learn) |
| `high-risk-changes` | Cross-cutting concerns, approval rules, migration checklist | Tech lead |
| `onboarding-guide` | New developer quick-start | All devs |
| `pr-review-checklist` | What to check in code reviews | All devs |
