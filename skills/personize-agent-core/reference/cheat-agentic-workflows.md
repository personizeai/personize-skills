# Agentic Workflow Patterns

`client.ai.prompt()` is **dual-mode**: pass `prompt` (single shot) OR `instructions` (multi-step). The two modes are mutually exclusive but use the same SDK method.

| Mode | When | Key Params |
|------|------|------------|
| `ai.prompt` (single) | One mental act: classify, extract, score, summarize | `prompt`, `context`, `outputs`, `evaluate`, `memorize`, `tier`, `mcpTools`, `attachments` |
| `ai.prompt` (multi-step) | plan → act → qa → fix in one round-trip, no client tools needed | `instructions: Array<string \| { prompt, maxSteps? }>`, `outputs`, `evaluate`, `memorize`, `tier`, `mcpTools` |
| `responses.create` | Multi-step + client-side tool loop (file I/O, custom APIs, > 20 rounds) | `steps`, `tools` (with `execute()` callbacks), `personize`, `system_prompt` |
| `chat.completions` | OpenAI SDK drop-in replacement | `messages`, `model`, `tools`, `temperature` |
| `ai.promptStream` | Real-time streaming UX | Same as `ai.prompt` + `streamTimeout`, `signal`; emits SSE: text/output/step_complete/done/error |

**`instructions` is on BOTH `ai.prompt` and `responses.create`.** Older versions of this cheat sheet attributed it to `responses.create` only — that was wrong.

Batch-apply: for each record `{ recall → govern → ai.prompt({ instructions }) → memorize }`
Evaluation: `ai.prompt({ evaluate: { criteria: [...], serverSide: true } })`
Auto-save: `ai.prompt({ memorize: { email | websiteUrl | recordId } })` stores outputs to memory
Tool loop: `responses.create` auto-executes client `execute()` functions up to 20 rounds

ai.prompt modes (0.10.x):
- `governedMemory: true` + `agentTools: false` → cheap default. Auto recall + auto guidelines + LLM, no tools. ~5x fewer input tokens.
- `governedMemory: true` + `agentTools: true` → governed retrieve plus full executor tool registry (use when MCPs/tools are needed).
- `webSearch: true | { maxUsesPerStep, allowedDomains, blockedDomains }` → native provider search. `metadata.sources` returned.
- `mcps: true | false | string[]` → opt-in MCP load. Default `false`.

For the literal request schemas (every field, every type), see attachment **`prompt-options-schema.md`** in `personize-reference`. For the SDK method index, see `sdk-methods.md` in the same skill.
