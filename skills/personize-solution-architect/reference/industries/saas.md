# Industry Blueprint: SaaS / B2B Software

SaaS companies sit on a goldmine of behavioral data — product usage, support tickets, billing events, feature requests — but rarely connect it to outbound communication. The result: generic onboarding, one-size-fits-all nurture emails, and CS teams flying blind into renewal calls. Personize unifies all of this into a single memory layer that every team and agent can read from.

---

## Recommended Schema

| Collection | Key Properties | Why |
|---|---|---|
| `Contact` | role, department, technical_level, onboarding_status, feature_adoption_score, last_active, communication_preferences, decision_maker_flag, champion_score | Per-person intelligence |
| `Company` | industry, employee_count, plan_tier, arr, contract_end_date, health_score, icp_fit_score, tech_stack, competitors_mentioned, expansion_signals | Account-level decisions |
| `Deal` | stage, close_date, deal_size, champion, blockers, competitor_mentioned, decision_criteria, next_step, stakeholders_mapped | Pipeline intelligence |
| `Product-User` | features_used, features_not_used, usage_frequency, api_calls_30d, last_feature_discovered, power_user_flag, error_rate, integration_count | Usage intelligence |

---

## Governance Setup

Create these governance variables before generating any content:

| Variable | Purpose | Example Content |
|---|---|---|
| `brand-voice` | Tone and style for all outbound | "Professional but approachable. Use 'you' not 'users'. No jargon unless talking to developers." |
| `icp-definition` | Ideal customer profile for scoring | "Mid-market B2B SaaS, 50-500 employees, using CRM, has dedicated CS team" |
| `competitor-policy` | How to handle competitor mentions | "Never disparage competitors by name. Focus on our differentiators. If asked directly, acknowledge and redirect to our strengths." |
| `pricing-rules` | Discount and pricing communication | "Never offer discounts without manager approval. Always position value before price. Annual plans: highlight savings vs monthly." |
| `email-playbook` | Sequence rules and timing | "Max 3 emails per sequence. Min 3 days between emails. No emails on weekends. Always include unsubscribe." |
| `data-handling` | What data can be referenced in outreach | "Can reference: company name, role, product usage stats, feature adoption. Cannot reference: revenue, employee count (feels creepy), internal org structure." |

```typescript
// Set up governance variables
await client.guidelines.create({
    name: 'SaaS Brand Voice',
    content: 'Professional but approachable. Use "you" not "users". Technical terms OK for developer audience, plain language for business audience. Never start emails with "I hope this finds you well."',
    triggerKeywords: ['brand voice', 'tone', 'writing style', 'email', 'communication'],
    tags: ['brand', 'voice', 'tone'],
});

await client.guidelines.create({
    name: 'Competitor Mention Policy',
    content: 'Never disparage competitors by name. If a prospect mentions a competitor, acknowledge their choice and pivot to our unique differentiators: unified memory, governance layer, and multi-channel personalization. Never make unverified claims about competitor limitations.',
    triggerKeywords: ['competitor', 'vs', 'alternative', 'comparison', 'switch from'],
    tags: ['competitor', 'sales', 'policy'],
});
```

---

## Unified Memory: What to Memorize

### Data Sources → Memorization Strategy

| Source | Method | `extractMemories` | What Gets Extracted |
|---|---|---|---|
| CRM (HubSpot, Salesforce) | `memorizeBatch()` on schedule | `false` for structured fields, `true` for notes/descriptions | Contact details, deal stages, activity timeline |
| Product analytics (Mixpanel, Amplitude, PostHog) | `memorize()` per event batch | `true` | Feature usage patterns, adoption milestones, drop-off signals |
| Support tickets (Zendesk, Intercom) | `memorize()` per ticket | `true` | Pain points, feature requests, sentiment, resolution patterns |
| Call transcripts (Gong, Chorus) | `memorize()` per call | `true` | Buyer signals, objections, decision criteria, stakeholder mapping |
| Billing events (Stripe) | `memorize()` per event | `false` | Plan changes, payment failures, expansion triggers |
| Product usage logs | `memorizeBatch()` weekly summary | `true` | Power user identification, feature gaps, integration usage |
| Email engagement | `memorize()` per campaign | `false` | Open/click/reply rates, content preferences |

