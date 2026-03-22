# Reference: Use Case Builder

How to build use cases that read like you've worked inside the prospect's company for years. The difference between "you could personalize your emails" and "your onboarding specialists are probably copy-pasting context from HubSpot into Google Docs before each kickoff call -- here's how to eliminate that."

---

## The Principle: Specificity Creates Trust

Generic use cases sound like a sales deck. Specific use cases sound like a consultant who's done the work.

| Generic (sounds like a pitch) | Specific (sounds like you know the business) |
|---|---|
| "Personalize your outreach emails" | "Your SDRs are probably spending 15 minutes per prospect copying data from [their CRM] into [their email tool] to write something that doesn't sound templated. With Personize, that context assembly happens automatically." |
| "Improve customer retention" | "When a [their product] user's API call volume drops 30% week-over-week, your CS team probably doesn't know until they check the dashboard manually. A health signal fires a Slack alert with context from support tickets + usage + billing in one narrative." |
| "AI-powered notifications" | "Right now your product sends 'You have 3 new matches' as a push notification. Personize would write 'Sarah from Acme Corp -- the healthcare VP you've been tracking -- just updated her profile. Her new role aligns with your Q2 pipeline target.'" |

---

## How to Build Specific Use Cases

### Step 1: Map Their Value Chain

From the Prospect Intelligence Brief, trace how value flows through their business:

```
ACQUISITION → ACTIVATION → RETENTION → EXPANSION → ADVOCACY
     ↓              ↓            ↓            ↓           ↓
[How do they    [What does    [How do they  [How do they  [How do they
 get customers?  onboarding    keep them     grow the      get referrals
 What channels?  look like?    engaged?      account?      or reviews?]
 What data do    What data     What signals  What triggers
 they collect?]  do they       indicate      upsell?]
                 need?]        churn risk?]
```

For each stage, ask: **"What would a human expert do if they had unlimited time and perfect memory?"** That's the Personize use case.

### Step 2: Find Their Pain Points from Public Signals

| Signal Source | How to Find Pain Points |
|---|---|
| **Job postings** | Hiring for "Customer Success Manager" suggests retention challenges. Hiring "Data Engineer" suggests data pipeline pain. |
| **G2/Capterra reviews** | "Great product but onboarding was rough" = onboarding personalization opportunity |
| **Their blog** | Blog about "scaling customer success" = they've hit the limit of manual CS work |
| **Pricing page** | Multiple tiers with very different feature sets = complex segmentation |
| **Support/help center** | Extensive docs = complex product. FAQ about common issues = proactive notification opportunities |
| **Social media from leadership** | CEO posting about "customer-centricity" = personalization is already a priority |
| **Product changelog** | Frequent releases = active dev team. Mentions of "personalization" or "AI" = already thinking about it |
| **Competitor comparison pages** | What they position against = their differentiation strategy |

### Step 3: Build Use Cases Using Their Language

Use the exact terminology from their website, job postings, and product. If they call customers "members," you call them members. If they call their product categories "solutions," use "solutions."

**Template for each use case:**

```markdown
## [Use Case Name -- using their terminology]

**The situation today:**
[Describe what their team currently does, based on your research. Be specific
about which role, which tool, which manual step. Use "probably" or "likely"
when inferring -- it shows honesty while still demonstrating insight.]

**What changes with Personize:**
[Describe the automated version. Reference their specific tools, data sources,
team structure, and customer types. Show all three layers in action.]

**Why this matters for [their company]:**
[Connect to a business outcome they care about. Reference their stage, their
competitive landscape, or their stated priorities.]

**Technical sketch:**
[3-5 line code snippet or data flow diagram using their entity names]
```

---

## Use Case Patterns by Company Profile

### Pattern A: High-Volume B2C / Consumer (10K+ customers)

**Their world:** They can't manually personalize anything. They rely on segments and templates. Their "personalization" is `{first_name}` and maybe behavioral triggers.

