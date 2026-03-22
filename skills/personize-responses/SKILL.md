---
name: personize-responses
description: "AI generation and orchestration via the Personize Responses API. Use this skill whenever the user wants to generate text, run multi-step AI workflows, orchestrate steps, use client-executed tools, function calling, tool calling, chat completions, OpenAI-compatible API, BYOK (bring your own key), pipeline execution, structured outputs, or anything involving the Personize SDK's responses or chat completions methods (client.responses.create, client.chat.completions.create). Also trigger when the user mentions AI generation, generate content, multi-step orchestration, step-driven workflows, prompt chaining, agent orchestration, evaluation, auto-eval, governance-aware generation, memory-aware generation, MCP integrations, or drop-in OpenAI replacement."
license: Apache-2.0
compatibility: "Requires @personize/sdk or Personize MCP server and a Personize API key (sk_live_...)"
metadata: {"author": "personize-ai", "version": "1.0", "homepage": "https://personize.ai", "openclaw": {"emoji": "\U0001F680", "requires": {"env": ["PERSONIZE_SECRET_KEY"]}}}
---

# Skill: Personize Responses

This is your AI generation and orchestration layer. Two endpoints, one SDK -- step-driven workflows with governance, memory, and client-executed tools via `POST /api/v1/responses`, or a drop-in OpenAI-compatible interface via `POST /api/v1/chat/completions`. **Use Responses when you need multi-step orchestration, client tools, or Personize extensions. Use Chat Completions when you need OpenAI compatibility with zero code changes.**

> **Internal principle:** Steps are the unit of orchestration. Each step gets its own prompt, tool scope, and context window. The orchestrator executes them sequentially, carrying forward shared context. Client tools make the stateless loop possible -- the LLM calls them, your server executes them, and HMAC-signed conversation state keeps everything tamper-proof.

---

## When This Skill is Activated

This skill gives you the ability to generate AI content and orchestrate multi-step workflows using the Personize SDK.

**If the developer hasn't given a specific instruction yet**, introduce yourself:

> "I have access to the Responses skill. I can help you generate AI content, orchestrate multi-step workflows, set up client-executed tools, configure BYOK (bring your own key), and build OpenAI-compatible integrations. What are you building?"

**If the developer says something about generating content, running prompts, or AI orchestration**, jump to **RESPONSES**.

**If the developer says something about OpenAI compatibility or drop-in replacement**, jump to **CHAT COMPLETIONS**.

**If the developer says something about tools, function calling, or client-side execution**, jump to **CLIENT-EXECUTED TOOLS**.

**If the developer says something about using their own API key**, jump to **BYOK**.

---

## When NOT to Use This Skill

- Need to store or retrieve entity data --> use **entity-memory**
- Need to manage organizational rules or guidelines --> use **governance**
- Need durable scheduled pipelines with retries --> use **code-pipelines**
- Need no-code visual workflows --> use **no-code-pipelines**
- Need multi-agent coordination state --> use **collaboration**
- Need to plan a full integration --> use **solution-architect**

---

## Works With Both SDK and MCP -- One Skill, Two Interfaces

This skill works identically whether the LLM accesses generation via the **SDK** (code, scripts, IDE agents) or via **MCP** (Claude Desktop, ChatGPT, Cursor MCP connection).

| Interface | How it works | Best for |
|---|---|---|
| **SDK** (`@personize/sdk`) | `client.responses.create()`, `client.chat.completions.create()` | Scripts, CI/CD, IDE agents, production apps |
| **MCP** (Model Context Protocol) | `ai_responses_create`, `ai_chat_completions` tools | Claude Desktop, ChatGPT, Cursor, any MCP-compatible client |

---

## RESPONSES (Step-Driven Orchestration)

`POST /api/v1/responses` -- the primary generation endpoint. Supports steps, client tools, governance, memory, structured outputs, and evaluation.

### Basic Usage