### Cross-Entity Context

Always pull company context when working on a contact — prevents blind spots:

```typescript
const [contactContext, companyContext] = await Promise.all([
    client.memory.smartDigest({ email: contact.email, type: 'Contact', token_budget: 2000 }),
    client.memory.smartDigest({ website_url: contact.companyDomain, type: 'Company', token_budget: 1500 }),
]);

const fullContext = [
    contactContext.data?.compiledContext || '',
    companyContext.data?.compiledContext || '',
].join('\n\n--- Company Context ---\n\n');
```

---

## Use Cases by Department

### Sales (15 use cases)

| # | Use Case | Trigger | Personize Capabilities Used |
|---|---|---|---|
| 1 | **Trial-to-Paid Conversion** | Trial day 7, 11, 13 | Memory (usage data) → Governance (pricing rules) → Generate (conversion email) |
| 2 | **Champion Identification** | Weekly cron | Memory (activity ranking) → Generate (internal brief for rep) |
| 3 | **Competitive Displacement** | CRM field update | Memory (competitor mentions from calls) → Governance (competitor policy) → Generate (battle-card outreach) |
| 4 | **Expansion Revenue Targeting** | Monthly cron | Memory (usage near limits) → Generate (upgrade proposal with ROI) |
| 5 | **Multi-Threading Outreach** | Deal stage = Negotiation | Memory (all contacts at account) → Generate (role-specific emails per stakeholder) |
| 6 | **Win-Back Sequences** | 90 days post-churn | Memory (churn reason + history) → Generate (win-back referencing improvements) |
| 7 | **Meeting Prep Brief** | Calendar event | Memory (contact + company + deal) → Generate (one-page prep brief) |
| 8 | **Deal Risk Alerts** | Daily cron | Memory (velocity + engagement) → Signal (Slack alert to rep) |
| 9 | **Proposal Personalization** | Deal stage = Proposal | Memory (pain points + industry) → Governance (pricing rules) → Generate (custom proposal sections) |
| 10 | **Inbound Lead Enrichment** | Signup event | Memory (memorize all data) → Memory (recall similar won deals) → Generate (qualification + routing) |
| 11 | **Renewal Prep Package** | 60 days pre-renewal | Memory (full account activity) → Generate (renewal deck with usage stats + ROI) |
| 12 | **Post-Demo Follow-Up** | Demo completed | Memory (demo notes) → Generate (follow-up referencing specific demo moments) |
| 13 | **Stakeholder Mapping** | New deal created | Memory (recall all contacts at company) → Generate (stakeholder map with influence + concerns) |
| 14 | **Pricing Objection Response** | Rep requests help | Memory (prospect context) → Governance (pricing rules + case studies) → Generate (value-first response) |
| 15 | **Lost Deal Analysis** | Deal marked closed-lost | Memory (all interactions) → Generate (loss analysis + lessons learned → memorize back) |

### Marketing (12 use cases)

