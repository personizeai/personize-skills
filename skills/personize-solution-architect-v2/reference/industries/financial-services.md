# Industry Blueprint: Financial Services / FinTech

Financial products are inherently personal — everyone's situation, risk tolerance, goals, and life stage is different. Yet most financial communication is segment-based ("high net worth" vs "retail") or purely transactional ("your statement is ready"). Personize enables advisors, banks, and fintech apps to communicate as if they deeply understand each client's financial life — while maintaining strict regulatory compliance through the governance layer.

---

## Recommended Schema

| Collection | Key Properties | Why |
|---|---|---|
| `Client` | risk_tolerance, investment_goals, life_stage, account_types, total_aum, net_worth_range, last_review_date, communication_frequency, regulatory_classification (accredited/qualified/retail), tax_situation, estate_plan_status | Client suitability and personalization |
| `Account` | account_type, balance_range, performance_ytd, fee_structure, benchmark, tax_status (taxable/tax-deferred/tax-exempt), last_rebalance_date | Portfolio intelligence |
| `Financial-Plan` | goals, timeline, milestones, risk_budget, asset_allocation_target, insurance_needs, estate_plan_elements | Planning context |
| `Interaction` | type (meeting/call/email), topics_discussed, action_items, next_steps, advisor_notes_summary | Relationship continuity |

**Critical note:** Never store exact account balances, SSNs, or account numbers in memory. Store ranges and categories. Use Personize for relationship intelligence, not as a system of record for financial data.

---

## Governance Setup (Regulatory)

| Variable | Purpose | Content |
|---|---|---|
| `regulatory-compliance` | SEC/FINRA/state requirements | "All investment-related communications must include: 'Past performance is not indicative of future results.' Never guarantee returns. Never promise specific outcomes. Include firm disclosure: '[Firm Name] is a registered investment adviser.'" |
| `suitability-rules` | Fiduciary and suitability | "Never recommend products above client's stated risk tolerance. Never suggest concentrated positions without documented client consent. Always reference the client's investment policy statement when recommending changes." |
| `fair-lending` | Anti-discrimination | "No language that could be construed as discriminatory based on race, religion, gender, age, national origin, disability, or marital status. No profiling based on zip code or demographic assumptions. Credit decisions must be based solely on financial criteria." |
| `fee-transparency` | Fee disclosure | "Always disclose relevant fees when discussing products or services. Present fee comparisons fairly. Never minimize fees or use confusing terminology to obscure costs." |
| `data-privacy` | Financial data handling | "Never include account numbers in email. Never reference exact balances in unencrypted channels. Use ranges ('your portfolio is well above your target'). Client financial data is confidential — never reference in marketing to other clients." |
| `market-commentary` | Market event communications | "Never predict market direction. Use phrases like 'historically' and 'on average' not 'will' or 'guaranteed'. Acknowledge uncertainty. Calm over alarm. Focus on the client's long-term plan, not short-term volatility." |

