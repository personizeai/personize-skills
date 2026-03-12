# Industry Blueprint: Insurance / InsurTech

Insurance is one of the most document-heavy, relationship-dependent industries — yet policyholders rarely hear from their agent outside of renewal season. This creates a massive trust deficit: the only time the company reaches out is when they want money. Personize flips this by enabling proactive, personalized communication throughout the policy lifecycle — building trust, identifying coverage gaps, and reducing churn before it starts.

---

## Recommended Schema

| Collection | Key Properties | Why |
|---|---|---|
| `Policyholder` | policies_held, coverage_gaps_identified, life_events_history, claims_history_summary, premium_total, risk_category, communication_preference, next_renewal_date, household_composition, occupation, life_stage | Policyholder intelligence |
| `Policy` | type (auto/home/life/health/business/umbrella), coverage_amount, premium, deductible, effective_date, renewal_date, riders, exclusions, payment_status | Policy details |
| `Claim` | type, status, amount, date_filed, resolution, satisfaction_score, adjuster_notes_summary, time_to_resolution | Claims intelligence |
| `Agent` | book_of_business_size, specialties, certifications, retention_rate, cross_sell_rate, client_satisfaction_avg | Agent performance |
| `Prospect` | current_carrier, coverage_needs, quote_history, objections, referral_source, follow_up_stage | Pipeline management |

---

## Governance Setup

| Variable | Purpose | Content |
|---|---|---|
| `insurance-regulations` | State/jurisdiction compliance | "Insurance communications must comply with state Department of Insurance regulations. Include required disclosures per state. Policy illustrations must include guaranteed and non-guaranteed elements clearly labeled. Never misrepresent coverage or policy terms." |
| `claims-communication` | Empathetic claims handling | "Claims are stressful moments. Lead with empathy, not process. Acknowledge the situation before explaining next steps. Never deny or minimize without full review. Provide clear timelines and single point of contact. Follow up proactively — don't make the policyholder chase." |
| `coverage-recommendations` | Coverage gap discussions | "When identifying coverage gaps, explain the risk in concrete terms (scenario-based), not abstract insurance jargon. Never use fear-mongering language. Present options, not ultimatums. Acknowledge budget constraints. Make recommendations based on the policyholder's specific situation, not generic upselling." |
| `privacy-and-data` | Policyholder data protection | "Personal health information (for life/health policies): treat as PHI under HIPAA-equivalent standards. Financial information: never include policy numbers in email. Driving records, claims history: confidential — never share with third parties without consent." |
| `marketing-compliance` | Advertising and marketing rules | "All marketing must be truthful and not misleading. Include required state disclosures. Premium estimates must clearly state they are estimates. Testimonials require disclosure. Comparisons must be factual and verifiable." |

```typescript
await client.guidelines.create({
    name: 'Insurance Communication Empathy Standards',
    content: `Insurance touches people at their most vulnerable moments — accidents, illness, property loss, death.
    CLAIMS: Lead with "I'm sorry this happened" not "Please fill out form XYZ." Explain the process simply. Set realistic expectations on timeline. Provide direct contact, not a call center number.
    COVERAGE GAPS: Frame as protection, not fear. "If [specific scenario] happened, you'd be covered for X but not Y — here's how to close that gap" not "You're dangerously underinsured."
    RENEWALS: Acknowledge the cost, show the value. "Here's what your policy protected you from this year" before "here's your new premium."
    LIFE EVENTS: Be present but not pushy. "Congratulations on the new home — when you're ready, I can help make sure it's fully protected" not "BUY HOMEOWNERS INSURANCE NOW."`,
    triggerKeywords: ['claim', 'coverage', 'renewal', 'policy', 'premium', 'policyholder', 'insured'],
    tags: ['insurance', 'empathy', 'communication'],
});
```

---

## Unified Memory: What to Memorize

| Source | Method | What Gets Extracted |
|---|---|---|
| Policy management system | `memorizeBatch()` daily | Policy types, coverage levels, renewal dates, premium history |
| Claims system | `memorize()` per claim event | Claim type, status, resolution, satisfaction, patterns |
| Life event signals | `memorize()` per event | Marriage, baby, home purchase, retirement, car purchase, business start |
| Agent interactions | `memorize()` per conversation | Topics discussed, concerns raised, coverage questions, personal updates |
| Quote history | `memorize()` per quote | Products quoted, competitor comparison, price sensitivity signals |
| Payment history | `memorize()` per event | Payment patterns, lapse risk, autopay status |
| Market/catastrophe data | `memorize()` per event | Weather events, market changes, regulatory updates affecting coverage |

---

## Use Cases by Function

