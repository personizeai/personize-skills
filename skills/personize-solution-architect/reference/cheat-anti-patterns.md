# Design Anti-Patterns

| Mistake | Why It Fails | Do This Instead |
|---------|-------------|-----------------|
| One mega-collection for everything | No schema focus, poor extraction | Split by entity type |
| Over-collecting properties (50+) | Extraction spreads thin | 10-20 properties per collection |
| Vague property descriptions | Extraction guesses wrong | "Deal budget in USD" not "Budget" |
| Skipping workspace for multi-agent | Agents duplicate work | Add workspace when >1 agent writes |
| All-MUST governance | Over-constrains agents | Balance MUST/SHOULD/MAY |
| No entity type on records | Can't filter or segment | Always set entity type |
| Storing summaries, not raw content | Loses detail for extraction | Store raw, let AI extract |
| No tags on memorization | Can't filter by source | Always tag with source:X |
| Jumping to build without proposing | Wrong architecture, rework | Assess -> propose 2-3 options -> decide |
| Ignoring evaluation after changes | Schema drift, quality drop | Evaluate after every schema change |
| Creating rules/policies as collections | Rules invisible to SmartContext, agents never see them | ICP, playbooks, tone guides, policies = `context_save` (type:'guideline') |
| Describing tool calls instead of executing | Nothing gets created, agent just writes plans | MUST call tools (collection_create, context_save), then verify with list/read |
| Skipping `personize_skill` at bootstrap | Agent doesn't know how platform works, makes fundamental errors | MUST call `personize_skill` before `personize_context` |

## Prompt-level anti-patterns (`instructions[]` authoring)

| Mistake | Why It Fails | Do This Instead |
|---|---|---|
| "Recall what we know" in instruction 1 | Wastes tokens; may trigger redundant tool calls | Skip the preamble. SmartRecall already ran. Describe what to *do* with loaded context. |
| `agentTools` left at default when tools needed | Model hallucinates "I searched and found…" with no actual search | Set `agentTools: true` whenever any instruction needs tools |
| `mcps: true` exploratorily | 5–20K tokens of unused schema overhead per instruction | Use `mcps: ["specific-id"]` for what you actually need |
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
| Tool failure aborts run | Flaky MCP server kills whole batch | "Retry once, then warn" inline rule (T4 blast-radius bound) |
| Confidence as 0..100 | False precision; routing logic gets brittle | 3-tier: `high\|medium\|low` |
| Audit + rewrite fused on long artifacts | Rewrite silently masks audit findings | Split into separate instructions for artifacts > 200 words |
| SmartContext for legal text | Retrieval paraphrases legally-required phrasing | Explicit `context` for compliance, ICP, numerical guidelines |
| Top-level `attachments` for mid-chain data | Middle/last instructions can't see it | Per-instruction `attachments: []` on the instruction that needs it |
| Mid-chain `<output>` markers without explicit prompt instruction | Emitted inconsistently (auto-reminder is last-instruction only) | Write "Emit `<output name='x'>...</output>`" in every middle instruction that needs to emit |
| One operation does plan + draft + audit + ship | Output quality degrades; debugging is impossible | Multi-step — one cognitive job per instruction |
| `required: true` on every output | One un-producible field fails entire request | Mark only true gating outputs required |
| No `metadata.recordId` on record-bound ops | Run journal can't link prompt run to record | Always set `metadata.recordId` for record-bound operations |

See [instruction-patterns.md](./instruction-patterns.md) for the full 9-pattern catalog (Conditional Specialize, Multi-Source Reconciliation, Soft Degradation, Compliance-Gated Generation, Multi-Recipient Fanout, Tool-Bounded Research, Few-Shot Calibrated Classification, Checklist-Gated Workflow, Self-Reflective Refinement Loop), error-handling tiers (T1–T4), context-wiring rules, and instruction-scope gotchas.
