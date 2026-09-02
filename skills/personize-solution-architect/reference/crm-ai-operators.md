# CRM AI Operators — When the Integration Is Operator-Shaped

Most Personize integrations you design are bespoke: a schema, some guidelines, a pipeline. **CRM work is the exception.** There is an open-source (MIT) catalogue of ready-made CRM operations that already does the common jobs, so for a HubSpot or Salesforce customer the right first move is usually to adopt it rather than design from scratch.

Repo: [`crm-ai-operators`](https://github.com/hataheri/crm-ai-operators). It ships an MCP server, a CLI (`crm-agent`), its own skills, and a catalogue of operations grouped as sync / research / score / generate / analyze / act.

**This file is a routing note, not a manual.** The catalogue changes; read the repo for what exists today.

## Recognise the shape

Route here when the customer's ask is:

- "Score our contacts / companies / leads."
- "Sync HubSpot or Salesforce into memory and write intelligence back."
- "Research accounts before calls" or "generate meeting briefs."
- "Draft outreach sequences" or "analyze reply sentiment."
- "Clean up our CRM data" or "find duplicates."
- Anything phrased as *"AI in our CRM"*, RevOps automation, or replacing a stack of workflow plugins.

If the ask is CRM-shaped, **do not design a bespoke schema first.** Start from the catalogue, then customize. A bespoke design is the right answer only once you have confirmed the catalogue does not already cover it.

## What the model is

The agent writes governed intelligence back into the CRM as `personize_*` fields, with an audit trail. The customer owns the guidelines, instructions, and any custom operation logic; Personize supplies memory, governance, sync, and the AI runtime underneath. The point is not "AI in your CRM", it is hours back and a shrinking CRM-debt problem instead of a growing one.

Operations are **dry-run by default**. That matters when you are proposing: the adoption path starts with a reversible, observable step, which is a much easier approval than a system that writes to production CRM on day one.

## Adoption stacks

The repo organizes operations into staged stacks rather than a flat list, which maps directly onto the roadmap section of a proposal:

| Stack | Roughly when | What it establishes |
|---|---|---|
| **Quick Win** | Under an hour | Setup, core sync, ICP-fit scoring, a daily digest |
| **Pipeline Intelligence** | Day 1 to 2 | Lead-quality scoring, buying-stage analysis, pipeline-health reporting |
| **Outreach Automation** | Day 2 to 5 | Outreach sequences, meeting briefs, reply-sentiment analysis, rep handoff |
| **Data Quality** | Day 1 to 3 | Deduplication, lifecycle normalization, property push |
| **Full RevOps** | Week 1 to 3 | The whole catalogue plus subagent pipelines |

Use these as proposal phases. They are already sequenced by time-to-value and each one is independently useful, which is what makes them defensible in a staged rollout.

## Handing off

The repo carries its own two skills. Load them instead of trying to work from this page:

- **`crm-ai-operators`** — operating the CRM through Personize: running operations, installing, configuring.
- **`solution-architect`** (in that repo) — evaluating, adopting, customizing, and extending it. Its references cover operation clusters, subagent dispatch patterns, an ROI playbook, memorization strategy, guidelines optimization, and how to author a new operation.

Other things worth knowing before you propose:

| You need | Read in `crm-ai-operators` |
|---|---|
| What operations exist right now | `README.md`, `docs/CAPABILITY-MENU.md` |
| How it fits together | `docs/ARCHITECTURE.md`, `docs/RUNTIME.md` |
| Multi-agent patterns over CRM records | `docs/DISPATCH-PATTERNS.md`, `docs/DISPATCHING-SUBAGENTS-ON-CRM-RECORDS.md` |
| Running it on Personize Private | `docs/PERSONIZE-PRIVATE.md` (includes a what-works / what-is-hosted-only section) |
| Salesforce specifics | `docs/salesforce-integration.md` |
| Security and privacy posture | `docs/SECURITY.md`, `docs/PRIVACY.md` |

**Do not quote an operation count from memory.** The repo's own documents have disagreed with each other on it. Read the current README, or ask the Personize team.
