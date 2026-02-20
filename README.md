# Personize Skills

Agent skills for [Personize](https://personize.ai) — installable across 40+ AI coding agents via [skills.sh](https://skills.sh).

## Install

```bash
# Install all skills
npx skills add hataheri/personize-skills

# Install a specific skill
npx skills add hataheri/personize-skills --skill memory

# Install for a specific agent
npx skills add hataheri/personize-skills -a claude-code
npx skills add hataheri/personize-skills -a cursor
npx skills add hataheri/personize-skills -a antigravity
```

## Skills

| Skill | Description |
|---|---|
| **memory** | Stores and retrieves persistent memory about records — contacts, companies, employees, members, and more. |
| **guidelines** | Manages organizational guidelines, policies, and best practices as governance variables accessible to all AI agents via SmartContext. |
| **personalization-architect** | Discovers and implements opportunities for AI-powered memory and personalization across software, workflows, and AI agents. |
| **integration-builder** | Builds data sync integrations that pull records from CRMs and databases into Personize memory. |
| **n8n-workflows** | Generates importable n8n workflow JSON files that sync data between Personize and 400+ apps. |
| **gtm-workflows-builder-trigger-dev** | Builds production-ready GTM workflow pipelines using Trigger.dev and the Personize SDK — outbound sequences, inbound lead processing, enrichment, and signal monitoring. |

## Prerequisites

- A Personize account and API key (`sk_live_...`)
- `npm install @personize/sdk` (for SDK-based skills)

## Supported Agents

Claude Code, Cursor, GitHub Copilot, Codex, Gemini, Windsurf, Antigravity, and any agent that supports [skills.sh](https://skills.sh).

## Learn More

- [Personize Documentation](https://docs.personize.ai)
- [skills.sh — The Agent Skills Directory](https://skills.sh)
