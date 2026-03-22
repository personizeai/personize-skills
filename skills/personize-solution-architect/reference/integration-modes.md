# Reference: Integration Modes

Complete decision framework for choosing how Personize enters a system -- SDK, MCP, multi-agent, Responses API, no-code, or hybrid.

---

## The Core Decision: Who Orchestrates?

Every Personize integration answers one question first: **who controls the flow?**

| Orchestrator | Integration Mode | When to Use |
|---|---|---|
| **Your code** | SDK / REST API | You know the exact sequence: fetch context, generate, deliver. Deterministic, testable, deployable as scripts or services. |
| **Personize** | Responses API (`/api/v1/responses`) | You define steps with tool scoping, Personize executes them sequentially. Good for multi-step workflows where you want structured outputs per step. |
| **An AI agent** | MCP on coding assistant | The developer describes what they want in natural language, the AI calls Personize tools to accomplish it. Good for ad-hoc tasks and development-time workflows. |
| **A workflow tool** | MCP on n8n/Zapier AI nodes | Visual orchestration with AI nodes that call Personize tools. Good for business users and no-code teams. |
| **An external agent framework** | MCP on multi-agent system | OpenClaw, CoWork, CrewAI, LangGraph, or custom orchestrators call Personize as one of many tool providers. Good for autonomous systems with multiple capabilities. |
| **Mixed** | Hybrid | Different modes for different jobs. Batch sync via SDK, real-time reasoning via MCP, event triggers via webhooks. Most production systems end up here. |

---

## Mode 1: SDK in Code

**Best for:** Batch processing, scheduled pipelines, deterministic workflows, production services.

**Who uses it:** Backend developers, DevOps, pipeline engineers.

**Architecture:**

```
Your Code (TypeScript/Python/any)
  └── @personize/sdk
       ├── client.memory.memorizeBatch()   -- ingest data
       ├── client.memory.smartDigest()      -- get context
       ├── client.ai.smartGuidelines()      -- get rules
       ├── client.ai.prompt()               -- generate content
       └── client.memory.memorize()         -- store outcomes
```

**Strengths:**
- Full control over flow, error handling, retries
- Type-safe with TypeScript
- Easy to test, deploy, schedule (cron, GitHub Actions, Lambda)
- Best for batch operations (process 10K records overnight)

**Limitations:**
- Requires a developer to write and maintain code
- Every new workflow = new code
- No adaptive reasoning -- the code does exactly what you wrote

**When to choose SDK:**
- Batch data sync from CRM/database
- Scheduled generation jobs (daily digests, weekly reports)
- Production APIs that serve personalized content
- Any workflow where the steps are known in advance

---

## Mode 2: MCP on AI Coding Assistants

**Best for:** Ad-hoc tasks, development-time workflows, prototyping, individual productivity.

**Who uses it:** Developers using Cursor, Claude Code, Windsurf, Claude Desktop.

**Architecture:**

```
Developer (natural language)
  └── AI Coding Assistant (Claude, GPT, etc.)
       └── Personize MCP Server (17 tools)
            ├── memory_recall_pro     -- "what do we know about Sarah?"
            ├── ai_smart_guidelines   -- "what are our outreach rules?"
            ├── memory_store_pro      -- "remember that Sarah prefers email"
            └── guideline_update      -- "update the playbook with this learning"
```

**Setup (API Key -- simplest):**

```json
{
  "mcpServers": {
    "personize": {
      "url": "https://agent.personize.ai/mcp/sse?api_key=sk_live_YOUR_KEY"
    }
  }
}
```

**Setup (OAuth -- for Claude web, ChatGPT):**

```
URL: https://agent.personize.ai/mcp/sse?organizationId=org_YOUR_ORG
Client ID: 1oe3h50chvlddca1110ncmr7bg
```

**Strengths:**
- Zero code -- developer describes intent, AI executes
- Great for exploration and prototyping
- Agents can read AND write governance (learning loop)
- Natural language interface to all Personize capabilities

**Limitations:**
- Not schedulable (requires human to initiate)
- Non-deterministic -- AI may call tools differently each time
- Not suitable for batch processing at scale
- Depends on the AI assistant's reasoning quality

**When to choose MCP on coding assistants:**
- "Write a follow-up email for sarah@acme.com using our brand voice"
- "What do we know about Acme Corp? Summarize their health."
- "Update our sales playbook to include this new objection handling"
- Quick one-off tasks during development

---

## Mode 3: MCP on AI Workflow Tools

**Best for:** Visual automation, business-user-accessible pipelines, event-triggered AI workflows.

**Who uses it:** Operations teams, marketing ops, RevOps, business analysts using n8n, Zapier, LangChain.

**Architecture:**

