# Reference: Prospect Research & Company Intelligence

How to research a prospect online before and during discovery. The goal: walk into the conversation (or build use cases) knowing their business well enough that they say "you clearly understand our world."

---

## Why Research First

Generic discovery questions waste everyone's time. "What does your product do?" is fine when you genuinely don't know. But if the prospect has a public website, a LinkedIn page, job postings, press releases, and a product you can sign up for -- you should already know the basics before asking.

**Research transforms discovery from interrogation to validation:**

- Instead of: "What does your product do?"
- You say: "I see you're a [X] platform serving [Y]. You've got about [Z] employees based on LinkedIn, and it looks like you're hiring engineers for [specific team]. Is that roughly right?"

That single sentence signals competence, earns trust, and skips 10 minutes of basics.

---

## Phase 0: Prospect Research

Run this BEFORE discovery questions. Use web search, the prospect's website, LinkedIn, Crunchbase, job boards, and any other public sources.

### Step 1: Company Profile

Search for and fill in as much as possible:

```
COMPANY PROFILE
===============
Company:        [name]
Website:        [url]
One-liner:      [what they do in one sentence, from their homepage or LinkedIn]
Founded:        [year]
Headquarters:   [city, country]
Industry:       [primary industry + sub-vertical]
Business model: [SaaS / marketplace / e-commerce / services / platform / etc.]

SIZING SIGNALS
==============
Employee count:     [from LinkedIn company page or Crunchbase]
  - Engineering:    [infer from LinkedIn "People" filter by department, or job postings]
  - Sales/Marketing: [same]
  - Customer Success: [same]
Revenue estimate:   [from funding stage, employee count, or public data]
Funding stage:      [bootstrapped / seed / Series A-E / public / PE-backed]
Total raised:       [from Crunchbase or press releases]
Last round:         [amount + date + lead investor]

CUSTOMER BASE
=============
Who they sell to:   [B2B / B2C / B2B2C / marketplace two-sided]
Customer segment:   [enterprise / mid-market / SMB / consumer / mixed]
Estimated volume:   [infer: "thousands of customers" from testimonials, case studies, pricing page signals]
Geographic scope:   [local / national / global / specific regions]
Key verticals:      [industries their customers are in]

PRODUCT & TECH
==============
Product type:       [web app / mobile app / API / platform / hardware+software]
Pricing model:      [per-seat / usage-based / freemium / enterprise-only / listed vs "contact us"]
Free trial/tier:    [yes/no, what's included]
Integrations:       [what tools they connect to, from integrations page]
Tech stack clues:   [from job postings: "React", "Python", "AWS", etc.]
API/developer docs: [do they have a public API? developer portal?]
```

### Step 2: Complexity Assessment

Based on the company profile, infer their organizational complexity:

#### Do They Have a Dev Team?

| Signal | Inference |
|---|---|
| Job postings for engineers | Yes, and you can see what they're building |
| "API" or "SDK" on their website | Yes, they build for developers |
| Only marketing/sales job postings | Likely no dedicated dev team, or very small |
| "No-code" or "easy setup" messaging | Their customers may not have dev teams |
| GitHub org with active repos | Strong engineering culture |
| Developer docs / changelog | Active dev team shipping regularly |
| < 20 employees total | Dev team is likely 2-5 people or outsourced |
| > 100 employees | Almost certainly dedicated eng team, likely 20%+ of headcount |

#### Customer Volume Estimation

| Signal | Inference |
|---|---|
| Pricing page says "contact us" / enterprise only | Low volume, high ACV (hundreds to low thousands of customers) |
| Self-serve signup with free tier | High volume (thousands to millions of users) |
| "Trusted by 500+ companies" on homepage | They tell you directly |
| Case studies from Fortune 500 | Enterprise, lower volume, high complexity |
| App store ratings (1K+ reviews) | Consumer scale |
| "Millions of [users/transactions/etc.]" in press | High volume |
| SMB pricing ($29-$199/mo) | Mid-volume, likely thousands of accounts |
| Enterprise pricing ($10K+/yr) | Low volume, dozens to hundreds of accounts |
| Marketplace model | Two-sided: could be millions on demand side, thousands on supply side |

#### B2B vs B2C vs B2B2C

| Signal | Inference |
|---|---|
| "For teams" / "For companies" messaging | B2B |
| Per-seat pricing | B2B |
| "SSO" / "SAML" / "Admin console" features | B2B, likely mid-market to enterprise |
| Individual signup, consumer pricing | B2C |
| App store presence (iOS/Android) | Likely B2C or prosumer |
| "Platform" that serves businesses who serve consumers | B2B2C |
| Both "For Business" and "For Personal" pages | B2B2C or freemium B2B |

