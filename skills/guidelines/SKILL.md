---
name: guidelines
description: "Manages organizational guidelines, policies, and best practices as governance variables accessible to all AI agents via SmartContext. Use when working with company rules, brand voice, compliance policies, playbooks, or when any task needs organizational context before proceeding."
license: Apache-2.0
compatibility: "Requires @personize/sdk or Personize MCP server and a Personize API key (sk_live_...)"
metadata: {"author": "personize-ai", "version": "1.0", "homepage": "https://personize.ai", "openclaw": {"emoji": "\U0001F4CB", "requires": {"env": ["PERSONIZE_SECRET_KEY"]}}}
---

# Skill: Guidelines

These are the rules, policies, and best practices that every AI agent in your organization must follow. **Always check Guidelines before generating content, making decisions, or taking actions.** One update here → every AI tool in your org gets smarter.

Guidelines are stored as markdown documents and are automatically available to all agents via `smartContext`. Use this skill to read, create, update, and manage them.

> This skill supports **two workflows**: conversational editing (chat, SDK scripts, automated pipelines) and **GitOps sync** (`.md` files in a Git repo synced to the API). Both produce the same output: well-structured guidelines available to all agents via `smartContext`.

---

## Actions

You have 6 actions available. Use whichever is appropriate for what the admin needs. They are not sequential — jump to the right action based on the conversation.

| Action | When to Use | Reference |
|---|---|---|
| **CREATE** | Admin shares content or wants a new guideline | `reference/operations.md` |
| **UPDATE** | Admin wants to modify an existing guideline (section, append, replace) | `reference/operations.md` |
| **IMPROVE** | Admin wants to clean up, restructure, or improve guideline quality | `reference/operations.md` |
| **AUDIT** | A factual change affects multiple guidelines (pricing, branding, policy) | `reference/operations.md` |
| **VERIFY** | Confirm agents can see the updated content via `smartContext` | `reference/operations.md` |
| **ONBOARD** | First-time user with 0-2 guidelines — guide them through setup | `reference/onboarding.md` |

**Before each action:** Read the reference file for full workflows, conversation patterns, and code examples.

---

## Works With Both SDK and MCP — One Skill, Two Interfaces

This skill works identically whether the LLM accesses guidelines via the **SDK** (code, scripts, IDE agents) or via **MCP** (Claude Desktop, ChatGPT, Cursor MCP connection).

| Interface | How it works | Best for |
|---|---|---|
| **SDK** (`@personize/sdk`) | `client.variables.list()`, `client.variables.update()`, etc. | Scripts, CI/CD, IDE agents, recipes |
| **MCP** (Model Context Protocol) | `guideline_list`, `guideline_read`, `guideline_create`, `guideline_update`, `guideline_delete` tools | Claude Desktop, ChatGPT, Cursor, any MCP-compatible client |

**MCP tools map 1:1 to SDK methods:**

| SDK Method | MCP Tool | Purpose |
|---|---|---|
| `client.variables.list()` | `guideline_list` | List all guidelines |
| `client.variables.getStructure(id)` | `guideline_read(guidelineId)` | Get section headings (TOC) |
| `client.variables.getSection(id, { header })` | `guideline_read(guidelineId, header)` | Get section content |
| `client.variables.create(payload)` | `guideline_create(name, value, tags, description)` | Create new guideline |
| `client.variables.update(id, payload)` | `guideline_update(guidelineId, value, updateMode, ...)` | Update guideline |
| `client.variables.delete(id)` | `guideline_delete(guidelineId)` | Delete guideline |
| `client.variables.history(id)` | `guideline_history(guidelineId)` | View change history |
| `client.ai.smartContext({ message })` | `ai_smart_context(message)` | Verify/fetch guidelines |

