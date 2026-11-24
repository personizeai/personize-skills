# Prompt Request Schemas

Literal TypeScript interfaces for the request payloads of `client.ai.prompt()` and `client.ai.promptStream()`. Source of truth: `@personize/sdk` (`sdk/src/types.ts`).

When an agent asks "what does method X accept?" or "show me the request schema", this file is the answer.

---

## `client.ai.prompt(options: PromptOptions)`

**Dual-mode.** Provide EITHER `prompt` (single-shot) OR `instructions` (multi-step). Mutually exclusive.

```ts
interface PromptOptions {
  // ── Mode (mutually exclusive) ────────────────────────────
  prompt?: string;
  instructions?: Array<string | { prompt: string; maxSteps?: number }>;

  // ── Streaming ────────────────────────────────────────────
  stream?: boolean;

  // ── Model selection ──────────────────────────────────────
  model?: string;            // BYOK only — without BYOK, use `tier`
  provider?: string;         // BYOK only — 'openai' | 'anthropic' | 'google' | 'xai' | 'deepseek' | 'openrouter'
  tier?: 'basic' | 'pro' | 'ultra';   // generate tier; default 'pro'
  openrouterApiKey?: string; // BYOK key — Pro/Enterprise plans only

  // ── Inputs ───────────────────────────────────────────────
  context?: string;
  sessionId?: string;
  attachments?: PromptAttachment[];   // max 10, 20MB each, 50MB total

  // ── Server-side features ─────────────────────────────────
  evaluate?: PromptEvaluateConfig;
  evaluationCriteria?: string;        // alias for evaluate.criteria + serverSide
  memorize?: PromptMemorizeConfig;
  outputs?: PromptOutputDefinition[]; // <output name="..."> XML extraction
  metadata?: { recordId?: string };
  mcpTools?: McpToolSelection[];

  // ── Governed-memory + native-search flags ────────────────
  governedMemory?: boolean;          // parallel retrieve + deterministic system prompt
  agentTools?: boolean;              // load full executor tool registry
  autoRecall?: boolean;              // run memory.retrieve in parallel-retrieve step (governed only)
  autoGuidelines?: boolean;          // run context.retrieve in parallel-retrieve step (governed only)
  webSearch?: boolean | PromptWebSearchConfig;
  mcps?: boolean | string[];         // false | true (all org MCPs) | id allowlist
}

interface PromptMemorizeConfig {
  email?: string;
  websiteUrl?: string;
  recordId?: string;
  type?: 'Contact' | 'Company' | 'User';
  captureToolResults?: boolean;
}

type PromptEvaluateConfig =
  | boolean
  | { criteria?: string; serverSide?: boolean };

interface PromptOutputDefinition {
  name: string;   // matches <output name="..."> markers
}

interface PromptAttachment {
  name?: string;
  mimeType: string;   // image/png|jpeg|gif|webp|svg+xml, application/pdf, text/plain|csv|html|markdown, application/json
  data?: string;      // base64
  url?: string;       // OR public URL — exactly one of data|url
}

interface McpToolSelection {
  mcpId: string;
  enabledTools?: string[];   // allowlist
  disabledTools?: string[];  // denylist
}

interface PromptWebSearchConfig {
  enabled?: boolean;
  maxUsesPerStep?: number;
  allowedDomains?: string[];
  blockedDomains?: string[];
}
```

### Key facts about `instructions`

- It IS on `PromptOptions`. `client.ai.prompt({ instructions: [...] })` is fully supported.
- Each element is `string` (treated as `{ prompt: <string>, maxSteps: 1 }`) OR `{ prompt: string; maxSteps?: number }`.
- Mutually exclusive with `prompt`. Pass one or the other, not both.
- In multi-step mode, `attachments` are sent with the first instruction only.

---

## `client.ai.promptStream(options: PromptStreamOptions)`

Same schema as `PromptOptions` minus `stream` (forced true), plus stream controls:

```ts
interface PromptStreamOptions extends Omit<PromptOptions, 'stream'> {
  streamTimeout?: number;   // overall stream timeout in ms (default 120000)
  signal?: AbortSignal;
}
```

Yields SSE events: `text`, `output`, `step_complete`, `done`, `error`.

---

## When to pick which method

| Need | Use | Why |
|------|-----|-----|
| One mental act (classify, extract, score, summarize) | `ai.prompt({ prompt })` | Single round-trip, lowest cost |
| plan → act → qa → fix in one round-trip | `ai.prompt({ instructions: [...] })` | Server-side multi-step, no tool loop |
| Tools, web search, or work that must survive a dropped connection | `agent.run()` (`POST /api/v1.1/agent/runs`) | Durable server-side run; see [agent-runs.md](agent-runs.md) |
| Real-time streaming UX | `ai.promptStream()` | SSE chunks for live display |

`client.chat.completions` and `client.responses.create()` are gone: the server routes were removed. `ai.prompt({ instructions })` runs the steps server-side with no client callbacks; outputs, evaluation and memorize are all server-side.

---

## Common gotchas

1. **`instructions` vs `prompt`**: pass exactly one. Both populated → 400 validation_error.
2. **BYOK vs tier**: pass `openrouterApiKey + model + provider` (BYOK, time-billed) OR `tier` (managed, credit-billed). Don't mix.
3. **`outputs[].name`** must match `<output name="X">…</output>` markers in the LLM response. Not a Zod schema — extraction is XML-tag based.
4. **`memorize`** requires at least one identifier (`email`, `websiteUrl`, or `recordId`).
5. **`webSearch: true`** requires a model that supports native web search — otherwise 400 `web_search_unsupported`.
