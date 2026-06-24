# Production Design Patterns

These patterns solve architectural challenges when building production systems on Personize. Each pattern is domain-agnostic -- the examples span verticals to show universality. Use `design-patterns.md` for foundational patterns (event-driven ingest, CQRS, workspace, governance). Use this file when the system needs coordinated execution, sequences, multi-entity coordination, or operational maturity.

---

## A. Coordinated Program

**When:** You need isolated execution units with their own rules, enrollment, and metrics. Campaigns, care plans, enrollment drives, renewal programs, onboarding cohorts.

**Model as:** A collection where each record is a program instance.

| Property | Type | Purpose |
|---|---|---|
| program_id | text | Stable identifier (e.g., "fintech-ctos-q2", "care-plan-diabetes-2026") |
| status | select: Draft/Active/Paused/Archived | Lifecycle state |
| target_criteria | text | Who qualifies (ICP definition, eligibility rules) |
| governance_overrides | text | Program-specific rules that layer on top of org defaults |
| daily_capacity | number | Hard cap per execution cycle |
| enrolled_count | number | Zero-cost counter via properties |
| success_count | number | Completions, conversions, graduations |
| owner | text | Responsible role or agent |

**Enrollment rule:** An entity can only be in one active program at a time. Store `program_id` on the entity record. Store `program_history` (array, append) to prevent re-enrollment.

**Governance layering:** Load program-specific governance BEFORE org defaults. Program rules override org rules for enrolled entities.

**Derived scoring:** Programs often need a composite score (lead score, risk score, readiness score) computed from multiple properties. Store the score as a `number` property, recompute on each enrichment cycle. Use `filterByProperty` on the score for prioritization.

**Examples:**
- Sales: outbound campaign with ICP criteria, sender pool, daily send cap
- Healthcare: treatment plan with protocol rules, provider assignments, milestone tracking
- Education: enrollment drive with eligibility criteria, advisor assignments, deadline tracking
- Insurance: renewal program with policy-specific messaging, agent routing, urgency tiers
- Membership: retention program with engagement scoring, offer rules, escalation triggers

**Anti-pattern:** Storing programs as local files or self-memories. If it has status and metrics, it's a collection.

---

## B. Channel Identity Management

**When:** Outbound communication needs stable identity -- the same person/provider/agent should consistently represent the organization to a given entity.

**Model as:** Records in a collection (or properties on existing records) with health and capacity tracking.

| Property | Type | Purpose |
|---|---|---|
| identity_id | text | Stable ID decoupled from channel address (sp_xxx, provider_001) |
| display_name | text | Human-facing name |
| channel_address | text | Email, phone, profile URL -- can rotate without changing identity |
| persona | select | Communication style: technical, executive, consultative, empathetic |
| health_score | number | 0-100, degrades on failures, recovers on success |
| daily_capacity | number | Hard cap per day |
| used_today | number | Counter, reset daily |
| warmup_day | number | Days since activation (for gradual ramp) |

**Assignment rule:** Once an entity is assigned an identity, all communication comes from that identity. Store `assigned_identity_id` on the entity record. Consistency builds trust.

**Health tracking:** Bounces/failures degrade health. Positive responses boost it. Auto-pause when health drops below threshold. This prevents sending from degraded channels.

**Warmup ramp:** New identities start with low daily capacity, increasing over days/weeks. Prevents deliverability damage from sudden volume.

**Examples:**
- Sales: sender profiles with email rotation, persona matching, bounce tracking
- Healthcare: provider profiles with specialty, availability, patient assignment
- Education: advisor profiles with department, load balancing, student assignments
- Support: agent profiles with expertise, queue capacity, satisfaction scores

**Anti-pattern:** Using raw email addresses or names as identifiers. They change. Use stable IDs.

---

## C. Entity-Level Coordination

**When:** Actions on child entities (contacts, patients, members) must be coordinated at the parent level (company, household, organization) to prevent conflicts.

**Model as:** Workspace properties on the parent entity record.

**The preflight gate:** Before any action on a child entity, check the parent workspace:
1. How many child entities were contacted recently? (prevent carpet-bombing)
2. Is there a negative event at the parent level? (pause during crises)
3. Are other programs active at this parent? (prevent conflicting messages)
4. What tone/strategy is set for this parent? (maintain consistency)