```typescript
await client.guidelines.create({
    name: 'Investment Suitability Rules',
    content: `Fiduciary obligations for all investment-related communications:
    1. NEVER recommend products above client's stated risk tolerance
    2. ALWAYS reference the client's investment goals and time horizon
    3. If recommending a change: explain WHY and HOW it serves their specific goals
    4. Alternative investments: only for accredited investors (verify regulatory_classification)
    5. Concentrated positions: require documented client acknowledgment of risk
    6. Tax implications: always mention when a recommendation has tax consequences
    7. Fee impact: disclose any fee changes resulting from recommendations
    If any recommendation conflicts with the client's IPS, flag for advisor review.`,
    triggerKeywords: ['investment', 'portfolio', 'recommend', 'suitability', 'risk', 'allocation', 'rebalance'],
    tags: ['compliance', 'suitability', 'fiduciary'],
});
```

---

## Unified Memory: What to Memorize

| Source | Method | What Gets Extracted |
|---|---|---|
| CRM (Salesforce Financial, Redtail, Wealthbox) | `memorizeBatch()` | Client profile, relationship history, life events, preferences |
| Financial planning software (MoneyGuidePro, eMoney) | `memorize()` per plan update | Goals, milestones, risk analysis, projections (without exact numbers) |
| Trading/portfolio platforms | `memorize()` daily/weekly summary | Performance categories, allocation drift, rebalancing needs |
| Meeting notes | `memorize()` per meeting | Topics discussed, action items, concerns raised, family updates |
| Market events | `memorize()` per significant event | Event type, magnitude, affected sectors, client exposure categories |
| Compliance records | `memorize()` per event | Disclosures made, consent obtained, regulatory filings |
| Client communications | `memorize()` per outbound | What was sent, when, client response |

---

## Use Cases by Function

### Wealth Management / Advisory (14 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Market Event Communication** | Market move > 3% | Memory (portfolio exposure + risk tolerance) → Governance (market commentary rules) → Generate (calm, personalized email referencing their plan) |
| 2 | **Quarterly Review Prep** | Quarterly calendar | Memory (performance + goals + life changes + interactions) → Generate (personalized review agenda with talking points) |
| 3 | **Life Event Planning** | Life event memorized | Memory (event details + financial plan) → Generate (proactive planning suggestions specific to event) |
| 4 | **Tax-Loss Harvesting Alert** | Year-end or market drop | Memory (positions + tax situation) → Governance (tax disclaimer) → Generate (personalized opportunity with estimated benefit range) |
| 5 | **Rebalancing Recommendation** | Allocation drift detected | Memory (target vs current allocation) → Governance (suitability) → Generate (recommendation with rationale) |
| 6 | **New Product Suitability** | Product launch | Memory (clients whose goals align) → Governance (suitability + accreditation check) → Generate (personalized introduction) |
| 7 | **Client Meeting Prep** | Calendar event | Memory (full relationship: AUM range, performance, conversations, family, concerns) → Generate (advisor prep brief) |
| 8 | **Regulatory Disclosure** | Regulatory trigger | Memory (client accounts + transactions) → Governance (regulatory compliance) → Generate (required disclosures) |
| 9 | **Referral Cultivation** | High satisfaction signals | Memory (NPS + growing relationship + referral history) → Generate (soft ask timed to positive event) |
| 10 | **Estate Planning Triggers** | Age/AUM milestones | Memory (age + AUM range + estate plan status) → Generate (proactive estate conversation starter) |
| 11 | **Beneficiary Review Reminder** | Life event or annual | Memory (beneficiary status + life changes) → Generate (personalized review reminder with specific prompts) |
| 12 | **Charitable Giving Strategy** | Year-end or windfall | Memory (charitable interests + tax situation) → Governance (tax disclaimer) → Generate (giving strategy suggestions) |
| 13 | **Insurance Gap Analysis** | Annual review | Memory (coverage + life stage + assets) → Generate (gap analysis with specific recommendations) |
| 14 | **Next-Gen Wealth Transfer** | Children reaching milestones | Memory (family composition + estate plan) → Generate (age-appropriate financial education content for heirs) |

### Banking / Consumer FinTech (10 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Spending Insight Notification** | Monthly statement | Memory (spending patterns) → Generate (personalized insight: "20% more on dining — unusual for you") |
| 2 | **Savings Goal Coaching** | Weekly check | Memory (goal + progress + income pattern) → Generate (motivational nudge with specific actionable suggestion) |
| 3 | **Credit Score Improvement** | Score change | Memory (credit factors + payment history) → Generate (personalized step-by-step improvement plan) |
| 4 | **Fraud Alert Context** | Anomaly detected | Memory (transaction patterns + travel history) → Signal (contextual alert: "This charge is near your office") |
| 5 | **Product Cross-Sell** | Gap detected | Memory (products held + financial profile) → Governance (fair lending) → Generate (personalized pitch for specific benefit) |
| 6 | **Major Purchase Planning** | Savings pattern or stated goal | Memory (savings rate + upcoming expenses) → Generate ("here's how to prepare for [expense]") |
| 7 | **Financial Wellness Check-In** | Monthly | Memory (overall financial health signals) → Generate (wellness report with one specific improvement suggestion) |
| 8 | **Rate Change Communication** | Rate environment change | Memory (rate-sensitive products held + refinance potential) → Generate (personalized impact explanation) |
| 9 | **Overdraft Prevention** | Low balance pattern | Memory (spending patterns + income timing) → Signal (proactive alert with transfer suggestion) |
| 10 | **New Feature Education** | Feature launch | Memory (banking behavior + tech comfort level) → Generate (personalized feature tutorial matching usage patterns) |

### Commercial / Business Banking (6 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Cash Flow Forecast Alert** | Weekly analysis | Memory (business cash flow patterns) → Generate (forecast with actionable suggestions) |
| 2 | **Lending Opportunity** | Business growth signals | Memory (revenue trend + current credit) → Governance (fair lending) → Generate (pre-qualified offer with specific terms) |
| 3 | **Treasury Management Optimization** | Quarterly | Memory (operating accounts + idle cash patterns) → Generate (optimization recommendations) |
| 4 | **Industry Risk Communication** | Sector event | Memory (business type + exposure) → Generate (industry-specific risk advisory) |
| 5 | **Business Review Prep** | Annual meeting | Memory (full business relationship) → Generate (relationship review with growth suggestions) |
| 6 | **Payroll/Payment Intelligence** | Pattern detected | Memory (payment timing + volumes) → Generate (operational efficiency suggestions) |

---

## Agent Coordination: Client Advisory Workspace

```typescript
// Financial planning agent records plan update
await client.memory.memorize({
    content: `[PLANNING-AGENT] Updated financial plan for retirement scenario. Client wants to retire at 62 (3 years earlier than originally planned). This requires: increasing savings rate by 12%, considering part-time income bridge, reviewing healthcare coverage gap (Medicare starts at 65). Current on-track probability: 78% (was 92% with age-65 retirement).`,
    email: client.email, enhanced: true,
    tags: ['workspace', 'financial-plan', 'retirement', 'planning-update'],
});

