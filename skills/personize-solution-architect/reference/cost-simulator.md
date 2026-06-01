# Cost & Savings Simulator

Estimate the monthly LLM bill with vs. without Personize. Mirrors the [savings calculator](https://personize.ai/pricing/api) on the website — same formulas, same Bedrock-region pricing (us-east-1, April 2026).

Use when a user asks "what will this cost?", "is it worth it?", "should I pick economy or professional tier?", or "how much do I save?". The calculator is text-based: collect inputs in conversation, plug into the formulas below, present the comparison.

> **Reminder:** these numbers are LLM-cost-only — they don't include the platform fee, support tier, BYOC infrastructure, or storage. The platform fee is a flat per-recall charge (`$0.003`) added in the Personize-cost line. For the *platform* pricing tiers (Free / Pro / Enterprise / BYOC), see the public pricing page. This simulator is about whether Personize's compact-recall pattern saves you LLM money vs. dumping the corpus into every call.

## Inputs to collect from the user

| Input | What it means | Typical range |
|---|---|---|
| **Records** | Count of entities (contacts + companies + deals) | 10K (pilot) → 10M (Tier-1 carrier) |
| **Recalls per record per year** | How often agents query/use the record annually | 10 (monthly) → 1,000 (AI-first / real-time) |
| **Context profile** | Token budget per agent call **without** Personize (raw-LLM baseline) | small / medium / large |
| **LLM tier** | Which model class powers the agent | economy / professional / frontier |
| **Optional: monthly budget** | Used for the inverse simulation — "what can $X/mo buy?" | — |

## Model tier rates (Bedrock April 2026, us-east-1, USD per 1M tokens)

| Tier | Model class | Input rate | Output rate |
|---|---|---:|---:|
| Economy | Bedrock Nova Lite — workhorse | $0.06 | $0.24 |
| Professional | Bedrock Nova Pro — balanced quality | $0.80 | $3.20 |
| Frontier | Claude Sonnet 4 — frontier reasoning | $3.00 | $15.00 |

## Context profiles (raw-LLM baseline)

These are the token budgets agents send WITHOUT a memory layer — the corpus dumped into the prompt.

| Profile | Input tokens | Output tokens | Typical use |
|---|---:|---:|---|
| Small | 20,000 | 1,200 | Record lookup ("what do we know about this contact?") |
| Medium | 50,000 | 3,000 | Document-heavy agents (read context doc + reason) |
| Large | 100,000 | 6,000 | Full-corpus agents (research, multi-entity reasoning) |

## Personize recall economics

Personize compacts the corpus into a small structured payload before calling the LLM — instead of sending 50K tokens of raw records, it sends 2K tokens of pre-extracted, ranked memory snippets.

| Item | Value |
|---|---:|
| Platform fee per recall | $0.003 |
| Compact-recall input tokens (sent to LLM) | 2,000 |
| Compact-recall output tokens (typical agent reply) | 200 |

## Memorize-once economics (write cost, amortized over 12 months)

Initial extraction when a record is first memorized — one-time per record. Two discounts compound:

- **Bedrock prompt cache** — 90% of input is the system prompt + per-org schema and gets cached → input billed at 10% of list (90% off).
- **Bedrock Batch API** — whole call runs through batch → 50% off both input and output.

| Item | Value |
|---|---:|
| Cached input tokens per write (90% discount) | 18,000 |
| Uncached input tokens per write | 2,000 |
| Output tokens per write | 5,000 |
| Cache discount | 0.10 (pay 10% of list) |
| Batch discount | 0.50 (50% off final total) |

## Formulas

```
# Raw LLM cost per call (no Personize)
rawLlmCostPerCall(tier, ctx) =
    ctx.inputTokens  × tier.inputRate  / 1e6
  + ctx.outputTokens × tier.outputRate / 1e6

# Compact-recall LLM cost (the small payload Personize sends)
compactRecallLlmCost(tier) =
    2_000 × tier.inputRate  / 1e6
  +   200 × tier.outputRate / 1e6

# Personize total per recall: platform fee + compact LLM
personizeCostPerRecall(tier) = $0.003 + compactRecallLlmCost(tier)

# Memorize-once cost per record (cache + batch discounts compound)
writeCostPerRecord(tier) = (
    18_000 × tier.inputRate  × 0.10 / 1e6   # cached input (90% off)
  +  2_000 × tier.inputRate         / 1e6   # uncached input
  +  5_000 × tier.outputRate        / 1e6   # output
) × 0.50                                     # batch discount

# Monthly totals
recallsPerMonth = records × recallsPerRecordPerYear / 12
writesPerMonth  = records / 12                       # amortize first-year writes over 12 months

rawMonthly       = recallsPerMonth × rawLlmCostPerCall(tier, ctx)
personizeMonthly = recallsPerMonth × personizeCostPerRecall(tier)
                 + writesPerMonth  × writeCostPerRecord(tier)
savings          = rawMonthly - personizeMonthly
savingsPct       = savings / rawMonthly
```

## Worked examples

### Example A — 50K records, professional tier, medium context, 100 recalls/record/yr

```
recallsPerMonth = 50_000 × 100 / 12 = 416,667
writesPerMonth  = 50_000 / 12        = 4,167

rawLlmCostPerCall  = (50,000 × $0.80 + 3,000 × $3.20) / 1e6 = $0.0496
compactRecallLlm   = (2,000  × $0.80 +   200 × $3.20) / 1e6 = $0.00224
personizeCostPerRecall = $0.003 + $0.00224 = $0.00524
writeCostPerRecord = ((18,000 × $0.80 × 0.10) + (2,000 × $0.80) + (5,000 × $3.20)) × 0.5 / 1e6
                   = (1,440 + 1,600 + 16,000) × 0.5 / 1e6 = $0.00952

rawMonthly       = 416,667 × $0.0496  = $20,667
personizeMonthly = 416,667 × $0.00524 + 4,167 × $0.00952
                 = $2,183 + $40 = $2,223
savings          = $18,444/mo
savingsPct       = 89%
```

**Read:** "At 50K records with the Professional tier and medium context, Personize cuts your monthly LLM bill from ~$21K to ~$2.2K — about 89% savings, ~$18K/mo. The compact-recall pattern is doing most of the work."

### Example B — 1M records, economy tier, large context, 200 recalls/record/yr

```
recallsPerMonth = 1,000,000 × 200 / 12 = 16,666,667
writesPerMonth  = 1,000,000 / 12        = 83,333

rawLlmCostPerCall  = (100,000 × $0.06 + 6,000 × $0.24) / 1e6 = $0.00744
compactRecallLlm   = (2,000   × $0.06 +   200 × $0.24) / 1e6 = $0.000168
personizeCostPerRecall = $0.003 + $0.000168 = $0.003168
writeCostPerRecord = ((18,000 × $0.06 × 0.10) + (2,000 × $0.06) + (5,000 × $0.24)) × 0.5 / 1e6
                   = (108 + 120 + 1,200) × 0.5 / 1e6 = $0.000714

rawMonthly       = 16,666,667 × $0.00744    = $124,000
personizeMonthly = 16,666,667 × $0.003168 + 83,333 × $0.000714
                 = $52,800 + $60 = $52,860
savings          = $71,140/mo
savingsPct       = 57%
```

**Read:** "At 1M records / economy tier / large context, the platform fee ($0.003) starts to dominate the math. Still 57% savings (~$71K/mo) but the gap narrows because economy LLM rates are already low. Frontier tier at this scale would show 90%+ savings."

### Example C — 10K records, frontier tier, small context, 30 recalls/record/yr

```
recallsPerMonth = 10,000 × 30 / 12 = 25,000
writesPerMonth  = 10,000 / 12       = 833

rawLlmCostPerCall  = (20,000 × $3.00 + 1,200 × $15.00) / 1e6 = $0.078
compactRecallLlm   = (2,000  × $3.00 +   200 × $15.00) / 1e6 = $0.009
personizeCostPerRecall = $0.003 + $0.009 = $0.012
writeCostPerRecord = ((18,000 × $3.00 × 0.10) + (2,000 × $3.00) + (5,000 × $15.00)) × 0.5 / 1e6
                   = (5,400 + 6,000 + 75,000) × 0.5 / 1e6 = $0.0432

rawMonthly       = 25,000 × $0.078  = $1,950
personizeMonthly = 25,000 × $0.012 + 833 × $0.0432
                 = $300 + $36 = $336
savings          = $1,614/mo
savingsPct       = 83%
```

**Read:** "Frontier (Claude Sonnet) is expensive per call — 10K records with weekly recalls still saves $1.6K/mo (~83%). The savings ratio is high because frontier rates penalize large prompts; the more expensive your tier, the more the compact-recall pattern pays off."

## Reading the results

Three patterns recur:

1. **Cheaper tier → smaller savings %.** Economy rates are so low that the platform fee becomes a meaningful share. Savings drop from ~90% (professional/frontier) to ~50-60% (economy) at the same scale.
2. **Larger context → bigger savings.** Personize's compact recall is a fixed 2K tokens regardless of corpus size; the raw-LLM baseline scales linearly with context. So small context → similar costs both sides; large context → dramatic savings.
3. **Write cost is a one-time amortization.** Even at 10M records, monthly write cost is < 10% of recall cost (assuming records get recalled at all). Don't over-optimize writes — recall efficiency is where the bill lives.

## Inverse simulation — "what can $X/mo buy?"

Given a monthly budget, solve for recalls funded:

```
recallsFunded = budget / personizeCostPerRecall(tier)
```

Then translate to business-side metrics using common multipliers:

| Output | Multiplier |
|---|---:|
| Agent interactions | × 1.0 |
| Documents processed | × 0.3 |
| Automation steps | × 2.0 |
| Profiles kept fresh | × 0.05 |

**Example:** $10K/mo budget, professional tier → `recallsFunded = $10,000 / $0.00524 ≈ 1.9M recalls/mo` → 1.9M agent interactions, 570K documents processed, 3.8M automation steps, or 95K profiles kept fresh.

## When to push the user to a different tier

| Signal | Recommend |
|---|---|
| User says "we mostly do simple record lookups" | **Economy** — large context isn't needed |
| User mentions multi-step reasoning, complex synthesis | **Professional** — balanced cost/quality |
| User mentions legal, compliance, regulated outputs | **Frontier** — quality matters more than $/call |
| Cost ratio is bad (savings < 50%) | Check if context profile is right-sized. Often the user picks "large" when "small" fits their actual workload |
| Recalls per record < 10/yr | Reconsider whether memorize amortization makes sense — at very low recall rates, the write cost dominates and Personize may not save money |

## BYOK delta

If the user runs BYOK (provides their own LLM API key), the LLM portion of the cost is paid directly to their provider — Personize charges only the platform fee. To model BYOK savings, set the LLM-cost portion to whatever rate their key provides (often cheaper for high-volume customers with negotiated pricing) and keep the $0.003 platform fee per recall.

## Sources & accuracy

- Rates: Bedrock pricing, us-east-1, April 2026 (last calibrated 2026-04-30)
- Discounts: Bedrock prompt-cache (90% off cached input), Bedrock Batch API (50% off both)
- Platform fee: `$0.003` per recall — this is the public published rate; org-specific contracts may differ
- Calibration source: [Personize savings calculator](https://personize.ai/pricing/api) on the website

**Re-calibrate when:**
- Bedrock pricing changes (check the [AWS Bedrock pricing page](https://aws.amazon.com/bedrock/pricing/))
- Personize publishes a new platform fee
- A new tier is added (e.g. Bedrock releases a sub-Nova-Lite model)

For exact runtime billing rates, query the live SSM pricing at `/personize/{stage}/pricing/rates` — but for solution-architect estimates, these constants are accurate to within ~10%.
