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
2. MUST call `personize_md` first -- discovers org state and platform guidance in one call
3. Recall self-memory: `memory_retrieve(about:"self")`
4. Check governance: `memory_retrieve(mode='scout', message='<task or rule topic>', sources={documents:true, memories:false})`

## Fresh Org Setup Order

A brand-new org is EMPTY -- no collections, no guidelines. The fastest way to provision it is to install a kit: a built-in declarative manifest that creates collections and guidelines for you. Browse with `kits_list` (built-in: `personize-starter` for a general baseline, `engineering-memory` for engineering teams), install with `kits_install`, and poll progress with `kits_get_status`. Install a kit first; only hand-build collections/guidelines when no kit fits.

When collections are empty and no guidelines exist:

| Step | Tool | What |
|------|------|------|
| 1 | `personize_md` | Discover org state (confirm it's empty) + platform guidance |
| 2 | `kits_list` | List installable kits (`personize-starter`, `engineering-memory`) |
| 3 | `kits_install` | Provision the empty org from a built-in kit (poll with `kits_get_status`) |
| 4 | Ask user | What are you building? Who are your entities? (if no kit fits, build manually) |
| 5 | `collection_create` | Create entity collections with properties |
| 6 | Verify: `collection_list` | Confirm collections exist with properties |
| 7 | `memory_save(shape:'document', type:'guideline', content:'...')` | Create governance guidelines (rules, policies) |
| 8 | Verify: `memory_retrieve(mode='filter', filters={documents:{docType:['guideline']}})` | Confirm guidelines exist |
| 9 | `memory_save(about:"self")` | Store what was configured |

## What Goes Where

| Thing | Tool | Examples |
|-------|------|----------|
| Entity data (has identity) | `collection_create` | Contacts, Companies, Deals, Campaigns |
| Behavioral rules/policies | `memory_save(shape:'document')` | ICP criteria, email standards, send limits |
| Content to remember | `memory_save` | Meeting notes, emails, research |
| Structured field on entity | Property in collection | deal_stage, budget, title |
| Agent's own learnings | `memory_save(about:"self")` | Preferences, decisions, patterns |
