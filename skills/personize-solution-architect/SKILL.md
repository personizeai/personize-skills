---
name: personize-solution-architect
description: "Personize Solution Architect — plans, designs, and validates complete Personize integrations across all integration modes (SDK, MCP, multi-agent, no-code), use case archetypes (communication, analysis, decision, execution, collaboration), and departments. Uses a 5-dimension situation assessment to prescribe the right architecture: who it's for, what kind of work, how Personize enters the system, what role it plays, and how autonomous. Covers the full journey: discovery, schema design, memorization pipelines, governance setup, content generation with guardrails, system wiring, and integration review. Use this skill whenever a developer wants to plan a Personize integration, design their data schema, add personalization to their product, generate AI-powered content with guardrails, wire Personize into existing systems, build batch processing pipelines, connect Personize as MCP tools to AI agents, design multi-agent architectures, or review an existing integration. Also trigger when they mention 'help me get started with Personize', 'how should I structure my data', 'personalization architecture', 'batch pipeline', 'MCP tools', 'multi-agent', collections design, the integration checklist, or want an end-to-end implementation roadmap. This is the starting point for any new Personize project."
license: Apache-2.0
compatibility: "Requires @personize/sdk and a Personize API key (sk_live_...)"
metadata: {"author": "personize-ai", "version": "2.0", "homepage": "https://personize.ai", "openclaw": {"emoji": "\U0001F3AF", "requires": {"env": ["PERSONIZE_SECRET_KEY"]}}}
---

# Skill: Personize Solution Architect

This skill is your architect and implementation guide for deploying Personize at scale -- unified customer memory, shared AI governance, and personalized experiences across every channel, integration mode, and autonomy level.

## What This Skill Solves

Most companies face three problems that block real personalization:

1. **Scattered customer knowledge.** Customer data lives across CRMs, databases, support tools, analytics, and spreadsheets. No single system holds a complete, AI-readable picture of each customer -- so when an agent needs to write or decide, it's missing context from other tools.

2. **Siloed AI guidelines.** Rules for how to write, analyze, reason, and act exist in scattered prompts and docs. Each AI agent follows its own version. There is no shared governance layer.

3. **Fragmented personalization.** Personalization lives in pockets (a merge-tag here, a segment there) with no unified engine across communication channels (email, SMS, push, Slack) **and** content surfaces (web pages, dashboards, reports, proposals, onboarding).

## What Personize Enables

Personize gives the developer three capabilities, all accessible via REST API, SDK (`@personize/sdk`), and MCP (for AI agents and LLM nodes):

| Capability | What It Does | Core SDK Methods | MCP Tools |
|---|---|---|---|
| **Unified Customer Memory** | Ingests structured and unstructured data from any tool via `memorizeBatch()`. AI extracts properties into per-entity profiles. Write-heavy by design -- ingest everything, recall what matters. | `memorize()`, `memorizeBatch()`, `recall()`, `smartDigest()` | `memory_store_pro`, `memory_recall_pro`, `memory_digest`, `memory_get_properties`, `memory_update_property` |
| **Governance Layer** | Centralizes guidelines (brand voice, ICPs, compliance rules, tone) as variables. When multiple employees use multiple AI tools and agents, governance is the single source of truth that keeps them all aligned. | `smartGuidelines()`, `guidelines.list/create/update()` | `ai_smart_guidelines`, `guideline_list`, `guideline_read`, `guideline_create`, `guideline_update`, `guideline_delete` |
| **Personalization Engine** | Combines memory (who is this person?) + governance (what are our rules?) to generate personalized output via multi-step `instructions[]`. | `prompt()` with `instructions[]`, `evaluate: true` | `ai_prompt` |

**Personalization surfaces:**
- **Communication** -- email, SMS, push notifications, Slack, in-app messages
- **Content** -- web pages, dashboards, reports, proposals, onboarding flows, knowledge base articles

> **Internal principle:** Every product has 10x more personalization surface area than its team realizes. Your job is to find it all.
>
> **Deep platform knowledge:** When designing solutions, you have access to the full platform capability inventory in `reference/platform-capabilities.md` -- including smart notifications (Personize Signal, open-source), data enrichment, multimodal input, MCP access profiles, and more. Consult it when a customer's requirements go beyond the three core capabilities. Open-source examples and templates are available at **https://github.com/orgs/personizeai/repositories**.

---

## The 5-Dimension Situation Assessment

Before proposing anything, understand the developer's situation across five dimensions. This assessment shapes every recommendation that follows.

### Dimension 1: Integration Mode -- HOW Personize enters the system

| Mode | Description | Who Controls the Flow | Example |
|---|---|---|---|
| **SDK in code** | Developer writes TypeScript/Python calling `@personize/sdk` | Developer -- deterministic, explicit | Batch CRM sync script, Next.js API route |
| **MCP on AI workflows** | Personize MCP tools added to n8n AI nodes, Zapier, LangChain | Workflow designer -- visual, low-code | n8n workflow with AI node that recalls + generates |
| **MCP on AI coding assistants** | Personize MCP tools in Cursor, Claude Code, Windsurf | The AI writes the integration | Developer says "write a follow-up email for sarah@acme.com" and the AI calls MCP tools |
| **MCP on multi-agent systems** | Personize as a tool provider in OpenClaw, CoWork, CrewAI, LangGraph, custom orchestrators | External framework orchestrates, agents call Personize tools autonomously | Sales intel agent + CS health agent + synthesis agent, each calling Personize MCP |
| **REST API from any language** | Direct HTTP calls to `/api/v1/*` endpoints | Developer -- any language | Python batch job, Go microservice, Ruby on Rails app |
| **No-code via n8n/Zapier** | Pre-built integrations, no code | Business user | Zapier: "When HubSpot deal closes, memorize + generate welcome email" |
| **Responses API** | `POST /api/v1/responses` -- Personize orchestrates multi-step workflows with scoped tools | Personize orchestrates | Step 1: recall context, Step 2: check governance, Step 3: generate, Step 4: memorize result |
| **Hybrid** | SDK for batch pipelines + MCP for agent reasoning + webhooks for event-driven | Mixed | Nightly batch sync (SDK) + real-time agent responses (MCP) + webhook triggers |

**Key distinction: "Personize orchestrates" vs "Personize is a tool."**
- **Personize orchestrates:** Using `/api/v1/responses` or `client.ai.prompt()` with `instructions[]`, Personize controls the multi-step loop.
- **Personize is a tool:** An external orchestrator (OpenClaw, LangGraph, n8n, custom code) calls individual Personize MCP tools or API endpoints as needed. The external system controls when to recall, generate, memorize.

> **Full guide:** Read `reference/integration-modes.md` for the complete decision framework, MCP setup, data flow patterns, and architecture diagrams.

### Dimension 2: Personize's Role -- WHERE it sits in the architecture

Personize can play one or more of these roles simultaneously. Map which are active for each use case.

| Role | What It Does | Active When | Key Capabilities |
|---|---|---|---|
| **Memory Layer** | Source (search, recall, digest, webhooks out) + Destination (memorize, batch, upsert) | Always -- this is the foundation | `search()`, `recall()`, `smartDigest()`, `memorize()`, `memorizeBatch()`, outbound webhooks |
| **Intelligence Layer** | Reasoning, generation, analysis via multi-step AI | Generating content, analyzing data, making decisions | `prompt()` with `instructions[]`, `responses` API, `evaluate: true` |
| **Governance Layer** | Rules, policies, guardrails that constrain all agents and employees | Any AI-generated output needs consistency | `smartGuidelines()`, `guidelines.list/create/update()` |
| **Learning Layer** | Agents write BACK -- updating governance and memories based on outcomes | Autonomous systems that improve over time | MCP: `guideline_create`, `guideline_update`, `memory_store_pro`, `memory_update_property` |
| **Coordination Substrate** | Workspace-based multi-agent collaboration on shared records | Multiple agents/humans working on the same entity | Workspace-tagged `memorize()` + `smartDigest()` reads |