| Check | Query | Block if |
|---|---|---|
| Volume check | Count child actions in last N days | Exceeds threshold |
| Negative event | Parent workspace `issues` with severity=high | Any active high-severity issue |
| Program conflict | Children with different active `program_id` | Multiple active programs |
| Strategy alignment | Parent workspace `context` | Action contradicts stated strategy |

**Cross-entity rollup:** Store summary stats on the parent (active_children_count, last_action_date, overall_sentiment). Update via `memory_update_property` after each child action. Enables `filterByProperty` at the parent level.

**Examples:**
- Sales: account-level coordination across multiple contacts at same company
- Healthcare: household coordination across family members under same plan
- Insurance: policy-holder coordination across multiple policies
- Education: family/guardian coordination across siblings

**Anti-pattern:** Acting on child entities without checking parent state. Each action feels reasonable in isolation but collectively overwhelms the parent.

---

## D. Multi-Touch Journey

**When:** Entities move through a sequence of actions with timing gates, across one or more channels, over days or weeks.

**Model as:** Sequence state properties on the entity record. NOT a separate collection -- the journey state lives on the entity it's about.

| Property | Type | Purpose |
|---|---|---|
| journey_step | number | Current step in sequence (1, 2, 3...) |
| journey_status | select: Active/Replied/Completed/Paused/Exited | Stop signals |
| last_action_date | date | When the last step was executed |
| next_action_due | date | When the next step should fire |
| channel_history | array (append) | Which channels were used at each step |

**Cadence gating via filterByProperty:** Session-based agents don't need schedulers. At session start:
```
filterByProperty(conditions: [
  { property: "next_action_due", operator: "less_than", value: "today" },
  { property: "journey_status", operator: "equals", value: "Active" }
])
```
This returns all entities due for their next step. The properties ARE the task queue.

**Stop signals:** Any inbound event (reply, opt-out, conversion) immediately sets `journey_status` to a terminal state. All agents check status before acting -- no duplicate follow-ups.

**Channel selection:** Store channel preferences in governance ("Step 1: email, Step 2: email, Step 3: LinkedIn, Step 4: phone"). The agent reads governance to decide which channel, then uses the appropriate external tool.

**Examples:**
- Sales: outreach sequence (email → email → LinkedIn → breakup)
- Healthcare: care follow-up sequence (appointment reminder → check-in → escalation)
- Education: enrollment nurture (info email → advisor call → deadline reminder)
- Onboarding: welcome sequence (setup guide → feature intro → feedback request)

**Anti-pattern:** Building a separate "sequence" collection. The journey state belongs on the entity, not in a separate tracking system.

---

## E. Interaction Ledger

**When:** You need to track every touchpoint for attribution, learning, and audit -- and the volume would overwhelm entity properties.

**Model as:** A separate collection where each record is one interaction.

| Property | Type | Purpose |
|---|---|---|
| entity_ref | text | Email or ID of the entity this interaction is about |
| parent_ref | text | Company/household/org reference |
| channel | select | Email, phone, SMS, chat, in-person, LinkedIn |
| direction | select: Outbound/Inbound | Who initiated |
| program_id | text | Which program triggered this (for attribution) |
| content_summary | text | What was communicated |
| message_id | text | Channel-specific ID for threading (email Message-ID, etc.) |
| outcome | select | Delivered, opened, replied, bounced, converted |
| variant | text | A/B test variant (if applicable) |

**Attribution:** When an inbound event arrives (reply, callback), match it to the outbound interaction via `message_id` or `entity_ref` + time window. This links responses to the specific message/program/variant that triggered them.

**Learning aggregation:** Query the ledger by program_id, group by variant or content dimension, compute success rates. Feed results into the Learning Loop (Pattern J).

**Separation from entity record:** Entity properties store current state (what step, what status). The ledger stores history (everything that happened). Don't conflate them -- entities need fast reads, ledgers need rich queries.

