# Reference: EVALUATING SOLUTIONS

How to know a Personize solution actually works -- before you ship it, and as you tune it. This is the measurement discipline behind the "Evaluation" lens of [`design-review.md`](./design-review.md): turn "the schema looks right" into "extraction scores 0.91 on a held-out set."

## Lead With This -- Build Evals First

Both Anthropic and OpenAI converge on the same discipline: **write the evals before you build the solution.** An eval is an executable definition of "good." Without one, you are tuning property descriptions and guidelines by vibes, and you will never know when to stop.

The order is deliberate:

1. **Define "good"** as a set of scenarios with expected outputs (the eval set).
2. **Run a baseline FIRST** -- with no skill, no tuned schema, no governance design -- to see where the gaps actually are. The baseline is the gap analysis. Concretely: memorize a sample record into a *bare* collection (default property descriptions, no guidelines) and run the four evals. The properties that score low and the tasks that route to nothing are your build spec.
3. **Build to pass.** Every schema, description, and guideline change is now a hypothesis you can test against the eval.
4. **Re-run after every change.** A change that doesn't move the eval is noise; a change that regresses it is a bug.

MUST establish the baseline before building -- because you cannot claim a design improved extraction if you never measured the design's absence. SHOULD keep the eval set in version control next to the schema it tests, so the eval evolves with the design and a regression is caught in review, not in production.

## The Four Eval Types

A Personize solution has four distinct things to measure. Each maps to one capability and one call. MUST cover all four that the solution actually uses -- a solution that only memorizes needs (1)+(2); one that governs generation needs (3); one that does a job end-to-end needs (4).

| # | Eval | What it answers | The call | Pass criteria |
|---|---|---|---|---|
| 1 | **Extraction accuracy** | Did the schema pull the right typed values out of the content? | `client.evaluate.memorizationAccuracy({ collectionId, input, skipStorage: true })` | Extracted `propertyValues` match expected per-property at/above your threshold (e.g. ≥0.85), confidence not spuriously high on wrong values |
| 2 | **Recall quality / precision** | Does a query return the right records and not the wrong ones? | `client.memory.smartRecall({ query, mode })` / `memory.search()` / MCP `retrieve_unified` | Expected record(s) appear in top-K; precision (relevant ÷ returned) at/above target; no false positives crowding the answer |
| 3 | **Governance routing** | Does a task surface the *right* guideline -- and not the wrong one? | `ai_smart_guidelines({ message })` (SDK `client.ai.smartGuidelines`) / `context_retrieve` | The expected guideline name is in `selection`; competing-but-wrong guidelines are absent |
| 4 | **End-to-end** | Does the solution do the actual job? | Run the real pipeline (recall → govern → act), score the output | Output meets the task rubric (e.g. email cites a real fact from memory AND obeys the brand guideline) |

**(1) Extraction accuracy.** This eval applies only to the content → AI-extraction write path (`memory.save` / `saveBatch`). A `memory.upsert` write sets known field values directly with no extraction, so there is nothing to score there -- the value either was set or wasn't.

`memorizationAccuracy` is a three-phase eval (extract → analyze → suggest schema fixes) and is the canonical extraction signal. Pass `skipStorage: true` so a test run never pollutes real memory. Read `phases[].extraction.propertyValues[]` -- each carries `propertyName`, `value`, and `confidence` -- and diff against expected. The third phase returns an `optimizedCollection` with `wasModified` + `changeReason` per property: that is the engine telling you which descriptions are weak, in its own words.

Watch the `confidence` field, not just the value: a wrong value at high confidence is a worse signal than a right value at low confidence, because it means the description is actively misleading the extractor.

**(2) Recall quality.** Run the query you expect users/agents to ask, then check the expected record is in the returned set. Measure precision (relevant ÷ returned), not just "did it return something" -- a query that returns the right record buried under nine wrong ones is a failing query.

`fast` mode (1 credit) is fine for presence checks; `deep` (2 credits) when you're scoring the synthesized answer, not just the result set. Scope by `email` / `recordId` / `websiteUrl` when the test is "what do we know about THIS entity," and leave scope off when the test is "does the right entity surface from an open query." Test both: scoped recall validates the entity has the data; open recall validates it's findable.

