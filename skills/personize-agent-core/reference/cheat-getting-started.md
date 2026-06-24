# Getting Started with Personize

## For Developers (SDK + CLI)

```bash
# 1. Install SDK
npm install @personize/sdk

# 2. Install CLI
npm install -g @personize/cli
# or use npx: npx personize

# 3. Install Skills (agent guidance for Claude Code, Copilot, etc.)
npx personize skills install

# 4. Set API key
export PERSONIZE_SECRET_KEY=pz_...
# or create .env file: PERSONIZE_SECRET_KEY=pz_...

# 5. Verify connection
npx personize test
```

## For AI Agents (MCP)

1. Connect Personize MCP server (configured by admin or user)
2. MUST call `personize_skill` first -- loads platform guidance
3. Call `personize_context` -- discovers org state
4. Recall self-memory: `memory_recall_pro(about:"self")`
5. Check governance: `ai_smart_guidelines`

## Fresh Org Setup Order

A brand-new org is EMPTY -- no collections, no guidelines. The fastest way to provision it is to install a kit: a built-in declarative manifest that creates collections and guidelines for you. Browse with `kits_list` (built-in: `personize-starter` for a general baseline, `engineering-memory` for engineering teams), install with `kits_install`, and poll progress with `kits_get_status`. Install a kit first; only hand-build collections/guidelines when no kit fits.

When collections are empty and no guidelines exist:

| Step | Tool | What |
|------|------|------|
| 1 | `personize_skill` | Load platform guidance |
| 2 | `personize_context` | Discover org state (confirm it's empty) |
| 3 | `kits_list` | List installable kits (`personize-starter`, `engineering-memory`) |
| 4 | `kits_install` | Provision the empty org from a built-in kit (poll with `kits_get_status`) |
| 5 | Ask user | What are you building? Who are your entities? (if no kit fits, build manually) |
| 6 | `collection_create` | Create entity collections with properties |
| 7 | Verify: `collection_list` | Confirm collections exist with properties |
| 8 | `context_save` | Create governance guidelines (rules, policies) |
| 9 | Verify: `guideline_list` | Confirm guidelines exist |
| 10 | `memory_save(about:"self")` | Store what was configured |

## What Goes Where

| Thing | Tool | Examples |
|-------|------|----------|
| Entity data (has identity) | `collection_create` | Contacts, Companies, Deals, Campaigns |
| Behavioral rules/policies | `context_save` | ICP criteria, email standards, send limits |
| Content to remember | `memory_save` | Meeting notes, emails, research |
| Structured field on entity | Property in collection | deal_stage, budget, title |
| Agent's own learnings | `memory_save(about:"self")` | Preferences, decisions, patterns |
