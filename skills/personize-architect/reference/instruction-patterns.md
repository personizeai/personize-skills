# Advanced Multi-Step Instruction Patterns

Companion to architectural design-patterns. These patterns are about authoring the **`instructions[]`** payload of `client.ai.prompt()` (i.e. multi-step prompts inside one round-trip). The same payload shape works on both `/api/v1/prompt` and `/api/v1.1/prompt` — v1.1 is a sibling route that mirrors v1's prompt handler. v1 sunsets 2026-07-15; no payload changes are required.

## Two key vocabulary terms

| Term | Meaning |
|---|---|
| **Instruction** | One element of the `instructions` array — one LLM round-trip. |
| **AI SDK step** | A tool-call round *inside* one instruction. `maxSteps` caps these, not instruction count. |

## Pattern selector

| I need to… | Pattern |
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

## Error-handling tiers

Pick the **lightest** tier that covers the real risk. Don't stack blindly.

| Tier | Mechanism | On failure | Best for |
|---|---|---|---|
| **T1 Hard abort** | `<abort reason='...'>` | Halts chain, skips auto-memorize, returns `success: false, aborted: true` | Identity fails, mandatory data missing, fundamental contradiction |
| **T2 Soft degrade** | `<output name='confidence'>low\|medium\|high</output>` + optional `warnings` | Returns `success: true` with partial outputs; caller routes by confidence | Partial data, ambiguous signal, low-stakes classification |
| **T3 Self-correct** | Audit instruction rewrites violations before emit | Internal correction, success unaffected | Math drift, format slips, brand-voice violations |
| **T4 Blast-radius bound** | `maxSteps`, `mcpTools` allowlist, "retry once then skip" inline rule | Tool failure isolated; run continues | MCP/HTTP flakiness, rate-limit windows |

**Anti-pattern:** using T1 for what should be T2. T1 = run is fundamentally invalid. T2 = run is valid but caller deserves a quality signal.

## Context-wiring rules

| Channel | Use for | Cost | Gotcha |
|---|---|---|---|
| `autoGuidelines: true` | Slow-changing org policy (brand voice, playbook, ICP) | Indexed; retrieved on instruction 1 only | Middle/last instructions inherit via `chatHistory`. If you need the rule in every instruction, wire it explicitly. |
| Explicit `context: '...'` | Exact wording required every instruction (legal, math, schemas) | Full token cost every instruction (but cached across chain) | Use when phrasing must be deterministic — compliance policy, ICP weights, artifact specs. |
| Per-instruction `attachments: []` | Instruction-specific data (a doc to summarize, a CSV to score) | Loaded only for that instruction | Top-level `attachments` does NOT propagate to instruction 2+. Wire per-instruction. |
| Inline in prompt | Tiny one-off rules ("Use formal tone", "Reject < $50k") | Cheap | Anything reusable belongs in a guideline; inline rules lose the audit trail. |

**Rule of thumb:** if a guideline drives a **number** (weights, thresholds, currency formats), wire it explicitly. If it drives a **tone**, SmartContext is fine.

## Instruction-scope gotchas

These fields only apply to specific instructions — the most common authoring mistakes:

| Field | Scope | What bites authors |
|---|---|---|
| `autoRecall` | **instruction 1 only** | Do NOT tell instruction 1 to "recall what we know" — SmartRecall already ran. Describe what to *do* with the already-loaded context. |
| `autoGuidelines` | **instruction 1 only** | Same as autoRecall. Don't tell it to "check the playbook" — SmartContext already ran. |
| `attachments` (top-level) | **instruction 1 only** | Not visible in instruction 2+. Use per-instruction `attachments`. |
| `evaluate` | **last instruction only** | Eval rubric attaches to the last instruction's run. |
| `agentTools` | all instructions | Without `agentTools: true`, tool calls fail silently; model hallucinates results. |
| `mcps` | all instructions | `mcps: true` loads every MCP schema (~5–20K tokens). Use `mcps: ["specific-id"]`. |

## Abort vs. stop-workflow

Critical distinction for checklist-gated patterns:

| | `success` | When | Caller behavior |
|---|---|---|---|
| `<abort>` | `false` | Run is invalid (malformed data, identity unverified) | Log as error |
| Stop-workflow | `true` | Run is valid; pre-conditions correctly failed | Log as clean skip with `gate_log` audit trail |

Conflating these makes analytics treat correct skips as broken runs.

## Quick request template

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

## Pattern detail

### A. Conditional Specialize

Branch on a discriminator (account tier, language, deal stage) in instruction 1; produce a tier-specific artifact in instruction 2.

```
Instruction 1: classify the account: tier=ENTERPRISE|MID|SMB. Emit <output name='tier'>...</output>.
Instruction 2: based on tier, generate the appropriate artifact:
  - ENTERPRISE → multi-page brief with org chart
  - MID → 1-page summary
  - SMB → 3-bullet executive snippet
```

