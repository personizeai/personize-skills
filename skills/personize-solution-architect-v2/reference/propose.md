# Reference: PROPOSE Action

How to present personalization proposals that showcase Personize's unique value — not generic personalization any CRM can do.

---

## The Differentiation Test

Before including any proposal, run this test:

**"Could they build this with [any CRM/analytics tool] + a single LLM call?"**

If yes → it's not a Personize proposal. Remove it or rethink it.

**What fails the test (weak proposals):**
- "Show a greeting based on user's role" → CRM lookup + if/else
- "Recommend content based on interests" → any recommendation engine
- "Swap CTA based on user segment" → feature flag tool
- "Tag users by behavior" → analytics platform

**What passes the test (strong proposals):**
- AI-WRITES a unique onboarding guide combining data from their CRM, support history, and product usage, in the org's brand voice, following compliance rules
- AI-GENERATES a landing page headline + subheadline specific to this visitor's industry and pain points, governed by messaging guidelines
- AI-COMPOSES a notification that synthesizes signals from 3 sources into a coherent narrative, respecting the org's tone and escalation policies

**The difference:** Weak proposals look up data and branch. Strong proposals GENERATE original content using all three layers.

---

## The Three-Layer Skeleton

Every proposal must use all three layers. If a proposal only needs one or two, it's not showcasing Personize's unique value.

### Layer 1: Governance (`smartGuidelines`)

