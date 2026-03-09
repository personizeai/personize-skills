# Personalization Opportunities for TaskFlow

You're sitting on three data sources that, individually, tell a partial story -- but combined, they reveal exactly why teams churn and exactly which teams are ready to adopt more features. Here's what becomes possible when you unify PostgreSQL activity data, Stripe billing, and Intercom tickets into a single memory layer that AI can reason over.

I've filtered these proposals through a hard test: **could you build this with a CRM and a basic LLM call?** If yes, I cut it. What's left are opportunities that only work when you combine governance (your rules for how to communicate), unified memory (cross-source context from all three systems), and AI content generation (writing original narratives, not filling in templates).

---

## Opportunity 1: AI-Written Churn Intervention Messages

### What the team admin sees

Instead of a generic "We miss you!" email when usage drops, the at-risk team's admin gets a message like this:

> "Hi Marcus -- your team's task completion rate dropped 34% over the past two weeks, and we noticed 3 of your 8 active members haven't logged in since Monday. That lines up with the two tickets your team filed about Gantt chart performance on large projects. Good news: we shipped a fix for that last Thursday in v4.2.1 that specifically handles projects with 200+ tasks (which matches your 'Q2 Platform Migration' board). Here's how to update, and I'd suggest turning on the new timeline caching option -- it was built for exactly your team's project size."

### Why this needs all three layers

| Layer | What it contributes | Without it |
|---|---|---|
| **Governance** (`smartGuidelines`) | Churn intervention playbook: tone rules (empathetic, not desperate), what to offer (help vs discounts), escalation criteria, when to involve a human CSM | AI writes tone-deaf "please come back" messages with unauthorized discount offers |
| **Unified Memory** (`smartDigest` + `recall`) | Connects the usage decline (PostgreSQL) + open support tickets (Intercom) + billing cycle timing (Stripe) into one picture. A CRM would see the usage drop but miss that it correlates with unresolved tickets about a specific feature | Each system triggers its own alert. Nobody connects "usage down" + "tickets about Gantt charts" + "renewal in 30 days" |
| **Content Generation** (`prompt` with `instructions[]`) | AI writes a message that synthesizes the WHY behind the usage drop, references the specific fix, and gives a concrete next step -- not a template with `{usage_change}` inserted | You get "Your usage dropped 34%. Let us know if you need help!" -- a template fill, not a narrative |

### The technical skeleton

```typescript
// Layer 1: Governance -- fetch churn intervention rules
const governance = await client.ai.smartGuidelines({
    message: 'churn intervention messaging guidelines, tone for at-risk accounts, escalation policy, discount policy',
    mode: 'deep',
});

// Layer 2: Unified Memory -- cross-source context
const [teamDigest, recentTickets, usageTrends] = await Promise.all([
    client.memory.smartDigest({ email: adminEmail, type: 'Team', token_budget: 2500 }),
    client.memory.recall({ query: 'recent support tickets, complaints, feature issues', email: adminEmail }),
    client.memory.recall({ query: 'usage trends, activity decline, feature engagement drop', email: adminEmail }),
]);

const context = [
    governance.data?.compiledContext,
    teamDigest.data?.compiledContext,
    recentTickets.data,
    usageTrends.data,
].filter(Boolean).join('\n\n---\n\n');

// Layer 3: Multi-step generation
const result = await client.ai.prompt({
    context,
    instructions: [
        { prompt: 'Analyze: What caused the usage decline? Cross-reference support tickets with the timing of the drop. Is this a product issue, a seasonal pattern, or disengagement? List specific facts.', maxSteps: 3 },
        { prompt: 'Check governance: What tone should we use? Can we offer anything? Should this escalate to a human CSM? What must we avoid saying?', maxSteps: 2 },
        { prompt: 'Write the intervention message to the team admin. Reference the specific cause, acknowledge their frustration if tickets are involved, point to a concrete fix or next step. Under 150 words. SUBJECT: and BODY_HTML: as separate fields.', maxSteps: 5 },
    ],
    evaluate: true,
    evaluationCriteria: 'Must reference at least 2 specific facts from memory. Must not offer discounts unless governance allows. Must include one actionable next step.',
});
```

### Without Personize

