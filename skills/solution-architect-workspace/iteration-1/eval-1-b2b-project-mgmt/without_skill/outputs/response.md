# Personize Implementation Proposal for TaskFlow

## Executive Summary

TaskFlow sits on a rich triad of data -- PostgreSQL activity logs, Stripe billing events, and Intercom support conversations -- spanning 2,000 active teams. By connecting these sources through Personize's entity memory and AI layers, you can build account-level intelligence that drives down churn and lifts feature adoption without building a custom ML pipeline. This proposal covers the full architecture: data ingestion, the personalization use cases it enables, and the implementation path.

---

## 1. Data Integration Architecture

### 1.1 Data Sources and What They Contribute

| Source | Key Signals | Entity Key |
|---|---|---|
| **PostgreSQL (Activity)** | Feature usage frequency, project creation rates, team member invite velocity, login recency, workflow automations configured, integrations enabled | `team_id` (account-level) and `user_id` (individual) |
| **Stripe (Billing)** | Plan tier, MRR, expansion/contraction events, payment failures, trial status, usage-based overages, upgrade/downgrade history | `stripe_customer_id` mapped to `team_id` |
| **Intercom (Support)** | Ticket volume, ticket categories, sentiment, resolution time, NPS/CSAT responses, feature requests, frustration signals | `intercom_user_id` mapped to `team_id` and `user_id` |

### 1.2 Ingestion Strategy

**Account-Level Memorization (Primary Entity)**

Each team becomes a Personize record keyed by `team_id`. Use `memorize()` for real-time events and `memorizeBatch()` for nightly syncs.

```typescript
import Personize from '@anthropic/personize-sdk';

const client = new Personize({ apiKey: process.env.PERSONIZE_API_KEY });

// Real-time: when a team activates a new feature
await client.memory.memorize({
  recordId: `team_${teamId}`,
  content: `Team "${teamName}" activated Gantt Charts for the first time. They have 14 members and are on the Pro plan. They've been a customer for 8 months. They previously submitted 2 support tickets asking about timeline visualization.`,
  properties: {
    teamId: teamId,
    plan: 'pro',
    teamSize: 14,
    tenureMonths: 8,
    event: 'feature_activation',
    feature: 'gantt_charts'
  }
});
```

**Nightly Batch Sync (Activity Aggregates)**

```typescript
// Nightly job: sync daily activity summaries for all teams
const teamSummaries = await db.query(`
  SELECT team_id,
         COUNT(DISTINCT user_id) as dau,
         COUNT(*) as total_actions,
         array_agg(DISTINCT feature_name) as features_used,
         MAX(created_at) as last_activity
  FROM activity_log
  WHERE created_at > NOW() - INTERVAL '1 day'
  GROUP BY team_id
`);

