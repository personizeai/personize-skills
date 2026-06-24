# Enablement — Rolling Personize Out to Everyone (and Their Agents)

How to take Personize from one integration to **every employee and every AI agent** in the org. The goal is one governed memory layer that all humans and all their AI tools share — so the org's knowledge and rules are consistent no matter who (or what) is doing the work. This is the *adoption* file; for the modeling layer that gets provisioned, see SKILL "Kits" and [`memory-as-business-model.md`](./memory-as-business-model.md).

The core idea: **governance is the shared control layer everyone inherits, and MCP is how each person's own AI tools connect to it.** Give each role the right access profile, layer the org's guidelines underneath every agent, and roll out in stages so trust builds before scope widens.

## MCP access profiles per role
Personize MCP exposes scoped **profiles** so each person/agent gets exactly the surface their role needs — read-only where mutations are dangerous, full access where it's warranted. Assign by role, not by person.

| Profile | Surface | Give to |
|---|---|---|
| **agent2_0** | 5-tool consolidated surface (`retrieve_unified`, `retrieve_feedback`, `memory_save`, `personize_cookbook`, `personize_md`). | New agent integrations — the default for anything built today. |
| **agent** | Memory read/write + SmartContext (read-only governance). Legacy full-surface profile. | Production agents that write memory on the legacy tool set. |
| **agent-readonly** | Memory read + SmartContext. Zero mutations. | Agents that should consult memory + rules but never change anything (analysts, dashboards, untrusted automations). |
| **governance** | Governance CRUD + SmartContext. No memory tools. | People/agents that own policies and playbooks (ops, enablement, compliance) without touching record data. |
| **developer** | Everything — full platform access. | IDE/chat tools for engineers building and operating the integration. |

SHOULD default new agents to **agent2_0**, give individual contributors' chat tools **agent-readonly** or **agent** depending on whether they should write, reserve **developer** for the people building the system, and route policy owners through **governance**. MUST NOT hand out **developer** broadly — full platform access is for builders, not every seat. Profiles are how you make "everyone has access" safe: the surface is shaped to the role.

## Governance as the shared control layer
Everyone — every human via their tools, every agent via MCP — inherits the **same org guidelines** through SmartContext. That's what makes the rollout coherent rather than a sprawl of disconnected agents each doing its own thing. The three-layer stack (platform skills → org guidelines → role-specific guidelines) means a new person or agent is governed correctly the moment they connect, with no per-tool configuration. SHOULD seed the org's guidelines *before* widening MCP access — because access without governance is just sprawl, and governance is the one layer that scales the org's intent to every consumer for free (guidelines are free; see `cost-optimization.md`). Role-specific overlays (`skill:role:*`) let one team's rules narrow on top of the org baseline without forking it.

## How each employee's own AI tools connect
The point of enablement is that an employee's *existing* AI tools become Personize-aware — no new app to learn. Each tool connects via MCP and inherits the org's memory + guidelines:
- **Claude Code / Cursor / other IDE agents** — developer (or agent) profile; the engineer's coding agent recalls org context and follows org rules while it works.
- **Claude / ChatGPT / chat assistants** — agent or agent-readonly profile; the assistant grounds answers in org memory and governance instead of guessing.
- **Custom / platform agents** — agent2_0 profile; built integrations use the consolidated 5-tool surface.

Every connected tool runs the same **Recall → Govern → Act → Store** loop: recall what the org knows about the entities involved, govern by the applicable guidelines, do the work, store useful outputs back. The result is a flywheel — what one person's agent learns is available to the next person's agent, because memory is a shared substrate, not per-tool state.

## Dogfooding via the engineering-memory kit
The fastest credible rollout is to use Personize on the team building with it. The built-in **`engineering-memory`** kit provisions a multi-developer + AI-agent modeling layer out of the box — entity types for `module` / `initiative` / `contributor` / `decision` / `incident` / `release` / `monitor` / `dependency`. Install it, point the team's coding agents at it (developer profile), and the org's own engineering knowledge becomes the first shared memory everyone's tools draw on. SHOULD dogfood here first — it proves the loop, surfaces gaps in the guidelines, and gives the team a concrete reference install before rolling to non-technical teams. (New orgs are empty until a kit runs; this is also the deliverable form of the *Memory as a Model of Your Business* model.)

## Onboarding stages
Roll out in widening rings — prove value, then scale scope. Each stage adds people, agents, and guideline coverage.

| Stage | Who | Profiles | Governance | Goal |
|---|---|---|---|---|
| **1. Pilot** | One team, a few power users + their agents | agent-readonly / agent; developer for builders | Seed core org guidelines (5–15) + one team overlay | Prove the Recall→Govern→Act→Store loop end-to-end; dogfood `engineering-memory`. |
| **2. Team** | The whole team, all their AI tools connected | Add agent2_0 for built integrations; governance for the team's policy owner | Refine guidelines from pilot learnings (`smartUpdate`, suggest mode) | Daily use is routine; outputs are consistent across people's tools. |
| **3. Org-wide** | All employees + all their agents | Full set, assigned by role | Org baseline stable; per-role overlays for each department | One governed memory layer the whole org and its agents share. |

MUST get value proven at each stage before widening — premature org-wide rollout without seeded governance produces inconsistent agents and erodes trust. SHOULD evolve guidelines from real usage (feed learnings to `guidelines.smartUpdate`, suggest mode for production) so the control layer improves as adoption grows.

## Enablement checklist

- [ ] **Core guidelines seeded** (5–15, one concern each) *before* widening MCP access.
- [ ] **Profiles assigned by role** — agent2_0 for new agents, agent-readonly/agent for ICs' tools, governance for policy owners, developer only for builders.
- [ ] **Kit installed** — `engineering-memory` for the build team (dogfood), or the right domain kit per team; orgs start empty.
- [ ] **Each tool connected via MCP** — IDE agents, chat assistants, custom agents all running Recall→Govern→Act→Store.
- [ ] **Staged rollout** — pilot → team → org-wide, value proven before each widening.
- [ ] **Governance evolves** — learnings fed back via `smartUpdate` (suggest mode) as adoption grows.

→ Modeling layer kits provision: SKILL "Kits". The shared-substrate rationale: [`memory-as-business-model.md`](./memory-as-business-model.md). Exact MCP tools per profile: ask about `personize-reference` (`mcp-tools.md`).