```typescript
import { Personize } from '@personize/sdk';
const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

// Simple single-step generation
const result = await client.responses.create({
    steps: [
        { prompt: 'Write a professional follow-up email for a prospect who asked about enterprise pricing.' },
    ],
});

console.log(result.output[0].content[0].text);
// result.usage → { prompt_tokens, completion_tokens, total_tokens }
```

### Multi-Step Orchestration

Steps execute sequentially with shared context. Each step can have its own prompt, tool scope, and max roundtrips.

```typescript
const result = await client.responses.create({
    steps: [
        {
            prompt: 'Research the company Acme Corp. Find their industry, size, and recent news.',
            tools: ['web_search', 'memory_recall_pro'],
            max_steps: 5,
        },
        {
            prompt: 'Based on the research above, draft a personalized outreach email highlighting how our product solves their specific challenges.',
            tools: ['memory_recall_pro'],
        },
        {
            prompt: 'Review the draft email. Check for factual accuracy, tone consistency, and that it follows our brand guidelines. Output the final version.',
        },
    ],
    system_prompt: 'You are a senior sales development representative.',
    temperature: 0.7,
});

// result.steps → array of StepResult, one per step
// Each step: { order, text, tool_calls, usage }
```

### Governance Integration

Inject organizational guidelines into generation. Guidelines are fetched by ID and included in the system prompt automatically.

```typescript
const result = await client.responses.create({
    steps: [
        { prompt: 'Write a cold outreach email for a VP of Engineering at a Series B startup.' },
    ],
    personize: {
        governance: {
            guideline_ids: ['gdl_brand_voice', 'gdl_outbound_rules', 'gdl_icp_enterprise'],
            mode: 'fast',  // 'fast' for embedding-only (~200ms), 'deep' for LLM-powered (~3s)
        },
    },
});
```

### Memory Integration

Recall context about a record before generating. Optionally memorize the output after generation.

```typescript
const result = await client.responses.create({
    steps: [
        { prompt: 'Write a personalized follow-up based on everything we know about this contact.' },
    ],
    personize: {
        memory: {
            record_id: 'rec_abc123',
            recall: true,  // Automatically recalls entity context before generation
        },
        memorize: {
            record_id: 'rec_abc123',
            collection: 'outbound-emails',
            capture_tool_results: true,  // Also memorize tool call results
        },
    },
});
```

### Structured Outputs

Define output keys that the LLM should produce. Extracted automatically from the response.

```typescript
const result = await client.responses.create({
    steps: [
        { prompt: 'Analyze this lead and produce a qualification score with reasoning.' },
    ],
    personize: {
        outputs: [
            { key: 'score', type: 'number' },
            { key: 'reasoning', type: 'string' },
            { key: 'next_steps', type: 'string' },
        ],
    },
});

console.log(result.outputs);
// { score: 85, reasoning: '...', next_steps: '...' }
```

### MCP Integrations

Load MCP server tools into the generation context. Tools from connected MCP servers become available alongside built-in tools.

```typescript
const result = await client.responses.create({
    steps: [
        { prompt: 'Look up the latest deal stage in Salesforce and draft an update email.' },
    ],
    personize: {
        mcp_integration_ids: ['mcp_salesforce', 'mcp_slack'],
    },
});
```

### Session IDs

Group multiple requests into a session. Used for SmartGuidelines deduplication and conversation continuity.

```typescript
const sessionId = `sess_${Date.now()}`;

const step1 = await client.responses.create({
    steps: [{ prompt: 'Research Acme Corp.' }],
    session_id: sessionId,
});

const step2 = await client.responses.create({
    steps: [{ prompt: 'Now draft an email based on that research.' }],
    session_id: sessionId,  // Same session -- guidelines won't be re-fetched
});
```

### Attachments

Attach files (images, PDFs, etc.) to the request for multimodal generation.

```typescript
const result = await client.responses.create({
    steps: [
        { prompt: 'Analyze this screenshot and describe what you see.' },
    ],
    attachments: [
        { type: 'image', url: 'https://example.com/screenshot.png' },
    ],
});
```

