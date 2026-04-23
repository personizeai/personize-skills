# Personize Skills

Skills are modular packages of instructions that help AI agents use the Personize platform effectively. Each skill is a folder with a `SKILL.md` entry point inside `skills/`.

**Install:** `npx personize skills install`

**How discovery works**: Only the `name` and `description` frontmatter is pre-loaded at startup. The full `SKILL.md` loads when the skill is triggered. Reference files load on-demand as the agent needs them. This progressive disclosure pattern is the same architecture that powers `smartGuidelines()` -- agents receive only the guidance relevant to the current task, not all of it.

---

## Skills Catalog

| Skill | Description | Use when... |
|---|---|---|
| [personize-agent-core](./skills/personize-agent-core/) | Core agent loop: bootstrap, recall-govern-act-store, tool composition, self-correction, learning | Foundation for any Personize-powered agent |
| [personize-architect](./skills/personize-architect/) | Entity modeling, property design, governance architecture, schema evolution, evaluation | Designing solutions, creating schemas, planning integrations |
| [personize-reference](./skills/personize-reference/) | Complete API endpoints, SDK methods, CLI commands, MCP tools, error handling | Need exact parameters, error codes, or method signatures |
| [personize-enabler](./skills/personize-enabler/) | Ready-to-run scripts, collection presets, governance templates | Need a script, template, or starter schema |

See [skills/README.md](./skills/README.md) for the full routing guide.
