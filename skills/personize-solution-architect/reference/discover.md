# Reference: DISCOVER Action

Complete discovery framework for understanding a developer's product, data, and personalization opportunities.

---

## Phase 0: Prospect Research (Before Discovery Questions)

**ALWAYS start here.** Before asking a single discovery question, research the prospect online. Use web search to build a Prospect Intelligence Brief. This transforms discovery from interrogation to validation.

**Full guide:** `reference/prospect-research.md`

**Quick checklist:**
1. Search for the company website, LinkedIn, Crunchbase, job postings, G2/Capterra reviews
2. Determine: company size, dev team presence, customer volume, B2B vs B2C, funding stage
3. Infer: tech stack (from job postings), customer segment, competitive landscape, BYOC likelihood
4. Look for Personize fit signals: multiple touchpoints, data silos, manual personalization, multiple teams touching customers
5. Produce a Prospect Intelligence Brief (see `reference/prospect-research.md` for template)
6. Identify gaps to fill during the conversation

**Output:** A Prospect Intelligence Brief that lets you validate rather than interrogate.

---

## Phase 1: Discovery Questions (Validate & Deepen)

With the Prospect Intelligence Brief in hand, lead with what you know and validate. Ask conversationally -- 2-3 at a time, adapt based on answers. Don't dump the full list.

### Product Understanding

1. **"I see you're a [X] platform for [Y]. How accurate is that, and has the focus shifted recently?"**
   - Lead with what you learned from research. Validate, don't interrogate.
   - If you couldn't find enough online: "What does your product do? Walk me through the core user journey."

2. **"It looks like you serve mostly [segment] in [verticals]. Is that where the growth is, or are you expanding?"**
   - Reference your research on their customer base
   - If unknown: "Who are your users? What roles or segments do you serve?"

3. **"What's the first thing a user does after signup? Walk me through onboarding."**
   - This reveals the earliest personalization opportunity
   - Look for: where users drop off, what info they provide, what choices they make

### Interaction Surface

4. **"Where do your users interact with your product?"**
   - Web app, mobile app, email, Slack, SMS, in-app notifications, dashboards, API
   - This tells you: which delivery channels to propose

5. **"What notifications or emails do you send today?"**
   - Welcome emails, alerts, digests, marketing, transactional
   - This tells you: what can be personalized immediately

6. **"Do your users have dashboards or reporting views?"**
   - This is prime territory for AI-generated insights

### Data Landscape

7. **"What data do you already have about your users?"**
   - CRM data, product analytics, support tickets, purchase history, behavior logs
   - This tells you: what can be memorized immediately

8. **"What does your team do manually today that involves knowing about a specific user?"**
   - Sales reps researching before calls, CS managers checking health, marketers segmenting
   - This tells you: which workflows to automate first

9. **"Do you have any ML models running — churn prediction, lead scoring, recommendations?"**
   - Store predictions + explanations in memory for AI to reference

10. **"What external data do you pull in? CRM, enrichment services, social, news?"**
    - Every external source is potential memorization material

### Personalization Gap

11. **"What do you wish your product knew about each user that it currently doesn't?"**
    - Preferences, intent, satisfaction, likelihood to churn, readiness to buy
    - This tells you: what AI extraction and memory can unlock

12. **"What personalization do you have today, if any?"**
    - "Hi {first_name}" in emails? Recommendation engine? Nothing?
    - This tells you: their starting point and how much headroom exists

13. **"Have you tried AI/LLM personalization before? What worked and what didn't?"**
    - Calibrate expectations and avoid repeating past failures

### Technical Context

14. **"I noticed you're hiring for [framework] and your integrations page lists [tools]. Is that the core of your stack?"**
    - Reference job postings and integrations page from your research
    - If unknown: "What's your tech stack?"

15. **"Do you use any workflow automation tools? (n8n, Zapier, Make, custom cron jobs)"**
    - This tells you: where pipelines can plug in

16. **"How does your team deploy? GitHub Actions, Docker, serverless, Vercel, Render?"**
    - This tells you: how to deploy the sync/pipeline scripts

---

## Codebase Analysis