await client.memory.memorizeBatch({
  memories: teamSummaries.map(team => ({
    recordId: `team_${team.team_id}`,
    content: `Daily activity summary for ${team.team_id}: ${team.dau} daily active users out of their team, ${team.total_actions} total actions. Features used today: ${team.features_used.join(', ')}. Last activity: ${team.last_activity}.`,
    properties: {
      teamId: team.team_id,
      dau: team.dau,
      totalActions: team.total_actions,
      reportDate: new Date().toISOString(),
      event: 'daily_activity_summary'
    }
  }))
});
```

**Support Ticket Ingestion (via Intercom Webhook)**

```typescript
// Intercom webhook handler
app.post('/webhooks/intercom', async (req, res) => {
  const { conversation, user } = req.body;
  const teamId = await resolveTeamId(user.email);

  await client.memory.memorize({
    recordId: `team_${teamId}`,
    content: `Support ticket from ${user.name} (${user.email}): "${conversation.subject}". Category: ${conversation.tags.join(', ')}. Sentiment detected: ${conversation.sentiment}. Full message: ${conversation.body}`,
    properties: {
      teamId: teamId,
      userId: user.external_id,
      ticketCategory: conversation.tags[0],
      sentiment: conversation.sentiment,
      event: 'support_ticket'
    }
  });

  res.sendStatus(200);
});
```

**Billing Event Ingestion (via Stripe Webhook)**

```typescript
// Stripe webhook handler
app.post('/webhooks/stripe', async (req, res) => {
  const event = req.body;

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object;
    const teamId = await resolveTeamIdFromStripe(sub.customer);
    const previousPlan = event.data.previous_attributes?.items?.data?.[0]?.price?.id;

    await client.memory.memorize({
      recordId: `team_${teamId}`,
      content: `Billing change: Team ${teamId} changed from ${previousPlan} to ${sub.items.data[0].price.id}. New MRR: $${sub.items.data[0].price.unit_amount / 100}. Change reason context: ${sub.cancellation_details?.comment || 'none provided'}.`,
      properties: {
        teamId: teamId,
        event: 'billing_change',
        newPlan: sub.items.data[0].price.id,
        mrr: sub.items.data[0].price.unit_amount / 100,
        changeType: previousPlan ? 'plan_change' : 'new_subscription'
      }
    });
  }

  res.sendStatus(200);
});
```

---

## 2. Personalization Opportunities

### Opportunity 1: Churn Risk Detection and Proactive Intervention

**Problem:** Teams churn silently. By the time a cancellation happens, it is too late.

**How It Works:**

Use `smartDigest()` to compile a holistic health picture per account, then use `prompt()` to classify risk and generate an intervention plan.

```typescript
// Weekly churn risk assessment for each team
async function assessChurnRisk(teamId: string) {
  // Pull the full account context from Personize
  const digest = await client.memory.smartDigest({
    recordId: `team_${teamId}`
  });

  // Use AI to evaluate churn risk with organizational guidelines
  const guidelines = await client.ai.smartGuidelines({
    context: 'churn_prevention'
  });

  const assessment = await client.ai.prompt({
    instructions: [
      {
        type: 'system',
        content: `You are a B2B SaaS churn analyst for TaskFlow, a project management tool. Analyze the account digest and classify churn risk as LOW, MEDIUM, HIGH, or CRITICAL. Consider these signals:

        HIGH-RISK INDICATORS:
        - Declining daily active users over 3+ weeks
        - Support tickets about missing features or bugs with negative sentiment
        - Payment failures or downgrade events
        - Low feature breadth (using <3 core features)
        - Admin login gap >14 days
        - Team size shrinking

        HEALTHY INDICATORS:
        - Growing DAU or stable high usage
        - Feature expansion (adopting new features)
        - Positive support interactions
        - Plan upgrades or seat additions
        - Active integrations

        Return a JSON object with: riskLevel, riskScore (0-100), topRiskFactors (array), recommendedActions (array), suggestedOutreach (personalized message draft).`
      },
      {
        type: 'user',
        content: `Account digest for team ${teamId}:\n\n${digest.content}`
      }
    ]
  });

  return assessment;
}
```

**Intervention Triggers:**
- **CRITICAL risk:** Automatically notify the assigned CSM with a personalized briefing and suggested talk track.
- **HIGH risk:** Queue a personalized in-app message from the CS team addressing the team's specific pain points.
- **MEDIUM risk:** Trigger a targeted feature education campaign based on what the team is not using but would benefit from.

**Expected Impact:** Catch 60-70% of at-risk accounts 4-6 weeks before they would otherwise cancel.

---

### Opportunity 2: Intelligent Feature Adoption Campaigns

**Problem:** TaskFlow likely has features (Gantt charts, automations, time tracking, integrations) that many teams never discover. Generic "Did you know?" emails get ignored.

**How It Works:**

For each team, identify which high-value features they have not adopted, then generate personalized recommendations based on their actual workflow patterns.

```typescript
async function generateFeatureRecommendations(teamId: string) {
  const digest = await client.memory.smartDigest({
    recordId: `team_${teamId}`
  });

  // Find similar teams that adopted features successfully
  const similarTeams = await client.memory.recall({
    query: `Teams similar to ${teamId} in size and industry that successfully adopted advanced features like automations, Gantt charts, or integrations and saw increased engagement`,
    filter: {
      event: 'feature_activation'
    },
    limit: 10
  });

  const recommendation = await client.ai.prompt({
    instructions: [
      {
        type: 'system',
        content: `You are a product adoption specialist for TaskFlow. Given an account's current usage patterns and examples of similar teams that successfully adopted new features, recommend the ONE feature most likely to deliver value for this specific team.

        Your recommendation must include:
        1. Which feature to recommend and why it fits their workflow
        2. A specific use case from their actual project data (e.g., "Your team creates 20+ tasks per week but assigns them manually -- automations could save 3 hours/week")
        3. A personalized in-app tooltip or walkthrough trigger point
        4. A short email snippet (2-3 sentences) that a CSM could send

        Do NOT recommend features they already use actively. Focus on the highest-impact gap.`
      },
      {
        type: 'user',
        content: `Account context:\n${digest.content}\n\nSimilar teams that adopted features:\n${similarTeams.results.map(r => r.content).join('\n\n')}`
      }
    ]
  });

  return recommendation;
}
```

**Delivery Channels:**
- In-app contextual tooltips triggered at the right moment (e.g., show Gantt suggestion when a user is manually reordering tasks in a list view).
- Personalized email sequences where each email references the team's actual projects and pain points.
- CSM talk tracks for quarterly business reviews.

**Expected Impact:** 20-35% lift in feature adoption rates for targeted features, leading to higher stickiness and expansion revenue.

---

### Opportunity 3: Personalized Onboarding Paths

**Problem:** New teams get a one-size-fits-all onboarding checklist. A 5-person design agency and a 50-person engineering org have completely different needs.

**How It Works:**

At signup, memorize the team's context from the signup form and Stripe data, then generate a tailored onboarding path.

```typescript
async function createPersonalizedOnboarding(teamId: string, signupData: any) {
  // Memorize initial team context
  await client.memory.memorize({
    recordId: `team_${teamId}`,
    content: `New team signed up: "${signupData.teamName}". Industry: ${signupData.industry}. Team size: ${signupData.teamSize}. Primary use case stated: "${signupData.useCase}". Role of signup user: ${signupData.role}. Plan selected: ${signupData.plan}. Referral source: ${signupData.referralSource}.`,
    properties: {
      teamId,
      event: 'signup',
      industry: signupData.industry,
      teamSize: signupData.teamSize,
      plan: signupData.plan
    }
  });

  // Find successful teams with similar profiles
  const similarSuccesses = await client.memory.recall({
    query: `${signupData.industry} team with ${signupData.teamSize} members that completed onboarding successfully and became active long-term users of TaskFlow`,
    limit: 5
  });

  const onboardingPlan = await client.ai.prompt({
    instructions: [
      {
        type: 'system',
        content: `You are an onboarding specialist for TaskFlow. Generate a personalized 14-day onboarding plan for this new team.

        Rules:
        - Prioritize features relevant to their stated use case and industry
        - If they are a small team (<10), focus on simplicity and quick wins
        - If they are a large team (>20), emphasize permissions, views, and integrations early
        - Reference what similar successful teams did during their first 2 weeks
        - Each day should have ONE clear action with a specific outcome
        - Include milestones that correlate with long-term retention (e.g., "teams that create 3+ projects in week 1 have 80% lower churn")

        Return a structured JSON plan with daily steps, each containing: day, action, reason, successMetric, inAppTrigger.`
      },
      {
        type: 'user',
        content: `New team profile:\n${JSON.stringify(signupData)}\n\nSimilar successful teams:\n${similarSuccesses.results.map(r => r.content).join('\n\n')}`
      }
    ]
  });

  return onboardingPlan;
}
```

**Expected Impact:** 25-40% improvement in time-to-value, 15-20% improvement in trial-to-paid conversion.

---

### Opportunity 4: Context-Aware Support Automation

**Problem:** When a team submits a support ticket, the agent starts from zero. They don't know the team's plan, usage patterns, recent frustrations, or history.

**How It Works:**

When an Intercom conversation opens, pull the team's full context and provide it to the support agent (or AI copilot).

```typescript
async function enrichSupportTicket(teamId: string, ticketContent: string) {
  const digest = await client.memory.smartDigest({
    recordId: `team_${teamId}`
  });

  // Search for similar past issues from other teams
  const similarIssues = await client.memory.recall({
    query: ticketContent,
    filter: {
      event: 'support_ticket'
    },
    limit: 5
  });

  const supportBrief = await client.ai.prompt({
    instructions: [
      {
        type: 'system',
        content: `You are a support intelligence assistant. Given a support ticket and the customer's full account history, generate a support agent briefing that includes:

        1. ACCOUNT CONTEXT: Plan, team size, tenure, health status, MRR
        2. RELEVANT HISTORY: Past tickets on similar topics, recurring issues, sentiment trend
        3. USAGE CONTEXT: Which features they use, recent activity changes that might relate to this issue
        4. RISK ASSESSMENT: Is this team at churn risk? Should this ticket be escalated?
        5. SUGGESTED RESOLUTION: Based on similar past tickets, what resolved this for other teams?
        6. TONE GUIDANCE: Based on their sentiment history, should the agent be more empathetic, technical, or proactive?`
      },
      {
        type: 'user',
        content: `New ticket: "${ticketContent}"\n\nAccount digest:\n${digest.content}\n\nSimilar past issues:\n${similarIssues.results.map(r => r.content).join('\n\n')}`
      }
    ]
  });

  return supportBrief;
}
```

**Expected Impact:** 30-40% reduction in first-response time, 20% improvement in CSAT, and support interactions become a churn prevention mechanism rather than a cost center.

---

### Opportunity 5: Expansion Revenue Triggers

**Problem:** Upgrade opportunities are identified manually by CSMs or not at all. Teams that would benefit from a higher plan stay on lower tiers.

**How It Works:**

Continuously monitor for expansion signals by combining activity data with billing data.

```typescript
async function detectExpansionOpportunities(teamId: string) {
  const digest = await client.memory.smartDigest({
    recordId: `team_${teamId}`
  });

  const assessment = await client.ai.prompt({
    instructions: [
      {
        type: 'system',
        content: `You are a revenue expansion analyst for TaskFlow. Analyze the account and identify expansion opportunities.

        EXPANSION SIGNALS:
        - Team consistently hitting plan limits (projects, storage, users)
        - High feature adoption suggesting readiness for advanced features
        - Team size growing (inviting new members)
        - Admin searching for or asking about features on higher plans
        - Support tickets requesting features available on higher tiers
        - Usage patterns matching teams that successfully upgraded

        TIMING SIGNALS:
        - Contract renewal approaching (for annual plans)
        - Recent positive sentiment in support interactions
        - Team just achieved a milestone (100th project, 1-year anniversary)
        - New admin or executive added to the account

        For each opportunity, provide: opportunity type (upsell/cross-sell/seat expansion), confidence (0-100), recommended approach, personalized pitch, ideal timing, and estimated revenue impact.`
      },
      {
        type: 'user',
        content: digest.content
      }
    ]
  });

  return assessment;
}
```

**Expected Impact:** 15-25% increase in expansion revenue, with higher conversion rates because outreach is contextual and well-timed.

---

### Opportunity 6: Personalized In-App Experience

**Problem:** Every team sees the same dashboard, the same feature announcements, and the same tips regardless of how they use the product.

**How It Works:**

Use Personize to power a real-time personalization layer in the TaskFlow UI.

```typescript
// API endpoint called by the TaskFlow frontend on dashboard load
app.get('/api/personalized-dashboard/:teamId', async (req, res) => {
  const { teamId } = req.params;

  const digest = await client.memory.smartDigest({
    recordId: `team_${teamId}`
  });

  const personalization = await client.ai.prompt({
    instructions: [
      {
        type: 'system',
        content: `Generate dashboard personalization for a TaskFlow team. Return JSON with:

        1. "welcomeMessage": A short, contextual greeting referencing something specific (e.g., "Your team closed 23 tasks last week -- 40% more than the week before")
        2. "spotlightFeature": One feature to highlight with a reason specific to their workflow
        3. "quickActions": 3 contextual quick actions based on their recent activity (not generic)
        4. "insightCard": One data-driven insight about their team's productivity trends
        5. "announcementRelevance": Given the latest product updates, which ONE is most relevant to this team and why

        Be specific. Reference their actual data. No generic content.`
      },
      {
        type: 'user',
        content: digest.content
      }
    ]
  });

  res.json(personalization);
});
```

**Expected Impact:** 10-20% increase in daily active usage and session duration through relevance.

---

### Opportunity 7: Automated Health Scoring with Cross-Source Intelligence

**Problem:** Traditional health scores use simple heuristics (login count, support tickets). They miss the nuanced interplay between usage patterns, billing trajectory, and support sentiment.

**How It Works:**

Build a composite health score that Personize continuously updates as new data flows in from all three sources.

```typescript
// Scheduled weekly for all 2,000 teams
async function updateHealthScores() {
  const allTeams = await getAllActiveTeamIds();

  for (const teamId of allTeams) {
    const digest = await client.memory.smartDigest({
      recordId: `team_${teamId}`
    });

    const healthScore = await client.ai.prompt({
      instructions: [
        {
          type: 'system',
          content: `Calculate a multi-dimensional health score for this B2B account. Score each dimension 0-100:

          DIMENSIONS:
          - Engagement: DAU/MAU ratio, feature breadth, session depth
          - Adoption: % of available features actively used, growth in feature usage
          - Sentiment: Support ticket sentiment trend, NPS/CSAT, tone of interactions
          - Growth: Team size trend, project creation velocity, storage usage trend
          - Financial: Payment reliability, plan utilization, expansion signals

          COMPOSITE SCORE: Weighted average (Engagement 30%, Adoption 25%, Sentiment 20%, Growth 15%, Financial 10%)

          Also flag any dimension that dropped >15 points from last assessment as an ALERT.

          Return JSON: { dimensions: {...}, composite: number, alerts: [...], trend: "improving"|"stable"|"declining", narrative: "one paragraph summary" }`
        },
        {
          type: 'user',
          content: digest.content
        }
      ]
    });

    // Store the health score back into Personize for future reference
    await client.memory.memorize({
      recordId: `team_${teamId}`,
      content: `Health score assessment (${new Date().toISOString()}): Composite score: ${healthScore.composite}/100. Trend: ${healthScore.trend}. ${healthScore.narrative}`,
      properties: {
        teamId,
        event: 'health_score',
        compositeScore: healthScore.composite,
        trend: healthScore.trend
      }
    });
  }
}
```

**Expected Impact:** Replaces manual CSM gut-feel with data-driven prioritization. CSMs focus on the right accounts at the right time.

---

## 3. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-3)

| Task | Details |
|---|---|
| Set up data ingestion pipelines | PostgreSQL CDC or nightly batch sync, Stripe webhooks, Intercom webhooks |
| Define entity schema | `team_{id}` as primary record, standardize properties across sources |
| Backfill historical data | Use `memorizeBatch()` to load 6 months of activity summaries, billing events, and support tickets for all 2,000 teams |
| Validate with `smartDigest()` | Pull digests for 10 teams manually and verify the data quality and completeness |

### Phase 2: Churn Prevention (Weeks 4-6)

| Task | Details |
|---|---|
| Build churn risk assessment pipeline | Weekly cron job scoring all teams (Opportunity 1) |
| Integrate with CSM tooling | Push risk scores and intervention recommendations to your CRM or Slack |
| Set up automated alerts | CRITICAL and HIGH risk teams trigger immediate notifications |
| Build the health scoring system | Opportunity 7 as the underlying engine |

### Phase 3: Growth Engine (Weeks 7-10)

| Task | Details |
|---|---|
| Feature adoption campaigns | Opportunity 2 with in-app and email delivery |
| Personalized onboarding | Opportunity 3 for new signups going forward |
| Expansion detection | Opportunity 5 feeding into CSM workflows |

### Phase 4: Full Personalization (Weeks 11-14)

| Task | Details |
|---|---|
| In-app personalization API | Opportunity 6 with frontend integration |
| Support intelligence | Opportunity 4 integrated into Intercom via custom app |
| Feedback loops | Track which recommendations were acted on, which interventions prevented churn, and feed outcomes back into Personize memory for continuous learning |

---

## 4. Organizational Guidelines with SmartGuidelines

Set up `smartGuidelines` to enforce consistency across all personalization touchpoints.

```typescript
// Define guidelines for your organization
const guidelines = await client.ai.smartGuidelines({
  context: 'customer_communication'
});

