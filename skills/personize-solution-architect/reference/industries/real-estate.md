# Industry Blueprint: Real Estate / PropTech

Real estate is deeply personal and relationship-driven. Agents manage dozens of clients simultaneously, each with different criteria, timelines, and emotional states. Every buyer has must-haves and deal-breakers that evolve with each showing. Every seller needs reassurance and market intelligence. Personize lets agents treat every client like their only client — by remembering everything and generating communication that reflects the full relationship history.

---

## Recommended Schema

| Collection | Key Properties | Why |
|---|---|---|
| `Buyer` | budget_range, preferred_neighborhoods, must_haves, deal_breakers, pre_approval_status, timeline, family_size, commute_requirements, lifestyle_priorities, school_district_preference, showing_feedback_summary, properties_viewed_count | Buyer matching intelligence |
| `Seller` | property_address, asking_price, listing_date, days_on_market, showing_count, feedback_themes, comparable_sales_summary, motivation_level, timeline_pressure, price_reduction_history | Listing management |
| `Property` | address, price, bedrooms, bathrooms, sqft, lot_size, neighborhood, school_district, listing_status, unique_features, condition, parking, hoa_fees, year_built, recent_improvements | Property matching |
| `Transaction` | stage, closing_date, inspection_status, financing_status, contingencies, key_dates, agent_notes, title_status | Transaction tracking |
| `Referral-Contact` | relationship_type, purchase_date, home_anniversary, last_contact_date, referral_given, satisfaction_level | Long-term relationship nurturing |

---

## Governance Setup

| Variable | Purpose | Content |
|---|---|---|
| `fair-housing` | Fair Housing Act compliance | "Never reference race, color, religion, sex, national origin, familial status, or disability in property descriptions or client communications. Never steer clients toward or away from neighborhoods based on demographics. Describe properties by features, not by 'type of people who live there.'" |
| `agency-disclosure` | Agency relationship clarity | "Always clarify representation relationship. Dual agency disclosures must be explicit. Never share confidential client information (motivation, bottom line) with the other party." |
| `advertising-rules` | MLS and advertising compliance | "All listings must include brokerage name and agent license number. No misleading claims about property condition. 'As-is' properties must be clearly labeled. Virtual staging must be disclosed." |
| `communication-tone` | Client communication style | "Warm and professional. Excited but not pushy. Never use high-pressure tactics. Respect the emotional weight of home buying/selling — this is often the biggest financial decision of someone's life." |
| `market-data` | How to present market data | "Use verified MLS data only. Always provide date range for comparables. Present data objectively — let clients draw their own conclusions. Never guarantee appreciation or market direction." |

```typescript
await client.guidelines.create({
    name: 'Fair Housing Compliance',
    content: `CRITICAL — Fair Housing Act compliance is non-negotiable:
    NEVER reference or describe neighborhoods by demographic composition
    NEVER steer clients toward/away from areas based on race, religion, family status, etc.
    Property descriptions: focus on physical features, condition, location amenities (parks, transit, schools by rating not composition)
    If a client asks about "the kind of people in the neighborhood" — redirect to factual community data (crime stats, school ratings, walkability scores)
    Marketing: no terms like "exclusive," "prestigious," or "family neighborhood" that could imply exclusion
    Always include Equal Housing Opportunity logo and language in marketing materials`,
    triggerKeywords: ['listing', 'neighborhood', 'property description', 'marketing', 'fair housing', 'community'],
    tags: ['compliance', 'fair-housing', 'real-estate'],
});
```

---

## Unified Memory: What to Memorize

| Source | Method | What Gets Extracted |
|---|---|---|
| MLS listings | `memorizeBatch()` daily | Property features, pricing, status changes, DOM |
| Showing feedback | `memorize()` per showing | What they liked, disliked, emotional reactions, comparison to other properties |
| Client intake forms | `memorize()` at intake | Criteria, budget, timeline, lifestyle needs, deal-breakers |
| Market data updates | `memorize()` weekly | Price trends by neighborhood, inventory levels, days-on-market averages |
| Transaction milestones | `memorize()` per milestone | Inspection results, financing status, contingency updates |
| Past purchases | `memorize()` per closing | What they bought, price, date — for anniversary and referral cultivation |
| Phone/meeting notes | `memorize()` per conversation | Criteria changes, emotional state, concerns, decision factors |

### Evolving Buyer Preferences

The key insight in real estate: buyer criteria evolve with every showing. Memorize feedback after each showing to refine the matching algorithm:

```typescript
// After each showing, memorize feedback
await client.memory.memorize({
    content: `Showing feedback — ${property.address} (${new Date().toLocaleDateString()}):
    Overall reaction: ${feedback.overallReaction}
    Liked: ${feedback.liked.join(', ')}
    Disliked: ${feedback.disliked.join(', ')}
    Compared to: ${feedback.comparedTo || 'N/A'}
    Would revisit: ${feedback.wouldRevisit ? 'Yes' : 'No'}
    New criteria discovered: ${feedback.newCriteria || 'None'}
    Dealbreaker identified: ${feedback.dealbreaker || 'None'}`,
    email: buyer.email,
    enhanced: true,
    tags: ['showing', 'feedback', property.neighborhood],
});
```