### Agent / Broker Operations (14 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Coverage Gap Analysis** | Annual review or life event | Memory (all policies + life events + household) → Generate (personalized gap analysis with scenario-based risk explanation) |
| 2 | **Life Event Coverage Trigger** | Life event detected | Memory (event details + current coverage) → Governance (no fear-mongering) → Generate (congratulations + gentle coverage suggestion) |
| 3 | **Renewal Prep + Retention** | 60 days before renewal | Memory (claims history + market rates + coverage changes + relationship) → Generate (renewal communication with value reinforcement) |
| 4 | **Claims Follow-Up** | Claim status change | Memory (claim details + policyholder preferences) → Governance (empathy standards) → Generate (proactive status update with next steps) |
| 5 | **Cross-Sell Timing** | Receptivity signal | Memory (life changes + coverage gaps + engagement history) → Generate (contextual product introduction timed to natural need) |
| 6 | **Policy Review Scheduling** | Annual or post-event | Memory (last review date + changes since then) → Generate ("it's been [X] since we reviewed — here's what's changed in your life") |
| 7 | **Disaster Preparedness** | Weather/catastrophe forecast | Memory (policyholders in affected area + coverage types) → Generate (proactive "here's what you're covered for" + preparation tips) |
| 8 | **Post-Claim Check-In** | Claim resolved | Memory (claim details + resolution + satisfaction) → Generate (check-in: how's the repair? anything else we can help with?) |
| 9 | **Referral Cultivation** | High satisfaction signals | Memory (long tenure + no claims issues + positive interactions) → Generate (personalized referral ask after positive moment) |
| 10 | **New Product Introduction** | Product launch | Memory (policyholders whose profile fits) → Governance (marketing compliance) → Generate (personalized introduction with specific benefit explanation) |
| 11 | **Payment Lapse Prevention** | Payment overdue | Memory (payment history + contact preference + policy value) → Signal (outreach before lapse) → Generate (empathetic reminder with easy resolution options) |
| 12 | **Commercial Risk Review** | Annual for business clients | Memory (business operations + claims + industry) → Generate (risk review with loss prevention suggestions and coverage recommendations) |
| 13 | **Quote Follow-Up** | Quote provided, no binding | Memory (quote details + objections + competitor info) → Generate (follow-up addressing specific objections) |
| 14 | **Policy Anniversary Celebration** | Policy anniversary | Memory (policy duration + claims prevented + coverage value) → Generate (anniversary acknowledgment with "here's what we've protected" summary) |

### Claims Operations (6 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **First Notice of Loss Support** | FNOL received | Memory (policyholder + policy details + coverage) → Generate (empathetic confirmation with clear next steps and timeline) |
| 2 | **Adjuster Prep Brief** | Claim assigned | Memory (policyholder history + claim details + coverage + past claims) → Generate (adjuster brief with context and relationship notes) |
| 3 | **Subrogation Opportunity Detection** | Claim reviewed | Memory (claim circumstances + liable parties) → Generate (subrogation assessment with recommended approach) |
| 4 | **Claims Satisfaction Recovery** | Low CSAT on claim | Memory (claim experience + pain points + policyholder value) → Generate (recovery outreach addressing specific dissatisfaction) |
| 5 | **Fraud Pattern Detection** | Claim submitted | Memory (past claims + patterns + behavioral signals) → Signal (flag suspicious patterns for SIU review) |
| 6 | **Catastrophe Response Coordination** | Catastrophe event | Memory (affected policyholders + coverage + prior claims) → Workspace (triage coordination) → Generate (mass communication with personalized coverage details) |

### Underwriting Support (4 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Risk Assessment Intelligence** | New application | Memory (applicant data + similar profiles + claims patterns) → Generate (risk assessment summary with comparable analysis) |
| 2 | **Renewal Pricing Intelligence** | Renewal pricing cycle | Memory (claims experience + market conditions + retention risk) → Generate (pricing recommendation balancing profitability and retention) |
| 3 | **Portfolio Risk Report** | Quarterly | Memory (aggregate exposure + claims trends + concentration risk) → Generate (portfolio risk analysis with rebalancing suggestions) |
| 4 | **Loss Control Recommendations** | Large commercial renewal | Memory (client's loss history + industry benchmarks) → Generate (personalized loss control recommendations with ROI estimates) |

---

## Agent Coordination: Claims Workspace

```typescript
// FNOL agent records initial claim
await client.memory.memorize({
    content: `[FNOL-AGENT] New claim filed: water damage to home. Burst pipe in upstairs bathroom. Estimated damage: significant — affected master bathroom, master bedroom (ceiling/walls), and kitchen below (ceiling). Policyholder is staying with family temporarily. Needs emergency mitigation company ASAP. Policy includes: dwelling coverage, personal property, ALE (additional living expenses). Deductible: $1,000.`,
    email: policyholder.email, enhanced: true,
    tags: ['workspace', 'claim', 'water-damage', 'fnol', `claim-${claimId}`],
});

// Adjuster agent updates after inspection
await client.memory.memorize({
    content: `[ADJUSTER-AGENT] On-site inspection completed. Confirmed: burst supply line to upstairs toilet. Damage scope larger than initial report — also affects hallway and guest bedroom. Mitigation company deployed (ServiceMaster). Initial repair estimate: $32,000-$45,000. Personal property damage inventory in progress. Structural engineer recommended for ceiling support assessment. Timeline estimate: 3-4 months for full repair. Recommended ALE advance: 60 days.`,
    email: policyholder.email, enhanced: true,
    tags: ['workspace', 'claim', 'inspection', 'estimate', `claim-${claimId}`],
});

// Communication agent synthesizes for policyholder update
const claimContext = await client.memory.smartRecall({
    query: 'all claim updates, inspections, estimates, and action items',
    email: policyholder.email, limit: 15, min_score: 0.3,
    filters: { conditions: [{ property: 'tags', operator: 'CONTAINS', value: `claim-${claimId}` }] },
});

const governance = await client.ai.smartGuidelines({
    message: 'claims communication empathy standards, privacy rules, transparency requirements',
    mode: 'fast',
});

const policyholderUpdate = await client.ai.prompt({
    context: [
        governance.data?.compiledContext || '',
        JSON.stringify(claimContext.data?.results),
    ].join('\n\n---\n\n'),
    instructions: [
        { prompt: 'Summarize the current claim status in plain language. What has been done, what happens next, and what the timeline looks like. Be honest about uncertainties.', maxSteps: 3 },
        { prompt: 'Generate a policyholder update. Lead with empathy — they are displaced from their home. Provide clear status on each item (mitigation, inspection, estimate, ALE). Include specific next steps and your direct contact info. Tone: warm, clear, supportive. SUBJECT: and BODY: fields.', maxSteps: 5 },
    ],
    evaluate: true,
    evaluationCriteria: 'Empathetic tone. No insurance jargon without explanation. Specific timeline and next steps. Direct contact provided.',
});
```

---

## Key Workflow: Coverage Gap Analysis

```typescript
async function analyzeCoverageGaps(policyholderEmail: string) {
    const governance = await client.ai.smartGuidelines({
        message: 'coverage recommendation guidelines, no fear-mongering, scenario-based explanations, privacy rules',
        mode: 'fast',
    });

    const [policyholderContext, policiesContext] = await Promise.all([
        client.memory.smartDigest({
            email: policyholderEmail, type: 'Policyholder', token_budget: 2500,
            include_properties: true, include_memories: true,
        }),
        client.memory.smartRecall({
            query: 'all current policies, coverage amounts, deductibles, exclusions, and riders',
            email: policyholderEmail, limit: 10, min_score: 0.4,
        }),
    ]);

    const context = [
        governance.data?.compiledContext || '',
        policyholderContext.data?.compiledContext || '',
        `Current policies: ${JSON.stringify(policiesContext.data?.results)}`,
    ].join('\n\n---\n\n');

    const gapAnalysis = await client.ai.prompt({
        context,
        instructions: [
            { prompt: 'Based on this policyholder\'s life stage, household, occupation, and assets, what coverage gaps exist? Consider: umbrella liability, disability income, life insurance adequacy, flood/earthquake (if in risk zone), cyber liability, identity theft. Only flag genuine gaps relevant to their situation.', maxSteps: 5 },
            { prompt: 'For each identified gap, write a scenario-based explanation: "If [specific realistic scenario] happened, here\'s what would be covered and what wouldn\'t." Present as a helpful review, not a scare tactic. Include estimated premium range for each recommendation. Format as structured sections per gap.', maxSteps: 5 },
        ],
        evaluate: true,
        evaluationCriteria: 'No fear-mongering language. Scenarios are realistic and relevant. Recommendations match their life stage. Not every gap needs to be filled immediately — prioritize.',
    });

    await client.memory.memorize({
        content: `[COVERAGE-REVIEW] Gaps identified: ${String(gapAnalysis.data).slice(0, 300)}... ${new Date().toISOString()}.`,
        email: policyholderEmail, enhanced: true,
        tags: ['generated', 'coverage-review', 'gap-analysis'],
    });

    return gapAnalysis.data;
}
```

---

## Quick Wins (First Week)

1. **Import policyholder data** via `memorizeBatch()` from policy management system
2. **Set up empathy + compliance governance** — critical for trust-building
3. **Renewal prep automation** — 60-day personalized communication pipeline
4. **Post-claim check-ins** — transforms claims from negative to trust-building experience
5. **Coverage gap annual review** — drives revenue while genuinely helping policyholders
