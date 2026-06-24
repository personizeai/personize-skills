# Reference: DISCOVER

The discovery framework for understanding a prospect's product, data, and Personize opportunities. Discovery feeds the situation assessment (the 6 dimensions in the parent SKILL) and produces the brief that drives every downstream recommendation.

Order: **research the prospect → validate with questions → read the codebase → map data sources to memory → assess the 6 dimensions → write the brief.** Don't interrogate before you research; don't design before you assess.

---

## Phase 0: Prospect Research (Before Any Question)

**ALWAYS start here.** Research the prospect online before asking a single question. This turns discovery from interrogation into validation — you lead with what you already know and ask the human to confirm or correct.

**Quick checklist:**
1. Search the company website, LinkedIn, Crunchbase, job postings, G2/Capterra reviews.
2. Determine: company size, dev-team presence, customer volume, B2B vs B2C, funding stage.
3. Infer the stack from job postings and the integrations/changelog page (framework, DB, CRM, channels).
4. Look for Personize fit signals: multiple touchpoints, data silos, manual personalization, multiple teams touching the same customer, a corpus being RAG'd, raw records dumped into prompts.
5. Produce a **Prospect Intelligence Brief** (the "Research-Derived" block of the Discovery Output below).
6. List the gaps you could not fill online — those become your first questions.

**Output:** enough context to validate rather than interrogate. If you can't find much online, the questions below fall back to open-ended form.

---

## Phase 1: Discovery Questions (Validate & Deepen)

With the brief in hand, lead with what you know and validate. Ask conversationally — **2-3 at a time**, adapt to answers. SHOULD NOT dump the full list.

### Product Understanding
1. **"I see you're a [X] platform for [Y]. How accurate is that, and has the focus shifted recently?"** — validate, don't interrogate. Fallback: *"Walk me through the core user journey."*
2. **"It looks like you serve mostly [segment] in [verticals]. Is that where the growth is, or are you expanding?"**
3. **"What's the first thing a user does after signup?"** — reveals the earliest personalization opportunity and what data the user hands you up front.

### Interaction Surface
4. **"Where do your users interact with your product?"** — web, mobile, email, Slack, SMS, in-app, dashboards, API. Tells you which outbound channels to propose (`destinations`, Signal).
5. **"What notifications or emails do you send today?"** — what can be personalized immediately.
6. **"Do your users have dashboards or reporting views?"** — prime territory for AI-generated, memory-grounded insights.

### Data Landscape
7. **"What data do you already have about your users?"** — CRM, product analytics, support tickets, purchase history, behavior logs. This is what can be memorized today.
8. **"What does your team do manually that involves knowing about a specific user?"** — reps researching before calls, CS checking health, marketers segmenting. These are the workflows to automate first, and the fleet-dispatch candidates.
9. **"Do you run any ML models — churn, lead scoring, recommendations?"** — store predictions + explanations as properties for agents to reference.
10. **"What external data do you pull in — CRM, enrichment, social, news?"** — every external source is memorization material.

### Personalization Gap
11. **"What do you wish your product knew about each user that it currently doesn't?"** — intent, satisfaction, churn risk, buying readiness. This is what extraction + memory unlocks.
12. **"What personalization do you have today, if any?"** — `Hi {first_name}`? a rec engine? nothing? Sets the starting point and the headroom.
13. **"Have you tried AI/LLM personalization before — what worked, what didn't?"** — calibrate expectations, avoid repeating failures.

### Retrieval Economics (new — the compaction lens)
14. **"When you call an LLM today, what goes into the prompt?"** — listen for *raw records dumped in*, *N API calls fanned out per prompt*, or *a whole corpus RAG-chunked into context*. Each pays linearly in tokens and hands the model unfiltered signal.
15. **"Do multiple runs, sessions, or agents re-derive the same facts about an entity?"** — re-derivation across runs is the signal that a shared memory substrate (compact-once, serve-small) pays off, and that one-subagent-per-record fleet dispatch becomes viable.

### Technical Context
16. **"I noticed you're hiring for [framework] and your integrations page lists [tools]. Is that the core of your stack?"** — Fallback: *"What's your tech stack?"*
17. **"Do you use workflow automation — n8n, Zapier, Make, custom cron?"** — where pipelines plug in; signals no-code vs SDK.
18. **"How does your team deploy — GitHub Actions, Docker, serverless, Vercel, Render?"** — how the sync/pipeline scripts will run.

---

## Codebase Analysis — A Repo-Reading Methodology