**(3) Governance routing.** The failure mode is silent: a guideline that never routes is invisible to every agent that needs it, and nothing errors. Send a representative task `message` and assert the expected guideline is in `selection`. Also assert the *absence* of a plausible-but-wrong guideline -- routing precision matters as much as recall, because a competing guideline that wins the slot starves the right one of the token budget. If routing misses, the lever is the guideline's header keywords and its one-concern scope (see [`design-review.md`](./design-review.md), Governance lens), not the routing call.

**(4) End-to-end.** The other three can all pass while the solution still fails the job. Run the full loop -- recall context, govern with `ai_smart_guidelines`, act, store -- on a real scenario and score the artifact against a rubric. This is where you catch "extraction is perfect and the right guideline routed, but the email still sounds generic." Score the output for both grounding (does it cite a real fact from memory?) and compliance (does it obey the routed guideline?); a pass requires both. This is the eval that maps to the actual business outcome, so it is the one a stakeholder cares about -- the other three are diagnostics that explain *why* this one passes or fails.

## The Method

- **≥3 realistic scenarios, grounded in the customer's real tasks.** Not toy inputs -- use redacted real records, real queries the team actually runs, real guideline-triggering tasks. Three is the floor; one scenario tells you nothing about variance.
- **Baseline before build.** Run the scenarios with no design in place. The gaps you find ARE the build spec.
- **Measure, then iterate.** Change one lever, re-run, compare. Attribute the delta to the change.
- **Hold out a set.** Tune on one set of scenarios, validate on a *held-out* set you never tuned against -- otherwise you overfit the descriptions to the examples and accuracy collapses on real traffic.
- **Analyze what the agent OMITS, not just what it includes.** A false negative (the property that should have extracted and didn't, the record that should have recalled and didn't, the guideline that should have routed and was silent) is usually worse than a false positive and far easier to miss. Always diff expected-minus-actual, not just actual-minus-expected.

SHOULD write scenarios as JSON (`{name, type, input, expected}`) so the same set drives a script and a CI gate. → `personize-enabler` ships a runnable harness, `scripts/script-eval-solution.ts`, that loads exactly this shape.

### Authoring The Scenarios

A scenario is one `input` plus the `expected` outcome for one eval type:

- **extraction** -- `input` is sample content the solution will ingest; `expected.properties` is the map of property name → value you should get out. Pick inputs that exercise the *hard* properties (the inferred ones, the ambiguous spans), not just the obvious ones.
- **recall** -- `input` is the natural-language query a user/agent will ask; `expected` names the record that must surface (by `email`/`recordId`/`websiteUrl`). Include at least one query phrased the way a human actually asks, not the way the data is stored.
- **governance** -- `input` is a representative task message; `expected.guideline` is the guideline name that must route. Include one "near-miss" task that should route to a *different* guideline, so you catch over-eager routing.

SHOULD include at least one deliberately adversarial scenario per type -- a record with a missing value, a query with a synonym, a task that two guidelines could plausibly claim. The easy scenarios tell you the solution works; the hard ones tell you where it breaks.

## Metrics To Track

No single metric tells the whole story: accuracy can rise while cost and latency quietly blow the budget, and a passing E2E rate can hide one property that fails every time. Track the spread, and read them together.

| Metric | Why it matters | Where it comes from |
|---|---|---|
| **Accuracy** | Did extraction get the value right? | `propertyValues[].value` vs expected |
| **Recall precision** | Relevant ÷ returned -- are results clean? | top-K of `smartRecall`/`search` |
| **Tool-call count** | Fewer calls = simpler, cheaper, less drift | count per scenario |
| **Tokens** | Context cost per run | response usage |
| **Credits / cost** | Real money: 1/memorize, 1/fast recall, 2/deep recall, governance free | `creditsCharged` / `analytics.credits()` |
| **Errors** | Rate-limits, validation, sparse-context skips | caught exceptions per run |
| **Latency** | fast (~500ms) vs deep (~10-20s) recall, etc. | wall-clock per call |

SHOULD record all seven per run so a "fix" that improves accuracy while doubling credits is visible as the trade-off it is.