// Tax planning agent reads planning notes and contributes
await client.memory.memorize({
    content: `[TAX-AGENT] Early retirement at 62 creates Roth conversion opportunity in low-income bridge years (ages 62-65). Estimated tax savings: significant if executed over 3 years. Also: review pension distribution options — lump sum vs annuity decision needed before retirement date. HSA max-funding recommended for healthcare bridge.`,
    email: client.email, enhanced: true,
    tags: ['workspace', 'tax-strategy', 'retirement', 'roth-conversion'],
});

// Advisor meeting prep synthesizes all agent contributions
const planningContext = await client.memory.smartRecall({
    query: 'all planning updates, tax strategy, insurance review, estate changes',
    email: client.email, limit: 20, min_score: 0.3,
    filters: { conditions: [{ property: 'tags', operator: 'CONTAINS', value: 'workspace' }] },
});

const governance = await client.ai.smartGuidelines({
    message: 'client meeting preparation, suitability rules, regulatory disclosures, fee transparency',
    mode: 'full',
});

const meetingBrief = await client.ai.prompt({
    context: [
        governance.data?.compiledContext || '',
        JSON.stringify(planningContext.data?.results),
    ].join('\n\n---\n\n'),
    instructions: [
        { prompt: 'Synthesize all agent contributions into a meeting prep brief. What are the key decisions the client needs to make? What are the risks and opportunities across planning, tax, and investment?', maxSteps: 5 },
        { prompt: 'Generate the advisor meeting brief. Sections: (1) Key Agenda Items, (2) Client Situation Summary, (3) Recommendations (with compliance disclosures), (4) Discussion Questions, (5) Follow-Up Actions. Include all required regulatory disclaimers.', maxSteps: 5 },
    ],
    evaluate: true,
    evaluationCriteria: 'Includes regulatory disclaimers. No return guarantees. Recommendations aligned with stated risk tolerance. All recommendations reference client goals.',
});
```

---

## Key Workflow: Market Volatility Client Communication

```typescript
async function communicateMarketEvent(eventDescription: string, affectedSectors: string[]) {
    const governance = await client.ai.smartGuidelines({
        message: 'market commentary rules, regulatory compliance, past-performance disclaimers, suitability rules',
        mode: 'full',
    });

    // Find all clients with exposure to affected sectors
    const clients = await client.memory.search({ type: 'Client' });

    for (const [id, record] of Object.entries(clients.data?.records || {})) {
        const clientContext = await client.memory.smartDigest({
            record_id: id, type: 'Client', token_budget: 2500,
            include_properties: true, include_memories: true,
        });

        const context = [
            governance.data?.compiledContext || '',
            clientContext.data?.compiledContext || '',
            `Market event: ${eventDescription}. Affected sectors: ${affectedSectors.join(', ')}`,
        ].join('\n\n---\n\n');

        const message = await client.ai.prompt({
            context,
            instructions: [
                { prompt: 'Assess: does this client have meaningful exposure to the affected sectors? What is their risk tolerance? Should we communicate (YES if exposed, SKIP if not materially affected)?', maxSteps: 3 },
                { prompt: 'If YES: write a calm, personalized email referencing their specific goals and time horizon. Frame volatility in context of their long-term plan. Include past-performance disclaimer. If conservative client: emphasize stability and plan adherence. If growth-oriented: frame as potential opportunity. SUBJECT: and BODY_HTML: as separate fields. If SKIP: output just SKIP.', maxSteps: 5 },
            ],
            evaluate: true,
            evaluationCriteria: 'Includes past-performance disclaimer. No market predictions. Tone matches client risk profile. References client-specific goals.',
        });

        const output = String(message.data || '');
        if (!output.includes('SKIP')) {
            await deliverSecureMessage({ clientId: id, content: output });

            await client.memory.memorize({
                content: `[MARKET-COMM] Sent market event communication re: ${eventDescription}. ${new Date().toISOString()}`,
                record_id: id, enhanced: true,
                tags: ['generated', 'market-communication', 'client-outreach'],
            });
        }
    }
}
```

---

## Quick Wins (First Week)

1. **Set up regulatory governance variables** — mandatory before any generation
2. **Client meeting prep briefs** — highest time-saving value for advisors
3. **Import client profiles** via `memorizeBatch()` from CRM
4. **Quarterly review templates** — structured, compliant, personalized
5. **Market event communication pipeline** — reactive but high-impact