**Examples:**
- Sales: outreach log with angle/variant tracking for reply rate analysis
- Healthcare: visit log with provider, diagnosis, treatment, follow-up
- Education: communication log with channel, topic, response, advisor
- Support: ticket interaction log with agent, resolution time, satisfaction

**Anti-pattern:** Storing all interactions as array properties on the entity. Arrays grow unbounded and slow down property reads.

---

## F. Vertical Configuration

**When:** The same system serves different use cases, industries, or segments -- each needing different terminology, defaults, tone, and rules.

**Model as:** One governance guideline per vertical/mode. The agent loads the right mode at session start and it configures everything.

**Guideline structure per mode:**

```markdown
# Mode: [Vertical Name]

## Terminology
- Entity = [patient/member/student/prospect/donor]
- Program = [care plan/renewal/enrollment/campaign/drive]
- Success = [appointment kept/renewed/enrolled/replied/donated]

## Default ICP
[Vertical-specific qualification criteria]

## Tone & Voice
[MUST/SHOULD rules for communication style]

## Signals
[What signals indicate readiness/risk in this vertical]

## Cadence Defaults
[Step count, timing, channels for this vertical]
```

**Mode selection:** At project start, the agent asks "what are you using this for?" and loads the corresponding mode guideline. The mode's defaults become the starting point -- then customized for the specific business.

**Governance layering:** Mode guideline → org-specific overrides → program-specific overrides. Each layer narrows the rules. Mode sets the broad tone, org sets the brand, program sets the tactical rules.

**Examples:**
- Sales: outbound-sdr, abm, cold-deal-revival, partner-recruitment
- Ecommerce: win-back, post-purchase, cart-abandonment
- Healthcare: appointment-follow-up, chronic-care, preventive-outreach
- Education: enrollment, alumni-engagement, student-retention

**Anti-pattern:** Hardcoding vertical logic in code. Governance guidelines are editable by humans and evolvable by `governance_smart_update`. Code isn't.

---

## G. Governance Safety

**When:** Governance changes are high-risk -- wrong rules mean wrong communication at scale.

**The safety workflow:**

| Step | Action | Tool |
|---|---|---|
| 1. Snapshot | Save current guideline content | `guideline_read` → store locally |
| 2. Validate | Check for truncation, contradictions, missing MUST rules | Agent reasoning |
| 3. Dry-run | Generate test content with proposed governance | `ai.prompt` with `evaluate` |
| 4. Compare | Show old vs new output to user | Agent presents diff |
| 5. Apply | Update with `historyNote` explaining why | `guideline_update` |
| 6. Verify | Generate another test, confirm quality | `ai.prompt` with `evaluate` |
| 7. Rollback (if needed) | Restore from `guidelines.history()` | `guideline_update` with old value |

**Validation checks:**
- Content length: did the update truncate? (compare character counts)
- Contradiction detection: does a new MUST conflict with an existing MUST?
- Coverage: are all required sections still present?
- Constraint balance: too many MUSTs over-constrains, too few under-constrains

**Examples across verticals:** Same workflow everywhere. Changing brand voice in sales, updating treatment protocols in healthcare, modifying enrollment criteria in education -- all high-risk, all need the same safety steps.

**Anti-pattern:** Directly overwriting governance without snapshot or dry-run. One bad edit affects every generated output until someone notices.

---

## H. Responsibility Routing

**When:** Different people or agents handle different lifecycle stages, and entities must transfer cleanly between them.

**Model as:** Role ownership property on the entity + handoff triggers + role-specific governance overlays.

| Property | Type | Purpose |
|---|---|---|
| role_owner | select | Current responsible role (sdr, ae, provider, advisor) |
| role_history | array (append) | Audit trail: { from, to, reason, timestamp } |

**Handoff triggers:** Define conditions that trigger ownership transfer:

| From | To | Trigger |
|---|---|---|
| SDR | AE | Meeting booked or deal qualified |
| AE | CSM | Deal closed |
| Triage nurse | Specialist | Diagnosis requires specialty |
| Advisor | Faculty | Student enrolled in program |

**Role-specific governance:** Each role gets a governance overlay that modifies tone, constraints, and playbook:
- SDR: challenger tone, high volume, short messages
- AE: consultative tone, personalized, proposal-ready
- CSM: relationship tone, proactive, retention-focused

