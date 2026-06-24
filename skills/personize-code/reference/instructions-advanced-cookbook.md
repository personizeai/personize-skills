# Inline Error-Handling Cookbook

Reusable phrases to drop into an instruction's prompt. Each solves a recurring failure mode without bloating the chain.

---

### "Tool failed once, retry; failed twice, skip with note"
> "If a tool call fails, retry once. If it fails again, do not retry; instead append the failure to a `<output name='warnings'>` line and continue with whatever data you already have. Do not abort the run for tool flakiness."

**When to use:** any tool-using instruction (Pattern F, or any pattern extended with `web_search` / MCP enrichment).
**Precondition:** requires `agentTools: true` — without it, the model has no tools to retry; it hallucinates instead.

---

### "Inventory before you reason"
> "Before drawing any conclusion, list what data is present (✓) and what is absent (✗) in plain prose. Do not invent absent data. Continue using only the present data."

**When to use:** scoring, classification, or summarization on sparse records.

---

### "Confidence cliff, not gradient"
> "State your confidence as one of: `high` (every required fact verified from named sources), `medium` (most facts verified, 1–2 inferred), `low` (significant inference). Do not output a confidence between these tiers."

**When to use:** any output the caller routes on. A 0–100 number invites false precision and makes routing logic brittle.

---

### "No new content during rewrite"
> "When rewriting in this instruction, you may only edit, delete, or reorder content already present in the previous instruction's draft. Adding new claims during a rewrite is forbidden; if a fix requires new content, emit `<output name='needs_human'>` describing what is missing."

**When to use:** Pattern 1 instruction 4, Pattern D instruction 3, Pattern I instruction 3.

---

### "No new content during rewrite, but you MAY restructure"
> "Reordering existing content is allowed. Splitting one paragraph into two is allowed. Adding new claims, statistics, or examples is forbidden. If clarity requires new content, flag it in `<output name='needs_human'>`."

**When to use:** when the strict no-new-content rule produces awkward prose.

---

### "Cite or soften"
> "Every claim of the form 'X happened' or 'X is true' must reference the source key from which it came. Claims without a source must be softened to 'reportedly', 'preliminary', or removed."

**When to use:** Pattern F (research), Pattern B (multi-source), any output that ships externally.

---

### "Identity verification gate"
> "Before binding any output to a record property, verify that the entity in your draft matches the entity in the recall context. If `email`, `domain`, or `legal_name` differs from the recall data, emit `<abort reason='identity_drift'>show both versions</abort>`."

**When to use:** any operation with `collectionId` / `propertyId` bindings on identity-shaped outputs.

---

### "Skip the optional honestly"
> "If you do not have enough data to produce `<output name='X'>` with reasonable confidence, omit the entire `<output>` block for that field. Do not write 'unknown', 'N/A', or invent. Skipped optional outputs are a feature, not a failure."

**When to use:** any prompt with optional outputs the caller can tolerate missing.

---

### "Numerical invariant check"
> "Before emitting `score`, recompute it from `factor_breakdown` using the formula above. If your recomputation differs from your earlier value by more than 1, use the recomputation. Do not back-fit the breakdown to your earlier value."

**When to use:** Pattern 2 instruction 3 and any scoring with a known formula.

---

### "Reflect with a confidence-in-improvement gate"
> "When asking the model to reflect on its own output and propose revisions, also require it to estimate `confidence_in_improvement` (low|medium|high). If LOW, terminate the loop and emit the current draft as-is. Iterating further when the model itself does not think it can do better produces word-shuffling, not improvement."

**When to use:** Pattern I, or any audit instruction that may trigger a rewrite. Without this gate, refinement loops fail by entropy.

---

### "Few-shot anchors must include WHY, not just labels"
> "When embedding few-shot examples in a classification or extraction prompt, every example must include the rationale (WHY) that distinguishes it from adjacent classes. INPUT + CLASS without WHY teaches phrasing memorization, not boundary discrimination. Specifically: WHY must explain how to tell THIS class from the most-confusable adjacent class."

**When to use:** Pattern G. Also any classification with adjacent labels that conflate run-to-run.

---

### "Stop-workflow is success; abort is failure"
> "If the workflow validly decided NOT to act because pre-conditions failed, return `success: true` with `workflow_status: 'stopped'` and a structured `stop_reason`. If the run itself was malformed (data integrity broken, identity unverified), use `<abort>`. Do not conflate them; downstream routing depends on the distinction."

**When to use:** Pattern H, or any operation with hard pre-conditions where some valid runs correctly produce no action.