**The 4-leg data flow loop:**

```
    ┌─────────────────┐
    │  External Systems │
    └───────┬───┬───────┘
            │   ▲
   Leg 1:   │   │  Leg 4:
   Ingest   │   │  Deliver/Webhook
            ▼   │
    ┌─────────────────┐
    │    PERSONIZE     │
    │  Memory + Gov +  │
    │  Intelligence    │
    └───────┬───┬───────┘
            │   ▲
   Leg 2:   │   │  Leg 3:
   Context  │   │  Learn Back
            ▼   │
    ┌─────────────────┐
    │  Agents / AI     │
    └─────────────────┘
```

- **Leg 1: External Systems -> Personize** -- CRM webhooks, batch imports, event streams feed data in
- **Leg 2: Personize -> Agents** -- recall, digest, guidelines provide context for reasoning
- **Leg 3: Agents -> Personize** -- agents memorize outcomes, update properties, create/update governance
- **Leg 4: Personize -> External Systems** -- outbound webhooks push results to CRMs, email services, Slack

A batch CRM sync only uses legs 1+4. A fully autonomous agent system uses all four legs continuously. The architect should map which legs are active for each use case.

### Dimension 3: Use Case Archetype -- WHAT kind of work

| Archetype | Description | Primary Personize Layers | Example Workflows |
|---|---|---|---|
| **Communication-heavy** | Generate and send -- outreach, follow-ups, notifications, nurture | Generation + Governance + Memory | Cold outreach sequences, health check-ins, digest emails, welcome messages |
| **Analysis-heavy** | Research and synthesize -- scoring, reporting, competitive intel | Memory + Recall + (light) Generation | Account research briefs, QBR narratives, health score reports, market analysis |
| **Decision-heavy** | Score and route -- qualification, prioritization, triage, next-best-action | All three layers equally | Lead qualification, churn risk routing, support ticket triage, deal prioritization |
| **Execution-heavy** | Sync and update -- CRM enrichment, batch updates, webhook dispatch | Memory (source + destination) + Webhooks | CRM data sync, property enrichment, batch imports, data migration |
| **Collaboration-heavy** | Coordinate across agents/humans on shared records | Workspaces + Memory + Governance | Multi-agent deal rooms, account intelligence, cross-functional handoffs |

Each archetype implies a different architecture. Communication-heavy needs strong generation guardrails. Analysis-heavy needs deep recall with high token budgets. Decision-heavy needs all three layers in tight loops. Execution-heavy is mostly batch memorize + webhooks with minimal AI. Collaboration-heavy needs workspace schemas and agent coordination.

> **Full guide:** Read `reference/archetypes.md` for archetype-specific architecture patterns, example pipelines, and recommended integration modes.

### Dimension 4: Department / Function -- WHO it serves

| Department | Typical Archetypes | What They Care About |
|---|---|---|
| **Revenue** (Sales, Partnerships, BizDev) | Communication, Decision | Pipeline velocity, personalized outreach, qualification accuracy |
| **Growth** (Marketing, Content, Demand Gen) | Communication, Analysis | Campaign personalization, visitor-level content, attribution |
| **Customer** (CS, Support, Onboarding) | Communication, Analysis, Decision | Health monitoring, proactive outreach, churn prevention |
| **Product** (Engineering, Design, Analytics) | Analysis, Execution | User research synthesis, feature adoption, feedback analysis |
| **Operations** (Finance, Legal, HR, Compliance) | Execution, Decision | Data governance, compliance automation, audit trails, internal routing |
| **Internal Collaboration** | Collaboration | Cross-team context sharing, agent coordination, knowledge management |
| **External Communication** | Communication | Brand-consistent messaging across all channels and agents |

### Dimension 5: Autonomy & Tempo -- HOW MUCH human involvement, HOW OFTEN

| Level | Description | Governance Strength Needed | Example |
|---|---|---|---|
| **Human-driven, on-demand** | Developer/user runs manually, reviews output before use | Light -- human is the guardrail | "Generate a follow-up email for Sarah" in Claude Code |
| **Human-in-the-loop, event-triggered** | Agent proposes, human approves before action | Medium -- governance as suggestion, human as gate | Draft email generated on deal stage change, rep reviews before sending |
| **Supervised autonomous, scheduled** | Batch jobs run on schedule, human reviews dashboard | Strong -- governance must catch edge cases | Nightly batch: generate health check-ins for all accounts, flag exceptions |
| **Fully autonomous, continuous** | Agents monitor signals, act, learn, repeat | Maximum -- governance + evaluation + learning loop | Multi-agent system monitoring accounts 24/7, generating and sending alerts autonomously |

Higher autonomy = stronger governance + the learning loop (Leg 3) becomes essential. Fully autonomous systems should use `evaluate: true` on every generation, flag sensitive content, and have agents update governance based on outcomes.

---

## Situation Profile

After the dimensional assessment, produce a compact **Situation Profile** that guides all subsequent actions:

```
SITUATION PROFILE:
  Company Profile: [A: High-volume B2C / B: Mid-market B2B / C: Enterprise B2B / D: Platform / E: No dev team]
  Integration Mode: [SDK / MCP on agents / Multi-agent / Hybrid / ...]
  Personize Role: [Memory + Intelligence + Governance + Learning] (which legs active: 1,2,3,4)
  Archetype: [Communication / Analysis / Decision / Execution / Collaboration]
  Department: [Revenue / Growth / Customer / Product / Operations / ...]
  Autonomy: [Human-driven / Human-in-loop / Supervised / Fully autonomous]
```

Example: *"Mid-market B2B SaaS (Pattern B, ~2K customers), Sales team (Revenue) doing communication-heavy outreach via multi-agent system with Personize as memory + intelligence + learning layer (all 4 legs), supervised autonomous on a weekly batch."*

This profile informs every subsequent action. A "Product team / Analysis / SDK / Memory-only / Human-driven" integration looks completely different from a "Sales team / Communication / Multi-agent / All layers / Fully autonomous" one.

---

## When This Skill is Activated

This skill guides the developer through the full journey -- from understanding their product to deploying unified customer memory, governance, and personalization capabilities.

**If the developer mentions a company name or product**, start with **Phase 0: Prospect Research**. Search the web for the company before asking questions. Build a Prospect Intelligence Brief, then validate with the developer.

**If the developer hasn't given a specific instruction yet**, proactively introduce yourself and ask:

> "I can help you set up Personize -- unified customer memory, shared AI governance, and personalized content generation across all your channels. What's the company or product we're designing for?"

**If the developer gives a broad direction** (e.g., "help me personalize my app"), start with **DISCOVER** (Phase 0 research first, then validation questions).

**If the developer gives a specific request** (e.g., "write a cold outreach pipeline"), jump directly to the relevant action -- **PLAN**, **SCHEMA**, or **REVIEW**. Even for specific requests, a quick 2-minute web search of their company improves the output significantly.

---

## When NOT to Use This Skill

This skill architects solutions. When it's time to execute a specific part, hand off to the right skill. All skills are published at **https://github.com/personizeai/personize-skills/tree/main/skills/** -- if you don't have a skill installed locally, fetch its SKILL.md from that URL.

