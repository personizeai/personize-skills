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

When collections are empty and no guidelines exist:

| Step | Tool | What |
|------|------|------|
| 1 | `personize_skill` | Load platform guidance |
| 2 | `personize_context` | Discover org state |
| 3 | Ask user | What are you building? Who are your entities? |
| 4 | `collection_create` | Create entity collections with properties |
| 5 | Verify: `collection_list` | Confirm collections exist with properties |
| 6 | `guideline_create` | Create governance guidelines (rules, policies) |
| 7 | Verify: `guideline_list` | Confirm guidelines exist |
| 8 | `memory_store_pro(about:"self")` | Store what was configured |

## What Goes Where

| Thing | Tool | Examples |
|-------|------|----------|
| Entity data (has identity) | `collection_create` | Contacts, Companies, Deals, Campaigns |
| Behavioral rules/policies | `guideline_create` | ICP criteria, email standards, send limits |
| Content to remember | `memory_store_pro` | Meeting notes, emails, research |
| Structured field on entity | Property in collection | deal_stage, budget, title |
| Agent's own learnings | `memory_store_pro(about:"self")` | Preferences, decisions, patterns |
