# Reference: Use Case Archetypes

Architecture patterns, layer weights, and example pipelines for each use case archetype. Use this after the Situation Assessment to select the right technical approach.

---

> **Related:** For full details on each integration mode (SDK, MCP, multi-agent, Responses API, etc.), see `reference/integration-modes.md`.

## How to Use This Guide

After determining the developer's archetype (from the Situation Profile), read the matching section for:
1. **Layer weights** -- which Personize layers matter most
2. **Data flow legs** -- which legs of the 4-leg loop are active
3. **Recommended integration modes** -- SDK, MCP, multi-agent, or hybrid
4. **Architecture pattern** -- how the pieces connect
5. **Example pipelines** -- concrete workflows with code or tool call sequences
6. **Department adaptations** -- how the archetype looks for Sales vs CS vs Marketing vs Product vs Ops

---

## Archetype 1: Communication-Heavy

**Definition:** Generate and send personalized messages -- outreach, follow-ups, notifications, nurture sequences, check-ins, digests.

### Layer Weights

| Layer | Weight | Why |
|---|---|---|
| **Generation** | High | Every message is AI-written, not templated |
| **Governance** | High | Brand voice, compliance, and tone must be enforced across all outputs |
| **Memory** | Medium | Context assembly for personalization, but the output IS the message |
| **Learning** | Medium | Store what was sent, track outcomes for future context |
| **Coordination** | Low (unless multi-agent) | Usually single-pipeline, unless multiple agents handle different channels |

### Data Flow Legs

```
Leg 1 (Ingest): CRM data, enrichment, past interactions -> memorize
Leg 2 (Context): smartDigest + smartGuidelines -> assemble context
Leg 3 (Learn Back): Store what was sent + delivery outcomes -> memorize
Leg 4 (Deliver): Generated content -> SendGrid/Slack/webhook/SMS
```

All 4 legs active. Leg 3 is critical -- future messages should know what was already sent.

### Recommended Integration Modes

| Autonomy | Mode | Pattern |
|---|---|---|
| Human-driven | MCP on coding assistant | "Write a follow-up for Sarah" -- AI calls tools, human reviews |
| Human-in-loop | SDK + review queue | Generate batch, human approves before sending |
| Supervised | SDK cron + evaluation | Nightly batch with `evaluate: true`, flag low scores |
| Fully autonomous | Multi-agent | Research agent -> Generation agent -> Delivery agent -> Learning agent |

### Architecture Pattern: SDK Batch Pipeline

```typescript
// Communication-heavy batch pipeline
async function communicationPipeline(contacts: string[]) {
    for (const email of contacts) {
        // Leg 2: Context
        const [governance, digest] = await Promise.all([
            client.ai.smartGuidelines({ message: 'outreach email guidelines', mode: 'fast' }),
            client.memory.smartDigest({ email, type: 'Contact', token_budget: 2000 }),
        ]);
        const context = [governance.data?.compiledContext, digest.data?.compiledContext]
            .filter(Boolean).join('\n\n---\n\n');

        // Generate
        const result = await client.ai.prompt({
            context,
            instructions: [
                { prompt: 'Analyze recipient: role, company, recent activity, pain points.', maxSteps: 2 },
                { prompt: 'Check governance: tone, compliance, forbidden topics.', maxSteps: 2 },
                { prompt: 'Write personalized email. SUBJECT: ... BODY_HTML: ... BODY_TEXT: ...', maxSteps: 5 },
            ],
            evaluate: true,
        });

        // Leg 4: Deliver
        const output = String(result.data || '');
        await deliverEmail(email, parseEmailOutput(output));

        // Leg 3: Learn back
        await client.memory.memorize({
            content: `[OUTREACH] Sent ${new Date().toISOString()}. Subject: ${parseSubject(output)}`,
            email, enhanced: true, tags: ['generated', 'outreach', 'email'],
        });

        await rateLimitPause();
    }
}
```

### Architecture Pattern: MCP Multi-Agent

