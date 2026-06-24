# Cost Optimization — The Levers That Move the Bill

How to minimize spend on a Personize integration. This is the *which lever* file; for *the math* (raw-LLM vs. Personize, savings %, inverse simulation), load [`cost-simulator.md`](./cost-simulator.md).

The bill has three components: **platform fee** (flat `$0.003`/recall), **credits** (1/memorize, 1/fast recall, 2/deep recall — guidelines + workspace are free), and **LLM cost** (the model that powers extraction, recall, and generation). Almost every optimization below works by shrinking one of those three. The biggest single win is usually structural: **compact-recall instead of dumping raw context** — that's where most of the savings in the simulator come from.

## The levers, in rough order of impact

### 1. Compaction vs. raw context — the structural win
Personize serves a small ranked payload (~2K tokens) per call instead of the whole corpus. The raw-LLM baseline scales linearly with corpus size; compact recall is fixed. SHOULD design recall to return the *task-relevant* slice, not the entity's full history — because the more context you'd otherwise dump, the more compaction pays off (large-context workloads show ~90% savings; small-context far less). MUST NOT re-feed raw records or N API-call outputs into every prompt when a recall would serve the same signal compacted.

### 2. Tier selection per workload
All tiers cost **1 credit** per item — tier affects extraction *quality*, not price. The cost lever is the **LLM model class** behind the tier (economy / professional / frontier in the simulator). SHOULD match tier to the actual content (see [`cheat-tier-selection.md`](./cheat-tier-selection.md)):
- `basic` for structured / short text — cheapest model, fine for fields.
- `pro` (default) for rich text, notes, emails, transcripts.
- `ultra` only for complex multi-topic content — don't pay frontier rates for a CRM row.

A common waste: picking `ultra` (or a frontier model) for simple lookups. MUST right-size the model to the workload, not the ambition.

### 3. Fast vs. deep recall
**Fast recall = 1 credit. Deep recall = 2.** Deep (recall + SmartContext synthesis) is worth 2× only when the agent needs reasoned, multi-source synthesis. SHOULD default to fast recall for record lookups and use deep only where the synthesis demonstrably improves the output. At high recall volume this is a literal 2× lever on the credit line.

### 4. `upsert` (no extraction) vs. `saveBatch` (extraction)
When you already have the field values, `memory.upsert()` / `memory_upsert` sets properties **directly with no LLM extraction pass** — cheaper and faster than re-deriving them. Reserve `client.memory.saveBatch()` (content → AI extraction) for unstructured content where extraction earns its keep. MUST use `upsert` for CRM-shaped data you already have structured — paying for extraction to re-discover values you already hold is pure waste. (Canonical create/upsert path; see SKILL "Scaling Patterns".)

### 5. Batch vs. per-record
>10 items MUST batch — sequential single calls waste credits *and* risk rate limits. Batch (`saveBatch` for extraction, `upsert` batch for known fields, async for large volumes) amortizes overhead and returns an `eventId` to poll. This is throughput + reliability, not a per-credit discount — but the rate-limit avoidance saves the retries that *do* cost.

### 6. Fleet cost forecasting (records × per-record envelope)
Fleet Dispatch (one bounded subagent per record) makes spend **predictable**: `cost = records × (recall + reason + write) token envelope × tier rate`, not lottery-ticket variance from open-ended agents (see `production-patterns.md`, Fleet Dispatch). SHOULD forecast before any large run and report the number to the human first. The optimization here is twofold: you can *see* the bill before committing, and the per-record envelope is far smaller than one open-ended agent looping the whole set in a bloating context. Pair the forecast with `cost-simulator.md` to compare against dumping raw context per call.

### 7. BYOK to cut LLM cost
With BYOK you pay your LLM provider directly and Personize charges only the platform fee — model the LLM portion at *your* negotiated rate (often cheaper at high volume) and keep `$0.003`/recall (see [`cheat-byok-provider.md`](./cheat-byok-provider.md) and the simulator's "BYOK delta"). Per-function routing is itself a cost lever: put a **cheap model on `memorize`** (high volume) and reserve a premium model for customer-facing `recall`/`generate` where quality matters. SHOULD start BYOK on `memorize` first — highest volume, easiest to evaluate. Embeddings always use the managed model (consistency required), so BYOK can't cut that line.

### 8. Caching and dedup
The write path already compounds two discounts in the cost model: **prompt cache** (~90% of input is the cached system prompt + org schema, billed at 10%) and **batch API** (50% off both input and output) — this is why write cost amortizes to <10% of recall cost even at 10M records. SHOULD route bulk writes through the batch/async path so both discounts apply. Dedup avoids paying to memorize the same content twice; SHOULD dedupe upstream before a large import rather than memorizing duplicates and cleaning up after.

### 9. Free surfaces — use them deliberately
**Guidelines and workspace are free.** `filterByProperty` (symbolic filtering, ordering, aggregation) is a property read, not a recall — use it as the task queue (Multi-Touch Journey, Typed Task Dispatch) and for list/browse instead of spending recall credits. SHOULD push as much routing, gating, and prioritization as possible onto free property filters and governance, reserving paid recall for the semantic "what's relevant?" question that only vectors answer. Governance routing (SmartContext) is free and replaces re-stuffing rules into every prompt.

## Where the bill actually lives
Three patterns from the simulator that should shape the design:
1. **Recall efficiency dominates.** Write cost is a one-time amortization (<10% of recall at any realistic recall rate). Don't over-optimize writes — optimize the recall payload and frequency.
2. **Cheaper tier → smaller savings %.** Economy LLM rates are so low the flat platform fee becomes a meaningful share; frontier tiers show the largest savings from compaction. The more expensive the model, the more compaction pays.
3. **Very low recall rate breaks the model.** If records are recalled <10×/yr, write cost dominates and Personize may not save money — reconsider whether memorize amortization makes sense for that data.

## Cost-optimization checklist

- [ ] **Compaction over raw** — recall returns a ranked slice, not the full corpus; no raw records or N-API-call dumps in prompts.
- [ ] **Tier right-sized** — `basic`/`pro`/`ultra` (and model class) matched to content, not defaulted to the top.
- [ ] **Fast recall by default** — deep (2 credits) only where synthesis demonstrably helps.
- [ ] **`upsert` for known fields** — no extraction pass paid to re-derive structured values.
- [ ] **Batch >10 items** — amortize overhead, avoid rate-limit retries; poll the `eventId`.
- [ ] **Fleet forecast computed** — `records × per-record envelope × rate` reported to the human before any large run.
- [ ] **BYOK evaluated** — cheap model on `memorize`, premium on customer-facing recall; start with `memorize`.
- [ ] **Cache + batch discounts applied** — bulk writes routed through batch/async; duplicates removed upstream.
- [ ] **Free surfaces exploited** — `filterByProperty` for queues/browse, guidelines for routing; recall reserved for semantic relevance.
- [ ] **Recall rate sanity-checked** — entities are recalled often enough (≥~10×/yr) for memorize amortization to pay off.

→ For the dollar figures, savings %, "what can $X/mo buy?", and when to push a different tier: [`cost-simulator.md`](./cost-simulator.md). For runtime billing rates, query live SSM `/personize/{stage}/pricing/rates`.
