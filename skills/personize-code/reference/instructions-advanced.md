# Advanced Multi-Step Instructions — Reference

> **API surface:** The `instructions[]` payload below is accepted by the prompt orchestration endpoint and works **identically on both `/api/v1/prompt` and `/api/v1.1/prompt`** — v1.1 is a sibling route that mirrors v1 (`src/modules/api/api.v1_1.router.ts` mounts the same `promptController.promptHandler`). v1 is being deprecated on **2026-07-15**; new code should call v1.1, but no payload changes are required. The SDK helper `client.ai.prompt({ instructions, ... })` currently posts to `/api/v1/prompt` — when the SDK migrates, your prompt shapes don't change.
>
> **Tested against:** `@personize/sdk@0.12.0` / `@personize/cli@0.5.0`.

Companion to the canonical five patterns. Covers the shapes teams keep reaching for in production: graceful degradation, conditional specialization, multi-source reconciliation, compliance gating, personalization fanout, and self-refinement.

> Full code examples (BAD/GOOD) for every pattern live in [instructions-advanced-patterns.md](./instructions-advanced-patterns.md).
> Reusable inline phrases live in [instructions-advanced-cookbook.md](./instructions-advanced-cookbook.md).

---

## Quick Pattern Selector

| I need to… | Use Pattern |
|---|---|
| Branch on account tier (enterprise/mid-market/SMB), each needs a different artifact | **A. Conditional Specialize** |
| Reconcile the same entity across CRM, web scrape, and an uploaded doc | **B. Multi-Source Reconciliation** |
| Score or classify when data is partial — abort wastes good signal | **C. Soft Degradation** |
| Generate outreach that must pass compliance/legal/brand before memorize writes it | **D. Compliance-Gated Generation** |
| Write N personalized variants for different personas on the same account | **E. Multi-Recipient Fanout** |
| Research current events and verify claims across 3+ sources before trusting them | **F. Tool-Bounded Research** |
| Classify replies where adjacent labels drift run-to-run | **G. Few-Shot Calibrated Classification** |
| Gate a workflow on N pre-conditions and produce a structured skip (not an error) | **H. Checklist-Gated Workflow** |
| Iteratively improve a draft until it scores above a quality rubric | **I. Self-Reflective Refinement Loop** |

---

## Two Key Vocabulary Terms

| Term | Meaning |
|---|---|
| **Instruction** | One element of the `instructions` array — one LLM round-trip. |
| **AI SDK step** | A tool-call round *inside* one instruction. `maxSteps` caps these, not instruction count. |

---

## Error-Handling Tiers

Pick the **lightest** tier that covers the real risk. Don't stack blindly.

| Tier | Mechanism | On failure | Best for |
|---|---|---|---|
| **T1 Hard abort** | `<abort reason='...'>` | Halts chain, skips auto-memorize, returns `success: false, aborted: true` | Identity fails, mandatory data missing, fundamental contradiction |
| **T2 Soft degrade** | `<output name='confidence'>low\|medium\|high</output>` + optional `warnings` | Returns `success: true` with partial outputs; caller routes by confidence | Partial data, ambiguous signal, low-stakes classification |
| **T3 Self-correct** | Audit instruction rewrites violations before emit | Internal correction, success unaffected | Math drift, format slips, brand-voice violations |
| **T4 Blast-radius bound** | `maxSteps`, `mcpTools` allowlist, "retry once then skip" inline rule | Tool failure isolated; run continues | MCP/HTTP flakiness, rate-limit windows |

**Anti-pattern:** using T1 for what should be T2. T1 = run is fundamentally invalid. T2 = run is valid but caller deserves a quality signal.

---

## Context-Wiring Rules

| Channel | Use for | Cost | Gotcha |
|---|---|---|---|
| `autoGuidelines: true` | Slow-changing org policy (brand voice, playbook, ICP) | Indexed; retrieved on instruction 1 only | Middle/last instructions inherit via `chatHistory`. If you need the rule in every instruction, wire it explicitly. |
| Explicit `context: '...'` | Exact wording required every instruction (legal, math, schemas) | Full token cost every instruction (but cached across chain) | Use when phrasing must be deterministic — compliance policy, ICP weights, artifact specs. |
| Per-instruction `attachments: []` | Instruction-specific data (a doc to summarize, a CSV to score) | Loaded only for that instruction | Top-level `attachments` does NOT propagate to instruction 2+. Wire per-instruction. |
| Inline in prompt | Tiny one-off rules ("Use formal tone", "Reject < $50k") | Cheap | Anything reusable belongs in a guideline; inline rules lose the audit trail. |

**Rule of thumb:** if a guideline drives a **number** (weights, thresholds, currency formats), wire it explicitly. If it drives a **tone**, SmartContext is fine.

---

## Instruction-Scope Gotchas

These fields only apply to specific instructions — the most common authoring mistakes:

| Field | Scope | What bites authors |
|---|---|---|
| `autoRecall` | **instruction 1 only** | Do NOT tell instruction 1 to "recall what we know" — SmartRecall already ran. Describe what to *do* with the already-loaded context. |
| `autoGuidelines` | **instruction 1 only** | Same as autoRecall. Don't tell it to "check the playbook" — SmartContext already ran. |
| `attachments` (top-level) | **instruction 1 only** | Not visible in instruction 2+. Use per-instruction `attachments`. |
| `evaluate` | **last instruction only** | Eval rubric attaches to the last instruction's run. |
| `agentTools` | all instructions | Without `agentTools: true`, tool calls fail silently; model hallucinates results. |
| `mcps` | all instructions | `mcps: true` loads every MCP schema (~5–20K tokens). Use `mcps: ["specific-id"]`. |

---

## Abort vs. Stop-Workflow

Critical distinction for checklist-gated patterns:

| | `success` | When | Caller behavior |
|---|---|---|---|
| `<abort>` | `false` | Run is invalid (malformed data, identity unverified) | Log as error |
| Stop-workflow | `true` | Run is valid; pre-conditions correctly failed | Log as clean skip with `gate_log` audit trail |

Conflating these makes analytics treat correct skips as broken runs.

---

## Quick Request Template

```json
{
  "instructions": [
    "Instruction 1: gather facts. Use tools. Don't emit output markers yet.",
    "Instruction 2: reason. If you cannot produce a required output, emit <abort reason='...'>...</abort> instead.",
    "Instruction 3: synthesize and emit the output markers."
  ],
  "outputs": [
    { "name": "must_have", "required": true, "collectionId": "...", "propertyId": "..." },
    { "name": "nice_to_have" }
  ],
  "memorize": { "email": "...", "type": "Contact" },
  "stream": false,
  "tier": "pro",
  "evaluate": false
}
```

---

## Anti-Pattern Catalog

| Anti-pattern | Symptom | Fix |
|---|---|---|
| "Recall what we know" in instruction 1 | Wastes tokens; may trigger redundant tool calls | Skip the preamble. SmartRecall already ran. |
| `agentTools` left at default when tools needed | Model hallucinates "I searched and found…" with no actual search | Set `agentTools: true` whenever any instruction needs tools |
| `mcps: true` exploratorily | 5–20K tokens of unused schema overhead per instruction | `mcps: ["specific-id"]` for what you actually need |
| Bumping `tier: 'ultra'` to fix bad output | Wasted credits on a prompt-quality problem | Fix the prompt first (split instructions, add audit) |
| Self-reflective loop with no `confidence_in_improvement` gate | Loop shuffles words endlessly; output ≈ v1 | Require `confidence_in_improvement`; terminate on LOW |
| Conflating stop-workflow with abort | Correct skips logged as broken runs | Stop-workflow → `success: true` + `workflow_status: 'stopped'`. Abort → malformed data only |
| Few-shot examples without WHY rationale | Model memorizes phrasing, drifts on novel inputs | Each example: INPUT + CLASS + WHY (distinguishes adjacent classes) |
| Tool loops without `maxSteps` | One instruction loops 30+ tool calls | `maxSteps: 5..8` per tool-calling instruction |
| Abort threshold = "thin data" | Operations fail when partial output would be useful | Use T2 soft-degrade with `confidence` output |
| One generic `artifact` output | Caller cannot route on shape | Add `artifact_type` companion output |
| Compliance check after generation | Non-compliant draft lands in auto-memorize | Gate at instruction 1 (Pattern D) |
| Multi-source data without source keys | Model picks one silently, no audit trail | Tag each source; force per-source enumeration in instruction 1 |
| Per-recipient loop | Cross-variant contradictions; N× recall cost | Fanout: one recall, N variants, one consistency audit (Pattern E) |
| Tool failure aborts run | Flaky MCP server kills whole batch | "Retry once, then warn" inline rule (T4) |
| Confidence as 0..100 | False precision; routing logic gets brittle | 3-tier: `high\|medium\|low` |
| Audit + rewrite fused on long artifacts | Rewrite silently masks audit findings | Split into separate instructions for artifacts > 200 words |
| SmartContext for legal text | Retrieval paraphrases legally-required phrasing | Explicit `context` for compliance, ICP, numerical guidelines |
| Top-level `attachments` for mid-chain data | Middle/last instructions can't see it | Per-instruction `attachments: []` on the instruction that needs it |
| Mid-chain `<output>` markers without explicit prompt instruction | Emitted inconsistently (auto-reminder is last-instruction only) | Write "Emit `<output name='x'>...</output>`" in every middle instruction that needs to emit |
| One operation does plan + draft + audit + ship | Output quality degrades; debugging is impossible | Multi-step — one cognitive job per instruction |
| `required: true` on every output | One un-producible field fails entire request | Mark only true gating outputs required |
| No `metadata.recordId` on record-bound ops | Run journal can't link prompt run to record | Always set `metadata.recordId` for record-bound operations |

---

## See Also

- [instructions-advanced-patterns.md](./instructions-advanced-patterns.md) — Full BAD/GOOD examples for all 9 patterns
- [instructions-advanced-cookbook.md](./instructions-advanced-cookbook.md) — Reusable inline error-handling phrases
- `personize-sdk-reference.md` — SDK methods, flag reference (`agentTools`, `mcps`, `webSearch`, `evaluate`, `tier`, BYOK)