| When you need... | Use this skill | GitHub URL |
|---|---|---|
| Production pipeline (retries, scheduling, durable execution) | **personize-code-pipelines** | [SKILL.md](https://github.com/personizeai/personize-skills/tree/main/skills/personize-code-pipelines/SKILL.md) |
| Store/retrieve/sync entity data, CRM imports | **personize-memory** | [SKILL.md](https://github.com/personizeai/personize-skills/tree/main/skills/personize-memory/SKILL.md) |
| Manage org rules, brand voice, compliance policies | **personize-governance** | [SKILL.md](https://github.com/personizeai/personize-skills/tree/main/skills/personize-governance/SKILL.md) |
| Visual workflow automation (n8n), no code | **personize-no-code-pipelines** | [SKILL.md](https://github.com/personizeai/personize-skills/tree/main/skills/personize-no-code-pipelines/SKILL.md) |
| Multi-agent coordination on shared records | **personize-agent-workspace** | [SKILL.md](https://github.com/personizeai/personize-skills/tree/main/skills/personize-agent-workspace/SKILL.md) |
| Smart notification logic (scoring, digests, fatigue) | **personize-signal** | [SKILL.md](https://github.com/personizeai/personize-skills/tree/main/skills/personize-signal/SKILL.md) |
| Generate content, multi-step AI workflows | **personize-responses** | [SKILL.md](https://github.com/personizeai/personize-skills/tree/main/skills/personize-responses/SKILL.md) |
| Verify setup or debug a broken integration | **personize-diagnostics** | [SKILL.md](https://github.com/personizeai/personize-skills/tree/main/skills/personize-diagnostics/SKILL.md) |
| Create a new skill | **personize-skill-builder** | [SKILL.md](https://github.com/personizeai/personize-skills/tree/main/skills/personize-skill-builder/SKILL.md) |

**Use this skill AND then hand off:** Architect the solution here, then invoke the appropriate skills for execution. For example: architect here -> hand off schema to **personize-memory** -> governance to **personize-governance** -> pipeline to **personize-code-pipelines** or **personize-no-code-pipelines**.

> **If running outside Claude Code / installed skills** (e.g., pasted into ChatGPT or Claude): Fetch any skill's SKILL.md from the GitHub URLs above to get its full instructions. The skills repo is public.

---

## Actions

You have 7 actions available. Use whichever is appropriate for what the developer needs. They are not sequential -- jump to the right action based on the conversation.

| Action | When to Use | Reference |
|---|---|---|
| **DISCOVER** | Developer is new or you need to understand their product + situation | `reference/discover.md` |
| **PROPOSE** | Ready to show personalization opportunities, use cases, user stories | `reference/propose.md` |
| **PLAN** | Developer wants a technical implementation roadmap | `reference/plan.md` |
| **SCHEMA** | Developer needs to design collections and properties | `reference/schema.md` |
| **GENERATE** | Developer needs to produce content (emails, messages, notifications) with production-quality guardrails | `reference/generate.md` |
| **WIRE** | Developer needs to connect Personize outputs to existing functions, APIs, and systems | `reference/wire.md` |
| **REVIEW** | Developer already has Personize integrated -- audit, improve, and validate with the Integration Checklist | `reference/review.md`, `reference/integration-checklist.md` |

**Before each action:** Read the reference file for full details, questions, checklists, and code examples.

---

## Action: DISCOVER

Understand the prospect's business AND their situation before proposing anything. Discovery now has three phases: Research, Validate, and Assess.

### Phase 0: Prospect Research (ALWAYS START HERE)

**Before asking a single question**, research the prospect online using web search. Build a Prospect Intelligence Brief that covers:

1. **Company profile** -- what they do, size, funding, business model
2. **Organizational complexity** -- do they have a dev team? How big? What are they building?
3. **Customer base** -- B2B vs B2C, enterprise vs SMB vs consumer, estimated volume
4. **Tools landscape** -- infer CRM, support, analytics from job postings and integrations page
5. **BYOC / deployment needs** -- regulated industry? Security-conscious? Data residency requirements? If yes, note that Personize has a BYOC (Bring Your Own Cloud) option -- but do NOT pitch details. Say: *"We have an enterprise BYOC option for organizations with data residency or security requirements. Let me connect you with our team to discuss specifics."* The offering is evolving and details should come from the Personize team directly.
6. **Competitive position** -- key competitors, differentiation, market pressures
7. **Fit signals** -- multiple touchpoints, data silos, hiring for AI/personalization

**Company profile pattern** (determines use case approach):
- **Pattern A: High-volume B2C** (10K+ customers) -- segment-of-one messaging, notification throttling, lifecycle-aware content
- **Pattern B: Mid-market B2B SaaS** (100-5K customers) -- meeting prep, health narratives, personalized onboarding, cross-team context
- **Pattern C: Enterprise B2B** (< 500 high-ACV customers) -- institutional knowledge capture, multi-stakeholder coordination, governance-gated proposals
- **Pattern D: Platform / Marketplace** -- dual-entity personalization, match narratives, two-sided churn prevention
- **Pattern E: No dev team** -- MCP-powered workflows, n8n/Zapier automation, Claude/ChatGPT-based email writing

This research transforms discovery from interrogation to validation. Instead of "What does your product do?" you say "I see you're a [X] platform for [Y] with about [Z] employees. Is that right?"

> **Full guide:** Read `reference/prospect-research.md` for the complete research framework, signal interpretation tables, and the Prospect Intelligence Brief template.

### Phase 1: Validate & Deepen

Lead with what you learned from research. Validate your inferences, then deepen into areas you couldn't find publicly.

**Core validation questions (adapt based on research):**
1. "I see you're a [X] for [Y]. Has the focus shifted recently?"
2. "It looks like you serve mostly [segment]. Is that where the growth is?"
3. "With [CRM] and [tools] in your stack, where are the data gaps?"
4. "Your emails look fairly templated -- have you tried going deeper?"
5. "Your engineering team looks like about [N] people. Are they focused on [area]?"

**If they share code:** Read it. Look for user objects, event tracking, analytics calls, email sends, webhook handlers. Every `user.email`, `event.track()`, `sendEmail()`, or `notify()` is a personalization opportunity.

### Phase 2: Situation Assessment

After research and validation, assess the 5 dimensions. Ask naturally, not as a formal checklist.

**Integration mode questions:**
- "How do you see Personize fitting in? Writing code directly, or adding it as a tool to your AI agents?"
- "Do you use any AI coding assistants (Cursor, Claude Code) or workflow tools (n8n, Zapier)?"
- "Are you building multi-agent systems, or is this a single application?"

**Deployment questions:**
- "Do you have data residency requirements or need to run in your own cloud?" (If yes: *"We have a BYOC option -- let me connect you with our team to discuss."* Do not pitch details.)

**Role questions:**
- "Will Personize be your primary data layer, or do you already have a data warehouse?"
- "Do you need agents to learn from outcomes and update rules over time?"
- "Do multiple agents or people need to collaborate on the same records?"

**Archetype questions:**
- "Is this primarily about generating and sending messages? Analyzing and synthesizing data? Making routing decisions? Syncing and enriching data? Or coordinating across teams and agents?"

**Department and autonomy questions:**
- "Which team benefits first from this?"
- "How much human review do you want? Every message reviewed, periodic spot-checks, or fully autonomous?"
- "Is this on-demand, event-triggered, scheduled, or continuous?"

**After all three phases**, produce the **Situation Profile** (including the Company Profile Pattern) and confirm it before proceeding.

> **Full guide:** Read `reference/discover.md` for the complete discovery framework with all three phases, codebase analysis patterns, and the full Discovery Output template.
>
> **Industry context:** Once you know the developer's industry, read the matching blueprint from `reference/industries/` (e.g., `saas.md`, `healthcare.md`, `ecommerce.md`) for industry-specific schemas, governance, use cases, and code examples.
>
> **Use case building:** Read `reference/use-case-builder.md` to build use cases that demonstrate deep knowledge of their business -- using their terminology, their tools, their workflows, and their numbers.

---

## Action: PROPOSE

After discovery, present personalization opportunities that showcase what's **only possible with all three Personize layers working together**.

**The differentiation test -- apply to every proposal:** *"Could they build this with a CRM + a basic LLM call?"* If yes, rethink it. Swapping a CTA label based on user role is template logic any tool can do. Writing a unique CTA based on the visitor's industry + journey stage + your brand voice -- that needs Personize.

**Every proposal must use all three layers:**

| Layer | What It Provides | Without It |
|---|---|---|
| **Governance** (`smartGuidelines`) | Org rules, brand voice, ICPs, compliance -- shared across ALL agents, employees, and tools | Every agent, employee, and AI tool invents its own voice and rules. 5 people using 3 tools = 15 different "brands." |
| **Unified Memory** (`smartDigest` + `recall`) | Cross-source context from ALL tools combined | AI sees one data source, misses the full picture |
| **Content Generation** (`prompt` with `instructions[]`) | Multi-step AI that WRITES original content | You're doing conditional rendering with extra steps |

**The key distinction:** Proposals must center on AI **generating** original content (paragraphs, emails, page copy, guides, insights) -- not on looking up data and displaying it differently.

### Adapt by Situation Profile

**By archetype:**
- **Communication-heavy:** Lead with email/notification generation proposals. Emphasize governance guardrails and the generation prompt pattern.
- **Analysis-heavy:** Lead with research synthesis, health reports, QBR narratives. Emphasize `smartDigest()` with high `token_budget` and cross-entity context.
- **Decision-heavy:** Lead with scoring, routing, qualification. Show how all three layers feed into structured `outputs` that drive automation.
- **Execution-heavy:** Lead with batch sync efficiency, webhook delivery, data enrichment. Code examples over narrative proposals.
- **Collaboration-heavy:** Lead with workspace patterns, multi-agent coordination, deal room concepts.

**By integration mode:**
- **SDK in code:** Show TypeScript code examples with `client.*` methods.
- **MCP on agents:** Show what the agent experience looks like -- "the agent will call `memory_recall_pro` to check context, then `ai_smart_guidelines` for rules, then generate a response."
- **Multi-agent:** Show the agent coordination pattern -- which agent does what, how they share state via workspaces.
- **No-code:** Describe the workflow visually -- "Step 1: Trigger on new HubSpot deal, Step 2: AI node recalls context, Step 3: Generate email, Step 4: Send via Gmail."

**5 surface areas** (only propose what's relevant):

| Surface | Three-Layer Proposal Examples |
|---|---|
| **Software / Web App** | AI-generated onboarding guides written per user, dashboard insight narratives, governance-controlled page copy |
| **Marketing Campaigns** | AI-written emails where every sentence uses unified context, governance-compliant landing page copy generated per visitor |
| **Notifications** | AI-synthesized alert narratives from multiple signals, generated digest briefings, governance-controlled messaging |
| **Customer Success** | AI-written health reports, generated QBR narratives, governance-compliant check-in messages |
| **Mobile App** | AI-composed push copy, generated home screen narratives, contextual in-app guidance |

**User stories by persona:** Developer, Product Manager, Sales, Marketing, Customer Success -- match stories to who you're talking to. Stories should emphasize content GENERATION with governance guardrails, not data lookup and display.

> **Full guide:** Read `reference/propose.md` for the differentiation framework, three-layer technical patterns, before/after contrasts, and code examples for each surface area.
>
> **Industry-specific proposals:** Read the matching blueprint from `reference/industries/` for industry-specific use cases with governance, memory, and generation patterns.

---

## Action: PLAN

When the developer says "let's do it" -- generate a complete implementation roadmap **adapted to their Situation Profile**.

**Plan structure:**
1. **Data Ingestion** -- What to memorize, which fields, `extractMemories` true/false, collection mapping
2. **Personalization Points** -- Every touchpoint (UI, email, notifications), SDK/MCP method chain, prompt template
3. **Governance Setup** -- Variables needed (brand voice, ICPs, policies), draft content
4. **Architecture** -- Where Personize fits in their stack, which integration mode, which data loop legs are active, caching strategy, rate limit budget
5. **Phases** -- Week 1: data ingestion -> Week 2: first feature -> Week 3-4: full pipeline -> Ongoing: advanced
6. **Code Examples** -- Actual code using their specific data models and field names, in their integration mode

### Adapt by Integration Mode

**SDK in code:**
- `npm install @personize/sdk` + project setup
- `client.me()` to verify auth and read plan limits
- TypeScript pipeline scripts with `memorizeBatch()`, `prompt()`, delivery

**MCP on AI agents / coding assistants:**
- MCP server connection setup (API key or OAuth)
- Tool discovery verification: confirm all 13 tools are available
- Example agent prompts showing how to instruct the agent to use Personize tools
- Governance guidelines that the agent should always check before acting

**Multi-agent systems:**
- Which agents exist and what each one does
- Workspace schema for shared state
- Agent coordination pattern: read workspace -> check governance -> act -> record contribution
- Which MCP tools each agent needs access to

**No-code (n8n/Zapier):**
- Workflow diagram with nodes/steps
- MCP server URL configuration
- Trigger -> AI node -> delivery node pattern

**Responses API (Personize orchestrates):**
- Step definitions with per-step tool scoping
- Structured outputs for machine-readable results
- `captureToolResults: true` for memorizing outcomes

**Every plan must include:**
- Auth verification (`client.me()` or MCP tool list)
- `client.collections.list()` to find real collection IDs
- Data ingestion strategy appropriate to scale
- The 10-step pipeline loop tailored to their use case and integration mode
- Scheduling strategy (cron, GitHub Actions, event-driven, or continuous)
- Delivery integration (SendGrid, Slack, Twilio, webhook, or MCP-connected)
- Which legs of the data flow loop are active and how

> **Full guide:** Read `reference/plan.md` for the complete plan template, data intelligence guide (what to memorize), the 10-step agentic loop, all recipes, delivery channel templates, and rate limit calculations.

---

## Action: SCHEMA -- Design Memory Schemas

Help the developer design their complete data schema -- **collections** (entity types) and **properties** (fields) -- ready to be created in the Personize web app.

**Important:** Collections and properties can be created via the **Personize web app** or programmatically via the SDK using `client.collections.create()`. The SDK supports full CRUD + history: `.list()`, `.create()`, `.update()`, `.delete()`, `.history(id, { mode: 'diff' })`. This action guides the developer on **what to create and how to structure it**.

### Schema Design Workflow

1. **Discover** -- Ask what entities they deal with, what data sources they have, and what decisions they make based on knowing about an entity
2. **Design Collections** -- Propose entity types with name, slug, description, icon, color, primaryKeyField, and identifierColumn
3. **Design Properties** -- For each collection, design properties with propertyName, type, options (if applicable), description (critical for AI extraction quality), autoSystem, update mode (replace vs append), and **tags**
4. **Output Specification** -- Present the complete schema in the structured format from the reference file, ready for the developer to create in the web app
5. **Create or Verify** -- Use `client.collections.create()` to create the schema programmatically, or confirm with `client.collections.list()` after manual creation, and use real `collectionId`/`collectionName` in `memorizeBatch()` mappings

### Property Types

| Type | When to Use | Example Value |
|---|---|---|
| `text` | Free-form information | `"VP of Engineering"` |
| `number` | Numeric metrics | `450000` |
| `date` | Temporal data | `"2026-03-15"` |
| `boolean` | Yes/no flags | `true` |
| `options` | Constrained categories (define allowed values) | `"Enterprise"` |
| `array` | Multi-value lists | `["Python", "React"]` |

### Key Design Decisions Per Property

| Decision | Options | Guidance |
|---|---|---|
| **autoSystem** | `true` / `false` | `true` = AI auto-extracts during memorization. Use for all properties you want populated from unstructured content. |
| **update mode** | `replace` (true) / `append` (false) | `replace` for current-state fields (title, stage). `append` for accumulating data (pain points, notes). |
| **tags** | string array | Tags answer: *"When should this property be extracted?"* They boost property selection (+15% per match) when memorize request tags match. Assign 1-3 tags per property from categories like `identity`, `firmographic`, `qualification`, `engagement`, `ai-extracted`, `enrichment`, `pipeline`, `messaging`. |
| **description quality** | -- | The #1 factor in extraction quality. Be specific, include examples, define boundaries, handle edge cases. |

> **Full guide:** Read `reference/schema.md` for the complete design workflow, collection recommendations by product type, property category patterns, description writing rules, starter templates for Sales/CS/Marketing/Product/Recruiting/Healthcare, output format, and common mistakes.

---

## Action: GENERATE

Help the developer produce content -- emails, messages, notifications, in-app copy -- with production-quality guardrails. This action is about **what to check before you ship generated output**.

> **Principle:** Personalization without guardrails is a liability. Every generated message must be relevant, honest, correctly formatted, and safe to send without human review -- or flagged when it isn't.

### Generation Constraints

> Keywords follow [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119): **MUST** = non-negotiable, **SHOULD** = strong default (override with stated reasoning), **MAY** = agent discretion.

Before generating **any** content, enforce these constraints:

| # | Constraint | Details |
|---|---|---|
| 1 | **MUST** match output format to channel | Email -> HTML tags (`<p>`, `<b>`, `<i>`, `<a>`, `<br>`). SMS -> plain text, 160 chars. Slack -> markdown. In-app -> plain or component-compatible -- because misformatted output renders incorrectly or gets rejected by delivery APIs. |
| 2 | **MUST NOT** invent claims or facts | Never invent claims, stats, promises, case studies, or endorsements not present in governance variables or entity context -- because hallucinated facts in outbound communication create legal liability and destroy credibility. |
| 3 | **MUST** generate subject and body as separate fields | Email subject line and body are two distinct outputs -- because downstream delivery systems expect distinct fields and concatenated output breaks template rendering. |
| 4 | **MUST** respect channel length limits | SMS <= 160 chars. Push <= 100 chars. Slack DMs <= 150 words -- because exceeding limits causes truncation, split messages, or delivery failure. |
| 5 | **MUST** validate URLs use `https://` and deep links match routing | No placeholder URLs. Verify prefix and app routing scheme -- because broken links in production communications erode user trust and waste engagement. |
| 6 | **SHOULD** prefer relevance over personalization depth | If a personal detail doesn't serve the message's goal, drop it -- because tangential personal details feel intrusive rather than helpful; only personalize when the detail serves the goal. |
| 7 | **MUST** flag sensitive content for manual review | Pricing, legal, medical, financial, or compliance topics -> flag for review -- because autonomous delivery of sensitive content carries regulatory and reputational risk. |
| 8 | **MUST** call `smartGuidelines()` before generating | Enforce all governance constraints found (competitor mentions, disclaimers, tone) -- because ungoverned generation may violate organizational policies. Governance quality drives generation quality -- see `reference/guideline-authoring-standards.md`. |

### Channel-Specific Format Rules

```
EMAIL:
  - Subject: plain text, no HTML, <= 80 chars
  - Body: HTML tags required -- <p>, <b>, <i>, <a href="...">, <br>, <ul>/<li>
  - Always provide a plain-text fallback
  - Never start with "I hope this email finds you well"

SMS / TEXT:
  - Plain text only, <= 160 characters
  - No URLs unless critical (use link shortener)
  - Get to the point in the first sentence

SLACK:
  - Markdown: *bold*, _italic_, `code`, >quote, bullet lists
  - <= 150 words for DMs, <= 300 for channel posts
  - Use blocks/attachments for structured data

PUSH / IN-APP:
  - Title: <= 50 chars, Body: <= 100 chars
  - Action button labels: 2-3 words max
  - Button URLs: absolute, https://, valid deep links

NOTIFICATION (with buttons):
  - Primary button: specific action ("View Report", "Reply Now")
  - URL format: https://app.yourcompany.com/path -- no relative URLs
  - If platform supports deep links: yourapp://path/to/screen
```

### The Generation Prompt Pattern

When generating content, structure the `instructions[]` like this:

```typescript
const result = await client.ai.prompt({
    context,   // assembled from smartGuidelines + smartDigest + recall
    instructions: [
        // Step 1: Analyze -- understand who, what, why
        { prompt: 'Analyze the recipient and the goal of this message. What facts do we know? What is the ONE outcome we want?', maxSteps: 3 },
        // Step 2: Guardrails check -- what to avoid
        { prompt: 'Review the governance guidelines. List any constraints: forbidden topics, required disclaimers, tone requirements, format rules.', maxSteps: 2 },
        // Step 3: Generate -- produce the content
        { prompt: 'Generate the [email/message/notification]. Follow ALL guardrails. Output as structured fields:\n\nSUBJECT: ...\nBODY_HTML: ...\nBODY_TEXT: ...\nCHANNEL_NOTES: ...', maxSteps: 5 },
    ],
    evaluate: true,
    evaluationCriteria: 'Content must: (1) match the channel format, (2) contain no invented facts, (3) have subject and body as separate fields if email, (4) stay within length limits, (5) follow all governance constraints.',
});
```

### When to Flag for Human Review

Generate **but flag** when any of these are true:
- Output references pricing, discounts, or contractual terms
- Output includes medical, legal, or financial advice
- Governance variables are empty or stale (last updated > 30 days)
- The AI's self-evaluation score is below threshold
- First-time generation for a new channel or audience segment

Add to the output: `WARNING: REVIEW SUGGESTED: [reason]. Consider testing via manual approval before sending at scale.`

> **Full guide:** Read `reference/generate.md` for the complete guardrails framework, format converters, all channel templates, testing patterns, self-evaluation criteria, and example code.

> **Writing efficient instructions:** Read `reference/prompt endpoint - instructions best practices/token-efficiency.md` for 10 rules that cut token costs by ~80% and speed up responses. Use the companion `prompt-checklist.md` before every `client.ai.prompt()` call.

---

## Action: WIRE

Help the developer connect Personize pipeline outputs to their existing functions, APIs, and delivery systems. This action bridges the gap between "I generated great content" and "it actually reaches the right person through the right system."

> **Principle:** Personize generates and remembers. Your existing stack delivers and tracks. WIRE connects the two without replacing what already works.

### Adapt by Integration Mode

Before presenting patterns, check the Situation Profile. The wiring approach changes dramatically based on integration mode:

**SDK in code** -- Use Patterns 1-5 below (wrap functions, webhook receivers, middleware, cron, queues).

**MCP on agents** -- The agent IS the wire. The agent calls `memory_recall_pro`, reasons, calls `ai_prompt` or generates directly, then calls your delivery API. Wiring = making your delivery APIs accessible to the agent (as MCP tools or HTTP endpoints the agent can call).

**Multi-agent systems** -- Each agent is wired to specific capabilities. Agent A reads memory, Agent B generates content, Agent C delivers. Wiring = workspace schema + agent coordination protocol.

**Responses API** -- Wiring is step definitions. Each step scopes tools, produces outputs, feeds the next step. External delivery happens via connected MCP tools or post-processing the response.

**No-code** -- Wiring is the workflow itself. Each node is a connection point. Personize MCP tools connect to delivery nodes (Gmail, Slack, HubSpot).

### The 4-Leg Data Flow -- Map Your Wiring

For every integration, explicitly map which legs of the data flow are active and how they're wired:

| Leg | Direction | How to Wire | Key Endpoints / Tools |
|---|---|---|---|
| **Leg 1: Ingest** | External -> Personize | Webhook receivers, batch scripts, CRM sync, event streams | `memorizeBatch()`, `memorize()`, `memory_store_pro` MCP |
| **Leg 2: Context** | Personize -> Agents/Code | SDK calls or MCP tool calls before reasoning/generation | `smartDigest()`, `recall()`, `smartGuidelines()`, `memory_recall_pro` MCP |
| **Leg 3: Learn Back** | Agents -> Personize | After acting, store outcomes, update properties, evolve governance | `memorize()`, `memory_update_property` MCP, `guideline_update` MCP |
| **Leg 4: Deliver** | Personize -> External | Outbound webhooks (SQS -> Lambda -> HTTP POST with HMAC-SHA256), or agent calls delivery APIs | Webhook destinations, SendGrid, Slack, Twilio, custom APIs |

### Wiring Pattern: MCP Tool Provider (NEW)

When Personize is a tool in an external orchestrator:

```
External Orchestrator (OpenClaw, LangGraph, n8n AI node, custom)
  ├── Agent receives task
  ├── Agent calls: memory_recall_pro (Personize MCP) -- get context
  ├── Agent calls: ai_smart_guidelines (Personize MCP) -- get rules
  ├── Agent reasons with context + rules
  ├── Agent calls: your_delivery_api -- send email / update CRM
  ├── Agent calls: memory_store_pro (Personize MCP) -- record what was done
  └── Agent calls: memory_update_property (Personize MCP) -- update status
```

**MCP Connection Setup:**
- API key in URL: `https://agent.personize.ai/mcp/sse?api_key=sk_live_YOUR_KEY`
- API key in header: `Authorization: Bearer sk_live_YOUR_KEY` to `https://agent.personize.ai/mcp/sse`
- OAuth (ChatGPT, Claude web/Desktop): `https://agent.personize.ai/mcp/sse?organizationId=org_YOUR_ORG` with Client ID `1oe3h50chvlddca1110ncmr7bg`

> **Full MCP setup:** Read the MCP Setup Guide for platform-specific instructions (Claude, ChatGPT, Cursor, Windsurf, n8n, Zapier, LangChain).

### Wiring Pattern: Outbound Webhooks (NEW)

Personize can push data OUT via webhook destinations:

- **Setup:** Configure destinations in the Personize dashboard (Integrations > Destinations)
- **Delivery:** SQS queue -> Lambda -> HTTP POST to your URL
- **Signature:** `X-Personize-Signature` (HMAC-SHA256 hex) + `X-Personize-Signature-Alg: HMAC-SHA256`
- **Timeout:** ~1.5s fire-and-forget -- your receiver must respond fast
- **Payload:** Raw event payload (not wrapped in an envelope)

```typescript
// Your webhook receiver for Personize outbound events
app.post('/webhooks/personize', async (req, res) => {
    // Verify HMAC signature
    const signature = req.headers['x-personize-signature'] as string;
    const expected = 'sha256=' + crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');
    if (signature !== expected) {
        return res.status(401).json({ error: 'Invalid signature' });
    }

    // Body is the raw event payload (NOT wrapped in an envelope)
    const payload = req.body;

    // Process the payload -- structure depends on the event type
    // configured in your destination settings
    await processWebhookPayload(payload);

    res.json({ ok: true }); // Respond fast -- webhook times out at ~1.5s
});
```

### Common Wiring Patterns (from v1)

| Pattern | What It Means | Example |
|---|---|---|
| **Wrap & Enhance** | Existing function gets personalization layer | Your `sendWelcomeEmail()` -> add context assembly + generation |
| **Webhook -> Pipeline** | External event triggers Personize pipeline | CRM webhook -> `memorizeBatch()` -> generate -> deliver |
| **API Middleware** | Personize sits between request and response | Express middleware that enriches responses with personalization |
| **Cron -> Generate -> Deliver** | Scheduled job generates and pushes to delivery | Daily cron -> `prompt()` -> SendGrid / Slack / webhook |
| **Event-Driven Queue** | Queue decouples event capture from personalization | SQS/BullMQ -> personalize worker -> delivery |
| **MCP Tool Provider** | External orchestrator calls Personize tools | OpenClaw agent -> `memory_recall_pro` -> reason -> `memory_store_pro` |
| **Outbound Webhook** | Personize pushes data to external systems | Memory update triggers webhook -> your CRM sync endpoint |

### Wiring Constraints

> Keywords follow [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119): **MUST** = non-negotiable, **SHOULD** = strong default (override with stated reasoning), **MAY** = agent discretion.

| # | Constraint | Details |
|---|---|---|
| 1 | **MUST** identify the trigger | Define the event that starts the pipeline (API call, webhook, cron, user action, database change, agent decision) -- because a pipeline without a defined trigger cannot be scheduled, tested, or monitored. |
| 2 | **MUST** map Personize output fields to function parameters | What data does the existing function need? Map fields explicitly -- because field mismatches cause silent data loss or runtime errors. |
| 3 | **SHOULD** store the target API's response back in memory | Close the feedback loop (Leg 3) -- because future recalls can then see delivery outcomes and adjust behavior. |
| 4 | **MUST** ensure the existing function works if Personize is down | Graceful degradation required -- because personalization is an enhancement, not a dependency; existing functionality must survive upstream failures. |
| 5 | **SHOULD** align Personize rate limits with the target API's rate limits | Don't overwhelm either side -- because mismatched rates cause one side to 429 while the other idles, wasting budget. |
| 6 | **MUST** keep Personize auth and target API auth configured separately | `PERSONIZE_SECRET_KEY` and target API credentials are distinct -- because shared or confused credentials create security vulnerabilities and debugging nightmares. |
| 7 | **MUST** map which data flow legs are active | Explicitly document: "This integration uses Legs 1, 2, and 4" -- because unmapped legs lead to missing feedback loops or data gaps. |

> **Full guide:** Read `reference/wire.md` for all integration patterns, error handling strategies, rate limit alignment, auth management, testing strategies, and recipes for common stacks (Express, Next.js, n8n, Zapier).

---

## Action: REVIEW

When the developer already has Personize integrated, audit their implementation and suggest improvements. Use the **Integration Checklist** below as your review framework.

**Review workflow:**
1. Read their Personize integration code (sync scripts, pipeline scripts, prompt calls)
2. Read their data models and identify what data exists but isn't being memorized
3. Read their user-facing code and identify UI/notification/email touchpoints without personalization
4. Walk through the Integration Checklist -- flag anything missing or misconfigured
5. **Check against their Situation Profile** -- are they using the right integration mode for their archetype? Are the right data flow legs active?
6. **Assess data quality** -- use the 3-phase memorization evaluation (`POST /api/v1/evaluate/memorization-accuracy`) to score extraction quality: Extract -> Analyze -> per-property optimization suggestions. This is the right time -- data is flowing, now optimize how well it's being captured.
7. Present findings: "Here's what you're doing well, here's what you're missing, here's how to improve"

> **Full guide:** Read `reference/review.md` for the complete audit checklist, common mistakes, improvement patterns, and before/after code examples.

### Integration Checklist

Use this to verify a Personize integration is complete. Each section builds on the previous.

**1. Connect** -- Pick at least one integration path:
- [ ] **SDK** installed (`@personize/sdk`) -- `client.me()` -> `GET /api/v1/me` returns org name
- [ ] **MCP** server added to agent tools -- 17 tools available including `memory_recall_pro`, `ai_smart_guidelines`, `memory_get_properties`, `memory_update_property`, `memory_digest`
- [ ] **MCP verified** -- agent can list tools, call `memory_recall_pro` with a test query, receive results
- [ ] **Zapier** connected -- memorizing data from external apps
- [ ] **Skills** installed -- `npx skills add personizeai/personize-skills`

**2. Schema** -- Collections designed with intent:
- [ ] Collections created -> `POST /api/v1/collections`
- [ ] Every property has a **description** (not just a name) -- descriptions drive AI extraction quality
- [ ] Property display types match the data (text, number, date, list, badge)

**3. Memorize** -- Data flowing in through the right endpoint:
- [ ] Rich text -> `POST /api/v1/memorize` with `extractMemories: true`
- [ ] Batch CRM/DB sync -> `POST /api/v1/batch-memorize` with per-property `extractMemories` flags
- [ ] Structured upsert -> `POST /api/v1/upsert` (no AI needed)
- [ ] Not pre-processing with LLM before memorizing
- [ ] 429 retry logic in batch operations

**4. Recall** -- Right method for each use case:
- [ ] Semantic search -> `POST /api/v1/smart-recall` via `smartRecall()` -- supports `mode: "fast" | "deep"` (fast=1 credit ~500ms, deep=2 credits ~10-20s with reflection)
- [ ] Entity context bundle -> `POST /api/v1/smart-memory-digest` via `smartDigest()`
- [ ] Property values with schema -> `POST /api/v1/properties` -- returns property values joined with collection schema descriptions and `update` flag. Supports `propertyNames` filter, `includeDescriptions`, `nonEmpty`.
- [ ] Direct lookup -> `POST /api/v1/recall` via `recall()` -- scope to specific collections with `collectionIds: [...]`
- [ ] Filter/export -> `POST /api/v1/search` via `search()`
- [ ] Cross-entity context: pulling company when working on contact

**5. Governance** -- Rules set and maintained:
- [ ] At least one guideline created -> `POST /api/v1/guidelines`
- [ ] **Guidelines follow authoring standards** -- markdown headers, 300-800 words, one concern per guideline, RFC 2119 keywords (MUST/SHOULD/MAY) with rationale clauses, contrasted examples
- [ ] `triggerKeywords` set on each guideline (drives retrieval scoring)
- [ ] `smartGuidelines()` -> `POST /api/v1/ai/smart-guidelines` returns content for real tasks
  - Broad retrieval: pass `message` + optional `tags`/`excludeTags` to route semantically
  - Targeted fetch: pass `guidelineIds: [...]` or `guidelineNames: [...]` to force-include specific guidelines (bypasses scoring)
- [ ] Guidelines reviewed and updated regularly -- not set-and-forget
- [ ] **For autonomous systems:** agents can update governance via `guideline_update` MCP tool or SDK

> **Guideline quality matters.** Well-structured guidelines save tokens, improve routing accuracy, and produce better AI output. Poorly written ones waste tokens, confuse routing, and degrade results. Read `reference/guideline-authoring-standards.md` before creating or reviewing any guideline.

**Content Budget:** `maxContentTokens` controls how much guideline content is delivered per call (default: 10,000 tokens). Guidelines exceeding the per-item cap are auto-trimmed to relevant sections. Remaining guidelines are returned as summaries with `id`, `description`, and `sections[]` for follow-up via `client.guidelines.getSection()`. Set lower values (e.g. 5,000) when token budget is tight.

**6. Generate** -- `/prompt` or `/responses` used correctly:
- [ ] Multi-step `instructions[]` -> `POST /api/v1/prompt` via `client.ai.prompt()`
- [ ] Or step-based orchestration -> `POST /api/v1/responses` with per-step tool scoping
- [ ] Structured `outputs: [{ name: "..." }]` for machine-readable results
- [ ] `memorize: { email, captureToolResults: true }` saves output back to memory
- [ ] `evaluate: true` for quality scoring on production runs
- [ ] `attachments` for multimodal inputs (images, PDFs, documents) when applicable
- [ ] External MCP tools connected via dashboard if needed

**7. Agents** -- Reusable prompt actions:
- [ ] Common patterns saved as agents -> `POST /api/v1/agents/:id/run`
- [ ] Agent input variables (`{{input}}`) documented
- [ ] Agents tested with real entity data

**8. Workspaces** -- Multi-agent coordination:
- [ ] Workspace schema attached to entities that need coordination
- [ ] Agents read workspace via `smartDigest()` / `smartRecall()` before acting
- [ ] Agents write contributions back via `memorize()` with workspace tags

**9. Data Flow Loop** -- Verify which legs are active:
- [ ] **Leg 1 (Ingest):** Data flows in from external systems -> Personize
- [ ] **Leg 2 (Context):** Personize provides context to agents/code before acting
- [ ] **Leg 3 (Learn Back):** Outcomes stored back in memory, properties updated, governance evolved
- [ ] **Leg 4 (Deliver):** Results pushed to external systems via webhooks, APIs, or agent actions
- [ ] All intended legs are actually wired and functioning

**10. Production readiness:**
- [ ] Context assembly: `smartGuidelines()` + `smartDigest()` + `smartRecall()` -- all three, every time
- [ ] Generated outputs memorized after delivery -- feedback loop closed
- [ ] Sensitive content (pricing, legal, medical) flagged for human review
- [ ] Rate limits read from `client.me()`, not hardcoded
- [ ] **For autonomous systems:** evaluation scores monitored, governance learning loop active
- [ ] **For MCP integrations:** tool availability verified, fallback behavior defined
- [ ] **Data quality:** Run memorization evaluation (`POST /api/v1/evaluate/memorization-accuracy`) to verify extraction quality and optimize property descriptions

> **Full checklist with examples and verify commands:** Read `reference/integration-checklist.md`.

---

## Advanced: Multi-Organization Deployments

> **DO NOT propose this pattern proactively.** Most users have a single organization and should stay that way -- especially if they are new to Personize, still in discovery, or have not yet completed a working integration. Only discuss multi-org when the user explicitly raises it or describes a concrete scenario that requires it (e.g., agency managing multiple client brands, holding company with isolated business units, platform embedding Personize per-customer).

### When Multi-Org vs. Single Org

| Scenario | Recommendation | Why |
|---|---|---|
| One company, multiple departments | **Single org** -- use entity separation (collections, tags) | Shared governance, shared memory, simpler to manage |
| One company, multiple products | **Single org** -- use collections per product | Cross-product context is valuable, one governance layer |
| Agency managing 5+ client brands | **Multi-org** -- one org per client | Each client needs isolated memory, separate governance (brand voice, compliance), separate API keys |
| Platform embedding Personize per-customer | **Multi-org** -- one org per customer | Data isolation is mandatory; customers must not see each other's data |
| Holding company, fully independent business units | **Multi-org** -- one org per unit | Different governance, different compliance requirements, no shared context needed |

### Key Considerations

- **Governance is per-org.** Each org has its own guidelines. If client A's brand voice is casual and client B's is formal, they need separate orgs -- not a single org with conditional logic.
- **Memory is per-org.** Data does not cross org boundaries. This is a feature (isolation) not a limitation.
- **API keys are per-org.** Each org has its own `sk_live_...` key. Manage these as separate credentials.
- **No cross-org queries.** You cannot `recall()` across orgs in a single call. If you need cross-org rollups, build them at the application layer.
- **Shared templates, separate execution.** You can reuse the same pipeline code (TypeScript, n8n workflows) across orgs -- just swap the API key per execution context.

### What NOT to Do

- Do not create multiple orgs "just in case" -- start with one, split only when you hit a concrete isolation requirement.
- Do not try to simulate multi-org within a single org using tags or naming conventions -- if you need true isolation, use separate orgs.

---

## SDK Quick Reference

```typescript
import { Personize } from '@personize/sdk';
import 'dotenv/config';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
```

| Category | Method | Purpose |
|---|---|---|
| **Auth** | `client.me()` | Get org, user, plan, rate limits |
| **Remember** | `client.memory.memorize(opts)` | Store single item with AI extraction |
| **Remember** | `client.memory.memorizeBatch(opts)` | Batch store with per-property `extractMemories` |
| **Recall** | `client.memory.recall(opts)` | Semantic search across memories |
| **Recall** | `client.memory.smartDigest(opts)` | Compiled context for one entity |
| **Recall** | `client.memory.properties(opts)` | Property values with schema descriptions and update flag |
| **Recall** | `client.ai.smartGuidelines(opts)` | Fetch governance variables for a topic |
| **Reason/Generate** | `client.ai.prompt(opts)` | Multi-step AI with `instructions[]` |
| **Observe** | `client.memory.search(opts)` | Query/filter records |
| **Schema** | `client.collections.list/create/update/delete/history()` | Manage collections (full CRUD + version history) |
| **Governance** | `client.guidelines.list/create/update/delete()` | Manage governance variables |

### MCP Tools (17 total)

When connecting via MCP (Claude Desktop, Cursor, ChatGPT, workflow tools, multi-agent systems), the following tools are available to AI agents:

**Memory Tools:**

| Tool | Purpose | Read/Write |
|---|---|---|
| `memory_store_pro` | Store content with AI extraction | Write |
| `memory_recall_pro` | Semantic search across memories | Read |
| `memory_digest` | Compiled entity context bundle (properties + memories, token-budgeted) | Read |
| `memory_get_properties` | Read property values with schema descriptions and `update` flag | Read |
| `memory_update_property` | Update properties: `set`, `push`, `remove`, `patch` | Write |
| `memory_search` | Query/filter records | Read |
| `memory_batch_memorize` | Batch store with per-property control | Write |
| `memory_upsert` | Structured upsert without AI extraction | Write |

**AI Context Tools:**

| Tool | Purpose | Read/Write |
|---|---|---|
| `ai_smart_guidelines` | Fetch governance variables for a topic | Read |
| `ai_prompt` | Multi-step AI with `instructions[]` | Read/Write |

**Governance Tools:**

| Tool | Purpose | Read/Write |
|---|---|---|
| `guideline_list` | List all guidelines with metadata | Read |
| `guideline_read` | Read guideline structure or specific sections | Read |
| `guideline_create` | Create new guidelines | Write |
| `guideline_update` | Update guidelines (replace, section, append) with history | Write |
| `guideline_delete` | Delete a guideline permanently | Write |

**Organization Tools:**

| Tool | Purpose |
|---|---|
| `list_organizations` | List orgs for OAuth users |
| `select_organization` | Select which org to use |

**Key insight for architects:** Agents with MCP tools can both READ and WRITE governance. This enables a **learning loop** -- agents that discover patterns can codify them as guidelines, improving future agent behavior organization-wide. This is fundamentally different from static SDK integrations.

### The Core Loop

Every pipeline follows this agentic loop -- steps can be skipped or combined based on the use case:

```
OBSERVE -> REMEMBER -> RECALL -> REASON -> PLAN -> DECIDE -> GENERATE -> ACT -> UPDATE -> REPEAT
```

This loop is powered by the **three-layer agent operating model**: **Guidelines** (`smartGuidelines()`) constrain how the agent reasons, **Memory** (`smartDigest()`/`recall()`) informs what it knows, and **Workspace** (workspace-tagged `recall()`/`memorize()`) tracks coordination. Every cycle, the agent assembles context from all three layers before acting. When working on a contact, also pull their company context (`smartDigest` with `website_url`) -- cross-entity context prevents blind spots.

> **Full architecture guide:** See the `collaboration` skill's `reference/architecture.md` for the complete three-layer model with code patterns.

> **Full technical reference:** Read `reference/plan.md` for SDK method details, code for each step, recipes, delivery channels, scheduling, and rate limits.

### Model Selection and Pricing (`prompt`)

`client.ai.prompt()` routes to any LLM via OpenRouter. Pass `model` (any OpenRouter model string) and `provider`:

```typescript
await client.ai.prompt({
    context,
    instructions: [...],
    model: 'anthropic/claude-opus-4-6',  // any OpenRouter model string
    provider: 'openrouter',               // default
});
```

Default model is selected by the `pro` tier. Supported: any model available on OpenRouter (Anthropic, Google, xAI, OpenAI, Mistral, etc.).

**Generate tiers** (billed on actual input + output tokens used):

| Tier | Input | Output | Best For |
|---|---|---|---|
| `basic` | 0.2 credits/1K tokens | 0.4 credits/1K tokens | High-volume, cost-first |
| `pro` | 0.5 credits/1K tokens | 1.0 credits/1K tokens | **Default** -- balanced |
| `ultra` | 1.0 credits/1K tokens | 2.5 credits/1K tokens | Highest capability models |

Pass `tier` to have Personize select a curated model, or pass an explicit `model` string directly. 1 credit = $0.01.

**Note:** Intelligence tiers (`basic`/`pro`/`pro_fast`/`ultra`) for **memorize** control the extraction pipeline. Generate tiers are separate and apply to `prompt()` only.

**Direct providers:** Pass `provider` to bypass OpenRouter and route directly to a provider's API: `openai`, `anthropic`, `google`, `xai`, `deepseek`, `openrouter` (default).

```typescript
// Without BYOK: use tier (model auto-selected)
await client.ai.prompt({
    context,
    instructions: [...],
    tier: 'pro',  // basic, pro (default), ultra
});

// With BYOK: must provide model + provider + openrouterApiKey
await client.ai.prompt({
    context,
    instructions: [...],
    openrouterApiKey: 'sk-or-v1-...',
    model: 'claude-sonnet-4-6',
    provider: 'anthropic',
});
```

**BYOK (bring your own key):** On Pro/Enterprise plans, pass `openrouterApiKey` with `model` and `provider` to use your own key. Without BYOK, `model`/`provider` are rejected (400) -- use `tier` instead. Billing switches to time-based: 10 credits base + 10 credits per extra minute.

### Rate Limits

Always call `client.me()` first to get actual limits -- the response includes `plan.limits.maxApiCallsPerMinute` and `plan.limits.maxApiCallsPerMonth`. Each record uses ~4-6 API calls, so divide per-minute limit by 6 for estimated records/min throughput.

---

## Available Resources

| Resource | Contents |
|---|---|
| `reference/prospect-research.md` | **NEW** -- Online research framework: company profiling, sizing signals, dev team detection, customer volume estimation, B2B/B2C inference, BYOC likelihood, fit signals, Prospect Intelligence Brief template |
| `reference/use-case-builder.md` | **NEW** -- Building use cases that demonstrate deep business knowledge: specificity patterns, company profile patterns (A-E), "Day in the Life" narratives, terminology customization, credibility checklist |
| `reference/discover.md` | Discovery framework with 3 phases (research, validate, assess), codebase analysis, situation assessment |
| `reference/propose.md` | All use cases, user stories, surface areas, before/after examples, archetype adaptations |
| `reference/integration-modes.md` | **NEW** -- SDK vs MCP vs multi-agent vs hybrid, data flow loop, who orchestrates, MCP setup |
| `reference/archetypes.md` | **NEW** -- 5 archetypes with layer weights, architecture patterns, example pipelines |
| `reference/industries/` | **Industry-specific blueprints** -- 10 industries with schemas, governance, use cases by department, code examples, agent coordination patterns, and quick wins. Read `reference/industries/README.md` for the index, then read the specific industry file matching the developer's product. |
| `reference/schema.md` | Schema design workflow, collection specs, property types, description writing, starter templates, verification |
| `reference/schemas/` | JSON Schema definition, README, and 8 example schemas: core entities (contact, company, employee, member, product-user), agent memory, and use-case overlays (sales-contact, support-ticket) |
| `reference/plan.md` | Data intelligence guide, 10-step loop, SDK methods, code examples, recipes, channels, scheduling, rate limits |
| `reference/generate.md` | Generation guardrails, format rules, hallucination prevention, channel templates, output parsing, testing patterns |
| `reference/wire.md` | Integration patterns (wrap, webhook, middleware, cron, queue, MCP tool provider, outbound webhook), error handling, rate alignment, stack-specific recipes |
| `reference/review.md` | Audit checklist, common mistakes, improvement patterns |
| `reference/guideline-authoring-standards.md` | **How to write high-quality guidelines** -- structure rules, content patterns (principles before rules, contrasted examples, RFC 2119 keywords with rationale), anti-patterns, token budget guide, quality warnings. Read before creating or reviewing any guideline. |
| `reference/integration-checklist.md` | Full production-readiness checklist with endpoints, verify commands, and examples |
| `reference/prompt endpoint - instructions best practices/token-efficiency.md` | 10 rules for writing token-efficient `instructions[]` |
| `reference/prompt endpoint - instructions best practices/prompt-checklist.md` | Quick-reference checklist for `client.ai.prompt()` |
| `reference/platform-capabilities.md` | Full platform capability inventory beyond the three core layers -- consult when the customer's requirements go deeper (notifications, enrichment, multimodal, MCP profiles, BYOC) |
| `reference/signal-open-source.md` | Personize Signal (open-source): smart notification architecture with AI-scored delivery, digest compilation, workspace collaboration. Not an installable package -- patterns and inspiration from GitHub. |
| `recipes/*.ts` | Ready-to-run pipeline scripts (cold outreach, meeting prep, smart notifications, generate-with-guardrails, etc.) |
| `channels/*.md` | Delivery channel templates (SendGrid, Slack, Twilio, webhook) |