### Template Variables

Pass dynamic variables into step prompts using the `inputs` field.

```typescript
const result = await client.responses.create({
    steps: [
        { prompt: 'Write a follow-up email for {{contact_name}} at {{company}}.' },
    ],
    inputs: {
        contact_name: 'Sarah Chen',
        company: 'Initech',
    },
});
```

---

## CHAT COMPLETIONS (OpenAI-Compatible)

`POST /api/v1/chat/completions` -- a drop-in replacement for OpenAI's chat completions API. Same request/response format, with optional Personize extensions.

### Basic Usage

```typescript
// Drop-in OpenAI replacement -- same interface, Personize backend
const result = await client.chat.completions.create({
    messages: [
        { role: 'system', content: 'You are a helpful sales assistant.' },
        { role: 'user', content: 'Draft a cold email for a VP of Engineering.' },
    ],
});

console.log(result.choices[0].message.content);
```

### With Personize Extensions

```typescript
const result = await client.chat.completions.create({
    messages: [
        { role: 'user', content: 'Write a personalized email for this prospect.' },
    ],
    personize: {
        governance: {
            guideline_ids: ['gdl_brand_voice'],
        },
        memory: {
            record_id: 'rec_abc123',
            recall: true,
        },
    },
});
```

### Migration from OpenAI SDK

Switching from the OpenAI SDK requires minimal changes:

```typescript
// Before (OpenAI SDK)
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const result = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello' }],
});

// After (Personize SDK -- same interface, adds governance + memory)
import { Personize } from '@personize/sdk';
const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
const result = await client.chat.completions.create({
    messages: [{ role: 'user', content: 'Hello' }],
    // Optional: add Personize extensions
    personize: {
        governance: { guideline_ids: ['gdl_brand_voice'] },
        memory: { record_id: 'rec_abc123', recall: true },
    },
});
```

---

## CLIENT-EXECUTED TOOLS

The Responses API supports client-executed tools. You define tool schemas in the request, and when the LLM decides to call one, the SDK executes it locally on your server and sends the results back. The conversation state is HMAC-signed to prevent tampering.

### How It Works

1. You define tools with JSON schemas in the request
2. The LLM generates a tool call
3. The API returns `status: 'requires_action'` with the tool calls, signed conversation state, and remaining steps
4. Your code executes the tool locally
5. You send a new request with the tool results, conversation, and signature
6. The loop repeats until all steps complete

### The SDK Handles the Loop

`client.responses.create()` handles the full tool execution loop automatically. You just provide the tool definitions and their execute functions:

```typescript
const result = await client.responses.create({
    steps: [
        { prompt: 'Look up the customer in our database and draft a renewal email.' },
    ],
    tools: [
        {
            type: 'function',
            function: {
                name: 'lookup_customer',
                description: 'Look up a customer by email in our internal database.',
                parameters: {
                    type: 'object',
                    properties: {
                        email: { type: 'string', description: 'Customer email address' },
                    },
                    required: ['email'],
                },
                // The SDK calls this locally when the LLM invokes the tool
                execute: async (args: { email: string }) => {
                    const customer = await db.customers.findByEmail(args.email);
                    return {
                        name: customer.name,
                        plan: customer.plan,
                        renewal_date: customer.renewalDate,
                        usage_pct: customer.usagePercent,
                    };
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'send_email',
                description: 'Send an email to a customer.',
                parameters: {
                    type: 'object',
                    properties: {
                        to: { type: 'string' },
                        subject: { type: 'string' },
                        body: { type: 'string' },
                    },
                    required: ['to', 'subject', 'body'],
                },
                execute: async (args: { to: string; subject: string; body: string }) => {
                    await emailService.send(args);
                    return { sent: true, timestamp: new Date().toISOString() };
                },
            },
        },
    ],
});

console.log(result.output[0].content[0].text);
// The LLM looked up the customer, drafted the email, and sent it -- all via your local tools
```

