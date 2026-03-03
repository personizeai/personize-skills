# Reference: DISCOVER Action

Complete discovery framework for understanding a developer's product, data, and personalization opportunities.

---

## Discovery Questions

Ask conversationally — 2-3 at a time, adapt based on answers. Don't dump the full list.

### Product Understanding

1. **"What does your product do? Walk me through the core user journey."**
   - What problem it solves, who uses it, how they use it
   - This tells you: where personalization touch points exist

2. **"Who are your users? What roles or segments do you serve?"**
   - Are they B2B or B2C? Enterprise or SMB? Technical or non-technical?
   - This tells you: how to tailor personalization recommendations

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

14. **"What's your tech stack?"**
    - Frontend framework, backend language, database, hosting, CI/CD
    - This tells you: how to structure the implementation plan

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

## Discovery Output

After discovery, you should be able to fill in this template:

```
PRODUCT: [what they build]
USERS: [who uses it, segments]
CHANNELS: [web, mobile, email, slack, sms, etc.]
EXISTING DATA: [CRM, analytics, support, ML, etc.]
CURRENT PERSONALIZATION: [none / basic / advanced]
TECH STACK: [frontend, backend, DB, hosting]
TOP OPPORTUNITIES:
  1. [highest-impact personalization]
  2. [second]
  3. [third]
DATA GAPS: [what they wish they knew]
MANUAL WORKFLOWS TO AUTOMATE: [what teams do by hand]
```

Use this to drive the PROPOSE action.

---

## Discovery Output Template

After discovery, you should have answers to produce this document:

### [Company Name] — Personalization Discovery

**Product**: [what they build, who it serves]
**Personalization surfaces**: [list of 3-5 touchpoints identified]
**Data sources**: [CRM, product usage, support, etc.]
**Entity types**: [Contact, Company, Deal, etc.]
**Key properties per entity**: [5-10 most important fields]
**Governance needs**: [brand voice, compliance, ICP definitions]
**Priority channel**: [email, in-app, Slack, etc.]
**Quick win**: [the single highest-impact personalization to build first]

If you cannot fill in 6+ of these 8 fields, continue discovery.