// Example guidelines to configure:
// - "Never mention competitor names in outreach"
// - "Always include a specific data point from the team's usage"
// - "Escalate any team with MRR > $5,000 and HIGH churn risk to VP of CS"
// - "Do not recommend Enterprise features to teams on Free plans"
// - "Support responses for teams with negative sentiment trend must be reviewed by a senior agent"
```

---

## 5. Measuring Success

| Metric | Baseline (Measure Now) | Target (90 Days) |
|---|---|---|
| Monthly churn rate | Current % | 20-30% reduction |
| Feature adoption (avg features per team) | Current count | 30% increase |
| Trial-to-paid conversion | Current % | 15-20% lift |
| Time to first value (onboarding) | Current days | 40% reduction |
| Expansion revenue (net revenue retention) | Current NRR | 10-15 point improvement |
| Support CSAT | Current score | 15-20% improvement |
| CSM efficiency (accounts per CSM) | Current ratio | 30% more accounts per CSM |

---

## 6. Technical Considerations

**Scale:** 2,000 teams is well within Personize's capacity. At steady state, expect roughly 2,000 daily batch memorizations + real-time events (estimate 5,000-10,000/day across Stripe, Intercom, and high-frequency activity events). Use `memorizeBatch()` for the nightly PostgreSQL sync to minimize API calls.

**Latency:** `smartDigest()` calls for dashboard personalization (Opportunity 6) should be cached at the application layer with a 15-30 minute TTL, since account context does not change second-by-second.

**Data Freshness:** Real-time webhooks from Stripe and Intercom ensure billing and support data is current. PostgreSQL activity data can lag up to 24 hours with the nightly sync approach. For higher freshness, set up a CDC pipeline (e.g., Debezium) to stream changes to a memorize endpoint in near-real-time.

**Privacy:** Ensure PII handling complies with your data processing agreements. Personize supports record-level deletion -- important for GDPR subject access requests from European teams.

---

## Summary

The seven personalization opportunities form an integrated system, not isolated features:

1. **Churn Risk Detection** -- know who is at risk before they leave
2. **Feature Adoption Campaigns** -- help teams discover value they are paying for but not using
3. **Personalized Onboarding** -- get new teams to value faster
4. **Context-Aware Support** -- turn every support interaction into a retention moment
5. **Expansion Revenue Triggers** -- find and act on upsell opportunities with precision
6. **Personalized In-App Experience** -- make the product feel built for each team
7. **Automated Health Scoring** -- replace gut feel with continuous, multi-source intelligence

The connecting thread is Personize's entity memory: every interaction across PostgreSQL, Stripe, and Intercom accumulates into a living account profile. Each use case draws from the same unified context through `smartDigest()`, meaning insights compound over time. The more data flows in, the smarter every personalization touchpoint becomes.