When the prospect shares code or repo access, run this recon **autonomously and in order**. Each step says what to find, how to find it, and which Personize capability the finding maps to. Record every finding in the **Opportunity Inventory** table at the end — that table, not a prose summary, is the deliverable of this phase.

> Use `Glob`/`Grep` over the repo. Read the *schema and the boundaries* (models, integration points, channels, decision branches) — you do not need to read business logic line-by-line.
>
> **Scope your search first.** Restrict recon to application source. EXCLUDE `node_modules`, vendored skill/agent dirs (`.agents/`, `.cursor/`, `skills/`), and docs/marketing copy (`*.md`, `content/`) — they pollute broad greps, and a tool name found only in a doc or template is **not** a real integration. MUST verify each integration hit is actually wired in app code before you count it (a HubSpot/Apollo pixel in a tracking config is a tracker, not a CRM sync). For repos with **no ORM/DB**, infer entities from API request/response types and form payloads instead of Step 1's schema patterns.

### Step 1 — Locate the data models
The user/customer/entity schema is the spine; every field is a candidate property.
- **Prisma:** `Glob **/schema.prisma`; read `model` blocks.
- **TypeORM:** `Grep "@Entity"` / `@Column`.
- **Sequelize:** `Grep "sequelize.define|extends Model"`.
- **Mongoose:** `Grep "new Schema\(|mongoose.model"`.
- **Raw SQL / migrations:** `Glob **/migrations/**` + `Grep "CREATE TABLE"`.
- **Plain types:** `Grep "interface User|type Customer|interface Contact"`.

**Maps to:** entity types + collections + properties. List every field; classify each as structured (→ property, `extractMemories:false`) or free-text (→ extraction, `extractMemories:true`). Domain names ("Member", "Candidate", "Patient") → custom entity types.

### Step 2 — Find CRM + enrichment integration points
- `Grep -i "hubspot|salesforce|pipedrive|apollo|clearbit|zoominfo|nango|@hubspot|jsforce"`.
- Inspect API-client wrappers and any `sync`/`import` jobs.

**Maps to:** inbound topology (CRM→Personize). HubSpot/Salesforce → passthrough (org-managed connection); enrichment payloads → memorize as properties + provenance tags. If they already sync CRM↔product, that's a bidirectional pipeline candidate.

### Step 3 — Find event / analytics tracking
- `Grep -i "analytics.track|analytics.identify|posthog|segment|mixpanel|amplitude|rudderstack|datadog"`.