```
Agent: Sales Outreach Coordinator (OpenClaw / CoWork)
  ├── Research Agent
  │    ├── memory_recall_pro: "what do we know about {email}?"
  │    ├── memory_digest: compile full context
  │    └── web_search: recent company news (external tool)
  │
  ├── Writer Agent
  │    ├── ai_smart_guidelines: "outbound email rules"
  │    ├── Receives research context from workspace
  │    └── Generates email using governance + context
  │
  ├── QA Agent
  │    ├── Reviews generated email against governance
  │    ├── Checks for hallucinated claims
  │    └── Flags or approves
  │
  └── Delivery Agent
       ├── Sends approved email via external API
       ├── memory_store_pro: record what was sent
       └── memory_update_property: update "last_contacted" date
```

### Department Adaptations

| Department | Communication Focus | Key Governance | Example |
|---|---|---|---|
| **Sales** | Outreach, follow-ups, proposals | Sales playbook, compliance, CAN-SPAM | Cold email sequence for new prospects |
| **Marketing** | Campaigns, nurture, landing pages | Brand voice, messaging framework, approved claims | Personalized drip campaign |
| **Customer Success** | Check-ins, health alerts, QBR prep | CS playbook, escalation rules, renewal messaging | Monthly health check-in per account |
| **Product** | Feature announcements, onboarding | Product messaging, onboarding guidelines | Personalized onboarding guide per user |
| **Operations** | Internal updates, compliance notices | Internal comms policy, legal requirements | Compliance digest for each department |

---

## Archetype 2: Analysis-Heavy

**Definition:** Research and synthesize -- scoring, reporting, competitive intel, health assessments, market analysis, research briefs.

### Layer Weights

| Layer | Weight | Why |
|---|---|---|
| **Memory** | High | Analysis requires deep context from multiple sources |
| **Recall** | High | `smartDigest` with high `token_budget`, cross-entity context |
| **Generation** | Medium | Outputs are narratives/reports, but insight quality depends on recall quality |
| **Governance** | Medium | Analysis frameworks, scoring criteria, reporting standards |
| **Learning** | High | Analysis findings should be stored back as new knowledge |

### Data Flow Legs

```
Leg 1 (Ingest): All data sources -> memorize (the richer, the better)
Leg 2 (Context): Deep recall with high token budgets + cross-entity context
Leg 3 (Learn Back): Analysis findings stored as new memories + properties updated
Leg 4 (Deliver): Reports/insights -> dashboards/Slack/email (lower urgency)
```

Leg 2 is the critical path. Use `token_budget: 3000-5000` for deep analysis. Pull cross-entity context (contact + company + related contacts).

### Recommended Integration Modes

| Autonomy | Mode | Pattern |
|---|---|---|
| Human-driven | MCP on coding assistant | "Research Acme Corp -- what's their health?" |
| Human-in-loop | Responses API | Step 1: recall, Step 2: cross-reference, Step 3: synthesize |
| Supervised | SDK batch | Weekly health reports for all accounts |
| Fully autonomous | Multi-agent | Intel agents monitor signals, synthesis agent produces reports |

### Architecture Pattern: Deep Analysis Pipeline

```typescript
// Analysis-heavy: account health assessment
async function analyzeAccountHealth(email: string, websiteUrl: string) {
    // Deep context assembly -- high token budget
    const [contactDigest, companyDigest, governance, recentActivity] = await Promise.all([
        client.memory.smartDigest({ email, type: 'Contact', token_budget: 3000 }),
        client.memory.smartDigest({ website_url: websiteUrl, type: 'Company', token_budget: 2000 }),
        client.ai.smartGuidelines({ message: 'health scoring criteria, CS playbook, risk signals' }),
        client.memory.recall({ query: 'recent support tickets, usage changes, billing events', email }),
    ]);

    const context = [
        governance.data?.compiledContext,
        '## Contact Context\n' + contactDigest.data?.compiledContext,
        '## Company Context\n' + companyDigest.data?.compiledContext,
        '## Recent Activity\n' + recentActivity.data,
    ].filter(Boolean).join('\n\n---\n\n');

    // Multi-step analysis
    const analysis = await client.ai.prompt({
        context,
        instructions: [
            { prompt: 'List all signals from all sources: usage trends, support patterns, billing status, stakeholder engagement, external signals.', maxSteps: 3 },
            { prompt: 'Score health 1-100. Cite specific evidence for each factor. Flag any contradictory signals.', maxSteps: 3 },
            { prompt: 'Write a 3-paragraph health assessment narrative: (1) current state, (2) risk factors, (3) recommended actions. Include specific evidence.', maxSteps: 5 },
        ],
        evaluate: true,
    });

    // Leg 3: Store analysis findings back
    await client.memory.memorize({
        content: `[HEALTH ASSESSMENT ${new Date().toISOString()}]\n${analysis.data}`,
        email, enhanced: true,
        tags: ['analysis', 'health-assessment', 'cs'],
    });

    return analysis.data;
}
```

