# Personize Platform Capabilities

> Quick reference for the solution architect. Use this to identify opportunities, recommend features, and design complete integrations. This is NOT exhaustive API docs -- it highlights what matters for architecture and sales conversations.

## Open-Source Packages

Personize publishes open-source packages at **https://github.com/orgs/personizeai/repositories**. When designing integrations, search these repos for examples, starter code, and inspiration relevant to the customer's use case.

| Package | Repository | Purpose |
|---|---|---|
| `@personize/sdk` | [github.com/personizeai/personize-sdk](https://github.com/personizeai/personize-sdk) | Official TypeScript/Node.js SDK -- memory, governance, AI, collections, agents |
| `@personize/cli` | [github.com/personizeai/personize-cli](https://github.com/personizeai/personize-cli) | CLI tool for memory, governance, agents, diagnostics from the terminal |
| Personize Signal | [github.com/personizeai/signal](https://github.com/personizeai/signal) | Open-source smart notification engine -- AI-scored delivery decisions, digest compilation, workspace collaboration. **Not an installable package yet** -- available as open-source reference code and inspiration. |

> **Always search GitHub** (`github.com/personizeai`) for real-world examples and templates when helping customers. Open-source repos contain examples/, templates/, and README walkthroughs that accelerate customer onboarding.

---

## Capability Matrix

### 1. Unified Customer Memory
Everything in the main SKILL.md -- memorize, recall, smartDigest, search, batch, collections, properties, cross-entity context.

### 2. Governance Layer
SmartGuidelines, guideline CRUD, RFC 2119 constraints, section-level delivery, token budgets, learning loops.

### 3. Personalization Engine
Multi-step `instructions[]`, structured outputs, evaluation, streaming (SSE), multimodal input.

### 4. Smart Notifications (Personize Signal)
See `reference/signal-open-source.md` for full details. Key value props for customers:
- **AI-scored delivery**: 4-stage pipeline decides IF, WHAT, WHEN, and HOW to notify each person (0-100 scoring: SEND/DEFER/SKIP)
- **Notification fatigue prevention**: deduplication, daily caps, quiet hours
- **Digest compilation**: deferred notifications compiled into personalized daily/weekly digests
- **Multi-channel routing**: Console, SendGrid, SES, Slack, InApp (plugin interface for custom channels)
- **Self-improving**: memorizes delivery outcomes, improves scoring over time
- **Workspace collaboration**: tasks, notes, updates, issues attached to entity records

### 5. Data Enrichment (Apollo Integration)
The platform includes Apollo integration for people and company enrichment. This is an emerging capability -- do not position it as a primary selling point, but be aware it exists if enrichment comes up in conversation.

### 6. Multimodal Input
The AI engine supports sending images, PDFs, and documents as attachments to prompts and agent runs. This is an emerging capability -- mention it if a customer's use case involves visual or document-based content, but do not lead with it.

### 7. MCP Profile System
Four access profiles control what tools are available to connected agents:

| Profile | Access | Use Case |
|---|---|---|
| `agent` (default) | Memory read/write + guidelines read | Standard agent integration |
| `agent-readonly` | Memory read + guidelines read (zero mutations) | Safe browsing, research agents |
| `governance` | Governance CRUD + guidelines read | Admin/policy agents |
| `developer` | Everything + skills + org selection | Full platform access |

- **Opportunity:** Customers building multi-agent systems can assign appropriate profiles per agent role -- e.g., research agents get `agent-readonly`, policy agents get `governance`, orchestrators get `developer`.

### 8. CLI & Developer Experience
`@personize/cli` provides terminal access to all platform operations:
- `personize memory recall/memorize/search/digest` -- memory operations
- `personize guidelines list/create/update` -- governance management
- `personize agents list/run` -- agent execution
- `personize doctor check` -- diagnostics and health checks
- `personize setup init` -- guided onboarding
- **Opportunity:** Developer-focused teams can prototype and test integrations from the terminal before writing code. The `doctor` command catches setup issues early.

### 9. Agents API
Reusable prompt actions with streaming support:
- `POST /api/v1/agents/:id/run` -- execute with inputs and attachments
- Agents support multimodal input, streaming (SSE), and structured outputs
- **Opportunity:** Customers can package common AI tasks (meeting prep, health reports, email generation) as reusable agents that non-technical team members can invoke.

### 10. Evaluation System (Post-Implementation Optimization)
3-phase memorization accuracy evaluation:
1. **Extract** -- run the memorizer LLM on sample input
2. **Analyze** -- evaluator LLM scores extraction quality
3. **Optimize** -- per-property improvement suggestions

- Streaming support (SSE) for real-time feedback
- **When to use:** During REVIEW action only. This is an optimization tool for existing integrations, NOT a discovery/proposal topic. Mention it when auditing data quality in a working integration.

### 11. Workflows
Workflow engine for managing automated processes:
- CRUD operations (create, list, get, update, delete)
- Status toggling (on/off)
- Sync with platform state

### 12. Events & Audit
- Event listing and detail retrieval
- Usage tracking (`GET /api/v1/usage/current`)
- Privacy audit logs (internal)

---

## Enterprise Capabilities

### BYOC (Bring Your Own Cloud)
For customers with data residency requirements, security mandates, or regulatory constraints, Personize offers a **Bring Your Own Cloud** deployment option.

**What it provides:**
- Full Personize platform deployed in the customer's own AWS account
- Data never leaves their infrastructure
- Customer pays AWS costs directly
- Multi-model support (OpenAI, Claude, Bedrock, and more)

**Current status:** This is an evolving solution. Infrastructure is deployed and functional, but the offering is still being refined.

**How to handle in conversations:**
- If a prospect mentions data residency, security requirements, regulated industry, or asks "can we run this in our own cloud?" -- acknowledge BYOC exists and share the high-level value
- Do NOT pitch specific details, pricing, or timelines -- the solution is evolving
- **Always say:** "We have a BYOC option for enterprises with data residency or security requirements. Let me connect you with our team to discuss your specific needs."
- Point them to the Personize team for a dedicated conversation

### What NOT to Promise
- SOC 2 certification (in progress, not yet complete)
- Multi-cloud (AWS is current focus; Kubernetes feasibility assessed)
- Specific BYOC pricing or contract terms (discuss with team)