**What resonates:**
- "Your segment of 'active users who haven't purchased in 30 days' is 50,000 people who all get the same email. Personize writes a unique email for each one."
- "Your push notifications say 'New items in [category].' Personize writes 'The [specific brand] [specific item type] you've been browsing is now 20% off -- and based on your size preferences, the [size] is still in stock.'"
- "You probably have 500+ notification rules. Each one is a template with variables. Personize replaces all of them with one AI pipeline that decides what to say, when, and through which channel."

**Use cases to propose:**
1. **Segment-of-one messaging** -- every customer gets unique copy, not segment-level templates
2. **Smart notification throttling** -- AI decides IF and WHEN to notify, preventing fatigue
3. **Lifecycle-aware content** -- the same "feature" is described differently based on where the customer is in their journey
4. **Return/churn prediction + proactive intervention** -- synthesize signals from multiple sources into early warnings with recommended actions
5. **Review/feedback solicitation timing** -- AI picks the optimal moment and crafts the ask based on relationship history

**Key governance:**
- Personalization boundaries (helpful vs creepy)
- Notification frequency limits
- Discount/promotion rules
- Privacy compliance (GDPR, CCPA)

### Pattern B: Mid-Market B2B SaaS (100-5,000 customers)

**Their world:** Small enough that they know their customers by name. Big enough that they can't keep context in their heads anymore. Their CS team is overwhelmed, their sales team sends semi-personalized outreach, and their data lives in 3-5 tools that don't talk to each other.

**What resonates:**
- "Your CSMs probably have 30-50 accounts each. They can't deeply know all of them. Personize gives each CSM a synthesized briefing on every account, every morning."
- "When a deal enters negotiation, your sales team probably pulls data from [CRM], checks [support tool] for open tickets, looks at [analytics] for usage, and maybe Googles the company. That's 20 minutes of context assembly that Personize does in 2 seconds."
- "Your onboarding flow probably has 3 templates: 'small team,' 'mid-size,' 'enterprise.' But a 50-person fintech company needs completely different onboarding than a 50-person marketing agency. Personize writes a unique onboarding guide for each."

**Use cases to propose:**
1. **Meeting prep briefs** -- one-click context assembly from all sources before any customer call
2. **Health score narratives** -- not just a number, but a paragraph explaining WHY the score is what it is
3. **Personalized onboarding per customer profile** -- AI-written guides that reference their industry, size, tech stack, and goals
4. **Cross-team context sharing** -- sales knows about support tickets, CS knows about deal history, support knows about renewal timeline
5. **Expansion signal detection** -- AI monitors usage patterns and surfaces upsell opportunities with context
6. **QBR auto-generation** -- full quarterly business review materials written by AI, using all data sources

**Key governance:**
- Brand voice for customer communication
- Sales playbook and messaging angles
- CS escalation criteria
- Competitor mention policy

### Pattern C: Enterprise B2B (< 500 customers, high ACV)

**Their world:** Each customer is a complex relationship. Multiple stakeholders, long sales cycles, dedicated account teams. They already do deep personalization -- manually. The problem is scale, consistency, and knowledge transfer when people leave.

**What resonates:**
- "When an account manager leaves, they take the relationship context with them. The replacement spends 3 months rebuilding that understanding. Personize captures institutional knowledge that survives turnover."
- "You have 8 people touching the same enterprise account -- sales, CS, support, solutions engineering, product, leadership. Do they all have the same view of the customer? Personize ensures they do."
- "Your proposals are already customized. But does every proposal follow the same messaging framework? Governance ensures your pitch deck for a healthcare company follows the healthcare compliance messaging rules automatically."

