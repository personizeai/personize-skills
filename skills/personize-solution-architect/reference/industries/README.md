# Industry Blueprints

Production-grade Personize integration blueprints organized by industry. Each blueprint covers all five Personize capabilities with industry-specific use cases, schemas, governance, code examples, and agent coordination patterns.

## How to Use These Blueprints

1. **During DISCOVER** — Ask the developer what industry they're in. Read the matching blueprint.
2. **During PROPOSE** — Pull use cases from the blueprint. Only propose what fits their product.
3. **During SCHEMA** — Use the recommended schema as a starting point. Customize to their data.
4. **During PLAN** — Use the workflow code examples. Adapt to their tech stack.
5. **During REVIEW** — Check their implementation against the blueprint's coverage map.

## Capability Coverage

Every blueprint addresses all five Personize pillars:

| Pillar | What the Blueprint Covers |
|---|---|
| **Unified Memory** | What to memorize, which sources, batch vs single, entity relationships, cross-entity context assembly |
| **Governance** | Industry-specific variables (compliance, brand voice, ICPs, playbooks), when to enforce, what to flag |
| **Generative Personalization** | What to generate, channel constraints, `instructions[]` patterns, evaluation criteria, structured outputs |
| **Agent Coordination** | Workspace schemas, multi-agent handoffs, contribution patterns, coordination without orchestration |
| **Signal / Notifications** | IF/WHAT/WHEN/HOW decision patterns, channel selection, urgency calibration, digest vs real-time |

## Available Blueprints

| Industry | File | Key Differentiator |
|---|---|---|
| **SaaS / B2B Software** | `saas.md` | Product usage intelligence, trial conversion, expansion revenue, multi-threading |
| **E-Commerce / DTC / Retail** | `ecommerce.md` | Purchase behavior, cart abandonment, loyalty, seasonal patterns, returns |
| **Healthcare / HealthTech** | `healthcare.md` | HIPAA governance, patient engagement, care continuity, provider coordination |
| **Financial Services / FinTech** | `financial-services.md` | Regulatory compliance, market event response, suitability rules, fiduciary governance |
| **Real Estate / PropTech** | `real-estate.md` | Property matching, showing feedback loops, transaction lifecycle, relationship longevity |
| **Recruiting / HR Tech** | `recruiting.md` | Candidate matching, outreach personalization, pipeline intelligence, placement tracking |
| **Education / EdTech** | `education.md` | Learning paths, adaptive content, student engagement, institutional analytics |
| **Professional Services** | `professional-services.md` | Relationship intelligence, cross-practice selling, matter/engagement context, thought leadership |
| **Insurance / InsurTech** | `insurance.md` | Coverage gap analysis, life event triggers, claims empathy, renewal retention |
| **Travel & Hospitality** | `travel-hospitality.md` | Guest recognition, preference memory, experience personalization, loyalty cultivation |

## Cross-Industry Patterns

These patterns apply to every industry. Use them as a baseline, then layer industry-specific logic from the blueprints.

| Pattern | SDK Methods | When |
|---|---|---|
| **Context Assembly** | `smartGuidelines()` + `smartDigest()` + `smartRecall()` | Before every generation |
| **Feedback Loop** | `memorize()` after every outbound | After every send/delivery |
| **Cross-Entity Context** | `smartDigest({ website_url })` when working on a contact | Always in B2B |
| **Lifecycle Communication** | `search()` to find entities at stage → generate per-entity | Stage transitions |
| **Churn Prevention** | `search()` for declining engagement → `smartDigest()` → generate outreach | Daily/weekly cron |
| **Workspace Coordination** | `memorize()` with workspace tags + `smartRecall()` for coordination context | Multi-agent workflows |
| **Governance-Gated Generation** | `smartGuidelines()` → check constraints → generate → flag if sensitive | Every generation |

## Choosing the Right Blueprint

If the developer's product doesn't fit neatly into one industry:

1. **Start with the closest match** — Most products map to one primary industry
2. **Layer from a second** — A healthcare scheduling app might use Healthcare + SaaS blueprints
3. **Use cross-industry patterns** — The patterns above work everywhere
4. **Focus on their data model** — The schema section is the most critical part to get right
