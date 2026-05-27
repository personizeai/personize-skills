# Personize Skills

Modular instruction packages that teach AI agents how to work with the [Personize](https://personize.ai) platform — memory, governance, prompts, schedules, CRM integration, and more.

Each skill is a folder with a `SKILL.md` entry point. Reference files, recipes, and templates live in subdirectories and load on-demand via progressive disclosure. This is the same architecture that powers Personize's `smartGuidelines()` retrieval — agents receive only the content relevant to the current task, not all of it.

**License:** Apache 2.0 — fork, customize, ship.

---

## Two Generations Currently in This Repo

This repo is in transition. The new persona-based skills (Skills 2.0) are the **recommended** catalog going forward; the older feature-named skills remain for backward compatibility and will be removed once all consumers have migrated.

### Skills 2.0 — recommended (4 personas)

Persona-based design: instead of memorizing a list of feature skills, you load the persona that matches what you're doing right now.

| Persona | Purpose | Mode |
|---------|---------|------|
| [personize-agent-core](./skills/personize-agent-core/) | How to think, compose, coordinate, self-correct, and learn as a Personize-powered agent. Bootstrap, recall-govern-act-store loop, tool composition, multi-agent coordination, identity resolution, error recovery, learning. **Foundation for any agent on any platform.** | AlwaysOn |
| [personize-architect](./skills/personize-architect/) | How to design, model, plan, evaluate, and evolve Personize integrations — including advanced multi-step `instructions[]` patterns (conditional branching, multi-source reconciliation, compliance-gated generation, persona fanout, bounded research, few-shot classification, checklist-gated workflows, self-reflective refinement). | On-demand |
| [personize-reference](./skills/personize-reference/) | Complete lookup layer for every API endpoint, SDK method, CLI command, and MCP tool — including schedules (`run_prompt` / `send_notification`) and CRM passthrough (HubSpot / Salesforce direct REST API via the org's managed OAuth connection). Cross-interface operation tables, error codes, response schemas, FAQ. | On-demand |
| [personize-enabler](./skills/personize-enabler/) | Ready-to-execute resources: TypeScript scripts (CSV import, CRM sync, outreach, monitoring), n8n workflow templates, collection schema presets, governance guideline templates. **Grab, customize, and run.** | On-demand |

**Why persona-based:** when you decompose a task in your head, you ask "Am I *acting* / *designing* / *looking up* / *executing*?" — those 4 verbs map directly to the 4 personas. One MCP tool call to `personize_skill(task)` routes by semantic relevance across all 4; you don't have to remember a long list of feature-skill names.

`agent-core` is always loaded; the other three load on-demand based on relevance scoring.

### Legacy feature skills — deprecated, kept for compatibility

These are the original feature-named skills. They still work — Claude Code, Cursor, Windsurf, and other IDE agents that install skills by name will continue to find them — but new development should target the personas above. Plan to remove these in a future release.

| Skill | Replacement | Status |
|---|---|---|
| [personize](./skills/personize/) (master) | → personize-reference + personize-architect | Deprecated |
| [personize-memory](./skills/personize-memory/) | → personize-reference (memory tables) + personize-enabler (recipes) | Deprecated |
| [personize-governance](./skills/personize-governance/) | → personize-architect (governance authoring) + personize-enabler (templates) | Deprecated |
| [personize-code](./skills/personize-code/) | → personize-enabler (scripts) + personize-architect (instruction patterns) | Deprecated |
| [personize-agent-workspace](./skills/personize-agent-workspace/) | → personize-architect (workspace schemas) + personize-enabler | Deprecated |
| [personize-solution-architect](./skills/personize-solution-architect/) | → personize-architect | Deprecated |

---

## How Skills Work

Skills follow a three-level progressive disclosure pattern:

| Level | What loads | When |
|---|---|---|
| 1. Frontmatter | `name` + `description` + tags | Always pre-loaded into the agent's context at startup |
| 2. SKILL.md body | Full guideline document (~100–300 lines) | When the skill is triggered by name or by SmartContext relevance scoring |
| 3. Attachments | Reference files, scripts, templates, presets in subdirectories | On-demand: cheat sheets ≤ 2 KB auto-inline; 2–20 KB preview shows the first 10 lines; > 20 KB returns metadata only and the agent fetches the full file when needed |

This keeps default context costs low — an agent doesn't pay for content it doesn't need.

## Installing & Using

### In Claude Code, Cursor, Windsurf, or any IDE skill system

Copy the persona folder you want into your IDE's skills directory. For Claude Code:

```bash
cp -r skills/personize-agent-core ~/.claude/skills/
cp -r skills/personize-reference ~/.claude/skills/
cp -r skills/personize-architect ~/.claude/skills/
cp -r skills/personize-enabler ~/.claude/skills/
```

Restart your IDE. The skills become discoverable via your IDE's skill router.

### Via the Personize Platform (`personize_skill` MCP tool)

If your agent is connected to the Personize MCP server, all 4 personas are already available — `seed-platform-guidelines.ts` from the Personize backend uploads them to SmartContext. Call the `personize_skill` MCP tool with your task description and the platform returns the relevant persona sections plus on-demand attachment previews.

### Direct download (any language, any agent)

The platform serves a packaged zip of all 4 personas + attachments:

```
GET https://agent.personize.ai/api/v1/guidelines/download?scope=platform
```

Returns `platform-guidelines/v2/guidelines.zip` (current size ~239 KB, 85 files).

## Routing Guide

When intent is ambiguous, this is how the personas line up against common requests:

| You want to… | Persona |
|---|---|
| Start any agent task / understand the platform's mental model | **personize-agent-core** (always loaded, no action needed) |
| Look up a specific API endpoint, SDK method, CLI command, MCP tool, or error code | **personize-reference** |
| Schedule a recurring prompt, set a one-time reminder, or list/edit/cancel schedules | **personize-reference** (schedules section + `client.schedules.*`) |
| Call HubSpot or Salesforce REST APIs without managing OAuth credentials | **personize-reference** (CRM passthrough section + `client.hubspot.*` / `client.salesforce.*`) |
| Design a new integration end-to-end (schema, workspace, governance, topology) | **personize-architect** |
| Author a multi-step prompt that branches by tier, reconciles sources, gates on compliance, fans out to N personas, refines iteratively | **personize-architect** (advanced `instructions[]` patterns) |
| Grab a ready-to-run TypeScript script, n8n template, collection preset, or governance template | **personize-enabler** |
| Build a durable pipeline (outbound sequence, CRM sync, daily digest, account monitor) | **personize-enabler** scripts + **personize-architect** patterns |

When you genuinely don't know which to load, just call the MCP tool: `personize_skill(task_description)` — semantic routing picks for you.

## API + SDK + CLI Tested Against

- **API:** `/api/v1/*` for schedules + CRM passthrough (v1.1 does not yet expose these surfaces). `/api/v1/prompt` and `/api/v1.1/prompt` mirror each other for the `instructions[]` payload — no payload differences. v1 sunsets `2026-07-15` for routes explicitly marked deprecated in the platform migration guide; **schedules and CRM passthrough are NOT in that deprecation set.**
- **SDK:** [`@personize/sdk@0.12.0`](https://www.npmjs.com/package/@personize/sdk) — verified `client.schedules.{create,list,get,update,delete,executions}`, `client.hubspot.{contacts,companies,deals,tasks,notes,request}`, `client.salesforce.{request,query,queryAll,sobject(...).{create,get,update,upsert,delete}}`, `client.ai.prompt({ instructions: [...] })`.
- **CLI:** [`@personize/cli@0.5.0`](https://www.npmjs.com/package/@personize/cli) — `personize schedules`, `personize crm hubspot`, `personize crm salesforce` command groups.

## Contributing

Skills are designed to be forkable. If you have a workflow worth sharing:

1. Fork this repo.
2. Drop your skill into `skills/<your-skill-name>/SKILL.md` with reference files under `skills/<your-skill-name>/reference/`.
3. Author attachments to hit the lowest tier that fits (cheat sheets under 2 KB get auto-inlined; deep references can be larger and load on demand).
4. Open a PR.

For more on authoring skills well (anti-patterns to avoid, when to split a file, how to write descriptions that trigger correctly), see [personize-architect → instruction-patterns.md](./skills/personize-architect/reference/instruction-patterns.md) and [personize-architect → cheat-anti-patterns.md](./skills/personize-architect/reference/cheat-anti-patterns.md).

## Versioning & History

| Date | Change |
|---|---|
| **2026-05-27** | Skills 2.0 reaches parity with the legacy skills. Schedules + CRM passthrough ported into `personize-reference`; advanced `instructions[]` patterns ported into `personize-architect`. Legacy skills marked deprecated. |
| 2026-05-26 | `personize-schedules`, `personize-crm-passthrough`, `personize-instructions-advanced` consolidated into the broader skills they fit. v1.1 API doc updates rolled in. |
| 2026-04-XX | Skills 2.0 introduced (4 personas replacing 22 feature skills). Initial draft of `personize-agent-core`, `personize-architect`, `personize-reference`, `personize-enabler`. |

## Links

- [Personize](https://personize.ai) — the platform
- [Personize Docs](https://docs.personize.ai)
- [@personize/sdk on npm](https://www.npmjs.com/package/@personize/sdk)
- [@personize/cli on npm](https://www.npmjs.com/package/@personize/cli)
- [Issues / questions](https://github.com/personizeai/personize-skills/issues)
