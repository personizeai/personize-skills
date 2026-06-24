# Reference: DESIGN REVIEW & HARDENING

A structured review of a Personize solution design -- a customer's proposed design, or **your own before you PROPOSE or BUILD**. Output: strengths, must-fix issues, and the **questions to ask to improve it**. This is `/code-review` for solution designs.

**When:** after DESIGN, before BUILD/PROPOSE; or whenever someone brings a design ("here's our schema/plan -- is it good?"). MUST self-review your own design with this before presenting it.

**How to run:** walk the lenses below in order. For each, check the design against "what good looks like," flag failures, and surface the hardening question. Score each lens (✓ / ⚠ / ✗), then produce the output (template at the end) -- don't collapse to a single thumbs-up.

## The review lenses

### 1. Entity & boundary
- **Good:** things with identity keys are collections; rules/policies are guidelines; the line between typed property and prose is deliberate.
- **Ask:** "Which fields will you actually filter, aggregate, or govern on? Anything else should be prose/memory, not a typed property." · "Is anything modeled as a collection actually a rule (ICP, tone, send limits)? → guideline." · "What's the stable identity key per entity, and can it change?"
- **Fail signals:** governance modeled as collections (invisible to SmartContext); 30 properties where 8 are ever filtered; raw name strings used as keys. See [`cheat-entity-decision.md`](./cheat-entity-decision.md).

### 2. Extraction quality
- **Good:** every property `description` reads as an extraction instruction; enumerables are `select`/`multi-select`; ≤~20 properties per collection; ~7 well-chosen memories per entity (curation, not capacity).
- **Ask:** "Does each description tell the extractor what to capture, when, and how -- with an example?" · "Which properties have a known value set? Make them `select` so `filterByProperty` is reliable." · "Will all these properties actually get populated, or are you over-collecting?"

### 3. Governance
- **Good:** one concern per guideline; MUST/SHOULD/MAY + rationale; compliance/brand checks **gated before generation**; domain-keyword headers for routing.
- **Ask:** "Is any compliance- or brand-critical output ungoverned, or checked *after* generation instead of gated before?" · "Does each guideline carry one concern, or is it a 2,000-word kitchen sink that competes poorly for the token budget?" · "Will an agent actually retrieve the right guideline -- do the headers carry domain keywords?" See [`governance-authoring.md`](./governance-authoring.md).

### 4. Retrieval economics (compaction vs raw vs RAG)
- **Good:** the design serves a small, ranked, typed payload per call -- not raw rows or a RAG-chunked corpus.
- **Ask:** "What exactly goes into the prompt at runtime -- raw records, N API calls, or a RAG dump? Where does compaction win?" · "Do multiple runs/agents re-derive the same facts about an entity? (→ shared memory + fleet)." · "Do you need exact filters, negation, or aggregation that vector RAG can't do?" See [`memory-as-business-model.md`](./memory-as-business-model.md).

### 5. Write path
- **Good:** structured known values → `upsert`; content needing extraction → `saveBatch`; batch sizing matched to volume.
- **Ask:** "Do you already have the field values (→ `upsert`, no extraction cost) or is this free text (→ `saveBatch`)?" · "Anything still on `memorizeBatch`? It's deprecated toward `upsert`/`saveBatch`."

### 6. Graph
- **Good:** entity-to-entity connections modeled as edges (often auto-inferred from foreign-key-shaped properties), not duplicated across records.
- **Ask:** "Which connections will you traverse ('all contacts at Acme', 'what incident this release caused')? Model those as relations." · "Are edges inferred from properties (`company`, `assigned_to_email`) or do they need explicit seeding?" See [`graph-relations.md`](./graph-relations.md).

### 7. Scale & cost
- **Good:** many-record processing uses fleet dispatch (one bounded subagent per record) with a cost forecast; tier matched to workload.
- **Ask:** "At N records, is this one looping agent (context bloat, drift, unpredictable cost) or fleet dispatch?" · "What's the forecast = records × per-record envelope × tier -- did you compute it before running?" · "Is the tier right -- basic for structured, pro default, ultra only for complex?" See [`cost-optimization.md`](./cost-optimization.md).

### 8. Coordination
- **Good:** multi-agent work shares a workspace with `status`; arrays are append-only; an approval/HITL gate exists where outputs are high-impact.
- **Ask:** "How do agents avoid colliding -- is there a claim (`assignee`/`Status`) before acting?" · "Is there a review-before-send gate for anything customer-facing?" · "Are Notes/Updates/Tasks append-only, or will a write clobber history?"

### 9. Deployment & compliance
- **Ask:** "Any data-residency, security, or control requirement that points to private/BYOC over multi-tenant SaaS?" · "PII handling, retention, deletion rights -- covered by governance + the privacy surface?" See [`deployment-mode.md`](./deployment-mode.md).

### 10. Evaluation
- **Good:** there's a plan to verify extraction accuracy, recall quality, and governance routing **before go-live**.
- **Ask:** "How will you know extraction is good -- what's the accuracy target and the test set?" · "How will you catch recall returning the wrong thing?" See [`evaluating-solutions.md`](./evaluating-solutions.md).

## Questions to ask to improve a design (the consolidated checklist)

Run these top-to-bottom on any design; each maps to a lens above:

1. What will you filter / aggregate / govern on? (boundary → property vs prose)
2. Is any rule modeled as data, or any entity as a rule? (collections vs guidelines)
3. Does every property description instruct the extractor, with examples?
4. Is compliance/brand gated BEFORE generation, not after?
5. What goes into the prompt at runtime -- raw, RAG, or compact recall?
6. Structured (`upsert`) or content (`saveBatch`) on the write path?
7. Which relationships will you traverse? (graph)
8. One looping agent or fleet dispatch at scale -- and what's the cost forecast?
9. How do multiple agents coordinate without colliding, and where's the human gate?
10. SaaS or private/BYOC -- any residency/compliance driver?
11. How will you evaluate extraction + recall quality before go-live?
12. What does this design trade away, and were 2-3 options presented?

## Output template

```
# Design Review -- [project]
Verdict: [Ship / Harden first / Rethink]
Strengths: [2-4 specific]
MUST-FIX (blocks build): [issue → fix, tagged by lens]
SHOULD-IMPROVE: [issue → fix]
Open questions for the customer/designer: [the hardening questions needing their input]
Per-lens scores: entity · extraction · governance · retrieval · write · graph · scale · coordination · deployment · eval  [✓ / ⚠ / ✗]
```

## Self-review mode

Before you PROPOSE, run this on your *own* design. An architect who hasn't tried to break their own design hasn't finished it. If you can't answer a hardening question, that's a discovery gap -- go back to [`discover.md`](./discover.md).

→ Anti-pattern catalog: [`cheat-anti-patterns.md`](./cheat-anti-patterns.md). Prompt-chain review: [`instruction-patterns.md`](./instruction-patterns.md).
