# Governance Setup Guide (Team)

This guide explains how every developer can use your governance system safely and consistently.

## What We Use

- **SDK (`@personize/sdk`)**: programmatic access to guidelines/memory.
- **Skills**: reusable workflows/docs/recipes (including governance auto-learning).
- **MCP (optional but recommended)**: gives IDE/chat agents direct governance tools.

Use all three for the best experience:
- SDK for scripts/CI.
- Skills for standard workflows and shared best practices.
- MCP for agent-native access in IDE/chat tools.

## 1. Prerequisites

- Node.js 18+ (22 recommended in this repo).
- Access to repo.
- Personize API key: `PERSONIZE_SECRET_KEY=sk_live_...`

## 2. Environment Setup

Add to local env:

```bash
PERSONIZE_SECRET_KEY=sk_live_...
```

Install dependencies:

```bash
npm ci
```

## 3. SDK Usage (Baseline)

Example:

```ts
import { Personize } from '@personize/sdk';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
const list = await client.guidelines.list();
const guidelines = list.data?.actions || [];
```

Important response shape:
- `client.guidelines.list()` returns `data.actions` (not top-level `actions`).

## 4. Skills Usage

Our governance skill files live in:

- `Skills/governance/*` (source of truth in this repo)
- mirrored copies in `.agents/...` and `sdk/...` for shared distribution

When updating governance skill behavior, update all copies together.

## 5. MCP Setup (Recommended)

Connect Personize MCP server in your client/tool using:

- SSE endpoint: `https://agent.personize.ai/mcp/sse`
- auth via API key/OAuth per tool

Common MCP tools:
- `guideline_list`
- `guideline_read`
- `guideline_create`
- `guideline_update`
- `guideline_history`
- `ai_smart_guidelines`

## 6. Governance Auto-Learn in CI

Workflow file:
- `.github/workflows/governance-learn.yml`

Current default behavior:
- On push to `src/**` (`main/master`), run scan and auto-apply governance updates.

## 7. Guardrails (Opt-In)

Supported flags in `Skills/governance/recipes/auto-learning-loop.ts`:

- `--require-approval` (no writes, proposal output only)
- `--proposals-file <path>`
- `--min-confidence <0..1>`
- `--max-updates <N>`
- `--dry-run`
- `--no-auto-apply`
- `--autoApply` (explicit auto-apply)

### Recommended Modes

1. **Fast mode (current account behavior)**
- Auto-apply on CI push.

2. **Production-hard mode (shared/regulated teams)**
- Stage 1 (propose only):

```bash
npx ts-node Skills/governance/recipes/auto-learning-loop.ts scan-git \
  --since "1 day ago" \
  --require-approval \
  --proposals-file "./governance-learning-proposals.json" \
  --min-confidence 0.65 \
  --max-updates 15
```

- Stage 2 (apply approved proposals):

```bash
npx ts-node Skills/governance/recipes/auto-learning-loop.ts batch \
  --file "./governance-learning-proposals.json"
```

## 8. Should Developers Add Skills, MCP, and SDK?

Short answer: **yes**.

- **SDK**: required for scripts, CI, tests, automation.
- **Skills**: required for shared workflows and consistency.
- **MCP**: strongly recommended for daily IDE/agent usage.

If someone skips MCP, they can still work via SDK + Skills.

## 9. Team Checklist

- [ ] `PERSONIZE_SECRET_KEY` configured locally
- [ ] `npm ci` succeeds
- [ ] can run `client.guidelines.list()` and read `data.actions`
- [ ] governance skill docs available locally
- [ ] understands CI mode: auto-apply vs review-first
- [ ] (recommended) MCP connected in IDE/chat tool