### Manual Loop (Advanced)

If you need full control over the tool execution loop (e.g., for streaming, custom retry logic, or human-in-the-loop approval), you can manage it manually:

```typescript
let response = await client.responses.create({
    steps: [
        { prompt: 'Look up the customer and draft a renewal email.' },
    ],
    tools: [
        {
            type: 'function',
            function: {
                name: 'lookup_customer',
                description: 'Look up a customer by email.',
                parameters: {
                    type: 'object',
                    properties: {
                        email: { type: 'string' },
                    },
                    required: ['email'],
                },
                // No execute function -- we handle it manually
            },
        },
    ],
});

// Loop until completed
while (response.status === 'requires_action') {
    const toolCalls = response.required_action.tool_calls;

    // Execute each tool call locally
    const toolResults = await Promise.all(
        toolCalls.map(async (tc) => {
            const args = JSON.parse(tc.function.arguments);
            let result: unknown;

            switch (tc.function.name) {
                case 'lookup_customer':
                    result = await db.customers.findByEmail(args.email);
                    break;
                default:
                    result = { error: `Unknown tool: ${tc.function.name}` };
            }

            return { id: tc.id, result: JSON.stringify(result) };
        }),
    );

    // Continue with tool results + signed conversation
    response = await client.responses.create({
        steps: response.remaining_steps,
        tools: [/* same tool definitions */],
        conversation: response.conversation.concat(
            toolResults.map(tr => ({
                role: 'tool' as const,
                tool_call_id: tr.id,
                content: tr.result,
            })),
        ),
        conversation_signature: response.conversation_signature,
    });
}

console.log(response.output[0].content[0].text);
```

### Tool Scoping Per Step

Limit which tools are available in each step:

```typescript
const result = await client.responses.create({
    steps: [
        {
            prompt: 'Look up the customer in our database.',
            tools: ['lookup_customer'],  // Only this tool available in step 1
        },
        {
            prompt: 'Draft the renewal email based on the customer data above.',
            tools: [],  // No tools -- pure generation
        },
        {
            prompt: 'Send the email.',
            tools: ['send_email'],  // Only send_email in step 3
        },
    ],
    tools: [/* all tool definitions */],
});
```

### Conversation Signature Security

The `conversation_signature` is an HMAC-SHA256 hash that signs the conversation state. It prevents:

- **Tampering**: Modifying conversation messages between roundtrips
- **Replay attacks**: Reusing old conversation states
- **Injection**: Adding unauthorized messages to the conversation

The signature is verified server-side on every continuation request. If verification fails, the API returns a `400 invalid_conversation_signature` error.

---

## BYOK (Bring Your Own Key)

Use your own API key for any supported LLM provider. BYOK allows you to use any model from any supported provider while still benefiting from Personize's orchestration, governance, memory, and tool infrastructure.

### Supported Providers

| Provider | Provider ID | Example Models |
|---|---|---|
| OpenAI | `openai` | `gpt-4o`, `gpt-4-turbo`, `o1-preview` |
| Anthropic | `anthropic` | `claude-sonnet-4-20250514`, `claude-opus-4-20250514` |
| Google | `google` | `gemini-2.5-pro`, `gemini-2.5-flash` |
| DeepSeek | `deepseek` | `deepseek-chat`, `deepseek-reasoner` |
| xAI | `xai` | `grok-3`, `grok-3-mini` |
| OpenRouter | `openrouter` | Any model on openrouter.ai |

### Usage