### Department Adaptations

| Department | Analysis Focus | Key Data Sources | Example |
|---|---|---|---|
| **Sales** | Prospect research, deal analysis | CRM + enrichment + product usage | Pre-call research brief for enterprise deal |
| **Marketing** | Campaign performance, audience insights | Analytics + CRM + engagement | "Why did Q1 campaign underperform in healthcare vertical?" |
| **Customer Success** | Health scoring, churn prediction | Usage + support + billing + stakeholder signals | Weekly account health dashboard narratives |
| **Product** | Feature adoption, user research synthesis | Product analytics + feedback + support | "Synthesize all feedback about the new API from the past 30 days" |
| **Operations** | Compliance audit, process analysis | Audit logs + policies + activity data | Quarterly compliance report with risk narrative |

---

## Archetype 3: Decision-Heavy

**Definition:** Score and route -- qualification, prioritization, triage, next-best-action, approval workflows.

### Layer Weights

| Layer | Weight | Why |
|---|---|---|
| **All three equally** | High | Decisions need full context (memory), rules (governance), and reasoning (generation) |
| **Learning** | High | Decision outcomes must be tracked to improve future decisions |
| **Coordination** | Medium | Decisions often involve handoffs between agents or teams |

### Data Flow Legs

All 4 legs active, with Leg 3 (learn back) being the most important for continuous improvement. Every decision outcome should be stored so future decisions can reference past results.

### Recommended Integration Modes

| Autonomy | Mode | Pattern |
|---|---|---|
| Human-driven | MCP or Responses API | "Should we prioritize Acme or Beta Corp for renewal outreach?" |
| Human-in-loop | SDK + approval flow | Score leads, present recommendations, human approves routing |
| Supervised | SDK + threshold alerts | Auto-route below threshold, alert human for edge cases |
| Fully autonomous | Multi-agent + governance + learning | Agents score, route, act, and update scoring criteria based on outcomes |

### Architecture Pattern: Structured Decision Output

```typescript
// Decision-heavy: lead qualification with structured output
const decision = await client.ai.prompt({
    context,  // governance scoring criteria + entity memory + company context
    instructions: [
        { prompt: 'List all qualification signals: firmographic fit, engagement level, timing signals, budget indicators.', maxSteps: 3 },
        { prompt: 'Apply our ICP scoring criteria from governance. Score each dimension 1-10 with evidence.', maxSteps: 3 },
        { prompt: 'Make a routing decision. Output as JSON: { "score": 0-100, "tier": "hot|warm|cold|disqualified", "reason": "...", "next_action": "...", "assigned_to": "..." }', maxSteps: 3 },
    ],
    evaluate: true,
    evaluationCriteria: 'Decision must cite specific evidence. Score must match the evidence. Routing must follow governance criteria.',
});

// Leg 3: Store decision for future reference
await client.memory.memorize({
    content: `[QUALIFICATION ${new Date().toISOString()}] Score: ${score}, Tier: ${tier}, Reason: ${reason}`,
    email, enhanced: true,
    tags: ['decision', 'qualification', 'sales'],
});
```

### The Decision Learning Loop

For autonomous decision systems, the learning loop is critical:

```
1. Agent makes decision (score, route, prioritize)
2. Decision is stored in memory with reasoning
3. Outcome is observed later (did the deal close? did churn happen?)
4. Outcome is stored in memory
5. Learning agent compares decisions to outcomes
6. If pattern emerges, learning agent updates governance:
   └── guideline_update: "Contacts with >3 support tickets in 30 days
       should be flagged as churn risk regardless of usage metrics"
7. Future decisions incorporate the updated governance
```

### Department Adaptations

| Department | Decision Focus | Governance Needed | Example |
|---|---|---|---|
| **Sales** | Lead qualification, deal prioritization | ICP scoring criteria, territory rules | Auto-qualify inbound leads, route to right rep |
| **Support** | Ticket triage, escalation | SLA rules, severity criteria, escalation paths | Route tickets by urgency + customer tier |
| **Customer Success** | Renewal prioritization, intervention timing | Health thresholds, intervention playbooks | "Which 10 accounts need attention this week?" |
| **Product** | Feature request prioritization, bug triage | Prioritization framework, impact criteria | Score feature requests by impact x effort x customer value |
| **Operations** | Approval routing, compliance checks | Approval matrices, compliance rules | Auto-approve below threshold, escalate above |

---

## Archetype 4: Execution-Heavy

**Definition:** Sync and update -- CRM enrichment, batch updates, webhook dispatch, data migration, property calculations.

### Layer Weights

| Layer | Weight | Why |
|---|---|---|
| **Memory** | High | Source and destination for data -- this IS the pipeline |
| **Governance** | Low | Data sync doesn't need brand voice, but may need data quality rules |
| **Generation** | Low | Minimal AI generation -- mostly structured data operations |
| **Learning** | Low | Execution is deterministic -- less to learn from |
| **Coordination** | Low | Usually single-pipeline |

### Data Flow Legs

```
Leg 1 (Ingest): External systems -> memorizeBatch / memorize
Leg 4 (Deliver): Personize -> External systems via webhooks or API calls
```

Primarily Legs 1 and 4. Leg 2 may be used for enrichment (recall existing data to merge with new). Leg 3 is minimal.

### Recommended Integration Modes

| Autonomy | Mode | Pattern |
|---|---|---|
| Human-driven | SDK script | Manual one-time data migration |
| Scheduled | SDK cron | Nightly CRM sync |
| Event-driven | Webhook + SDK | CRM webhook triggers memorize |
| Continuous | n8n workflow | Visual pipeline with schedule trigger |

### Architecture Pattern: Batch Sync Pipeline

```typescript
// Execution-heavy: CRM batch sync with rate limiting
async function syncCRMContacts(contacts: CRMContact[]) {
    const { data: me } = await client.me();
    const rpm = me?.plan?.limits?.requestsPerMinute || 60;
    const delayMs = Math.ceil(60_000 / (rpm / 6)); // 6 API calls per record

    const batchSize = 50;
    for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);

        await client.memory.memorizeBatch({
            records: batch.map(c => ({
                recordId: c.email,
                collectionName: 'Contacts',
                properties: {
                    email: { value: c.email, extractMemories: false },
                    name: { value: c.name, extractMemories: false },
                    title: { value: c.title, extractMemories: false },
                    company: { value: c.company, extractMemories: false },
                    deal_stage: { value: c.dealStage, extractMemories: false },
                    notes: { value: c.notes, extractMemories: true }, // AI extracts from notes
                },
            })),
        });

        console.log(`Synced ${Math.min(i + batchSize, contacts.length)}/${contacts.length}`);
        await new Promise(r => setTimeout(r, delayMs));
    }
}
```

### Architecture Pattern: Webhook-Triggered Enrichment

```typescript
// Event-driven: CRM update triggers enrichment
app.post('/webhooks/crm/contact-updated', async (req, res) => {
    const { email, fields } = req.body;

    // Leg 1: Ingest the update
    await client.memory.memorize({
        content: `CRM update: ${JSON.stringify(fields)}`,
        email, enhanced: true,
        tags: ['crm', 'webhook', 'sync'],
    });

    // Optional Leg 2+4: If enrichment needed, recall + push back
    if (fields.company && !fields.industry) {
        const digest = await client.memory.smartDigest({
            website_url: fields.website, type: 'Company', token_budget: 500,
        });
        // Push enriched data back to CRM via their API
        await crmApi.updateContact(email, { industry: extractIndustry(digest) });
    }

    res.json({ ok: true });
});
```