---

## Use Cases by Function

### Buyer Representation (14 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Smart Property Matching** | New listing on MLS | Memory (criteria + showing feedback + lifestyle) → Generate (personalized recommendation explaining lifestyle fit) |
| 2 | **Showing Debrief + Criteria Refinement** | Showing completed | Memory (all showings + feedback) → Generate (summary with refined criteria + next recommendations) |
| 3 | **Market Update Personalization** | Weekly cron | Memory (target neighborhoods + budget) → Generate (market update focusing only on relevant areas) |
| 4 | **Neighborhood Guide** | Buyer mentions interest | Memory (lifestyle priorities: schools, dining, commute) → Generate (custom guide highlighting what matters to them) |
| 5 | **Price Reduction Alert** | Price change event | Memory (buyers whose budget now includes this property) → Signal (personalized "good news" notification) |
| 6 | **Buyer Fatigue Check-In** | 30+ showings, no offer | Memory (showing history + emotional signals) → Generate (empathetic check-in with strategy adjustment suggestion) |
| 7 | **Offer Strategy Brief** | Buyer ready to offer | Memory (property + comparables + buyer's position) → Governance (agency rules) → Generate (offer strategy with market context) |
| 8 | **Inspection Prep Guide** | Offer accepted | Memory (property condition notes + age) → Generate (personalized inspection checklist based on property specifics) |
| 9 | **Financing Milestone Updates** | Financing events | Memory (loan type + timeline) → Generate (status update with next steps and dates) |
| 10 | **Closing Countdown** | 2 weeks to close | Memory (all pending items) → Generate (personalized closing checklist with outstanding tasks) |
| 11 | **New Construction Progress** | Construction milestones | Memory (build specs + buyer selections) → Generate (progress update with photos and timeline) |
| 12 | **Relocation Concierge** | Relocation client identified | Memory (from where, family needs, employer, start date) → Generate (comprehensive guide: neighborhoods, schools, commute, utilities) |
| 13 | **Investment Property Analysis** | Investor inquiry | Memory (investment criteria + portfolio) → Generate (property analysis with rental yield, cap rate, comparable rents) |
| 14 | **First-Time Buyer Education** | First-time buyer identified | Memory (financial readiness + concerns) → Generate (step-by-step education series tailored to their situation) |

### Seller Representation (10 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Listing Preparation Plan** | Listing agreement signed | Memory (property condition + market data) → Generate (personalized prep plan: repairs, staging, photography) |
| 2 | **Listing Description Generation** | Ready to list | Memory (property features + neighborhood + buyer persona data) → Governance (fair housing + advertising) → Generate (compelling listing copy) |
| 3 | **Showing Feedback Summary** | After each showing | Memory (all feedback) → Generate (weekly summary for seller with themes and market positioning insights) |
| 4 | **Price Reduction Strategy** | DOM > threshold | Memory (showing feedback + market data + comparables) → Generate (data-backed price discussion with specific recommendation) |
| 5 | **Weekly Seller Update** | Weekly cron | Memory (showings + inquiries + market activity) → Generate (update with context and strategy recommendations) |
| 6 | **Open House Follow-Up** | Open house completed | Memory (visitor info + interests) → Generate (personalized follow-up per visitor) |
| 7 | **Offer Presentation Prep** | Offer received | Memory (seller goals + market context) → Generate (offer analysis with strengths, weaknesses, recommendation) |
| 8 | **Multiple Offer Strategy** | Multiple offers | Memory (all offers + seller priorities) → Generate (comparison matrix with strategic recommendation) |
| 9 | **Counter-Offer Communication** | Negotiation phase | Memory (offer details + seller bottom line) → Governance (agency rules) → Generate (professional counter-offer communication) |
| 10 | **Post-Sale Referral Cultivation** | 90 days post-close | Memory (sale details + experience) → Generate (check-in with home care tips + subtle referral ask) |

### Long-Term Relationship / Referral (6 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Home Anniversary** | Purchase anniversary | Memory (property + purchase details) → Generate (anniversary email with estimated home value + neighborhood update) |
| 2 | **Home Maintenance Reminders** | Seasonal | Memory (home age + systems + climate) → Generate (personalized seasonal maintenance checklist) |
| 3 | **Neighborhood News Digest** | Monthly | Memory (client's neighborhood + interests) → Generate (relevant community news + events) |
| 4 | **Referral Thank You + Update** | Referral received | Memory (referral details + transaction progress) → Generate (thank you with status update) |
| 5 | **Life Event → Move Signal** | Life event detected | Memory (family changes + current home) → Generate (gentle check-in: "growing family? Your 2BR might be feeling small") |
| 6 | **Market Milestone Alert** | Home value milestone | Memory (purchase price + current estimate) → Generate (value update celebrating equity growth) |

---

## Agent Coordination: Transaction Workspace

Real estate transactions involve multiple agents coordinating: buyer's agent, seller's agent, lender, inspector, title company, appraiser.

```typescript
// Buyer's agent records showing and offer status
await client.memory.memorize({
    content: `[BUYERS-AGENT] Offer submitted on 123 Oak St at $485,000 (5% above asking). Contingencies: inspection (10 days), financing (21 days), appraisal. Earnest money: $10,000. Buyer pre-approved for $500,000. Competing offer situation — seller reviewing all offers by Friday 5pm.`,
    email: buyer.email, enhanced: true,
    tags: ['workspace', 'transaction', 'offer', '123-oak-st'],
});

// Lender agent updates financing status
await client.memory.memorize({
    content: `[LENDER-AGENT] Loan application submitted. Credit: approved. Income verification: pending employer letter. Appraisal: ordered, scheduled for next Tuesday. Rate locked at market rate for 45 days. Estimated closing costs sent to buyer. No issues anticipated.`,
    email: buyer.email, enhanced: true,
    tags: ['workspace', 'transaction', 'financing', '123-oak-st'],
});

// Transaction coordinator synthesizes for client update
const transactionContext = await client.memory.smartRecall({
    query: 'all transaction updates, financing, inspection, title, appraisal status',
    email: buyer.email, limit: 20, min_score: 0.3,
    filters: { conditions: [{ property: 'tags', operator: 'CONTAINS', value: 'transaction' }] },
});

const update = await client.ai.prompt({
    context: JSON.stringify(transactionContext.data?.results),
    instructions: [
        { prompt: 'Synthesize all transaction updates. What is the current status of each contingency? What are the next milestones and dates?', maxSteps: 3 },
        { prompt: 'Generate a client-friendly transaction update. Clear status for each item (inspection, financing, appraisal, title). Upcoming dates and what to expect. Warm, reassuring tone — buying a home is stressful. SUBJECT: and BODY: fields.', maxSteps: 5 },
    ],
});
```

---

## Key Workflow: Smart Property Matching with Learning

```typescript
async function matchNewListings(buyerEmail: string) {
    // 1. Get the full buyer profile including evolving preferences
    const buyerContext = await client.memory.smartDigest({
        email: buyerEmail, type: 'Buyer', token_budget: 2500,
        include_properties: true, include_memories: true,
    });

    // 2. Get showing history to understand preference evolution
    const showingHistory = await client.memory.smartRecall({
        query: 'all showing feedback: what they liked, disliked, dealbreakers discovered, emotional reactions',
        email: buyerEmail, limit: 25, min_score: 0.4,
    });

    // 3. Get new listings in their areas
    const newListings = await client.memory.smartRecall({
        query: 'new active listings matching buyer criteria',
        type: 'Property', limit: 15, min_score: 0.5,
        filters: { conditions: [
            { property: 'listing_status', operator: 'EQ', value: 'active' },
        ]},
    });

    // 4. Governance
    const governance = await client.ai.smartGuidelines({
        message: 'fair housing compliance, property description guidelines, communication tone',
        mode: 'fast',
    });

    const context = [
        governance.data?.compiledContext || '',
        buyerContext.data?.compiledContext || '',
        `Showing history and feedback: ${JSON.stringify(showingHistory.data?.results)}`,
        `New listings: ${JSON.stringify(newListings.data?.results)}`,
    ].join('\n\n---\n\n');

    const recommendation = await client.ai.prompt({
        context,
        instructions: [
            { prompt: 'Analyze the buyer\'s evolving preferences from their showing feedback. How have their criteria changed? What patterns emerge (they say they want X but consistently prefer Y)?', maxSteps: 5 },
            { prompt: 'Match new listings to this buyer. Consider both stated criteria AND revealed preferences from showing history. Rank top 3 matches with specific lifestyle-fit reasoning (not just specs).', maxSteps: 5 },
            { prompt: 'Write a property recommendation email. For each property (max 3): why it fits THEIR life specifically. Reference past showing feedback ("you loved the natural light at [address] — this home has even more"). Fair housing compliant — describe features, not demographics. SUBJECT: and BODY_HTML: fields.', maxSteps: 5 },
        ],
        evaluate: true,
        evaluationCriteria: 'Fair housing compliant (no demographic references). References specific showing feedback. Lifestyle-fit reasoning, not just specifications.',
    });

    await client.memory.memorize({
        content: `[PROPERTY-MATCH] Sent ${3} property recommendations. Properties: [extracted from output]. ${new Date().toISOString()}`,
        email: buyerEmail, enhanced: true,
        tags: ['generated', 'property-match', 'recommendation'],
    });

    return recommendation.data;
}
```

---

## Quick Wins (First Week)

1. **Import existing clients and contacts** via `memorizeBatch()` from CRM
2. **Set up fair housing governance** — non-negotiable compliance
3. **Showing feedback capture** — start building the preference evolution data
4. **Weekly seller updates** — immediate time savings for agents
5. **Home anniversary emails** — reactivate dormant referral relationships