You'd query PostgreSQL for declining usage, pull Intercom tickets separately, check Stripe for renewal date, then manually draft a template: "Hi {name}, we noticed your team's usage dropped {percent}%. Need help?" That's three queries, no synthesis, no original narrative.

---

## Opportunity 2: AI-Generated Feature Adoption Guides Per Team

### What the team admin sees

When a team is underutilizing features that would solve problems they're clearly experiencing, the admin gets a personalized guide -- not a generic "Did you know?" tooltip, but a multi-paragraph walkthrough written for their specific workflow:

> "Your team runs 15+ parallel workstreams across 3 projects, but you're managing dependencies manually -- I can see from your activity that team members are @-mentioning each other in task comments to flag blockers about 12 times per week. TaskFlow's Dependency Mapping would automate this: when a blocking task slips, every downstream assignee gets notified automatically. Based on your 'Q2 Platform Migration' project structure, here's how to set it up: (1) Open your project board, (2) Select 'Enable Dependencies' in project settings, (3) On your 'Backend API' task, click 'Add Dependency' and link it to 'Database Schema Finalization'..."

### Why this needs all three layers

| Layer | What it contributes | Without it |
|---|---|---|
| **Governance** (`smartGuidelines`) | Feature adoption messaging guidelines: which features to push for which team profiles, how to frame the value (productivity, not "you're doing it wrong"), product terminology standards | AI recommends features randomly or frames adoption as criticism ("you're not using our product right") |
| **Unified Memory** (`smartDigest` + `recall`) | Combines usage patterns (PostgreSQL: what features they use, what they don't, behavioral proxies like "@-mention frequency for blockers") + support tickets (Intercom: "how do I track dependencies?") + plan tier (Stripe: whether the feature is available on their plan) | You can see they don't use Dependencies, but you can't see that their behavior pattern indicates they need it, or that they asked about it in a ticket 3 weeks ago |
| **Content Generation** (`prompt` with `instructions[]`) | AI writes a walkthrough using their actual project names, task examples, and team workflow. Not a link to a help doc -- a personalized guide | You send everyone the same "Check out Dependencies!" email with a link to docs |

### The technical skeleton

```typescript
const result = await client.ai.prompt({
    context,  // governance + team digest + usage data + ticket history assembled
    instructions: [
        { prompt: 'Identify the top underutilized feature for this team. Cross-reference: (1) features not used, (2) behavioral signals suggesting they need it, (3) any support tickets asking about related functionality. Pick the ONE feature with the strongest signal.', maxSteps: 3 },
        { prompt: 'Check governance: How should we frame feature adoption? What tone? Verify the feature is available on their current plan (from Stripe billing data).', maxSteps: 2 },
        { prompt: 'Write a personalized adoption guide (3-4 paragraphs). Reference their specific projects and workflow by name. Include step-by-step setup instructions using their actual data. Frame it as solving a problem they demonstrably have, not as a feature push.', maxSteps: 5 },
    ],
    evaluate: true,
    evaluationCriteria: 'Guide references at least one real project/task name from memory. Does not recommend features unavailable on their plan. Frames adoption as solving an observed problem.',
});
```

---

## Opportunity 3: AI-Synthesized Team Health Narratives for CSMs

### What your internal CS team sees

Instead of a dashboard with numbers (DAU: 34, Tasks created: 127, Tickets: 2), your CSMs get a morning digest with AI-written narratives per account:

> "Acme Engineering (45-seat team, Pro plan, renews April 15): Strong adoption week -- task completion velocity up 18%, and they started using Automations for the first time (3 rules created by their lead PM, Dana Torres). However, their billing admin opened a ticket yesterday asking about per-seat pricing for scaling to 60 seats, and they mentioned 'evaluating options.' Combined with the renewal in 37 days, this is likely a pricing negotiation signal, not a churn signal. Recommended: reach out to Dana (the champion -- most active user, created all automations) to reinforce value before the billing admin drives the renewal conversation. Talking points: (1) automation ROI -- estimate time saved from their 3 rules, (2) volume pricing for 60-seat tier."

### Why this needs all three layers

| Layer | What it contributes | Without it |
|---|---|---|
| **Governance** (`smartGuidelines`) | CS playbook: how to interpret signals (ticket about pricing = negotiation vs churn), renewal handling rules, what talking points to include, tone for internal briefs vs external messages | CSM gets raw data with no interpretation framework. Is "asking about pricing" good or bad? Depends on context the playbook defines |
| **Unified Memory** (`smartDigest` + `recall`) | Synthesizes usage trends (PostgreSQL) + the billing inquiry ticket (Intercom) + renewal date and plan tier (Stripe) + who the champion is (cross-source: most active user + who created automations + who filed the most positive tickets) | CSM checks three dashboards, misses the connection between "billing question" + "renewal in 37 days" + "champion is different from billing contact" |
| **Content Generation** (`prompt` with `instructions[]`) | AI writes the interpretation and the recommended action. It doesn't just list signals -- it tells a story and gives specific talking points derived from the account's actual data | CSM gets "Health score: 72. Renewal: April 15. Open tickets: 1." -- no narrative, no recommended action, no champion identification |

### The technical skeleton

```typescript
// For each account in the CSM's portfolio
const result = await client.ai.prompt({
    context,  // governance CS playbook + account digest from all three sources
    instructions: [
        { prompt: 'Synthesize all signals from the past 7 days across usage data, support tickets, and billing events. What story do they tell TOGETHER that no single source reveals? Identify the champion (most active, most engaged user).', maxSteps: 3 },
        { prompt: 'Apply CS playbook: Is this account healthy, at-risk, or in expansion mode? What does governance say about how to handle this combination of signals? What is the renewal timeline pressure?', maxSteps: 2 },
        { prompt: 'Write a 3-4 sentence account narrative for the CSM. Include: current trajectory, the key insight from cross-source synthesis, and one specific recommended action with talking points. Use internal brief tone.', maxSteps: 5 },
    ],
    evaluate: true,
    evaluationCriteria: 'Narrative connects signals from at least 2 different data sources. Recommended action is specific (who to contact, what to say). Correctly applies CS playbook rules.',
});
```

---

## Opportunity 4: AI-Generated Onboarding Playbooks Per Team

### What a new team sees in their first week

Instead of the same onboarding checklist every team gets, each new TaskFlow team sees an AI-written setup guide tailored to their situation -- their industry, team size, plan tier, and what they told you during signup or sales:

> "Welcome to TaskFlow, Nexus Design Studio. Since your team of 12 is primarily designers and project coordinators working on client deliverables, here's your tailored setup path:
>
> **Day 1: Set up your client project structure.** With 4-6 concurrent client projects (based on what you shared with our sales team), we recommend one Board per client with shared labels for project phase. Here's a template we've pre-loaded based on design agency workflows...
>
> **Day 2: Connect your team's communication flow.** Your team mentioned using Figma and Slack heavily. Start by enabling the Slack integration -- it'll post task updates to your project channels automatically. The Figma integration will link design files directly to tasks...
>
> **Day 3: Set up your first Automation.** Agencies like yours typically automate client review workflows. Here's a one-click rule: when a task moves to 'Client Review,' auto-assign it to the project coordinator and send a Slack notification to the client channel..."

### Why this needs all three layers

| Layer | What it contributes | Without it |
|---|---|---|
| **Governance** (`smartGuidelines`) | Onboarding guidelines per ICP segment (agency vs enterprise vs startup), product terminology, what features to highlight first based on team type, brand voice for onboarding | Every team gets the same generic walkthrough regardless of whether they're a 5-person startup or a 200-person enterprise |
| **Unified Memory** (`smartDigest` + `recall`) | Signup data + sales conversation notes + plan tier (Stripe: which features are available) + any pre-signup Intercom conversations ("we're looking for something that handles client projects") | Onboarding ignores everything you already know about this team. They told sales they're a design agency, but onboarding treats them like a generic new user |
| **Content Generation** (`prompt` with `instructions[]`) | AI writes the entire onboarding playbook -- not selecting template A/B/C, but composing paragraphs with their company name, team structure, tools, and workflow type woven in | "Step 1: Create a project. Step 2: Add tasks. Step 3: Invite team members." -- the same guide you'd give to literally anyone |

---

## Opportunity 5: AI-Written Upgrade Proposals Triggered by Usage Patterns

### What the team admin sees when they're outgrowing their plan

Instead of a banner that says "Upgrade to Pro for more features!", the admin gets a personalized case for upgrading, written from their actual usage data:

> "Hi Priya -- your team hit the 50-project limit twice this month and worked around it by archiving active projects (I can see 'Q2 Redesign' was archived and unarchived 3 times). On Pro, you'd get unlimited projects plus Automations -- and based on your team's workflow, Automations would save significant time: your team manually moves tasks between stages about 40 times/day, which is exactly what automation rules handle. Here's what your cost would look like: with 22 active seats at the annual Pro rate, it comes to $X/month -- and based on the time your team spends on manual status updates alone, that likely pays for itself in the first month."

### Why this needs all three layers

| Layer | What it contributes | Without it |
|---|---|---|
| **Governance** (`smartGuidelines`) | Pricing communication rules (how to frame cost, what comparisons are approved, discount authority, required disclaimers), upgrade messaging guidelines, what NOT to say about competitor pricing | AI makes up pricing claims, offers unauthorized discounts, or frames the upgrade as a punishment for hitting limits |
| **Unified Memory** (`smartDigest` + `recall`) | Combines usage patterns hitting plan limits (PostgreSQL) + current plan and billing history (Stripe) + any tickets about limitations (Intercom: "is there a way to have more projects?") | You know they hit the project limit but miss that they asked about it in a ticket, and you can't calculate what their actual upgrade cost would be |
| **Content Generation** (`prompt` with `instructions[]`) | AI writes a persuasive case using their specific usage data: the workaround they're currently using, the time they'd save, and the actual pricing math for their seat count | Generic banner: "Upgrade for unlimited projects!" -- no reference to their workaround, no ROI calculation, no acknowledgment they asked about this in support |

---

## Data Ingestion Plan

To power all five opportunities, here's what to memorize from each source:

| Source | What to memorize | Method | `extractMemories` |
|---|---|---|---|
| **PostgreSQL** (activity) | Team creation, project activity, feature usage events, task completion rates, login frequency, feature engagement (which features each team member uses) | `memorizeBatch()` on daily cron | `true` -- let AI extract patterns like "power user," "declining engagement," "workaround behavior" |
| **PostgreSQL** (team profiles) | Team name, size, industry, signup date, plan tier, admin contact | `memorizeBatch()` on daily cron | `false` -- structured data, no extraction needed |
| **Stripe** (billing) | Plan tier, seat count, billing cycle, renewal date, payment failures, plan changes, upgrade/downgrade history | `memorize()` via Stripe webhooks | `false` -- structured billing events |
| **Intercom** (tickets) | Full ticket conversations, feature requests, complaints, sentiment, resolution | `memorize()` per ticket close/update | `true` -- AI extracts pain points, feature requests, sentiment, and correlates with product issues |

## Governance Variables to Create First

| Variable | Purpose |
|---|---|
| `brand-voice` | TaskFlow's tone across all generated content (product-led, helpful, not salesy) |
| `churn-intervention-playbook` | Rules for intervention messaging: when to reach out, what to offer, escalation criteria, what NOT to promise |
| `cs-playbook` | How to interpret health signals, renewal handling, champion identification criteria |
| `onboarding-guidelines` | Onboarding messaging per ICP segment (agency, startup, enterprise, remote team), feature prioritization per team type |
| `pricing-communication` | What to say about pricing, discount authority, upgrade framing, required disclaimers |
| `feature-adoption-messaging` | How to frame feature suggestions (solve a problem, not push a feature), tone, what features to recommend for which team profiles |

---

## What This Means for TaskFlow

Each of these five opportunities follows the same pattern: data from PostgreSQL, Stripe, and Intercom gets unified into a single context window, governance rules constrain how the AI communicates, and the AI generates original content -- narratives, guides, proposals, briefings -- that no template system could produce.

The churn reduction comes from Opportunities 1, 3, and 5: catching at-risk teams with synthesized intelligence (not just a usage metric), giving CSMs actionable narratives (not dashboards), and converting limit-hitting teams before they evaluate alternatives.

The feature adoption comes from Opportunities 2 and 4: onboarding guides written for each team's actual situation, and adoption nudges triggered by behavioral signals (not generic feature announcements).

**Recommended starting point:** Memorize your PostgreSQL activity data and Intercom tickets via `memorizeBatch()`, set up `brand-voice` and `cs-playbook` governance variables, and build the Team Health Narrative (Opportunity 3) first. It's the highest-value, lowest-effort win -- your CS team will see the impact within the first week, and the data pipeline you build for it feeds every other opportunity.