```
Trigger (webhook, schedule, event)
  └── Workflow Tool (n8n, Zapier, LangChain)
       ├── Node 1: Receive event data
       ├── Node 2: AI Node with Personize MCP
       │    ├── memory_recall_pro    -- get context
       │    ├── ai_smart_guidelines  -- get rules
       │    └── (AI reasons and generates)
       ├── Node 3: Deliver (Gmail, Slack, HubSpot)
       └── Node 4: AI Node with Personize MCP
            └── memory_store_pro     -- record outcome
```

**n8n Setup:**
- Add MCP server: `https://agent.personize.ai/mcp/sse?api_key=sk_live_YOUR_KEY`
- AI nodes automatically discover Personize tools
- Chain AI nodes with delivery nodes

**Strengths:**
- Visual, no-code workflow design
- Business users can modify without developer help
- Event-triggered with built-in scheduling
- 400+ app integrations via n8n/Zapier ecosystem

**Limitations:**
- Less control over AI reasoning than SDK
- Harder to debug complex multi-step logic
- Rate limits depend on both Personize and workflow platform
- AI node quality varies by platform

**When to choose MCP on workflow tools:**
- Event-driven personalization (HubSpot deal closed -> personalized onboarding email)
- Scheduled batch workflows (weekly digest generation)
- Cross-platform integrations (Salesforce -> Personize -> Slack)
- Teams without dedicated developers

---

## Mode 4: MCP on Multi-Agent Systems

**Best for:** Autonomous systems, complex coordination, multiple AI agents working together.

**Who uses it:** AI engineers building with OpenClaw, CoWork, CrewAI, LangGraph, AutoGen, or custom orchestrators.

**Architecture:**

```
External Orchestrator (OpenClaw, LangGraph, custom)
  ├── Agent A: Sales Intel
  │    ├── memory_recall_pro (Personize MCP)
  │    ├── web_search (other MCP)
  │    └── memory_store_pro (Personize MCP)
  │
  ├── Agent B: Content Generator
  │    ├── ai_smart_guidelines (Personize MCP)
  │    ├── memory_digest (Personize MCP)
  │    └── ai_prompt (Personize MCP)
  │
  ├── Agent C: Delivery
  │    ├── email_send (external tool)
  │    ├── memory_store_pro (Personize MCP) -- record delivery
  │    └── memory_update_property (Personize MCP) -- update status
  │
  └── Agent D: Governance Learner
       ├── memory_search (Personize MCP) -- find patterns
       ├── guideline_read (Personize MCP) -- check current rules
       └── guideline_update (Personize MCP) -- evolve rules
```

**Key design decisions:**

1. **Which tools does each agent get?** Not every agent needs all 17 tools. Scope tools per agent role:
   - Read-only agents: `memory_recall_pro`, `memory_digest`, `memory_get_properties`, `ai_smart_guidelines`
   - Write-capable agents: add `memory_store_pro`, `memory_update_property`
   - Governance agents: add `guideline_create`, `guideline_update`

2. **How do agents share state?** Via Personize workspaces. Each agent reads the shared workspace via `memory_digest`, acts, and writes contributions back via `memory_store_pro` with workspace tags.

3. **What's the coordination protocol?**
   - **Parallel:** Multiple agents run simultaneously, each reading shared state and contributing independently. Good for intelligence gathering.
   - **Sequential:** Agent A completes, writes findings, Agent B reads and continues. Good for pipelines (research -> generate -> deliver).
   - **Reactive:** Agents monitor for signals and act when triggered. Good for health monitoring and alerting.

4. **The learning loop:** Agent D (or any agent with governance write access) can update guidelines based on observed outcomes. This creates a system that improves over time without human intervention -- but requires strong initial governance guardrails.

**Strengths:**
- Most capable architecture -- multiple specialized agents
- Scales to complex workflows with coordination
- Learning loop enables continuous improvement
- Personize provides the memory and governance substrate

**Limitations:**
- Most complex to build and debug
- Requires governance guardrails before deploying autonomously
- Agent coordination overhead (workspace reads/writes)
- Cost scales with number of agents x number of tool calls

**When to choose multi-agent:**
- Account intelligence systems (research + monitor + synthesize + alert)
- Autonomous outreach (research -> qualify -> generate -> send -> follow-up)
- Complex decision workflows (multiple perspectives before routing)
- Systems that need to learn and improve over time

---

## Mode 5: Responses API (Personize Orchestrates)

**Best for:** Multi-step workflows where you want Personize to control the execution, with structured outputs per step.

**Who uses it:** Developers who want step-based orchestration without managing the LLM loop themselves.

**Architecture:**

```
Your Code
  └── POST /api/v1/responses
       ├── Step 1: { prompt: "recall context", tools: ["memory_recall_pro"] }
       ├── Step 2: { prompt: "check governance", tools: ["ai_smart_guidelines"] }
       ├── Step 3: { prompt: "generate email", tools: [], outputs: ["subject", "body"] }
       └── Step 4: { prompt: "memorize result", tools: ["memory_store_pro"] }
```