```typescript
// Using your own OpenAI key
const result = await client.responses.create({
    model: 'gpt-4o',
    provider: 'openai',
    llm_api_key: process.env.OPENAI_API_KEY,
    steps: [
        { prompt: 'Analyze this sales call transcript and extract action items.' },
    ],
});

// Using your own Anthropic key
const result = await client.responses.create({
    model: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    llm_api_key: process.env.ANTHROPIC_API_KEY,
    steps: [
        { prompt: 'Write a technical blog post about distributed systems.' },
    ],
});

// Using OpenRouter for any model
const result = await client.responses.create({
    model: 'meta-llama/llama-3.1-405b-instruct',
    provider: 'openrouter',
    openrouter_api_key: process.env.OPENROUTER_API_KEY,
    steps: [
        { prompt: 'Generate a product comparison matrix.' },
    ],
});
```

### BYOK Billing

BYOK requests are billed at a flat per-request rate based on duration, not token usage. You pay for the LLM tokens directly to the provider. Personize charges only for orchestration, governance, memory, and tool infrastructure.

### Without BYOK -- Tiers

When not using BYOK, select a tier to control model quality and cost:

| Tier | Best for | Default |
|---|---|---|
| `basic` | High-volume, cost-sensitive workloads | Yes (when no tier specified) |
| `pro` | Balanced quality and cost | |
| `ultra` | Maximum quality, complex reasoning | |

```typescript
const result = await client.responses.create({
    tier: 'ultra',
    steps: [
        { prompt: 'Write a detailed competitive analysis with market positioning recommendations.' },
    ],
});
```

---

## EVALUATION

Enable auto-evaluation to score AI responses against configurable criteria. Evaluation runs after generation completes and returns scores alongside the response.

```typescript
const result = await client.responses.create({
    steps: [
        { prompt: 'Write a cold outreach email for a VP of Engineering.' },
    ],
    personize: {
        governance: {
            guideline_ids: ['gdl_brand_voice', 'gdl_outbound_rules'],
        },
    },
    // Evaluation is configured via governance guidelines
    // Guidelines can include evaluation criteria that are automatically applied
});

// Evaluation results are included in the response metadata when configured
```

---

### Constraints

> Keywords follow [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119): **MUST** = non-negotiable, **SHOULD** = strong default (override with stated reasoning), **MAY** = agent discretion.

1. **MUST** provide at least one step with a non-empty prompt, or at least one user message in `messages` -- because the API returns 400 without valid input.
2. **MUST** provide both `model` and `provider` when using `llm_api_key` -- because BYOK requires explicit model selection (no tier-based defaults).
3. **MUST NOT** exceed 20 steps per request -- because the API enforces a hard limit of `maxSteps: 20`.
4. **SHOULD** use `steps` over `messages` for any workflow with more than one logical phase -- because steps provide tool scoping, sequential execution, and per-step usage tracking.
5. **SHOULD** set `temperature` between 0.3-0.7 for production content generation -- because extreme values (0 or 2) produce either overly deterministic or incoherent output.
6. **SHOULD** include `session_id` when making multiple related requests -- because sessions enable SmartGuidelines deduplication and conversation continuity.
7. **MUST NOT** modify the `conversation` array between roundtrips -- because the HMAC signature will fail verification, returning a 400 error.
8. **SHOULD** use the SDK's automatic tool execution loop (`execute` functions) over the manual loop -- because it handles retries, error formatting, and conversation management automatically.
9. **MAY** combine governance, memory, and tools in a single request -- because the orchestrator handles all three layers transparently.

---

## SDK Method Reference

```typescript
import { Personize } from '@personize/sdk';
const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
```

### Generation Methods

| Method | Endpoint | Purpose |
|---|---|---|
| `responses.create(opts)` | `POST /api/v1/responses` | Step-driven orchestration with tools, governance, memory |
| `chat.completions.create(opts)` | `POST /api/v1/chat/completions` | OpenAI-compatible drop-in with Personize extensions |