**When reading this skill document:**
- If you're connected via **MCP**, use the MCP tool names (`guideline_list`, `guideline_update`, etc.)
- If you're running via **SDK**, use the `client.variables.*` methods
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
- Tools `guideline_list`, `guideline_read`, `guideline_create`, `guideline_update`, `guideline_delete`, `guideline_history`, and `ai_smart_context` are automatically available

---

## What Guidelines Are

Guidelines are organization-wide documents — policies, best practices, playbooks, checklists, technical manuals, how-tos — stored as markdown. Once saved, they are automatically available to **all agents** in the organization via `client.ai.smartContext()`. When any agent asks smartContext a question like "how should I write a cold email?", it retrieves the relevant guidelines and includes them as context.

**Examples:** `sales-playbook`, `brand-voice-guidelines`, `icp-definitions`, `data-handling-policy`, `engineering-standards`, `incident-response-runbook`, `known-bugs-and-workarounds`, `pricing-rules`

---

## Action Summaries

### CREATE — Draft a New Guideline

1. Ask admin for topic, audience, and source material
2. Check for overlap with existing variables (`client.variables.list()`)
3. Draft with proper markdown structure (H1 title, H2 sections, actionable content)
4. Propose kebab-case name, tags, description
5. **Show draft and ask for approval** → create → verify with `smartContext`

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

After any create/update: call `smartContext` with relevant query → confirm the updated content appears.

> **Full workflows, conversation patterns, and code:** Read `reference/operations.md`

---

## Critical Rules

1. **ALWAYS show the admin what you're about to change before calling the API.** Never apply changes silently.
2. **ALWAYS include a historyNote** on every update. Be specific about what changed and why.
3. **Check for duplicates before creating.** Always list existing guidelines first.
4. **Prefer section-level updates over full replace.** Smaller, targeted changes are safer.
5. **Verify after changes.** Call `smartContext` to confirm agents will see the updated content.
6. **Preserve existing structure.** When updating a section, don't reorganize the rest of the guideline.
7. **Tag consistently.** Use existing tags when possible.
8. **Write for agents, not humans.** Be explicit, avoid ambiguity, use clear headers that match likely search queries.
9. **One concept per guideline.** Don't stuff everything into one mega-document.
10. **Respect the admin.** Improve structure and formatting, but preserve their voice and intent.
11. **Check history before editing in teams.** Call `client.variables.history(id)` before making changes. If someone else edited recently, mention it.

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
         │ smartContext     │ SDK API          │ Sync
         ▼                 ▼                  ▼
┌────────────┐   ┌──────────────┐   ┌──────────────────┐
│ AI Agents  │   │ IDE/Dev Tool │   │ CI/CD Pipelines  │
│ (chat,     │   │ Claude Code  │   │ GitHub Actions   │
│  workflows │   │ Codex/Cursor │   │ Cron jobs        │
│  pipelines)│   │ Gemini/Copilot│  │ n8n workflows    │
└────────────┘   └──────────────┘   └──────────────────┘
```

---

## Team Collaboration

When multiple people manage guidelines, follow these practices:

- **Version history:** Every update is tracked. Use `client.variables.history(id)` or `guideline_history` to review changes. Always start with `limit: 1`.
- **Conflict avoidance:** Use section-level updates (`updateMode: 'section'`) — two people can safely update different sections concurrently. Read before writing.
- **Attribution:** Write attribution-rich `historyNote` values — include what changed, why, and who requested it.
- **Ownership by tag:** `sales-*` variables owned by sales team, `engineering-*` by engineering.

> **Full guide:** Read `reference/collaboration.md` for version history patterns, conflict avoidance workflows, team patterns, and weekly review scripts.

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
2. **Fetch remote state** — Call `client.variables.list()`.
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

Use the provided `github-action.yml` to auto-sync on push:

```yaml
# .github/workflows/governance-sync.yml
# Copy from this skill's github-action.yml
```

The CI workflow uses `--no-delete` by default. Add `--delete` to the run command to enable deletion on push.

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
