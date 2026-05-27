# Integration Modes: MCP vs SDK vs API vs CLI

| Mode | Best For | Language | Auth | Real-Time | Batch | Agent-Friendly |
|---|---|---|---|---|---|---|
| **MCP** | AI agents, coding assistants, multi-agent systems | Tool calls | API key in config | Yes | No | Native |
| **SDK** | TypeScript/Node.js applications, pipelines | TypeScript | `secretKey` param | Yes | Yes | Programmatic |
| **API** | Any language, direct HTTP integration | HTTP/JSON | `X-Api-Key` header | Yes | Yes | Via HTTP |
| **CLI** | Local dev, scripts, quick operations | Shell | `PERSONIZE_API_KEY` env | Yes | Limited | Manual |

---

## Decision Matrix

Use this matrix to pick the right integration mode for your use case:

| Question | MCP | SDK | API | CLI |
|---|---|---|---|---|
| Building a TypeScript app? | | **Yes** | | |
| Building in Python/Go/other? | | | **Yes** | |
| Connecting an AI coding assistant? | **Yes** | | | |
| Multi-agent system (CrewAI, AutoGen)? | **Yes** | | | |
| Workflow tool (n8n, Make, Zapier)? | | | **Yes** | |
| One-off data operations? | | | | **Yes** |
| CI/CD pipeline integration? | | | | **Yes** |
| Need batch operations? | | **Yes** | **Yes** | |
| Need streaming responses? | | **Yes** | **Yes** | |

---

## MCP (Model Context Protocol)

**What it is:** A tool interface that lets AI agents call Personize capabilities as native tools. The agent sees tools like `memory_memorize`, `memory_recall`, `ai_smart_guidelines` and calls them directly.

**Architecture:**

```
AI Agent (Claude, GPT, etc.)
    |
    |-- tool_call: memory_recall({ query: "...", email: "..." })
    |
MCP Server (Personize)
    |
    |-- Personize API
```

**When to use:**
- AI coding assistants (Claude Desktop, Cursor, Windsurf)
- Multi-agent orchestration (CrewAI, AutoGen, LangGraph)
- Workflow tools with MCP support
- Any scenario where an AI agent needs to access Personize capabilities

**Configuration:**

```json
{
    "mcpServers": {
        "personize": {
            "command": "npx",
            "args": ["-y", "@anthropic/personize-mcp"],
            "env": {
                "PERSONIZE_API_KEY": "your-api-key"
            }
        }
    }
}
```

**Key considerations:**
- Tool scoping: limit which tools each agent can access via `toolFilter`
- Token budgets: MCP defaults to 8,000 tokens for smartGuidelines (API defaults to 10,000)
- No batch operations -- MCP tools are designed for single-entity, real-time calls
- Agent autonomy: the AI decides when and how to call tools based on its reasoning

**Pros:**
- Zero code -- agents use tools through natural language
- Tool composition -- agents chain calls intelligently
- Works with any MCP-compatible AI platform

**Cons:**
- No batch operations
- Limited control over call sequencing
- Token overhead from tool descriptions
- Dependent on agent's reasoning quality

---

## SDK (@personize/sdk)

**What it is:** A TypeScript/Node.js client library with typed methods for all Personize capabilities. Full programmatic control over every API feature.

**Architecture:**

```
Your Application (TypeScript/Node.js)
    |
    |-- client.memory.memorize({ ... })
    |-- client.memory.recall({ ... })
    |-- client.ai.smartGuidelines({ ... })
    |
Personize API (HTTPS)
```

**When to use:**
- TypeScript/Node.js applications
- Production pipelines (Trigger.dev, custom schedulers)
- Applications needing full type safety and IDE autocompletion
- Batch operations (memorizeBatch, bulk recall)
- Custom agent frameworks built in TypeScript

**Installation:**

```bash
npm install @personize/sdk
```

**Usage:**

```typescript
import { Personize } from '@personize/sdk';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

// Typed methods with full autocompletion
const result = await client.memory.recall({
    query: 'recent pricing discussions',
    email: 'sarah@acme.com',
    limit: 10,
});
```

**Key considerations:**
- Full TypeScript types for all request/response shapes
- Built-in error handling and retry logic
- Supports all API features including batch operations
- Version-locked to API version -- update SDK when API changes

**Pros:**
- Full type safety and autocompletion
- All features available (batch, streaming, advanced options)
- Fine-grained control over every parameter
- Best for production pipelines