**Maps to:** behavioral signals → memory. High-frequency events → roll up to a weekly summary memory or crystallize as a counter property (don't memorize every click). Stored ML predictions → properties.

### Step 4 — Find outbound channels
- Email: `Grep -i "sgMail|nodemailer|ses\.|postmark|resend|sendEmail"`.
- Slack/chat: `Grep -i "slack|chat.postMessage|webhook"`.
- SMS/push: `Grep -i "twilio|sendSms|pushNotification|fcm|apns"`.

**Maps to:** delivery points for generated content; `destinations` (webhook/S3) for event routing; Signal for context-aware "if/what/when/how to notify." Each channel is a personalization surface.

### Step 5 — Find decision branches
- `Grep "if .*\.plan ===|user\.tier|user\.role ===|switch .*segment|isPremium|user\.plan"`.

**Maps to:** hardcoded `if/else` segmentation → AI-driven decisions grounded in memory + governance. These branches are often the highest-value rewrites (rules become guidelines; the decision becomes a memory-grounded prompt).

### Step 6 — Find identity / auth
- `Grep -i "passport|next-auth|clerk|auth0|jwt|session\.user|cognito"`.

**Maps to:** identity keys for collections (email for people, domain/URL for companies, external ID for CRM-synced). MUST pick a stable, unique key per entity — key changes break record continuity. Multi-tenant auth → confirm org isolation strategy.

### Step 7 — Find batch / cron / queue jobs
- `Grep -i "cron|node-cron|bull|bullmq|sqs|setInterval|@Cron|trigger\.dev"`; `Glob **/jobs/**`, `**/workers/**`.

**Maps to:** where durable Personize pipelines (Trigger.dev) replace or augment existing jobs; scheduled sync; and **fleet dispatch** — a nightly job that loops records is a one-subagent-per-record candidate (predictable cost = records × token envelope, with governed per-record memory as the shared substrate).

### Step 8 — Find content surfaces (keep + expand the original pattern table)
The classic pattern→opportunity map, extended:

| Code pattern | What it means | Personize opportunity |
|---|---|---|
| `user.email`, `user.name`, `user.role` | User data model | Identity properties to memorize |
| `analytics.track()`, `analytics.identify()` | Event tracking | Behavioral signals → memory (rolled up) |
| `sgMail.send()`, `ses.send()`, `resend.emails` | Email sends | Personalize content; outbound delivery point |
| `notify()`, `pushNotification()` | Notifications | Signal: decide if/what/when/how to notify |
| `fetch('/api/...')` with raw user data in prompt | Prompt assembly | **Compaction** — serve a small ranked payload, not raw rows |
| RAG over a doc corpus (`pinecone`, `chunk`, `embed`) | Retrieval layer | Compact once at write; property filter + graph the RAG can't do |
| Prisma/TypeORM/SQL schemas | Data model | Map fields → collections/properties |
| `if (user.plan === 'pro')` | Segmentation logic | AI-driven decision + guideline |
| Search endpoints | User search queries | Intent signals → memory |
| File / doc upload handlers | User-generated content | Memorize content/summaries; attachments |
| Dashboard / report components | Data views | AI-generated, memory-grounded insights |
| Onboarding flows | First-run experience | Smart onboarding personalization |
| Empty-state components | No-data views | Personalized suggestions from memory |
| Nightly job looping all records | Batch processing | Fleet dispatch: one subagent per record |

### Opportunity Inventory (the deliverable)
For every finding from Steps 1-8, add a row. This is what you carry into PROPOSE.

| Finding (file:symbol) | Category | Personize capability | Notes / quick-win? |
|---|---|---|---|
| `schema.prisma:Contact` | Data model | Collection `Contact` + 8 properties | Identity = email; quick win |
| `lib/hubspot.ts:syncContacts` | CRM integration | Inbound sync + passthrough | Bidirectional candidate |
| `lib/ai.ts:buildPrompt` | Prompt assembly | **Compaction** — `retrieve_unified` vs raw dump | High-value; est. 80-90% token cut |
| `jobs/nightly-score.ts` | Cron/batch | Fleet dispatch (1 subagent/record) | ~12k records; predictable cost |
| `lib/email.ts:sendWelcome` | Outbound | Personalized generation + delivery | Priority channel? |
| `if user.plan===` (checkout.ts) | Decision branch | Guideline + memory-grounded decision | Rewrite rules as governance |

---

## Mapping Data Sources to Memorization

After the recon, classify each source by **what becomes what**. Three destinations; pick one per data type (full playbook + batch-sizing table: [`audit-and-plan.md`](./audit-and-plan.md)).

```
Source: [their database / CRM / analytics / corpus]
├── Structured field values you already have
│   └── → memory.upsert()   (memory_upsert / POST /api/v1.1/memory/upsert)
│         sets properties directly, no extraction. Single or batch.
│         email · name · plan_tier · last_login · industry · ARR
│
├── Unstructured content needing AI extraction
│   └── → client.memory.saveBatch()  (content → per-property extraction)
│         support_tickets · call_notes · transcripts · research_reports
│         each item: own tier (basic/pro/ultra), schema, max_properties
│
├── Behavioral rules / policies / playbooks / ICP / brand voice
│   └── → context_save({ type: 'guideline' })   (NOT a collection)
│         reaches agents via SmartContext routing
│
├── Coordination state alongside an entity
│   └── → workspace property (push to array: Tasks · Notes · Issues)
│
└── Connections between entities (works_at, reports_to, ...)
    └── → graph: collectionGraph/smartGraph on save (auto-inferred from
          FK-shaped props), query via sources.graph / retrieve_unified(scout)
```

**Empty-org note:** `createOrganization()` no longer seeds content — new orgs are **empty**. Provision the modeling layer in one shot with `kits_install` (`kits_list` → `kits_install({kitId})` → `kits_get_status`). Built-ins: `personize-starter` (Contact/Company/Standard Profile/Workspace + base guideline), `engineering-memory`. Author/fork a kit when the prospect's domain doesn't match a built-in.

**The test:** would you ever say *"show me all the X"*? → collection. *"remind agents of X when relevant"*? → guideline. *"what's the latest on this account"* across contributors? → workspace.

---

## Situation Assessment — The 6 Dimensions

After research + validation + codebase recon, assess the six dimensions from the parent SKILL. Ask naturally, 2-3 at a time. Then MUST propose 2-3 options with trade-offs before building.

| # | Dimension | What to determine | Listen for |
|---|---|---|---|
| 1 | **Entity complexity** | How many entity types, how nested? | Flat contacts → simple; company→contact→deal hierarchies → graph |
| 2 | **Data volume** | Hundreds / thousands / millions? | Sizes the import: script vs batch vs streaming |
| 3 | **Integration depth** | Standalone, CRM-connected, or multi-system? | "Sync HubSpot + Postgres + analytics" → bidirectional pipelines |
| 4 | **Autonomy level** | Human-in-loop, supervised, autonomous? | The human → human-agent → agent-agent progression |
| 5 | **Compliance** | PII, audit trails, retention, deletion rights? | Healthcare/finance → governance + redaction non-negotiable |
| 6 | **Retrieval economics** | Raw records / N API calls / RAG-chunked corpus per prompt? | The **compaction opportunity** — compact once, serve a small ranked payload. Re-derivation across agents → fleet dispatch |

**Cross-cutting selections that fall out of the six:**
- **Integration mode:** "I'll write TypeScript" → SDK · "we use n8n" → MCP on workflow tools · "I use Cursor/Claude Code" → MCP on coding assistant · "we're building agents" → MCP/multi-agent · "API from Python/Go" → REST · "different tools for different jobs" → hybrid.
- **Archetype:** message → Communication · synthesis → Analysis · score/route → Decision · sync/enrich → Execution · multi-agent → Collaboration. Probe: *"What does success look like — an email sent, a report, a decision, a data update, a coordinated action?"*
- **Department:** Sales / Marketing / CS / Product / Operations / cross-functional — which team benefits first.

---

## Discovery Output

After all phases, produce this brief. It drives PROPOSE and every recommendation. Use the company's own terminology throughout.

### [Company Name] — Personize Discovery

**Research-Derived (Phase 0):**
- **Company:** name, founded, HQ, one-liner
- **Size:** employees, estimated eng-team size, funding stage
- **Customer base:** B2B/B2C/B2B2C, segment, estimated volume, verticals
- **Business model:** how they make money
- **Tools landscape:** CRM, support, analytics, marketing, channels (from job posts + integrations page)
- **Dev team:** yes/no, size, focus areas
- **Competitive position:** key competitors, differentiation
- **Fit signals:** 3-5 specific signals (multiple touchpoints, data silos, manual personalization, raw-data-in-prompt, corpus being RAG'd)

**Validated in Conversation (Phase 1):**
- **Product / Users / Channels:** in their words
- **Data sources:** CRM, product usage, support, analytics, ML, enrichment — named specifically
- **Entity types:** their terminology ("Members" not "Contacts" if that's what they say)
- **Key properties per entity:** 5-10 most important fields — their field names
- **Current personalization:** none / merge-tags / advanced — with examples
- **Tech stack:** frontend, backend, DB, hosting, CI/CD — validated against inferences
- **Governance needs:** brand voice, compliance, ICP — specific to their industry
- **Priority channel + Quick win:** the single highest-impact thing to build first
- **Top opportunities** (specific, not generic): 1, 2, 3 — described in their terms
- **Data gaps & manual workflows:** what they wish they knew; what teams do by hand (name role + current tool)

**Opportunity Inventory:** the codebase-analysis table above (finding → category → capability → quick-win flag).

**Situation Profile (the 6 dimensions):**
- Entity complexity · Data volume · Integration depth · Autonomy level · Compliance · Retrieval economics
- Integration mode: SDK / MCP / multi-agent / hybrid / REST
- Archetype: Communication / Analysis / Decision / Execution / Collaboration
- Department: Sales / Marketing / CS / Product / Operations / cross-functional

**Continue discovery if** you cannot fill the research-derived block + 10 validated fields + the 6-dimension profile.

### Where to go next
- **Onboard an existing corpus:** [`audit-and-plan.md`](./audit-and-plan.md) (audit → destination → sequence → verify).
- **The mental model to lead with:** [`memory-as-business-model.md`](./memory-as-business-model.md) (compaction vs RAG, fleet dispatch, the relational→agent mapping).
- **Vertical starting point:** [`industry-saas.md`](./industry-saas.md) / [`industry-healthcare.md`](./industry-healthcare.md) / [`industry-recruiting.md`](./industry-recruiting.md) / [`industry-ecommerce.md`](./industry-ecommerce.md) / [`industries-other.md`](./industries-other.md).
- **Cost the import:** [`cost-simulator.md`](./cost-simulator.md). **Schema:** [`schema-design-guide.md`](./schema-design-guide.md). **Graph:** [`graph-relations.md`](./graph-relations.md). **Workspaces:** [`workspace-schemas.md`](./workspace-schemas.md).