```typescript
const response = await fetch('https://agent.personize.ai/api/v1/responses', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        steps: [
            {
                prompt: 'Recall everything known about sarah@acme.com',
                tools: ['memory_recall_pro', 'memory_digest'],
                max_steps: 3,
            },
            {
                prompt: 'Check our outreach guidelines and brand voice',
                tools: ['ai_smart_guidelines'],
                max_steps: 2,
            },
            {
                prompt: 'Generate a follow-up email. Output as: <output name="subject">...</output> <output name="body_html">...</output>',
                tools: [],
                max_steps: 5,
            },
        ],
        model: 'anthropic/claude-sonnet-4-6',
    }),
});
```

**Strengths:**
- Structured step execution with per-step tool scoping
- Personize manages the LLM loop, conversation history, tool calls
- Structured outputs via `<output name="...">` markers
- `captureToolResults: true` auto-memorizes tool returns
- Works from any language (REST API)

**Limitations:**
- Sequential steps only (no parallel branching)
- Less control over error handling than SDK
- Requires understanding of tool scoping

**When to choose Responses API:**
- Multi-step generation with different tool access per step
- When you want structured outputs without parsing LLM text
- When you don't want to manage the tool loop yourself
- API-first architectures where you call Personize from any language

---

## Mode 6: Hybrid (Production Default)

Most production systems use multiple modes for different jobs:

| Job | Mode | Why |
|---|---|---|
| Nightly CRM sync | SDK batch script | Deterministic, handles 10K+ records with rate limiting |
| Real-time agent responses | MCP on multi-agent | Agent decides what context to pull and how to respond |
| Weekly digest generation | SDK cron job | Batch processing with quality evaluation |
| Ad-hoc research | MCP on Claude Code | Developer asks natural language questions |
| Event-triggered alerts | n8n workflow with MCP | Visual workflow, easy for ops team to modify |
| Governance evolution | MCP on autonomous agent | Agent learns from outcomes and updates guidelines |

**Design principle:** Use the simplest mode that handles the job. SDK for batch, MCP for reasoning, webhooks for events.

---

## Decision Matrix

Use this to recommend integration modes based on the Situation Profile:

| Archetype | Human-Driven | Human-in-Loop | Supervised Autonomous | Fully Autonomous |
|---|---|---|---|---|
| **Communication** | MCP on coding assistant | SDK + review queue | SDK batch + evaluation | Multi-agent + governance loop |
| **Analysis** | MCP on coding assistant | SDK + dashboard | SDK batch + reporting | Multi-agent + workspace |
| **Decision** | MCP or Responses API | SDK + approval flow | SDK + threshold alerts | Multi-agent + governance + learning |
| **Execution** | SDK script | SDK + dry-run first | SDK cron job | SDK + webhook triggers |
| **Collaboration** | MCP on agents | Multi-agent + human review | Multi-agent + workspace | Multi-agent + workspace + learning |

---

## MCP Connection Reference

### API Key (works everywhere)

**In URL:**
```
https://agent.personize.ai/mcp/sse?api_key=sk_live_YOUR_KEY
```

**In header:**
```
URL: https://agent.personize.ai/mcp/sse
Header: Authorization: Bearer sk_live_YOUR_KEY
```

### OAuth (ChatGPT, Claude web/Desktop)

```
URL: https://agent.personize.ai/mcp/sse?organizationId=org_YOUR_ORG
Client ID: 1oe3h50chvlddca1110ncmr7bg
Auth URL: https://auth.personize.ai/oauth2/authorize
Token URL: https://auth.personize.ai/oauth2/token
Scopes: openid email profile
```

### Platform-Specific Setup

| Platform | Method | Config |
|---|---|---|
| Claude Code | API Key | `--mcp-server personize=https://agent.personize.ai/mcp/sse?api_key=sk_live_KEY` |
| Claude Desktop | API Key or OAuth | `claude_desktop_config.json` -> `mcpServers.personize.url` |
| Claude Web | OAuth only | Settings -> Integrations -> Add MCP Server |
| ChatGPT | OAuth only | Settings -> Connected apps -> Add MCP server |
| Cursor | API Key | Settings -> MCP Servers -> Add |
| Windsurf / Cline | API Key | One-line URL with key |
| n8n / Zapier | API Key in URL | `https://agent.personize.ai/mcp/sse?api_key=sk_live_KEY` |
| LangChain | API Key | MCP client with URL or Bearer header |
| OpenClaw / CoWork | API Key | MCP tool provider configuration |
| CrewAI / LangGraph | API Key | Custom MCP client integration |

### Verifying MCP Connection

After setup, verify the agent can:
1. List tools (should see 17 tools)
2. Call `memory_recall_pro` with a test query
3. Call `ai_smart_guidelines` with a test message
4. Call `memory_store_pro` to write a test memory

If any tool is missing, check: API key validity, org has data, MCP server URL is correct.