| # | Use Case | Trigger | Personize Capabilities Used |
|---|---|---|---|
| 1 | **ICP-Targeted Content** | Bi-weekly cron | Memory (ICP segment + consumption history) → Generate (personalized content recommendations) |
| 2 | **Event Follow-Up** | Event ends | Memory (attendance + conversations) → Generate (personalized follow-up per attendee) |
| 3 | **Product-Led Growth Nurture** | Usage milestone | Memory (milestone details) → Generate (celebration + next feature suggestion) |
| 4 | **ABM Campaign** | Campaign launch | Memory (all stakeholders at target) → Generate (role-specific emails + landing page copy) |
| 5 | **Referral Request** | NPS > 8 + recent success | Memory (satisfaction + wins) → Generate (referral ask timed to positive moment) |
| 6 | **Case Study Matching** | Lead score threshold | Memory (prospect industry + size) → Memory (recall similar customers) → Generate ("companies like you" email) |
| 7 | **Webinar Promotion** | 2 weeks before | Memory (interests + past attendance) → Generate (personalized invite explaining relevance) |
| 8 | **Re-engagement** | 30 days inactive | Memory (what they used to engage with) → Generate (win-back referencing peak usage) |
| 9 | **Newsletter Personalization** | Weekly send | Memory (role + interests + activity) → Generate (unique "top picks for you" per subscriber) |
| 10 | **Product Launch Announcement** | Feature ship | Memory (who requested/needs this feature) → Generate ("you asked, we built it" email) |
| 11 | **Persona-Based Onboarding Drip** | Signup + role identified | Memory (role + goals) → Generate (role-specific education sequence) |
| 12 | **Community Engagement** | Community milestone | Memory (contribution history) → Generate (recognition + exclusive content offer) |

### Customer Success (12 use cases)