**Implementation:** Store `role_owner` on entity. Before acting, check if current agent's role matches `role_owner`. If not, skip or escalate. After handoff trigger, update `role_owner`, append to `role_history`, notify new owner via `notification_send`.

**Anti-pattern:** Multiple roles acting on the same entity without checking ownership. Creates conflicting messages and confused recipients.

---

## I. Observability & Health Monitoring

**When:** The system runs continuously and stakeholders need to know if it's working.

**Three monitoring layers:**

| Layer | What to measure | How |
|---|---|---|
| **Throughput** | Actions per period (emails sent, appointments scheduled, enrollments processed) | Aggregate from Interaction Ledger or program stats |
| **Quality** | Success rates (reply rate, show-up rate, conversion rate) | Compute from outcomes in ledger |
| **Health** | Integration status, channel identity health, error rates | Check external services, review channel scores |

**Daily digest pattern:**
1. Query program stats (`filterByProperty` on program collection -- zero cost)
2. Query interaction ledger for last 24h outcomes
3. Check channel identity health scores
4. Compile into summary
5. Store in Personize as self-memory (tag: `daily-brief`) for agent recall
6. Notify stakeholders via `notification_broadcast` or external channel

**Auto-remediation:**
- Success rate below threshold → pause program, notify owner
- Channel health below threshold → auto-pause channel, reassign entities
- Error rate spike → create workspace issue, escalate

**The key insight:** Store the daily digest in Personize memory. Next session, the agent recalls it and has instant context without recomputing.

**Anti-pattern:** Only monitoring when something breaks. Proactive daily digests catch drift before it becomes a crisis.

---

## J. Learning & Evolution Loop

**When:** The system should get smarter over time, not just repeat the same actions.

**The loop:**

```
Measure (query interaction ledger)
  → Analyze (group by dimension, compute success rates)
    → Propose (draft governance changes based on evidence)
      → Validate (dry-run with Governance Safety pattern)
        → Apply (update guidelines with historyNote)
          → Measure again (next cycle)
```

**What to measure:**
- Which messaging angles get responses? (group ledger by content dimension)
- Which channels perform best for which entity segments? (group by channel × segment)
- Which programs have the highest conversion? (group by program_id)
- Which time-of-day/day-of-week gets best engagement? (group by timestamp)

**How to feed back:**
- Strong signal (>50 data points, >2x difference): propose `governance_smart_update` with evidence
- Weak signal (<50 data points): store as self-memory for future reference, don't change governance yet
- Conflicting signals: surface to user, don't auto-apply

**Store learnings:** `memory_save(content="...", about:"self", tags:["learning", "program:{id}"])`. Next session, the agent recalls what worked and doesn't repeat failed approaches.

**Examples:**
- Sales: "ROI-focused emails get 3x more replies from CTOs" → update playbook
- Healthcare: "SMS reminders have 2x show-up rate vs email" → adjust channel defaults
- Education: "Early-deadline messaging converts 40% better" → update enrollment cadence

**Anti-pattern:** Changing governance based on gut feel or small samples. Evidence-based evolution only. Set minimum sample sizes before proposing changes.

---

## K. Escalation & Human-in-the-Loop

**When:** The agent reaches its capability boundary or encounters a high-stakes situation that needs human judgment.

**Escalation triggers:**