#### BYOC / Deployment Requirements

| Signal | Inference |
|---|---|
| Customers in healthcare, finance, government | Likely needs data residency, on-prem, or VPC deployment |
| "SOC 2" / "HIPAA" / "ISO 27001" badges on site | Security-conscious, may want BYOC |
| "Enterprise" tier with "custom deployment" | Already offering deployment flexibility to their customers |
| > 500 employees | More likely to have infosec team that requires BYOC |
| Job postings for "Security Engineer" or "Compliance" | Active security program, BYOC likely important |
| Regulated industry vertical | Almost certainly needs deployment control |
| Startup < 50 people, SaaS product | Unlikely to need BYOC unless serving regulated customers |
| "Data Processing Agreement" or "GDPR" pages | Privacy-aware, may want regional deployment |

### Step 3: Competitive & Market Position

| Research Area | Where to Look | What It Tells You |
|---|---|---|
| **Competitors** | G2, Capterra, Google "[company] alternatives" | Market positioning, what features differentiate them |
| **Recent news** | Google News, TechCrunch, company blog | Momentum, pivots, layoffs, launches |
| **Customer reviews** | G2, Capterra, Trustpilot, App Store | What customers love/hate, pain points |
| **Job postings** | LinkedIn Jobs, company careers page | What they're building next, team priorities |
| **Content/blog** | Company blog, LinkedIn posts from leadership | Thought leadership topics, what they think about |
| **Social proof** | Testimonials page, case studies | Customer types, use case validation |
| **Tech partnerships** | Integrations page, partner directory | Ecosystem they operate in |

### Step 4: Personize Fit Signals

As you research, flag these signals that indicate strong Personize fit:

#### Strong Fit Signals

| Signal | Why It Matters | Personize Angle |
|---|---|---|
| They have multiple customer touchpoints (email + in-app + Slack + calls) | Multiple channels = scattered personalization | Unified memory across all channels |
| They sell to different segments (enterprise + SMB, or multiple verticals) | Different segments need different messaging | Governance ensures consistent but segment-appropriate voice |
| They're hiring for "personalization" or "AI" roles | Active investment in the space | Personize accelerates what they're already trying to build |
| They have a CRM + support tool + analytics but no unified view | Data silo problem | Unified memory solves this directly |
| Their product has onboarding that varies by customer type | Onboarding personalization opportunity | AI-generated onboarding guides |
| They send emails that look templated (mail merge style) | Obvious upgrade path | AI-written emails that reference actual customer context |
| Multiple teams interact with the same customer (sales, CS, support) | Cross-team context problem | Workspace coordination patterns |
| They mention "AI" or "ML" on their site but no memory/context layer | AI without context is limited | Personize adds the memory and governance layers |
| High customer volume (10K+ contacts) | Manual personalization impossible at scale | Personize scales to millions |
| They have governance needs (compliance, brand voice, multiple teams writing) | Governance is a real pain point | smartGuidelines solves this |

#### Weak Fit Signals

| Signal | Why It's Weak |
|---|---|
| < 100 customers, all enterprise, all managed by one person | Can personalize manually |
| Pure developer tool with no customer communication | Limited personalization surfaces |
| Already built a custom RAG + personalization pipeline | Switching cost may be too high unless they're unhappy |
| Pre-revenue startup with no customers yet | No data to memorize, no use cases to personalize yet |

---

## Research Output: Prospect Intelligence Brief

After research, produce this document. It feeds directly into DISCOVER (Phase 1 becomes validation, not interrogation) and PROPOSE (use cases reference their actual business).

```markdown
# Prospect Intelligence: [Company Name]

## Company Snapshot
- **What they do:** [one paragraph, in your own words, showing you understand the business]
- **Who they serve:** [customer types, segments, verticals]
- **How big:** [employees, funding, estimated revenue, estimated customer volume]
- **Business model:** [how they make money]
- **Growth stage:** [early / scaling / mature / pivoting]

## Organizational Complexity
- **Dev team:** [yes/no, estimated size, what they're building based on job postings]
- **Go-to-market teams:** [sales, marketing, CS -- estimated sizes, structure]
- **Cross-team coordination:** [do multiple teams touch the same customer?]
- **Tools landscape:** [CRM, support, analytics, marketing tools -- from integrations page or job postings]

## Customer Profile
- **Volume:** [estimated number of customers/users]
- **Type:** [B2B / B2C / B2B2C]
- **Segment:** [enterprise / mid-market / SMB / consumer]
- **Verticals:** [industries their customers are in]
- **Lifecycle complexity:** [simple funnel / multi-stage / ongoing relationship]

## Personize Fit Assessment
- **Fit score:** [Strong / Moderate / Exploratory]
- **Primary value:** [which Personize capability matters most to them]
- **Top 3 signals:** [what makes this a good fit]
- **Potential objections:** [what might hold them back]
- **BYOC likelihood:** [Low / Medium / High -- with reasoning]

## Gaps to Fill in Discovery
- [What you couldn't find online and need to ask about]
- [What you inferred but need to validate]
- [What they're likely sensitive about (recent layoffs, competitor pressure, etc.)]
```