**Use cases to propose:**
1. **Account intelligence workspace** -- all teams contribute to a shared, AI-synthesized account view
2. **Stakeholder mapping and relationship intelligence** -- track every contact, their role, their priorities, their sentiment over time
3. **Institutional knowledge capture** -- every meeting, call, and email enriches the account memory
4. **Governance-gated proposals** -- AI generates proposal sections that automatically follow industry-specific messaging rules
5. **Executive sponsor briefings** -- AI-written updates for C-level stakeholders that synthesize across all touchpoints
6. **Competitive displacement playbook** -- when a competitor is mentioned, governance surfaces the right battle card and approach

**Key governance:**
- Industry-specific compliance rules
- Approval workflows for customer-facing content
- Pricing and discount authority
- NDA-aware communication rules
- BYOC deployment for data sovereignty

### Pattern D: Platform / Marketplace (two-sided)

**Their world:** They have two customer types -- supply and demand. Each side needs different personalization. The platform's job is matching and facilitating trust.

**What resonates:**
- "You need to personalize for both sides simultaneously. A property listing alert needs to match what the buyer wants AND what the seller is offering. That's two entity types in memory, both consulted during generation."
- "Your supply-side users (hosts, sellers, freelancers) need different governance than your demand-side users (guests, buyers, clients). One set of rules for retention messaging, another for acquisition."
- "Matching is your core value. But the COMMUNICATION around the match is where trust is built or broken. 'You have a new match' vs 'Sarah, a VP of Engineering at a Series B healthtech in Boston -- similar to the 3 clients you loved working with last year -- just posted a project that matches your AI/ML expertise.'"

**Use cases to propose:**
1. **Match narrative generation** -- explain WHY a match is good, using context from both sides
2. **Dual-entity personalization** -- different messaging for each side of the marketplace
3. **Trust-building communication** -- AI-written messages that highlight relevant social proof specific to this match
4. **Churn prediction per side** -- different signals for supply churn vs demand churn, different interventions
5. **Marketplace health monitoring** -- detect supply/demand imbalances and generate targeted recruitment or retention campaigns

### Pattern E: No Dev Team / Non-Technical

**Their world:** They use no-code tools, spreadsheets, and SaaS products. They don't have engineers. They need solutions that work through existing tools.

**What resonates:**
- "You don't need to write code. Connect your CRM to Personize through n8n or Zapier, set up your brand voice, and every email your team sends through [their email tool] can be AI-personalized."
- "Your team probably has 'the person who knows the most about each client.' That knowledge needs to be in a system, not in someone's head. Personize captures it through simple forms, CRM sync, or even pasting call notes."
- "You can use Personize through Claude or ChatGPT. Just connect the MCP server and say 'write a follow-up for Sarah at Acme.' It pulls everything from your CRM and writes the email."

**Use cases to propose:**
1. **MCP-powered email writing** -- use Claude/ChatGPT with Personize memory to write personalized emails
2. **n8n/Zapier automated sync** -- keep customer memory updated from CRM automatically
3. **Smart email campaigns via n8n** -- visual workflow that generates and sends personalized emails on a schedule
4. **Team knowledge capture** -- simple workflows that memorize meeting notes, call summaries, and client updates
5. **Client briefing generation** -- ask the AI "prepare me for my call with Sarah" and get a full briefing

---

## Building the "Day in the Life" Narrative

The most compelling use case presentation shows what a specific person's workflow looks like today vs with Personize. Build this for the prospect's most relevant role.

### Template