### Key Parameters -- `responses.create()`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `steps` | `StepDefinition[]` | Yes* | Ordered steps with prompts and optional tool scoping |
| `messages` | `Message[]` | Yes* | OpenAI-style messages (converted to single step internally) |
| `tools` | `ClientToolSchema[]` | No | Client-executed tool definitions with JSON schemas |
| `system_prompt` | `string` | No | System prompt prepended to all steps |
| `temperature` | `number` | No | LLM temperature (0-2, default varies by tier) |
| `max_tokens` | `number` | No | Max output tokens |
| `tier` | `'basic' \| 'pro' \| 'ultra'` | No | Model tier when not using BYOK (default: `basic`) |
| `model` | `string` | BYOK only | Model identifier (required with `llm_api_key`) |
| `provider` | `string` | BYOK only | Provider identifier (required with `llm_api_key`) |
| `llm_api_key` | `string` | No | Your own LLM API key |
| `openrouter_api_key` | `string` | No | OpenRouter API key (alternative to `llm_api_key`) |
| `session_id` | `string` | No | Group requests for guideline deduplication |
| `inputs` | `Record<string, string>` | No | Template variables for step prompts |
| `attachments` | `Attachment[]` | No | Files for multimodal generation |
| `personize.governance` | `object` | No | `{ guideline_ids, mode }` -- inject guidelines |
| `personize.memory` | `object` | No | `{ record_id, recall }` -- recall entity context |
| `personize.memorize` | `object` | No | `{ record_id, collection, capture_tool_results }` -- auto-memorize outputs |
| `personize.outputs` | `Array<{ key, type }>` | No | Structured output extraction |
| `personize.mcp_integration_ids` | `string[]` | No | Load MCP server tools |
| `conversation` | `WireMessage[]` | No | Signed conversation state for tool loop continuation |
| `conversation_signature` | `string` | No | HMAC signature for conversation verification |
| `stream` | `boolean` | No | Enable streaming (reserved for future release) |

*One of `steps` or `messages` is required.

### Key Parameters -- `chat.completions.create()`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `messages` | `Message[]` | Yes | OpenAI-format messages array |
| `model` | `string` | No | Model identifier |
| `temperature` | `number` | No | LLM temperature |
| `max_tokens` | `number` | No | Max output tokens |
| `personize` | `PersonizeConfig` | No | Governance, memory, MCP extensions |

### Response Shape -- Completed

```typescript
interface ResponsesCompletedResponse {
    id: string;                    // 'resp_...'
    status: 'completed';
    session_id: string;
    output: Array<{
        type: 'message';
        role: 'assistant';
        content: Array<{ type: 'text'; text: string }>;
    }>;
    steps: Array<{
        order: number;
        text: string;
        tool_calls: CanonicalToolCall[];
        usage: { prompt_tokens: number; completion_tokens: number };
    }>;
    outputs?: Record<string, unknown>;   // Structured outputs (if configured)
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    metadata: {
        tier?: string;
        credits_charged?: number;
        model?: string;
        provider?: string;
        byok?: boolean;
    };
}
```

### Response Shape -- Requires Action (Client Tools)

```typescript
interface ResponsesRequiresActionResponse {
    id: string;                    // 'resp_...'
    status: 'requires_action';
    session_id: string;
    required_action: {
        type: 'tool_calls';
        tool_calls: Array<{
            id: string;
            type: 'function';
            function: { name: string; arguments: string };
        }>;
    };
    conversation: WireMessage[];          // HMAC-signed conversation state
    remaining_steps: StepDefinition[];    // Steps not yet executed
    completed_step_count: number;
    conversation_signature: string;       // HMAC-SHA256 signature
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}
```

### Error Format

```typescript
interface ApiError {
    error: {
        message: string;
        type: 'invalid_request_error' | 'authentication_error' | 'permission_error' | 'server_error';
        code: string;   // e.g. 'missing_input', 'byok_missing_model', 'invalid_conversation_signature'
    };
}
```

---

## Safety Limits

| Limit | Value |
|---|---|
| Max steps per request | 20 |
| Max tool roundtrips | 20 |
| Max conversation messages | 200 |
| Max conversation size | 512 KB |
| Max attachments | 10 |
| Max attachment size | 50 MB |
| Request timeout | 20 minutes |