---

## During Discovery: Validate, Don't Interrogate

With the Prospect Intelligence Brief in hand, restructure your discovery questions:

### Instead of Open-Ended Basics...

| Don't Ask | Do Ask |
|---|---|
| "What does your product do?" | "I see you're a [X] platform for [Y]. How accurate is that, and has the focus shifted recently?" |
| "Who are your customers?" | "It looks like you serve mostly [segment] in [verticals]. Is that where the growth is, or are you expanding into new segments?" |
| "What's your tech stack?" | "I noticed you're hiring for [framework] and your integrations page lists [tools]. Is that the core of your stack, or is there more under the hood?" |
| "Do you have a dev team?" | "Your engineering team looks like about [N] people based on LinkedIn. Are they focused on [inferred area], or spread across multiple products?" |
| "What data do you have?" | "With [CRM] and [analytics tool] in your stack, you probably have good structured data. Where do you feel the gaps are -- is it the unstructured stuff like call notes and support tickets?" |
| "What personalization do you do today?" | "Your emails look fairly templated right now -- [reference a specific example if you signed up]. Have you tried going deeper, or has it been hard to justify the engineering investment?" |

### Validation Questions That Show You Did Your Homework

These demonstrate competence and build trust:

1. **"I saw you recently [raised a round / launched a feature / expanded to a market]. How is that changing your customer base?"** -- Shows you follow their news.

2. **"Your job postings mention [specific technology/role]. Is that a new initiative, or have you been building in that direction?"** -- Shows attention to detail.

3. **"I noticed [competitor] just launched [feature]. Is that creating pressure on your side, or are you differentiated enough that it doesn't matter?"** -- Shows market awareness without being threatening.

4. **"Your [G2/Capterra] reviews mention [specific praise or complaint]. Does that match what you're hearing internally?"** -- Shows you went beyond their own marketing.

5. **"With [estimated customer volume] accounts across [segments], manual personalization must be impossible at this point. What's your biggest bottleneck?"** -- Shows you understand their scale problem.

---

## Research Timing

| Scenario | Research Depth |
|---|---|
| **Pre-meeting (scheduled call)** | Full research -- 15-20 minutes. Fill in the complete Prospect Intelligence Brief. |
| **Inbound lead (they came to you)** | Quick research -- 5 minutes. Company snapshot + fit signals. Validate during conversation. |
| **Cold outreach (you're reaching out)** | Full research -- this IS the value. Your outreach should prove you know their world. |
| **Referral introduction** | Moderate research + referrer context. Ask the referrer what to know before the call. |
| **Existing customer expansion** | Internal research -- pull from Personize memory + supplement with public data on new stakeholders or departments. |

---

## Tools for Research

Use web search to find information from these sources:

| Source | What You Get |
|---|---|
| **Company website** | Product description, pricing, integrations, team page, blog, case studies |
| **LinkedIn company page** | Employee count, department breakdown, recent posts, growth trend |
| **LinkedIn job postings** | Tech stack, team priorities, new initiatives, organizational structure |
| **Crunchbase / PitchBook** | Funding, investors, revenue estimates, competitor landscape |
| **G2 / Capterra** | Customer reviews, feature comparisons, satisfaction scores |
| **Google News** | Recent press, launches, funding announcements, executive changes |
| **GitHub (if applicable)** | Open-source contributions, tech stack, engineering culture |
| **Product Hunt** | Launch positioning, early traction, community reception |
| **Glassdoor** | Internal culture clues, team size validation, growth signals |
| **Twitter/X / LinkedIn posts from leadership** | Thought leadership, priorities, frustrations, what they care about |
| **Their blog** | Content strategy, target audience, expertise areas, product roadmap hints |
| **Their API docs / changelog** | Technical maturity, shipping velocity, integration patterns |