**Cons:**
- TypeScript/Node.js only
- Requires application code (not zero-code)
- Must manage SDK version updates

---

## API (Direct HTTP)

**What it is:** RESTful HTTP endpoints. Any language, any platform, any HTTP client. The universal integration path.

**Architecture:**

```
Your Application (any language)
    |
    |-- POST https://agent.personize.ai/api/v1/memory/memorize
    |       Headers: { X-Api-Key: "your-key" }
    |       Body: { content: "...", email: "..." }
    |
Personize API
```

**When to use:**
- Non-TypeScript applications (Python, Go, Java, Ruby, etc.)
- Workflow tools (n8n HTTP nodes, Make webhooks, Zapier)
- Server-to-server integrations
- Any platform that can make HTTP requests
- When you need language-agnostic integration

**Example (Python):**

```python
import requests

response = requests.post(
    'https://agent.personize.ai/api/v1/memory/memorize',
    headers={'X-Api-Key': 'your-api-key'},
    json={
        'content': 'Meeting notes from Q2 planning...',
        'email': 'sarah@acme.com',
        'tags': ['source:manual', 'type:meeting-notes'],
    },
)
```

**Example (curl):**

```bash
curl -X POST https://agent.personize.ai/api/v1/memory/memorize \
    -H "X-Api-Key: your-api-key" \
    -H "Content-Type: application/json" \
    -d '{"content": "...", "email": "sarah@acme.com"}'
```

**Key considerations:**
- Base URL: `https://agent.personize.ai/api/v1`
- Auth: `X-Api-Key` header on every request
- All responses follow `{ success: boolean, data?: T, error?: string }` format
- Rate limits apply per API key
- Supports all features including batch and streaming

**Pros:**
- Language-agnostic -- works with anything that speaks HTTP
- No SDK dependency to manage
- Direct control over every request
- Works with workflow tools, webhooks, serverless functions

**Cons:**
- No type safety (unless you generate types from OpenAPI spec)
- Manual error handling and retry logic
- More verbose than SDK
- Must track API version changes manually

---

## CLI (@personize/cli)

**What it is:** Command-line interface for local development, scripting, and quick operations. Useful for testing, debugging, and one-off data management.

**Architecture:**

```
Terminal
    |
    |-- personize memory recall --query "..." --email "..."
    |
Personize API (HTTPS)
```

**When to use:**
- Local development and testing
- Shell scripts and CI/CD pipelines
- Quick data operations (import, export, cleanup)
- Debugging and inspection
- Demo and exploration

**Installation:**

```bash
npm install -g @personize/cli
```

**Usage:**

```bash
# Set API key
export PERSONIZE_API_KEY="your-api-key"

# Memory operations
personize memory memorize --content "Meeting notes..." --email sarah@acme.com
personize memory recall --query "pricing discussions" --email sarah@acme.com
personize memory smart-digest --email sarah@acme.com --type Contact

# Governance
personize governance list
personize governance create --name "brand-voice" --content "..."

# Collections
personize collections list
personize collections create --name "Sales Contacts" --entity-type Contact
```

**Key considerations:**
- Reads API key from `PERSONIZE_API_KEY` environment variable
- Output formats: human-readable (default), JSON (`--json`), or table (`--table`)
- Limited batch support -- use SDK or API for large-scale operations
- Good for CI/CD smoke tests after deployment

**Pros:**
- Zero code -- just shell commands
- Fast iteration for development
- Scriptable for CI/CD
- Good for exploration and learning

**Cons:**
- Limited batch capabilities
- Not suitable for production application integration
- Shell escaping can be tricky with complex content
- No streaming support

---

## Combining Modes

Most production integrations use multiple modes:

| Layer | Mode | Why |
|---|---|---|
| Data pipeline | **SDK** | Batch operations, type safety, error handling |
| AI agents | **MCP** | Native tool access, agent autonomy |
| External integrations | **API** | Language-agnostic, webhook receivers |
| Development/debugging | **CLI** | Quick inspection, testing |

**Example: Full-stack integration**

```
HubSpot webhook --> API (receiver endpoint)
                        |
                    SDK (pipeline: memorize + enrich)
                        |
                    MCP (AI agent: analyze + act)
                        |
                    SDK (pipeline: store outcomes)
                        |
                    CLI (debugging when something breaks)
```

The modes are interchangeable at the API level -- they all hit the same endpoints with the same capabilities. Choose based on your development context, not capability differences.