When the developer shares code or gives you access to their repo, analyze it systematically.

### What to Look For

| Pattern | What It Means | Personalization Opportunity |
|---|---|---|
| `user.email`, `user.name`, `user.role` | User data model | Identity properties to memorize |
| `event.track()`, `analytics.identify()` | Event tracking | Behavioral signals to memorize |
| `sendEmail()`, `sgMail.send()`, `ses.send()` | Email sends | Personalize email content |
| `notify()`, `pushNotification()` | Notifications | Smart notification via `smartDigest()` |
| `fetch('/api/...')` with user data | API calls | Intercept for personalization |
| Database schemas (Prisma, TypeORM, Sequelize) | Data model | Map fields to collections/properties |
| `if (user.plan === 'pro')` | Segmentation logic | Replace with AI-driven decisions |
| Search endpoints | User search queries | Intent signals to memorize |
| File upload handlers | User-generated content | Memorize content/summaries |
| Dashboard/report components | Data views | AI-generated insights opportunity |
| Onboarding flows | First-run experience | Smart onboarding personalization |
| Empty state components | No-data views | Personalized suggestions |
| Help/FAQ pages | Support content | Dynamic help based on user level |

### How to Analyze

1. **Start with the data model** — Find the user/customer/contact schema. List every field. These become properties.
2. **Follow the data flow** — Where does user data get created, updated, read, and displayed?
3. **Find the outbound channels** — Email, notifications, Slack, SMS. These are delivery points.
4. **Find the decision points** — Where does the code branch based on user attributes? These can be AI-driven.
5. **Count the touchpoints** — Every screen, every email, every notification is a personalization surface.

### Mapping Data Sources to Memorization

After reading the codebase, create a mapping:

```
Source: [their database/CRM/analytics]
├── Structured fields (extractMemories: false)
│   ├── email → Standard collection
│   ├── name → Standard collection
│   ├── plan_tier → Standard collection
│   └── last_login → Standard collection
│
├── Unstructured fields (extractMemories: true)
│   ├── support_tickets → Generated Content collection
│   ├── call_notes → Generated Content collection
│   └── research_reports → Generated Content collection
│
└── Real-time events (memorize individually)
    ├── search queries → memorize with enhanced: true
    ├── feature usage → memorize weekly summary
    └── content consumption → memorize with content itself
```

---

## Phase 2: Situation Assessment

After Phase 0 (research) and Phase 1 (validation), assess the 5 dimensions. Ask naturally -- 2-3 at a time, adapt based on answers.

### Integration Mode (D1)

**"How do you see Personize fitting into your workflow?"**
- Are you writing code directly (SDK), or do you want AI agents to have Personize as a tool (MCP)?
- Do you use AI coding assistants like Cursor or Claude Code?
- Do you use workflow automation tools like n8n, Zapier, or Make?
- Are you building multi-agent systems (OpenClaw, CoWork, CrewAI, LangGraph)?
- Do you need Personize to control the workflow, or will something else orchestrate?

**What to listen for:**
| Signal | Integration Mode |
|---|---|
| "I'll write TypeScript pipelines" | SDK in code |
| "We use n8n for everything" | MCP on workflow tools |
| "I'm using Cursor/Claude Code" | MCP on coding assistant |
| "We're building an agent system" | MCP on multi-agent |
| "I need an API I can call from Python/Go/Ruby" | REST API |
| "Different tools for different jobs" | Hybrid |

### Personize's Role (D2)

**"What role should Personize play in your stack?"**
- Will Personize be your primary customer data layer, or do you have a data warehouse?
- Do you need AI generation (writing emails, reports), or mainly data storage and recall?
- Do you need multiple agents to collaborate on the same records?
- Should agents learn from outcomes and update rules over time?

**Map the data flow legs:**
| Signal | Active Legs |
|---|---|
| "We need to import CRM data and sync it" | Legs 1 + 4 (Execution) |
| "We need AI to write personalized emails" | Legs 1 + 2 + 3 + 4 (Communication) |
| "Agents should improve over time" | Legs 1 + 2 + 3 (with governance writes) |
| "Multiple agents work on the same account" | All 4 legs + workspace coordination |