Add a companion output: `artifact_type` so callers can route on shape, not just content.

### B. Multi-Source Reconciliation

Same entity across CRM, web, uploaded doc. Tag each source explicitly; force per-source enumeration in instruction 1.

```
Instruction 1: For each source [CRM, WEB, DOC], extract: name, role, company, last_contact.
              Emit per-source as <source name='CRM'>...</source>.
Instruction 2: Reconcile across sources. If sources contradict on a field, prefer most recent.
              If no source has a required field, emit <abort reason='missing identity'>.
```

### C. Soft Degradation (T2)

When data is partial, return what you can with a quality signal, don't abort.

```
Instruction 1: Score this lead 0-100 on 5 dimensions. For any dimension where data is insufficient,
              score it `null` and add to <output name='warnings'>...</output>.
              Emit <output name='confidence'>low|medium|high</output> based on data coverage.
```

Caller routes: `high` → auto-send; `medium` → human review; `low` → enrichment queue.

### D. Compliance-Gated Generation

Gate compliance at instruction 1, not after generation. Bad drafts shouldn't reach auto-memorize.

```
Instruction 1: Read the compliance policy (context: '...'). Verify the user's request is allowed.
              If not, emit <abort reason='compliance:<rule>'> and STOP.
Instruction 2: Generate the artifact. Apply brand voice from autoGuidelines.
Instruction 3: Audit. If any compliance violation in the draft, rewrite. Then emit output markers.
```

### E. Multi-Recipient Fanout

Generate N variants for N personas (sales lead, technical contact, exec sponsor) on one account. One recall, N variants in one instruction, one consistency audit. Avoid the per-recipient loop (cross-variant contradictions; N× recall cost).

```
Instruction 1: Recall account context once. List the 3 personas with their roles.
Instruction 2: Generate 3 variants in parallel inside one instruction.
              Emit each as <output name='variant_for_<role>'>...</output>.
Instruction 3: Audit cross-variant consistency. If any contradict on facts, rewrite.
```

### F. Tool-Bounded Research

For current-events research, require 3+ sources with `webSearch: true` and `maxSteps: 6..10`. Force source enumeration before claims.

```
Instruction 1: Search for [topic]. List sources with publish dates and URLs.
              If fewer than 3 distinct sources, emit <output name='confidence'>low</output>.
Instruction 2: For each claim, cite at least 2 sources. Reject single-source claims.
Instruction 3: Synthesize. Emit citations inline.
```

### G. Few-Shot Calibrated Classification

For classification with adjacent labels (e.g. interested / curious / lukewarm), include examples with WHY — each: INPUT + CLASS + WHY (distinguishes adjacent classes).

```
Examples:
- INPUT: "Let's talk pricing" → CLASS: interested → WHY: explicit ask, not just curiosity
- INPUT: "Tell me more" → CLASS: curious → WHY: open question, no commitment signal
- INPUT: "Maybe later" → CLASS: lukewarm → WHY: deferral, weak commitment signal
```

Confidence as 3-tier (`high|medium|low`), not 0..100 — false precision makes routing brittle.

### H. Checklist-Gated Workflow

Gate on N pre-conditions; produce a structured skip (not an error) when conditions fail.

```
Instruction 1: Verify pre-conditions:
  - identity_verified
  - record_freshness_lt_7_days
  - opt_in_present
  Emit <output name='gate_log'> with per-condition result.
Instruction 2: If any condition failed, emit <output name='workflow_status'>stopped</output>
              with `success: true`. Otherwise proceed.
Instruction 3: Execute the workflow.
```

`success: true` with `workflow_status: 'stopped'` is the *correct* outcome when conditions fail — distinct from `<abort>` which signals invalid run.

### I. Self-Reflective Refinement Loop

Iterate draft → critique → revise. Always gate the loop on a `confidence_in_improvement` output to prevent endless shuffling.

```
Instruction 1: Generate initial draft.
Instruction 2: Critique against the rubric. Emit `critique_score` + specific issues.
Instruction 3: Revise. Emit `confidence_in_improvement: high|medium|low`.
              If LOW, terminate with current draft. If HIGH, you may loop once more.
```

Cap rounds via `maxSteps`. Self-reflective loops without a confidence gate shuffle words endlessly with output ≈ v1.

## See also

- [cheat-anti-patterns.md](./cheat-anti-patterns.md) — Prompt-level anti-patterns and fixes
- [design-patterns.md](./design-patterns.md) — Architectural patterns (event-driven ingest, CQRS, workspace coordination, etc.)
- Reference persona's `prompt-options-schema.md` — Full `PromptOptions` interface including `instructions`, `outputs`, `evaluate`, `memorize`, `mcps`, `agentTools`, `autoRecall`, `autoGuidelines`, `webSearch`, `tier`, BYOK