Fetch the org's rules before generating ANYTHING:
- Brand voice and tone
- ICP definitions (who matters, how to talk to them)
- Compliance rules (what you can/can't say)
- Messaging playbooks (angles, objection handling, approved claims)

**Why this layer matters:** Real companies have multiple employees using multiple AI tools — a sales rep using an AI email writer, a marketer using an AI content tool, a CS agent using an AI chatbot, custom pipelines running overnight. Without governance, each of these invents its own voice, its own rules, its own version of "how we talk to customers." Five people using three tools = fifteen different "brands." Governance is the ONLY thing that ensures every AI-generated touchpoint — regardless of which person, tool, or agent created it — follows the same brand voice, the same compliance rules, the same messaging playbook. This is impossible to replicate with per-prompt instructions scattered across tools.

### Layer 2: Unified Memory (`smartDigest` + `recall`)

Assemble context from ALL sources into one window:
- CRM data (role, company, deal stage)
- Product analytics (feature usage, engagement patterns)
- Support history (tickets, sentiment, resolution)
- Enrichment data (company signals, news, funding)
- Past AI interactions (what was sent before, what worked)

**Why this layer matters:** Any single source gives a partial picture. A CRM knows the deal stage but not that the user filed 3 support tickets last week. Product analytics knows usage patterns but not that the company just raised funding. Unified memory means the AI sees EVERYTHING when it writes — context that no single tool could provide.

### Layer 3: Content Generation (`prompt` with `instructions[]`)

The multi-step reasoning pipeline that GENERATES original content:
- Step 1: Analyze (who is this person, what do we know from all sources)
- Step 2: Apply governance (what rules constrain our output)
- Step 3: Generate (write the actual content — paragraphs, not template fills)
- Step 4: Self-evaluate (does it meet our standards)

**Why this layer matters:** This isn't "fill in template variables." The AI WRITES paragraphs, emails, headlines, guides, narratives — original content that no template could produce because it's unique to this specific person + these specific rules + this specific moment.

### The Combined Technical Pattern

Every strong proposal follows this skeleton:

```typescript
// Layer 1: Governance — fetch org rules first
const governance = await client.ai.smartGuidelines({
    message: 'brand voice, messaging guidelines, and compliance rules for [specific context]',
    mode: 'deep',
});

// Layer 2: Unified Memory — assemble cross-source context
const [digest, relevant] = await Promise.all([
    client.memory.smartDigest({ email, type: 'Contact', token_budget: 2500 }),
    client.memory.recall({ query: '[situation-specific query]', email }),
]);

// Combine all three layers into one context window
const context = [
    governance.data?.compiledContext,
    digest.data?.compiledContext,
    relevant.data,
].filter(Boolean).join('\n\n---\n\n');

// Layer 3: Multi-step generation
const result = await client.ai.prompt({
    context,
    instructions: [
        { prompt: 'Analyze: Who is this person? What do we know from all sources? What matters most right now?', maxSteps: 3 },
        { prompt: 'Apply rules: What governance constraints apply? Brand voice? Compliance? Messaging guidelines?', maxSteps: 2 },
        { prompt: 'Generate: [THE ACTUAL CONTENT]. Follow all governance rules. Reference specific facts from memory.', maxSteps: 5 },
    ],
    evaluate: true,
    evaluationCriteria: 'Content must: reference 2+ specific facts from memory, follow brand voice from governance, be original (not templated).',
});
```

---

## How to Present a Proposal

1. **Lead with the experience** — What does the end user/visitor/customer actually SEE? Paint the picture.
2. **Show why it needs all three layers** — Briefly note what each layer contributes to THIS proposal.
3. **Contrast with the "without Personize" baseline** — Show what they'd get with basic tools (the CRM + single LLM call version).
4. **Include the technical skeleton** — Adapt the three-layer pattern to this specific use case.
5. **Only propose what's relevant** — Don't propose mobile if they don't have an app.

---

## Adapt by Situation Profile

Before presenting proposals, check the Situation Profile from discovery. This changes WHAT you propose and HOW you present it.

### By Archetype

| Archetype | Proposal Focus | Lead With |
|---|---|---|
| **Communication-heavy** | Email/notification generation with governance guardrails | Before/after email examples, generation prompt patterns, channel format rules |
| **Analysis-heavy** | Research synthesis, health reports, scoring narratives | Deep recall with high token budgets, cross-entity context, narrative generation |
| **Decision-heavy** | Scoring, routing, qualification with structured outputs | Structured JSON outputs, governance scoring criteria, decision learning loops |
| **Execution-heavy** | Batch sync, enrichment, webhook delivery | `memorizeBatch()` code, rate limit calculations, webhook patterns. Minimize narrative -- show data flow. |
| **Collaboration-heavy** | Workspace patterns, multi-agent coordination | Agent coordination diagrams, workspace schemas, contribution protocols |

### By Integration Mode

| Mode | How to Present Proposals |
|---|---|
| **SDK in code** | Show TypeScript code with `client.*` methods. Include error handling and rate limiting. |
| **MCP on coding assistant** | Describe what the agent experience looks like: "You'll say 'write a follow-up for Sarah' and the AI will call memory_recall_pro, then ai_smart_guidelines, then generate the email." |
| **MCP on multi-agent** | Show agent coordination: which agent does what, how they share state, tool scoping per agent. |
| **MCP on workflow tools** | Describe visually: "Trigger: HubSpot deal closed -> AI Node: recall context + generate email -> Gmail Node: send -> AI Node: memorize outcome." |
| **Responses API** | Show step definitions with tool scoping and structured outputs. |
| **No-code** | Describe in workflow terms. Reference no-code-pipelines skill for n8n JSON generation. |

### By Department

| Department | What Resonates | What to Avoid |
|---|---|---|
| **Sales** | Pipeline velocity, outreach quality, qualification accuracy | Over-engineering. Sales wants results fast. |
| **Marketing** | Campaign personalization, brand consistency, attribution | Technical complexity. Marketing thinks in campaigns and audiences. |
| **Customer Success** | Proactive outreach, health monitoring, churn prevention | Reactive patterns. CS wants to get ahead of problems. |
| **Product** | User research synthesis, feature adoption, feedback analysis | Communication-heavy proposals unless asked. Product cares about understanding users. |
| **Operations** | Data governance, compliance, automation, cost reduction | Flashy generation demos. Ops wants reliable, auditable systems. |

### By Autonomy Level

| Autonomy | Proposal Emphasis |
|---|---|
| **Human-driven** | Show the developer experience. "Here's what you type, here's what you get." |
| **Human-in-loop** | Show the review queue. "Emails are generated in batch, you review and approve before sending." |
| **Supervised** | Show the monitoring dashboard. "The system runs nightly, you check scores and exceptions." |
| **Fully autonomous** | Show governance guardrails + learning loop. "Agents act within these rules, and update the rules based on outcomes. Here's the safety net." |

---

## Surface Area 1: Software / Web Application

### What basic personalization looks like (no Personize needed):
- "Hi {first_name}" greeting
- Segment-based feature flags (show/hide based on plan tier)
- Template-based onboarding (pick path A, B, or C based on role)
- Recommendation engines (collaborative filtering)

These are all "look up a field, branch on it." They don't need unified memory, governance, or content generation.

### Three-Layer Proposals

#### AI-Generated Onboarding Guide

**The experience:** After signup, the new user sees a multi-paragraph setup guide WRITTEN specifically for their situation — their industry, their tech stack, their likely goals — in the org's voice, following the product's onboarding best practices.

**Why it needs all three layers:**
- **Governance:** Onboarding guidelines, product messaging rules, what to emphasize per ICP segment
- **Memory:** What we know from signup form + CRM enrichment + any prior interactions (visited pricing page, attended webinar, talked to sales)
- **Generation:** AI WRITES the guide — not "pick template A/B/C" but actual paragraphs unique to this person

**Before (basic):** "Welcome! Choose your use case: [ ] Marketing [ ] Sales [ ] Engineering"

**After (three-layer):** "Welcome, Sarah. Since your team at Acme Corp is scaling outbound — and based on what we discussed in last week's demo — here's your personalized setup: **Step 1:** Connect your HubSpot instance (we saw you're already using it). **Step 2:** Import your target accounts — we recommend starting with the 50 companies in your Q2 pipeline. **Step 3:** Set up your first governance variable for brand voice — here's a starter based on your website's tone..."

```typescript
const result = await client.ai.prompt({
    context,  // governance + memory assembled as above
    instructions: [
        { prompt: 'Analyze what we know about this new user: role, company, data sources, likely goals. List 3 facts we can reference.', maxSteps: 3 },
        { prompt: 'Check onboarding guidelines: what should we emphasize for their ICP segment? What setup steps matter most for their situation?', maxSteps: 2 },
        { prompt: 'Write a personalized onboarding guide (3-4 paragraphs). Reference specific facts. Use brand voice. Include 3-5 concrete next steps tailored to their situation.', maxSteps: 5 },
    ],
    evaluate: true,
});
```

#### AI-Written Dashboard Insights

**The experience:** When a user opens their dashboard, they see a natural-language narrative about their data — trends, anomalies, recommendations — written in the org's voice, referencing their specific metrics AND context from other sources.

**Why it needs all three layers:**
- **Governance:** How to frame insights (positive tone? data-driven? casual?), what metrics matter per role
- **Memory:** The user's recent activity, historical trends, support interactions, feature usage — from multiple sources combined
- **Generation:** AI WRITES insight paragraphs that connect dots across sources, not just "metric X went up 15%"

**Before (basic):** "Revenue: $45K (+12% MoM) | Deals: 23 open | Tasks: 5 overdue"

**After (three-layer):** "Strong month, Sarah — your team closed $45K, up 12% from last month. The Acme Corp deal you flagged is progressing: they downloaded the API docs yesterday. Heads up: 3 support tickets came in from your Enterprise segment this week, mostly around SSO setup — might be worth a proactive FAQ update before the webinar next Tuesday."

#### AI-Generated Page Content

**The experience:** Solution pages, feature pages, or landing pages where the copy is GENERATED per visitor — headline, value prop, use cases, proof points — tailored to their industry, role, and journey stage.

**Why it needs all three layers:**
- **Governance:** Brand messaging, approved claims, tone per audience, compliance rules
- **Memory:** Visitor's industry, role, company size, previous page views, how they found you, past interactions
- **Generation:** AI WRITES the page copy — different angles for different visitors, not segment-based templates

**Before (basic):** One static headline for all visitors: "The All-in-One Platform for Growth"

**After (three-layer):** Healthcare visitor sees: "HIPAA-Compliant Patient Communication at Scale — How healthcare teams use [product] to personalize outreach while maintaining compliance." // SaaS engineer sees: "Ship Personalization in Days, Not Quarters — A TypeScript SDK that gives your app unified customer context and AI-generated content with zero ML infrastructure."

```typescript
const result = await client.ai.prompt({
    context,
    instructions: [
        { prompt: 'Identify the visitor: industry, role, company size, journey stage, what page they are on. What facts do we have?', maxSteps: 2 },
        { prompt: 'Check messaging guidelines: What claims can we make? What tone for this audience? What proof points for their industry?', maxSteps: 2 },
        { prompt: 'Generate page variables as JSON: { headline, subheadline, valueProp, useCaseExample, ctaText, ctaSubtext }. Every field must be tailored to this specific visitor using governance rules and memory context.', maxSteps: 5 },
    ],
});
```

> See `recipes/web-personalization.ts` for the full implementation with caching and framework integration.

---

## Surface Area 2: Marketing Campaigns

### What basic personalization looks like (no Personize needed):
- Mail merge: "Hi {first_name}, noticed your company {company_name}..."
- Segment-based templates (send Template A to segment X)
- Drip sequences with fixed timing

These all select from pre-written templates and fill in merge fields. The copy is written once by a human.

### Three-Layer Proposals

#### AI-Written Outreach (Every Sentence Unique)

**The experience:** Each prospect gets an email where every sentence references their specific situation — their company's recent news, their role's likely pain points, their previous interactions — written in the org's approved voice with compliance guardrails.

**Why it needs all three layers:**
- **Governance:** Sales playbook, approved messaging angles, compliance rules (CAN-SPAM, industry-specific), brand voice
- **Memory:** CRM data + enrichment (funding, news) + product usage + past interactions + support history — all combined into one context window
- **Generation:** AI WRITES each email from scratch — not filling in [company_name] blanks but composing unique paragraphs

**Before (basic):** "Hi {first_name}, I noticed {company} is growing fast. We help companies like yours with {product_category}. Want to chat?"

**After (three-layer):** "Hi Sarah — saw that Acme just expanded the engineering team (congrats on the Series B). With 40+ devs now, you're probably hitting the point where tribal knowledge about customers gets lost across teams. That's exactly what unified memory solves — one place where every customer interaction (support, sales, product usage) is accessible to any team member or AI agent. Would it be worth 15 minutes to show you how [similar company in their space] set this up?"

```typescript
const sequence = await client.ai.prompt({
    context,  // governance playbook + unified memory context
    instructions: [
        { prompt: 'Analyze: What do we know about this prospect from ALL sources? What specific facts can we reference? What is their most likely pain point?', maxSteps: 3 },
        { prompt: 'Check sales playbook and compliance rules: What messaging angles are approved? What claims can we make? What must we avoid?', maxSteps: 2 },
        { prompt: 'Write Email 1 (introduction): Lead with a specific observation about their situation. Connect to value prop. End with soft CTA. Under 150 words. Follow brand voice.', maxSteps: 5 },
        { prompt: 'Write Email 2 (value-add, 3 days later): Share an insight relevant to THEIR situation. Reference a customer in their space. Stronger CTA.', maxSteps: 5 },
        { prompt: 'Write Email 3 (breakup, 5 days later): Brief, respectful. One final compelling reason specific to them. Clear yes/no CTA.', maxSteps: 3 },
    ],
    evaluate: true,
    evaluationCriteria: 'Each email: under 150 words, references a specific fact about the prospect, follows approved messaging, distinct angle from previous emails.',
});
```

> See `recipes/cold-outreach-sequence.ts` for the full implementation with timing and state tracking.

#### AI-Generated Landing Pages Per Visitor

**The experience:** When a prospect clicks through from an email or ad, the landing page copy is GENERATED for them — headline, body, testimonial selection, CTA — based on everything known about them + the org's messaging rules.

**Why it needs all three layers:**
- **Governance:** Approved claims and disclaimers, messaging per industry/role, tone guidelines
- **Memory:** What brought them here (which email/ad), their company/role, past visits, deal stage
- **Generation:** Landing page copy written per visitor, not per segment

**Before (basic):** Everyone sees the same landing page with static copy.

**After (three-layer):** A prospect who clicked from Email 2 about "scaling outbound" sees a landing page with headline "Scale Outbound Without Scaling Headcount" and a case study from their industry, with a CTA that references their specific situation. A different prospect who clicked from a webinar follow-up sees entirely different copy matching that context.

---

## Surface Area 3: Notifications (Email, Slack, SMS, In-App, Webhook)

### What basic personalization looks like (no Personize needed):
- "You have 3 new leads this week"
- Alert templates with inserted metric values
- Fixed notification rules (if X > threshold, notify Y)

These are template alerts with data fills — they don't synthesize context or write narratives.

### Three-Layer Proposals

#### AI-Synthesized Alert Narratives

**The experience:** Instead of "Customer X did Y," the notification tells a STORY — synthesizing signals from multiple sources into an actionable narrative with specific recommendations.

**Why it needs all three layers:**
- **Governance:** Notification policies (what warrants an alert, appropriate tone, escalation rules)
- **Memory:** Signals from CRM + product analytics + support + enrichment — synthesized across sources
- **Generation:** AI WRITES a narrative connecting dots that no single alert could, with a recommended action

**Before (basic):** "Alert: Acme Corp usage declined 25% this month."

**After (three-layer):** "Acme Corp health declining — usage down 25%, and Sarah Chen (your main contact) hasn't logged in since March 1. Context: they filed 2 unresolved tickets about API rate limits, their renewal is in 45 days, and their VP Eng just posted about evaluating alternatives on LinkedIn. Recommended action: schedule a check-in focused on the API issues — they're likely blocked, not disengaged."

```typescript
const result = await client.ai.prompt({
    context,  // governance notification rules + unified memory from all sources
    instructions: [
        { prompt: 'Synthesize: What signals do we have from ALL sources about this account? What story do they tell together that no single source reveals?', maxSteps: 3 },
        { prompt: 'Check notification rules: Does this warrant an alert? What tone? What channel? What priority level?', maxSteps: 2 },
        { prompt: 'Write the alert as a narrative: situation → context from multiple sources → specific recommended action. Max 150 words. Follow notification tone guidelines.', maxSteps: 5 },
    ],
});
```

> See `recipes/smart-notification.ts` for the full implementation.

#### AI-Composed Smart Digests

**The experience:** Instead of 10 separate notifications, the user gets ONE AI-written digest that synthesizes everything important into a coherent morning briefing — prioritized, contextualized, actionable.

**Why it needs all three layers:**
- **Governance:** What matters to this role/persona, prioritization rules, digest format and tone
- **Memory:** All events, signals, and context from the past day/week across ALL sources
- **Generation:** AI WRITES a briefing that connects events and prioritizes — not a bullet list of raw events

**Before (basic):** "• 3 new leads • 2 support tickets • 1 deal closed • Meeting at 2pm"

**After (three-layer):** "Good morning, Sarah. Three things that matter today: (1) The Acme Corp deal just moved to negotiation — they asked about SSO, which aligns with the enterprise security concerns we've seen from their vertical. Worth preparing the security whitepaper. (2) Two support tickets from your accounts — both about the same API endpoint, suggesting a pattern worth flagging to engineering. (3) A new inbound lead from a healthcare company — similar profile to the MedTech deal you closed last quarter; the same approach might work here."

---

## Surface Area 4: Customer Success & Support

### What basic personalization looks like (no Personize needed):
- Customer health scores based on usage metrics
- Template-based check-in emails ("Hi {name}, just checking in!")
- Manual QBR prep by pulling CRM data

### Three-Layer Proposals

#### AI-Written Health Check-Ins

**The experience:** Each customer gets a check-in message WRITTEN for their specific situation — referencing their actual wins, recent usage patterns, any open issues, and next steps — in a tone appropriate for their relationship stage and your CS playbook.

**Why it needs all three layers:**
- **Governance:** CS playbook (what to say when healthy vs at-risk), tone rules, escalation criteria, what metrics to reference
- **Memory:** Product usage + support tickets + billing + past interactions + enrichment — combined from all sources
- **Generation:** AI WRITES the check-in — not a template with merge fields but a message that connects dots

**Before (basic):** "Hi Sarah, just checking in! How are things going with the platform? Let me know if you need anything."

**After (three-layer):** "Hi Sarah — your team's had a solid quarter: API calls up 40%, and the onboarding pipeline you built is processing 200+ contacts/day. Quick note: we noticed the batch endpoint is timing out on some of your larger imports (>5K records). Our engineering team shipped a fix for this last week in v2.3.1, which should resolve it. Also, your renewal is coming up in 60 days — based on your usage growth, it might be worth looking at the Pro tier for higher rate limits. Happy to walk through the numbers."

#### AI-Generated QBR Materials

**The experience:** Quarterly business review materials with GENERATED narratives — not just charts, but written analysis of what went well, what's at risk, and AI-recommended next steps — all governed by the CS team's presentation standards.

**Why it needs all three layers:**
- **Governance:** QBR structure, presentation standards, what metrics to highlight, how to frame risks
- **Memory:** 3 months of product usage + support interactions + billing data + stakeholder contacts + previous QBR outcomes
- **Generation:** AI WRITES analysis paragraphs, executive summary, and recommendations — not template slides

---

## Surface Area 5: Mobile App

### Three-Layer Proposals

#### AI-Composed Push Notifications

**The experience:** Push notification text WRITTEN by AI — not selected from templates — based on the trigger event, cross-source user context, and notification governance rules. The AI decides whether to send, what to say, and how to say it.

**Why it needs all three layers:**
- **Governance:** Notification frequency limits, quiet hours, tone for push (concise, actionable), what warrants a push vs in-app
- **Memory:** User's activity patterns, preferences, engagement history, what was sent before
- **Generation:** AI WRITES the push text, not selects from a list

#### AI-Generated Home Screen Content

**The experience:** A home screen with an AI-written greeting, insight narrative, and recommended action — all generated per user session using cross-source context and brand voice.

---

## User Stories by Persona

Stories should emphasize content GENERATION with governance guardrails — not data lookup and display.

### For the Developer / Engineering Team
- *"As a developer, I call three SDK methods and get AI-generated content that references customer data from 5 different sources — no data pipeline to build, no per-prompt instructions to maintain."*
- *"As a developer, governance means I don't craft tone and compliance rules in every prompt — the org's rules are fetched automatically and applied to all generated content."*
- *"As a developer, the `instructions[]` pipeline handles multi-step reasoning (analyze → apply rules → generate → evaluate) — I don't chain LLM calls manually."*

### For the Product Manager
- *"As a PM, every page on our site speaks to each visitor's specific situation — not because we built 20 templates, but because AI generates the copy using our brand guidelines and everything we know about the visitor."*
- *"As a PM, onboarding guides are WRITTEN for each user — they reference the user's actual tools, team size, and goals. Not a template menu."*
- *"As a PM, governance rules ensure every AI-generated touchpoint follows our brand voice and messaging — consistent across web, email, notifications, and in-app, without per-feature prompt engineering."*

### For the Sales Team
- *"As a sales rep, my outreach emails are written by AI that knows everything — CRM data, product usage, support history, company news, past emails — not just name and company from a mail merge."*
- *"As a sales rep, governance ensures my AI follows our sales playbook and compliance rules automatically — I can trust it to generate quality output."*

### For Marketing
- *"As a marketer, landing page copy is generated per visitor — not per segment. A healthcare VP sees different copy than a SaaS engineer, and both see different copy from what they'd see next month as they progress through the funnel."*
- *"As a marketer, brand voice governance means every AI-generated touchpoint sounds like us — consistent across email, web, notifications, and in-app. One set of rules, enforced everywhere."*

### For Customer Success
- *"As a CS manager, health check-ins reference actual product usage AND support tickets AND billing data — the AI synthesizes everything into a narrative, not just one metric in a template."*
- *"As a CS manager, QBR materials include AI-written analysis with recommendations — governed by our CS team's presentation standards. Not just auto-generated charts."*