### Use Case Archetype (D3)

**"What kind of work will Personize power?"**
- Is this primarily about generating and sending messages? (Communication)
- Researching and synthesizing information? (Analysis)
- Scoring and routing decisions? (Decision)
- Syncing and enriching data? (Execution)
- Coordinating across multiple agents or teams? (Collaboration)

**If unclear, use these probes:**
- "What does success look like? An email sent? A report generated? A decision made? Data synced?"
- "How would you describe the output -- a message, a score, a report, a data update, or a coordinated action?"

### Department (D4)

**"Which team benefits first?"**
- Sales, Marketing, Customer Success, Product, Operations?
- Internal collaboration or external communication?
- Is this for one team or cross-functional?

### Autonomy & Tempo (D5)

**"How much human oversight do you want?"**
- Every output reviewed before action? (Human-in-loop)
- Batch jobs with periodic spot-checks? (Supervised)
- Fully autonomous with governance guardrails? (Autonomous)

**"How often does this run?"**
- On-demand (when a human triggers it)
- Event-triggered (when something happens in a CRM/system)
- Scheduled (daily, weekly)
- Continuous (always running, monitoring, acting)

---

## Discovery Output

After ALL three phases (research + validation + situation assessment), produce this document. It drives the PROPOSE action and every subsequent recommendation. Use the company's own terminology throughout.

### [Company Name] -- Personalization Discovery

**Research-Derived (from Phase 0):**
- **Company**: [name, founded, HQ, one-liner]
- **Size**: [employee count, estimated engineering team size, funding stage]
- **Customer base**: [B2B/B2C/B2B2C, segment, estimated volume, verticals]
- **Business model**: [how they make money]
- **Tools landscape**: [CRM, support, analytics, marketing tools -- from job postings and integrations page]
- **Dev team**: [yes/no, estimated size, focus areas from job postings]
- **BYOC likelihood**: [Low/Medium/High with reasoning]
- **Competitive position**: [key competitors, differentiation]
- **Fit signals**: [3-5 specific signals from research]

**Validated in Conversation (from Phase 1):**
- **Product**: [what they build, who it serves -- in their own words]
- **Users**: [who uses it, segments -- validated and refined]
- **Channels**: [web, mobile, email, Slack, SMS, notifications, dashboards]
- **Data sources**: [CRM, product usage, support, analytics, ML, enrichment -- named specifically]
- **Entity types**: [using their terminology -- "Members" not "Contacts" if that's what they say]
- **Key properties per entity**: [5-10 most important fields -- using their field names]
- **Current personalization**: [none / basic merge-tags / advanced -- with specific examples]
- **Tech stack**: [frontend, backend, DB, hosting, CI/CD -- validated against job posting inferences]
- **Governance needs**: [brand voice, compliance, ICP definitions -- specific to their industry]
- **Priority channel**: [email, in-app, Slack, etc.]
- **Quick win**: [the single highest-impact personalization to build first]
- **Top opportunities** (specific to their business, not generic):
  1. [highest-impact -- described using their terminology, their tools, their workflow]
  2. [second -- same specificity]
  3. [third -- same specificity]
- **Data gaps**: [what they wish they knew]
- **Manual workflows to automate**: [what teams do by hand -- name the role and the current tool]

**Situation Profile:**
- Integration Mode: [SDK / MCP on agents / Multi-agent / Hybrid / ...]
- Personize Role: [Memory + Intelligence + Governance + Learning] (legs: 1,2,3,4)
- Archetype: [Communication / Analysis / Decision / Execution / Collaboration]
- Company Profile Pattern: [A: High-volume B2C / B: Mid-market B2B / C: Enterprise B2B / D: Platform / E: No dev team]
- Department: [Sales / Marketing / CS / Product / Operations / Cross-functional]
- Autonomy: [Human-driven / Human-in-loop / Supervised / Fully autonomous]

**Use case builder guide:** After completing this output, read `reference/use-case-builder.md` to build use cases that demonstrate deep knowledge of their business.

If you cannot fill in the research-derived section + 10 of the validated fields + the Situation Profile, continue discovery.