| # | Use Case | Trigger | Personize Capabilities Used |
|---|---|---|---|
| 1 | **Health Score Alert + Action Plan** | Health < 60 | Memory (usage decline + tickets) → Signal (Slack to CSM) → Generate (action plan) |
| 2 | **QBR Auto-Generation** | Quarterly cron | Memory (all quarter activity) → Generate (executive summary + ROI + recommendations) |
| 3 | **Onboarding Progress Tracker** | Onboarding event | Memory (steps completed) → Generate (nudge for next step or celebrate completion) |
| 4 | **Proactive Feature Adoption** | Monthly cron | Memory (unused but relevant features) → Generate ("did you know?" email with workflow suggestion) |
| 5 | **Escalation Context Brief** | Ticket priority = urgent | Memory (full customer history) → Generate (escalation brief for manager) |
| 6 | **Renewal Risk Dashboard** | 90 days pre-renewal | Memory (sentiment + usage + issues) → Generate (risk assessment with talking points) |
| 7 | **Success Milestone Celebration** | Milestone event | Memory (achievement details) → Generate (congratulations + "what's next") |
| 8 | **Customer Feedback Response** | Survey response | Memory (feedback history) → Generate (personalized response acknowledging their specific feedback) |
| 9 | **Cross-Sell Intelligence** | Quarterly review | Memory (features used + benchmarks) → Generate (add-on recommendation with fit explanation) |
| 10 | **CSM Handoff Brief** | CSM assignment change | Memory (full relationship history) → Generate (handoff document with nuances + preferences + risks) |
| 11 | **Usage Regression Alert** | Usage drops 30%+ WoW | Memory (what changed) → Signal (alert to CSM) → Generate (proactive check-in) |
| 12 | **Executive Sponsor Engagement** | Quarterly | Memory (exec's priorities + company goals) → Generate (strategic value update for exec sponsor) |

### Product / Engineering (8 use cases)

| # | Use Case | Trigger | Personize Capabilities Used |
|---|---|---|---|
| 1 | **Feature Request Intelligence** | Monthly cron | Memory (all requests from tickets + calls) → Generate (prioritized report with customer impact) |
| 2 | **Personalized Changelog** | Feature release | Memory (who requested/needs it) → Generate ("we shipped what you asked for" notification) |
| 3 | **Beta Invite Targeting** | Beta launch | Memory (usage patterns + engagement) → Generate (personalized beta invite) |
| 4 | **API Deprecation Communication** | Deprecation scheduled | Memory (who uses deprecated endpoint) → Generate (migration email with their usage patterns) |
| 5 | **Error Pattern Response** | Error threshold hit | Memory (repeated errors per user) → Generate (proactive fix guidance) |
| 6 | **Developer Onboarding** | Signup | Memory (stated tech stack) → Generate (customized quickstart with relevant SDKs) |
| 7 | **Usage Anomaly Detection** | Daily cron | Memory (normal usage baseline) → Signal (alert on anomaly) → Generate (likely explanation) |
| 8 | **Integration Health Monitor** | Hourly check | Memory (connected integrations per account) → Signal (alert on integration failure) |

### Operations / Internal (6 use cases)

| # | Use Case | Trigger | Personize Capabilities Used |
|---|---|---|---|
| 1 | **Sales-to-CS Handoff** | Deal closed-won | Memory (all sales interactions) → Workspace (create CS workspace) → Generate (handoff brief) |
| 2 | **Compliance Audit Trail** | Quarterly audit | Memory (all AI-generated communications) → Generate (compliance report) |
| 3 | **Revenue Intelligence Digest** | Daily 6 AM cron | Memory (pipeline changes + risks + signals) → Generate (executive digest) |
| 4 | **Team Performance Insights** | Weekly cron | Memory (rep activity) → Generate (per-rep insights with coaching suggestions) |
| 5 | **Process Bottleneck Detection** | Monthly cron | Memory (workflow execution data) → Generate (bottleneck report with root causes) |
| 6 | **Customer Voice Report** | Monthly cron | Memory (all customer feedback, tickets, calls) → Generate (themes, sentiment trends, feature demand) |

---

## Agent Coordination: Workspace Patterns

### Sales-to-CS Handoff Workspace

When a deal closes, create a workspace that both sales and CS agents can coordinate on:

```typescript
// Sales agent: Record what happened during the sale
await client.memory.memorize({
    content: JSON.stringify({
        type: 'sales-handoff',
        champion: 'Sarah Chen, VP Engineering',
        decision_criteria: ['API-first', 'SOC2 compliance', 'Sub-200ms latency'],
        commitments_made: ['Dedicated onboarding call', 'Custom integration support', 'Quarterly reviews'],
        risks: ['Competing eval with Competitor X not fully resolved', 'Budget owner (CFO) not fully bought in'],
        technical_requirements: ['SSO integration', 'Custom webhook format', 'On-prem data residency'],
    }),
    website_url: account.domain,
    enhanced: true,
    tags: ['workspace', 'handoff', 'sales-to-cs'],
});

// CS agent: Read handoff context before first interaction
const handoff = await client.memory.smartRecall({
    query: 'sales handoff notes, commitments, risks, and decision criteria',
    website_url: account.domain, limit: 10, min_score: 0.5,
    filters: { conditions: [{ property: 'tags', operator: 'CONTAINS', value: 'handoff' }] },
});

// CS agent: Record onboarding progress
await client.memory.memorize({
    content: `[ONBOARDING] Week 1 complete. SSO integration done. Webhook format customization in progress. Sarah confirmed satisfied with API documentation. Next: data migration.`,
    website_url: account.domain,
    enhanced: true,
    tags: ['workspace', 'onboarding', 'cs-progress'],
});
```

### Multi-Agent Account Intelligence

Multiple agents (sales, CS, product, marketing) contribute to the same account context:

```typescript
// Each agent reads the full workspace before acting
const workspaceContext = await client.memory.smartRecall({
    query: 'all agent contributions, updates, and coordination notes',
    website_url: account.domain, limit: 30, min_score: 0.3,
    filters: { conditions: [{ property: 'tags', operator: 'CONTAINS', value: 'workspace' }] },
});

// Each agent writes its contribution with clear attribution
await client.memory.memorize({
    content: `[PRODUCT-AGENT] Feature request detected: Custom dashboard widgets. 3 stakeholders mentioned this in separate conversations. Priority: HIGH. Relates to their Q2 goal of self-service analytics.`,
    website_url: account.domain,
    enhanced: true,
    tags: ['workspace', 'product-feedback', 'feature-request'],
});
```

---

## Signal / Notification Patterns

### Deal Risk Signal

```typescript
// Configure signal to evaluate deal risk daily
// The signal engine decides IF this notification should fire

// Event source: daily cron scanning all active deals
const deals = await client.memory.search({
    type: 'Deal',
    filters: { conditions: [{ property: 'stage', operator: 'NEQ', value: 'Closed Won' }] },
});

for (const [id, deal] of Object.entries(deals.data?.records || {})) {
    const context = await client.memory.smartDigest({
        record_id: id, type: 'Deal', token_budget: 2000,
    });

    const riskAssessment = await client.ai.prompt({
        context: context.data?.compiledContext,
        instructions: [
            { prompt: 'Assess deal risk: days in current stage, engagement trend, blocker severity, competitor threat. Score 1-10.', maxSteps: 3 },
            { prompt: 'If risk > 6: generate a Slack alert for the rep with specific recommended actions. If risk <= 6: output SKIP.', maxSteps: 3 },
        ],
    });

    // Signal decision: only notify if risk warrants it
    const output = String(riskAssessment.data || '');
    if (!output.includes('SKIP')) {
        await deliverSlackAlert({ channel: deal.repSlackId, message: output });
    }
}
```

---

## Key Workflows with Code

### Workflow 1: Trial-to-Paid Conversion

```typescript
import { Personize } from '@personize/sdk';
const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

async function generateTrialConversionEmail(userEmail: string, trialDay: number) {
    // 1. Governance — what rules to follow
    const governance = await client.ai.smartGuidelines({
        message: 'trial conversion email guidelines, pricing rules, competitor mention policy, brand voice',
        mode: 'fast',
    });

    // 2. Memory — who is this person and what have they done
    const [userContext, usageContext] = await Promise.all([
        client.memory.smartDigest({ email: userEmail, type: 'Contact', token_budget: 1500 }),
        client.memory.smartRecall({
            query: 'product usage, features tried, integration activity during trial',
            email: userEmail, limit: 15, min_score: 0.4,
        }),
    ]);

    // 3. Generate — personalized conversion email
    const context = [
        governance.data?.compiledContext || '',
        userContext.data?.compiledContext || '',
        `Usage data: ${JSON.stringify(usageContext.data?.results?.slice(0, 5))}`,
    ].join('\n\n---\n\n');

    const result = await client.ai.prompt({
        context,
        instructions: [
            { prompt: `This is trial day ${trialDay}. List the top 3 features this user actually used. What value did they get? What haven't they tried that they'd love?`, maxSteps: 3 },
            { prompt: 'Write a conversion email. Reference their specific usage. Show what they\'d lose. Include one ROI number based on their activity. No generic "upgrade now" language. SUBJECT: and BODY_HTML: as separate fields.', maxSteps: 5 },
        ],
        evaluate: true,
        evaluationCriteria: 'References at least 2 specific features the user tried. No invented metrics. Under 150 words. Clear CTA.',
    });

    // 4. Memorize — close the feedback loop
    await client.memory.memorize({
        content: `[TRIAL-CONVERSION-EMAIL] Day ${trialDay}. Subject: ${String(result.data).match(/SUBJECT:\s*(.+)/i)?.[1] || 'N/A'}. Sent ${new Date().toISOString()}.`,
        email: userEmail,
        enhanced: true,
        tags: ['generated', 'trial', 'conversion', `day-${trialDay}`],
    });

    return result.data;
}
```

### Workflow 2: QBR Auto-Generation

```typescript
async function generateQBR(accountDomain: string, quarter: string) {
    // 1. Full account context
    const accountDigest = await client.memory.smartDigest({
        website_url: accountDomain, type: 'Company', token_budget: 4000,
        include_properties: true, include_memories: true,
    });

    // 2. Quarter-specific activity
    const quarterActivity = await client.memory.smartRecall({
        query: `all activity, support tickets, feature usage, milestones, and communications for ${quarter}`,
        website_url: accountDomain, limit: 50, min_score: 0.3,
    });

    // 3. Workspace context — what all agents know
    const agentContributions = await client.memory.smartRecall({
        query: 'agent contributions, notes, and updates from all teams',
        website_url: accountDomain, limit: 20, min_score: 0.3,
        filters: { conditions: [{ property: 'tags', operator: 'CONTAINS', value: 'workspace' }] },
    });

    // 4. Governance — QBR format and rules
    const governance = await client.ai.smartGuidelines({
        message: 'QBR format, customer communication guidelines, data presentation rules',
        mode: 'full',
    });

    const context = [
        governance.data?.compiledContext || '',
        accountDigest.data?.compiledContext || '',
        `Quarter Activity: ${JSON.stringify(quarterActivity.data?.results)}`,
        `Team Notes: ${JSON.stringify(agentContributions.data?.results)}`,
    ].join('\n\n---\n\n');

    const qbr = await client.ai.prompt({
        context,
        instructions: [
            { prompt: `Summarize ${quarter}: usage trends, features adopted, support tickets, milestones. Use actual numbers from memory.`, maxSteps: 5 },
            { prompt: 'Calculate ROI indicators: time saved, automations run, contacts processed, pipeline influenced. Only use verifiable data.', maxSteps: 3 },
            { prompt: 'Generate the QBR document. Sections: Executive Summary (3 sentences), Usage Highlights (bullet list with numbers), ROI Metrics (table), Recommendations for Next Quarter (3 actionable items), Open Items. Structured markdown.', maxSteps: 8 },
        ],
        evaluate: true,
        evaluationCriteria: 'All metrics sourced from memory (no invented numbers). Recommendations are specific and actionable. Executive summary is under 100 words.',
    });

    // 5. Memorize the QBR itself for future reference
    await client.memory.memorize({
        content: `[QBR-GENERATED] ${quarter}. ${String(qbr.data).slice(0, 500)}...`,
        website_url: accountDomain,
        enhanced: true,
        tags: ['workspace', 'qbr', quarter],
    });

    return qbr.data;
}
```

### Workflow 3: Multi-Agent Account Intelligence Pipeline

```typescript
async function runAccountIntelligencePipeline(accountDomain: string) {
    // Sales agent contribution
    const salesInsight = await client.ai.prompt({
        context: (await client.memory.smartDigest({
            website_url: accountDomain, type: 'Deal', token_budget: 2000,
        })).data?.compiledContext,
        instructions: [
            { prompt: 'Analyze pipeline status for this account. What deals are active? What\'s the expansion potential? Any risks?', maxSteps: 5 },
        ],
    });

    await client.memory.memorize({
        content: `[SALES-AGENT] ${String(salesInsight.data)}`,
        website_url: accountDomain, enhanced: true,
        tags: ['workspace', 'sales-intelligence', 'weekly-update'],
    });

    // CS agent contribution
    const csInsight = await client.ai.prompt({
        context: (await client.memory.smartDigest({
            website_url: accountDomain, type: 'Company', token_budget: 2000,
        })).data?.compiledContext,
        instructions: [
            { prompt: 'Assess customer health: engagement trend, support ticket volume and sentiment, feature adoption rate, NPS trend. Flag any concerns.', maxSteps: 5 },
        ],
    });

    await client.memory.memorize({
        content: `[CS-AGENT] ${String(csInsight.data)}`,
        website_url: accountDomain, enhanced: true,
        tags: ['workspace', 'cs-intelligence', 'weekly-update'],
    });

    // Coordination agent reads all contributions and synthesizes
    const allContributions = await client.memory.smartRecall({
        query: 'latest sales, CS, and product agent contributions and intelligence',
        website_url: accountDomain, limit: 10, min_score: 0.4,
        filters: { conditions: [{ property: 'tags', operator: 'CONTAINS', value: 'weekly-update' }] },
    });

    const synthesis = await client.ai.prompt({
        context: JSON.stringify(allContributions.data?.results),
        instructions: [
            { prompt: 'Synthesize all agent contributions into a unified account intelligence brief. Identify: (1) biggest opportunity, (2) biggest risk, (3) recommended next action for each team.', maxSteps: 5 },
        ],
    });

    return synthesis.data;
}
```

---

## Quick Wins (First Week)

1. **Memorize CRM contacts** via `memorizeBatch()` — immediate foundation
2. **Set up brand voice governance** — one variable, used everywhere
3. **Meeting prep briefs** — highest perceived value, lowest effort
4. **Trial conversion email** — direct revenue impact
5. **Health score alerts** — CS team loves this immediately