```markdown
## A Day in the Life: [Role] at [Company]

### Today (without Personize)

**8:30 AM** — [Name] opens [their CRM]. Scrolls through a list of [entities].
No context on which ones need attention. Clicks into the first one, sees basic
fields: name, email, last activity date. Doesn't know about the support ticket
filed yesterday or the usage drop last week.

**9:00 AM** — Has a call with [customer name]. Opens [CRM], [support tool],
[analytics dashboard] in three tabs. Spends 12 minutes building a mental picture
of the account. Misses the fact that the customer's company just announced layoffs.

**10:00 AM** — Needs to send follow-up emails to 15 accounts. Opens [email tool].
Uses the same template for all 15. Changes the first name and company name.
Adds one custom sentence per email -- if there's time. There usually isn't.

**2:00 PM** — A high-value customer hasn't logged in for 3 weeks. Nobody notices
because the alert threshold is set to 30 days. By then, the customer is already
evaluating alternatives.

### Tomorrow (with Personize)

**8:30 AM** — [Name] opens their dashboard. A Personize-generated morning briefing
shows: "3 accounts need attention today. Acme Corp: usage down 25% + unresolved
ticket about [feature]. Beta Inc: renewal in 30 days, champion changed roles
last week. Gamma LLC: expansion signal -- hit 90% of their plan limit."

**9:00 AM** — Before the call, clicks "Prep Brief." Personize assembles everything
from [CRM] + [support tool] + [analytics] + LinkedIn news in 2 seconds. One
page. [Name] walks in informed.

**10:00 AM** — Reviews 15 AI-drafted emails. Each one references specific facts
about the account: usage patterns, recent support interactions, upcoming renewal,
industry news. [Name] edits 3 of them, approves the rest. Total time: 10 minutes
instead of 90.

**2:00 PM** — At 2 PM yesterday, Personize's health monitoring noticed the 3-week
login gap, correlated it with a failed API integration attempt from 3 weeks ago,
and sent a Slack alert to [Name]: "This customer likely stopped because of the
integration failure, not disengagement. Suggested action: send them the updated
integration guide." [Name] sent a helpful email at 9 AM. The customer replied
with gratitude by 11 AM.
```

---

## Customizing Industry Blueprints

After building the Prospect Intelligence Brief, customize the generic industry blueprint:

### Rename Everything

| Generic | Customized |
|---|---|
| "Contact" collection | Use their term: "Member," "Patient," "Subscriber," "Candidate" |
| "Company" collection | Use their term: "Account," "Client," "Firm," "Practice" |
| "email" as identifier | Use their primary key: "member_id," "patient_mrn," "user_handle" |
| "CRM" | Name their actual CRM: "HubSpot," "Salesforce," "Pipedrive" |
| "support tool" | Name it: "Zendesk," "Intercom," "Freshdesk" |
| "analytics" | Name it: "Mixpanel," "Amplitude," "PostHog," "Google Analytics" |

### Replace Generic Properties with Theirs

Don't propose `industry`, `employee_count`, `deal_stage` unless those concepts exist in their world. Instead:

- For a fitness app: `fitness_goals`, `workout_frequency`, `preferred_activities`, `membership_type`
- For a legal platform: `practice_area`, `bar_admissions`, `case_volume`, `billing_rate`
- For a restaurant chain: `location`, `cuisine_preferences`, `visit_frequency`, `dietary_restrictions`

### Use Their Numbers

| Generic | Specific |
|---|---|
| "thousands of customers" | "your 8,000 active accounts" |
| "multiple data sources" | "HubSpot + Zendesk + Mixpanel" |
| "your team" | "your 12-person CS team managing 400 accounts each" |
| "regular emails" | "the weekly product digest you send to 25K subscribers" |

---

## The Credibility Checklist

Before presenting use cases, verify each one passes:

- [ ] **Uses their terminology** -- not our generic terms
- [ ] **References their actual tools** -- by name
- [ ] **Describes a real workflow** -- that someone on their team would recognize
- [ ] **Quantifies the problem** -- time wasted, opportunities missed, scale challenge
- [ ] **Shows all three layers** -- governance + memory + generation working together
- [ ] **Passes the differentiation test** -- couldn't be done with CRM + single LLM call
- [ ] **Connects to a business outcome** -- not just "better personalization" but revenue, retention, efficiency, or risk reduction
- [ ] **Acknowledges what they already do well** -- don't imply their current approach is broken, show how it gets better
- [ ] **Calibrated to their maturity** -- don't propose enterprise collaboration patterns to a 20-person startup
- [ ] **Honest about what you inferred** -- use "based on what I see" or "likely" for assumptions
