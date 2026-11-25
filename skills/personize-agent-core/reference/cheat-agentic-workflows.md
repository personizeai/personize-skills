# Agentic Workflow Patterns

`client.ai.prompt()` is **dual-mode**: pass `prompt` (single shot) OR `instructions` (multi-step). The two modes are mutually exclusive but use the same SDK method.

| Mode | When | Key Params |
|------|------|------------|
| `ai.prompt` (single) | One mental act: classify, extract, score, summarize | `prompt`, `context`, `outputs`, `evaluate`, `memorize`, `tier`, `mcpTools`, `attachments` |
| `ai.prompt` (multi-step) | plan → act → qa → fix in one round-trip, no client tools needed | `instructions: Array<string \| { prompt, maxSteps? }>`, `outputs`, `evaluate`, `memorize`, `tier`, `mcpTools` |
| `agent.run` | Durable multi-step run with tools, web search, typed outputs (managed cloud, own model key); see `agent-runs.md` in `personize-reference` | `instructions`, `input`, `tools`, `personize` (`record`, `outputs`, `limits`, `idempotencyKey`) |
| `ai.promptStream` | Real-time streaming UX | Same as `ai.prompt` + `streamTimeout`, `signal`; emits SSE: text/output/step_complete/done/error |

`responses.create` and `chat.completions` are removed (no server route). Use `ai.prompt` for plain or server-side multi-step generation and `agent.run` for tools and durable runs.

Batch-apply: for each record `{ recall → govern → ai.prompt({ instructions }) → save }`
Evaluation: `ai.prompt({ evaluate: { criteria: [...], serverSide: true } })`
Auto-save: `ai.prompt({ memorize: { email | websiteUrl | recordId } })` stores outputs to memory
Durable run: `agent.run({ ... })` returns a `runId`; poll with `agent.waitFor(runId)` or `agent_run_get`

ai.prompt modes (0.10.x):
- `governedMemory: true` + `agentTools: false` → cheap default. Auto recall + auto guidelines + LLM, no tools. ~5x fewer input tokens.
- `governedMemory: true` + `agentTools: true` → governed retrieve plus full executor tool registry (use when MCPs/tools are needed).
- `webSearch: true | { maxUsesPerStep, allowedDomains, blockedDomains }` → native provider search. `metadata.sources` returned.
- `mcps: true | false | string[]` → opt-in MCP load. Default `false`.

For the literal request schemas (every field, every type), see attachment **`prompt-options-schema.md`** in `personize-reference`. For the SDK method index, see `sdk-methods.md` in the same skill.