| Trigger | Severity | Action |
|---|---|---|
| Ambiguous inbound (can't classify) | Medium | Create workspace task, notify owner |
| High-value entity (above threshold) | High | Flag for human review before acting |
| Compliance-sensitive (legal, medical, financial) | Critical | Block action, require human approval |
| Repeated failures (3+ errors on same entity) | High | Pause, create issue, escalate |
| Conflicting signals (positive + negative simultaneously) | Medium | Surface to human with both signals |

**Implementation:**
1. Detect trigger condition
2. Create workspace task: `{ title, description, severity, owner, dueDate }`
3. Notify: `notification_send` to specific owner or `notification_broadcast` to role group
4. Include action buttons: `{ type: "link", label: "Review", url: "..." }`
5. Block further automated action on this entity until task is resolved
6. Track resolution via `workspace.completeTask()` or `workspace.declineTask()`

**Escalation vs automation boundary:** Define in governance which actions are AUTO (agent acts freely), REVIEW (agent proposes, human approves), and MANUAL (human only). This clarity prevents both under-escalation (agent does something harmful) and over-escalation (agent asks about everything).

**Examples:**
- Sales: hot lead replied but message is ambiguous → escalate to AE
- Healthcare: patient reports new symptom outside protocol → escalate to physician
- Finance: transaction exceeds threshold → escalate to compliance
- Education: student at risk of dropping out → escalate to advisor

**Anti-pattern:** Silently skipping actions the agent can't handle. The user never knows something was missed. Always surface, never swallow.

---

## L. Typed Task Dispatch

**When:** The system processes many tasks at scale (100+) and needs predictable execution, cost estimation, and reliable agent-to-agent handoff.

**The problem with free-form tasks:** When workspace tasks use natural language Context as the only instruction, each agent interprets them differently. Outputs are inconsistent. Post-execution side effects (update CRM, create follow-up, opt-out) are missed. At 10,000 tasks, it's chaos.

**The pattern:** Each task is an entry in the `Pending Tasks` array with a `type` field (machine-readable identifier) and `input` object (structured JSON). A dispatcher queries all records with `Pending Tasks IS_SET`, parses the arrays, groups by type, and routes to AI or pipeline.

**Task type contract:**

| Field | Purpose |
|---|---|
| id | kebab-case identifier (e.g., `enrich-contact`, `schedule-appointment`, `send-reminder`) |
| requiresAI | false = pipeline (0 credits, <1s), true = ai.prompt |
| tier | basic / pro / ultra (only if requiresAI) |
| creditCost | estimated credits per execution |
| input | required input fields (structured schema) |
| output | guaranteed output fields |
| after | post-execution side effects (update properties, create follow-up tasks, send notifications) |

**AI vs pipeline routing:**

| Task needs... | Route | Cost | Latency |
|---|---|---|---|
| Reasoning, generation, classification | AI (`ai.prompt`) | 2-5 credits | 10-30s |
| Data movement, status update, property set | Pipeline (SDK direct call) | 0 credits | <1s |

At 10,000 records: all-AI = ~30,000 credits, 83 min. With routing: ~14,000 credits, 20 min. **2x cost savings, 4x speed.**

**Credit estimation before execution:** `(AI tasks x avg_credits) + (pipeline tasks x 0) = total`. Users know the cost before they start.

**Composable chains:** A task type's `after` field can create follow-up tasks of known types. Example: `classify-reply` → if positive, creates `schedule-meeting`. If OOO, creates `write-email` with delayed due date. The chain is predictable and debuggable.

**Examples across verticals:**

| Vertical | AI tasks | Pipeline tasks |
|---|---|---|
| Sales | write-email, classify-reply, qualify-lead, research-company | update-stage, send-email, handle-opt-out, enroll-in-campaign |
| Healthcare | draft-follow-up, triage-symptom, summarize-visit | schedule-appointment, update-chart, send-reminder |
| Education | write-enrollment-email, assess-risk, generate-report | update-status, send-notification, assign-advisor |
| Insurance | draft-renewal-notice, assess-claim, generate-quote | update-policy, send-document, route-to-agent |

**Anti-pattern:** Running every task through AI. Tasks like "update status to Contacted" or "send this pre-written email" don't need reasoning -- they're direct SDK calls. Routing them through AI wastes credits and adds 10-30s of latency for nothing.

---

## M. Notebook (Verbatim Content Storage)

**When:** Content needs its exact wording preserved -- posts, templates, code reviews, meeting transcripts, email drafts. `memory_save` atomizes content for semantic recall, which is great for facts but destroys the original structure. The Notebook pattern stores verbatim text as a property.

**Model as:** Records keyed by slug (`nb:{type}-{title-kebab}`), with a `Body` property for exact text and structured properties for discovery.

| Property | Purpose |
|---|---|
| Record Type | Always `notebook` (discriminator for filterByProperty) |
| Title | Entry name |
| Body | Exact content, preserved verbatim -- not atomized |
| Type | note / idea / post / draft / template / snippet / code / doc |
| Channel | linkedin / email / blog / internal / general |
| Status | capture → draft → review → final → published → archived |
| Tags | Comma-separated categorization |
| Versions | Array (append) -- auto-save previous body before overwrite |
| Notes | Array (append) -- comments and feedback |

**Key operations:**
- **Create:** `memory_save` (creates record) → `memory_update_properties` (set properties) → `memory_update_property` (set Body verbatim)
- **Read:** `filterByProperty(Record Type=notebook)` for list (0 credits), `memory_get_properties` for body
- **Update body:** Save old body to Versions array FIRST, then overwrite Body
- **Discover:** `filterByProperty` on Type, Channel, Status, Tags -- all free

**When to use Notebook vs memory_save:**

| Content | Use | Why |
|---|---|---|
| "Acme uses Kubernetes" | `memory_save` | Fact -- atomization helps recall |
| "Here's my LinkedIn post" | Notebook | Must preserve exact wording |
| "Cold emails work better on Tuesday" | `memory_save` | Insight -- recalled contextually |
| "Our email template for VP Sales" | Notebook | Template -- needs exact text |
| "Meeting notes from Acme call" | Either | Verbatim transcript → Notebook. Key facts only → `memory_save` |

**Examples across verticals:**
- Sales: email templates, LinkedIn posts, pitch decks, call scripts
- Healthcare: clinical note templates, patient communication templates, protocol documents
- Education: lesson plans, student feedback templates, curriculum drafts
- Legal: contract clauses, compliance checklists, policy drafts

**Anti-pattern:** Using `memory_save` for content that needs exact preservation. Extraction atomizes "Your 500-word LinkedIn post" into fragments like "The author believes AI agents are changing sales." The original post is gone.

---

## N. Fleet Dispatch (Subagent per Record)

**When:** You need to run the same reasoning across hundreds to hundreds-of-thousands of records and get back predictable cost and uniform output shape -- enrich every account, score every lead, triage every ticket, draft a variant per recipient, run a watcher over every monitor.

**The shift:** From open-ended autonomous agents (unpredictable cost and output) to **one bounded subagent per record** executing a fixed instruction chain. The unit of work -- not model capability -- is what makes this production-viable.

**The pattern:** A dispatcher selects the record set (`filterByProperty`, a program's enrollment, or a `Pending Tasks` queue), then fans out one subagent per record with a concurrency cap. Each subagent runs the same chain -- Plan → Gather → Reason → Act → Write back -- and is automatically grounded in two things: the **governed memory scoped to that record** (recall) and the **org guidelines** (govern). It writes results back to the record (properties + `updates`), then exits.

**What you trade, and what you get:**

| You give up | You get back |
|---|---|
| Open-ended autonomy inside each run | **Forecasted spend:** cost = records × per-record token envelope, not lottery-ticket variance |
| Free-form output | **Format consistency:** identical output shape across 100,000 runs -- downstream automation can trust it |
| Cross-record improvisation | **Composability:** predictable typed outputs become trustworthy inputs for the next stage |

**Why memory is the substrate, not a feature:** without shared governed memory, parallel subagents re-derive what the last one already learned -- every run pays the discovery cost again. With it, each subagent recalls the record's compacted history and the org's guidelines, does only the new work, and writes back. Memory is what makes a *fleet* consistent rather than a thousand disconnected one-offs. This is the [`memory-as-business-model.md`](./memory-as-business-model.md) model at scale.

**Guardrails (bake into the chain):**
- **Hard isolation** -- one record's learned context must never bleed into another's. Scope recall to the record key.
- **Fabrication refusal** -- when a fact can't be verified, the subagent aborts that field explicitly rather than inventing a plausible value.
- **Audit/rewrite separation** -- for artifacts >200 words, audit and rewrite are separate steps so the model can't silently mask its own format violations (see `instruction-patterns.md`, tier T3).
- **Blast-radius bound** -- `maxSteps` per tool-calling instruction; retry-once-then-skip for flaky tools (T4). One bad record never aborts the fleet.

**Cost forecasting:** estimate before dispatch -- `records × (recall + reason + write) token envelope × tier rate`. Pair with `cost-simulator.md` to compare against dumping raw context per call, and report the forecast to the human before a large run.

**Examples across verticals:**
- Sales: enrich + score every account in a territory; draft a persona-tailored opener per contact.
- Healthcare: summarize the latest visit for every patient on a care plan.
- Support: triage and tag every open ticket; draft a first response per ticket.
- Ops: a cron fleet that re-checks every `monitor` record and writes its `last_result`.

**Anti-pattern:** one open-ended agent looping over all records in a single context. Context bloats, cost is unpredictable, output drifts between record 5 and record 5,000, and one failure can poison the rest. Fan out bounded per-record subagents instead.

**Relationship to other patterns:** Fleet Dispatch is how you *execute* a Typed Task Dispatch (L) queue at scale, and how a Coordinated Program (A) processes its enrollment. Use the Interaction Ledger (E) to capture each run's outcome for the Learning & Evolution (J) loop.

---

## O. Ledger Aggregation

**When:** You have an Interaction Ledger (Pattern E) -- one record per touchpoint -- and you need rolled-up metrics for the learning loop: reply rate by variant, conversion by program, show-up rate by channel. There is no `GROUP BY` in the memory layer, so the aggregation happens in your code, not the query.

**The pattern:** Select the cohort with the free structured filter, pull the one metric property off each record, aggregate client-side, and write the rollup back as a single summary record (or a self-memory). The ledger stays append-only; the summary is the queryable, cheap artifact everyone reads.

| Step | Action | Cost |
|---|---|---|
| 1. Select cohort | `filterByProperty` on the ledger (e.g. `program_id = X`, `created_at >= window`) | 0 credits |
| 2. Pull the metric | Read the outcome/variant property off each returned record | 0 credits |
| 3. Aggregate | Tally in code: count by `outcome` per `variant`/`channel`/`program_id` | Local |
| 4. Roll up | Write one summary record (`Record Type=ledger-rollup`, period-keyed) via property write-back, or a `memory_save(about:'self', tags:['rollup'])` | 1 write |
| 5. Read later | `filterByProperty(Record Type=ledger-rollup)` -- the next cycle reads the summary, not the raw ledger | 0 credits |

**Why aggregate to a record, not recompute every time:** raw ledgers are large and grow unbounded. Scanning 50,000 interaction rows to recompute "reply rate by variant" on every learning cycle is wasteful. Compute it once per cadence, store the rollup, and every subsequent reader (digest, dashboard, the learning loop) gets the answer for the cost of one free filter.

**Cadence:** run the rollup on a fixed beat -- nightly for throughput/quality, weekly for variant attribution (you need enough volume per variant for the numbers to mean anything). Key the summary by period (`rollup:2026-W24`) so history is preserved and trends are queryable.

**Attribution by tag/variant:** the rollup is only as good as the dimension you tagged at write time. Every ledger row must carry its `variant`, `program_id`, and `channel` (set when the interaction was logged). Aggregation groups on those tags -- if they weren't captured, the dimension doesn't exist. For large cohorts, page the filter (`nextToken`) or fan the aggregation out as a Fleet Dispatch (N) over sub-cohorts and sum the partial rollups.

**Examples across verticals:**
- Sales: reply rate by email variant; meetings booked per program this week.
- Healthcare: show-up rate by reminder channel (SMS vs email); follow-ups completed per protocol.
- Education: enrollment conversion by outreach angle; advisor response rate by cohort.
- Support: median resolution time by queue; CSAT by agent persona.

**Anti-pattern:** asking the LLM to "summarize the ledger" by dumping thousands of rows into a prompt. That is slow, expensive, and non-deterministic -- counts come back wrong. Counting is a code job; reserve the LLM for interpreting the rollup, not computing it.

**Relationship to other patterns:** Ledger Aggregation is the *measure* step that feeds the Learning & Evolution (J) loop -- it turns the raw history captured by the Interaction Ledger (E) into the evidence J needs before it proposes a governance change. Observability & Health Monitoring (I) reads the same rollups for its daily digest.

---

## P. Agent Triggering & Approval Lifecycle

**When:** One agent's work needs to wake another agent (a researcher finishes, a writer should start), or an action is high-stakes enough that a human or a manager agent must approve it before it goes out. Both are coordination problems, and both hinge on one fact about the platform.

**The platform fact:** Personize is *passive*. It stores state, guidelines, and memory; it does not run loops or fire events on its own. Personize coordinates state -- an external scheduler or runner executes. Any "trigger" is something outside Personize polling or reacting to a state change you wrote.

### (a) How Agent A wakes Agent B

There is no in-platform pub/sub. Pick the mechanism that fits your runtime:

| Mechanism | How it works | Use when |
|---|---|---|
| **Scheduled poll (cron/rate)** | An external scheduler runs Agent B on a beat; B opens with `filterByProperty(status = "ready-for-B")` and processes whatever A flagged | Batch handoffs, no urgency, simplest to operate |
| **Destination webhook** | A writes a record/event; a configured webhook destination POSTs into an external runner that invokes Agent B | Near-real-time handoff to code you control |
| **Workspace `Status` as the flag** | A sets workspace `Status` (e.g. `research-complete`); B's poll or the runner keys off that field as the trigger | Multi-agent collaboration on a shared record |

In every row the pattern is the same: **A writes a state, B (driven by an external scheduler or runner) reads that state and acts.** The flag is a property or workspace `Status`; the *execution* is always external. Design the handoff as a queryable state, never as a direct call -- A and B may run minutes or hours apart.

### (b) The draft -> review -> send state machine

For anything that leaves the building (an email, a public post, a customer-facing document), separate *generation* from *sending* with an explicit, queryable lifecycle on a `Pending Task`:

| Status | Who sets it | What it means |
|---|---|---|
| `draft` | Generator agent | Content produced, not yet checked |
| `pending-review` | Generator agent | Ready for a human or manager agent to judge |
| `approved` | Manager / review agent | Cleared to send |
| `sent` | Sender (external runner) | Delivered; terminal |
| `rejected` | Manager / review agent | Bounced back with a reason; generator may revise |

**Wiring it:**
- Generation is **compliance-gated before it runs** -- the generator loads governance (`ai_smart_guidelines` / `context_retrieve`) and refuses to draft if a hard rule blocks it. Don't generate first and filter later.
- Governance marks the send action **REVIEW** (the AUTO / REVIEW / MANUAL boundary from Pattern K). REVIEW means: the agent may *produce* and *propose*, but a human or a designated review agent must flip the status before the send step is allowed to fire.
- The **manager/review agent owns the status transition.** A separate review pass (its own poll over `filterByProperty(status = "pending-review")`) reads the draft, checks it against guidelines, and sets `approved` or `rejected`. Audit/rewrite separation (Pattern N) applies: review is a distinct step from generation so the generator can't rubber-stamp itself.
- Only on `approved` does the external sender act, then set `sent`. The status IS the gate -- the runner refuses to send anything not in `approved`.

**Examples across verticals:**
- Sales: SDR agent drafts an outbound email (`pending-review`); the AE or a manager agent approves before send.
- Healthcare: an agent drafts patient-facing instructions; a clinician approves before delivery (`MANUAL`/`REVIEW` -- never `AUTO`).
- Finance: a renewal notice is drafted but blocked at `pending-review` until compliance clears it.
- Marketing: a post is generated and held; a brand reviewer flips it to `approved` before it publishes.

**Anti-pattern:** an agent that generates and sends in one uninterrupted step for high-stakes output -- there is no point at which a human or reviewer can intervene, and a single bad generation reaches the customer. Equally wrong: expecting Personize to "trigger" Agent B by itself. Nothing runs without an external scheduler or runner; the platform only holds the state they react to.

**Relationship to other patterns:** the approval lifecycle is the concrete state machine behind Escalation & Human-in-the-Loop (K) -- K decides *when* to require review, P defines the *statuses and transitions* that enforce it. The review agent flipping status is a handoff governed by Responsibility Routing (H): generation and approval are different roles, and ownership moves with the status. Triggering (a) is how a Fleet Dispatch (N) of generators hands its drafts to a separate fleet of reviewers.