## The Evaluation Loop

The loop that converges a weak schema into a good one:

```
evaluate  ->  find weak property descriptions  ->  adjust the description
   ^                                                      |
   |                                                      v
re-evaluate  <-------------------------  re-extract (memorizationAccuracy)
```

1. **Evaluate** the scenarios; record per-property accuracy.
2. **Find the weak link** -- the property scoring lowest, or the one `optimizedCollection.changeReason` flags as modified.
3. **Adjust** that property's `description` (the description IS the extraction prompt -- see [`schema-design-guide.md`](./schema-design-guide.md)). Change ONE thing.
4. **Re-extract** via `memorizationAccuracy` and **re-evaluate** against the same set.
5. Stop when you hit the threshold on the held-out set.

MUST define the accuracy threshold BEFORE starting the loop -- because without a target, optimization never terminates; you just keep fiddling. A threshold ("Company and Title must hit ≥0.9; Notes is best-effort") turns an open-ended tuning session into a finite task. SHOULD change one lever per iteration so each delta is attributable.

**Worked example.** Baseline run: `Budget` scores 0.4 -- the extractor keeps returning `null` because the description just says "Budget." You adjust to "Annual deal budget in USD, extracted from pricing or contract discussions; e.g. '$120k ARR' -> 120000." Re-extract: `Budget` jumps to 0.9. You did NOT touch `Company` (already 1.0) -- one lever, attributable delta. If accuracy were still low after a strong description, the next lever is the tier (basic → pro → ultra for harder content), then the input itself (is the value actually present?). Reorder properties or split an overloaded one only after descriptions and tier are exhausted.

## When To Run Each Eval

- **After every schema change** -- run (1). Descriptions directly drive extraction; a one-word edit can swing accuracy.
- **After adding/renaming a collection or relation** -- run (2). Recall scope shifts.
- **After adding/editing guidelines** -- run (3). Routing is sensitive to header keywords and one-concern discipline.
- **Before go-live** -- run (4) on the held-out set. This is the gate; treat a failing E2E eval the way you treat a failing test.

This is the measurement half of the **TEST** phase of the project lifecycle (UNDERSTAND → PLAN → BUILD → TEST → OPERATE → EVOLVE). The design-review walk is the qualitative gate; this eval suite is the quantitative one. MUST NOT declare a solution production-ready on a green review alone -- a design can read well and still extract badly. Both gates, then go-live.

Set the threshold **per property and per eval**, not as one global number -- governance-critical and filter-on properties (the ones agents branch on) MUST hit a high bar; best-effort prose properties MAY sit lower. A single org-wide threshold either blocks go-live on a field nobody filters or waves through a field that drives a compliance decision. In EVOLVE, re-run the suite whenever real traffic reveals a gap the scenarios missed, and fold that case back into the held-out set.

## Common Failure Modes The Evals Catch

| Symptom in the eval | Likely cause | First lever |
|---|---|---|
| Property extracts `null` / omitted | Description too vague; value not actually in the input | Rewrite description with an example; confirm the value is present |
| Wrong value at high confidence | Description points the extractor at the wrong span | Narrow the description; add a counter-example |
| Right record buried below wrong ones (low precision) | Query too broad, or near-duplicate records | Scope by identity key; tighten the schema's distinguishing properties |
| Recall returns nothing for a known entity | Wrong scope key, or the fact was never written | Check the write path ran; verify `email`/`recordId` matches |
| Expected guideline absent from `selection` | Weak header keywords; guideline too broad | Add domain keywords to the header; split into one concern |
| Wrong guideline wins the slot | Two guidelines overlap in concern | Merge or sharpen the overlapping pair |
| All three pass, E2E output still poor | Prompt isn't using the recalled context/guidelines | Fix the act step's wiring, not the data layer |

## Cross-References

- [`design-review.md`](./design-review.md) -- the qualitative review; this doc is its quantitative "Evaluation" lens.
- [`schema-design-guide.md`](./schema-design-guide.md) -- how to write the property descriptions you'll be tuning in the loop.
- [`cost-simulator.md`](./cost-simulator.md) -- forecast credits/cost before you run evals at volume.