### Department Adaptations

| Department | Execution Focus | Scale | Example |
|---|---|---|---|
| **Sales** | CRM sync, lead enrichment | Medium (1K-10K records) | Nightly HubSpot -> Personize sync with enrichment |
| **Marketing** | List import, segment sync | High (10K-100K records) | Import event attendees with batch memorize |
| **Operations** | Data migration, cleanup | High (one-time or periodic) | Migrate 50K contacts from legacy CRM |
| **Product** | Usage data sync, feature flags | Continuous (event-driven) | Product usage events -> Personize memory |

---

## Archetype 5: Collaboration-Heavy

**Definition:** Coordinate across agents and humans on shared records -- multi-agent deal rooms, account intelligence, cross-functional handoffs, shared workspaces.

### Layer Weights

| Layer | Weight | Why |
|---|---|---|
| **Coordination (Workspaces)** | High | This IS the archetype -- shared state across participants |
| **Memory** | High | Each participant reads and writes to shared context |
| **Governance** | High | Rules for who can do what, contribution standards, escalation |
| **Generation** | Medium | Synthesis of contributions, status narratives |
| **Learning** | High | Collaborative systems learn from collective intelligence |

### Data Flow Legs

All 4 legs active, with Leg 3 (learn back) being the core activity. Every participant reads (Leg 2) and writes (Leg 3) to the shared workspace continuously.

### Architecture Pattern: Multi-Agent Workspace

```
Workspace: "Account: Acme Corp"
  │
  ├── Sales Intel Agent (runs weekly)
  │    ├── memory_recall_pro: recent interactions
  │    ├── web_search: company news, hiring, funding
  │    └── memory_store_pro: "Acme raised Series C, hiring 20 engineers"
  │
  ├── Product Analytics Agent (runs daily)
  │    ├── memory_get_properties: usage metrics
  │    ├── Analyzes trends
  │    └── memory_update_property: adoption_score = 78
  │
  ├── CS Health Agent (runs daily)
  │    ├── memory_digest: full account context (all agents' contributions)
  │    ├── ai_smart_guidelines: health scoring criteria
  │    ├── Synthesizes all signals into health assessment
  │    └── memory_store_pro: health score + narrative + recommended actions
  │
  └── Human CS Manager (reads dashboard)
       ├── Reviews synthesized health assessment
       ├── Takes recommended action or overrides
       └── memory_store_pro: "Called Sarah, she confirmed API issues are blocking adoption"
```

### Department Adaptations

| Department | Collaboration Pattern | Participants | Example |
|---|---|---|---|
| **Sales + CS** | Deal room | Sales rep + CS manager + research agent | Coordinated account strategy with shared intelligence |
| **Cross-functional** | Account intelligence | Sales + CS + Product + Support agents | 360-degree account view with contributions from all functions |
| **Product** | Feature decision workspace | PM + Engineering + Customer feedback agent | Aggregate customer feedback, engineering constraints, business priority |
| **Operations** | Incident response | Alert agent + triage agent + human responder | Coordinated incident response with escalation |

---

## Archetype Combinations

Real use cases often combine archetypes. Common combinations:

| Combination | Example | Architecture |
|---|---|---|
| **Execution + Communication** | Sync CRM data, then generate outreach for new contacts | SDK batch: memorize -> filter new -> generate -> deliver |
| **Analysis + Decision** | Research accounts, then score and prioritize | Deep recall -> multi-step analysis -> structured scoring output |
| **Analysis + Communication** | Research account health, then generate check-in | smartDigest -> health analysis -> personalized email |
| **Decision + Communication** | Qualify lead, then generate appropriate response | Score -> route -> generate message matching tier |
| **Collaboration + Communication** | Multi-agent workspace produces intelligence, then generates outreach | Workspace agents contribute -> synthesis agent generates |

When combining, apply the higher governance requirements. If any archetype in the combination is communication-heavy, enforce full generation guardrails.
