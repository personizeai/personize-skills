# Design Patterns for Personize Integrations

| Pattern | Summary | When to Use |
|---|---|---|
| **Event-Driven Ingest** | CRM webhooks -> memorize -> extract properties | Any CRM/data source integration |
| **CQRS for AI Context** | Separate write (memorize) and read (recall) paths | All integrations (this is the default) |
| **Workspace-as-Coordination** | Patient chart model for multi-agent collaboration | 2+ agents or humans sharing an entity |
| **Progressive Enrichment** | Start with basic data, enrich over time | External API enrichment, data building |
| **Governance-as-Guardrails** | Guidelines constrain output, not prescribe it | Any AI generation with brand/compliance rules |
| **Memory-First Architecture** | Recall before acting, store after acting | Agents that learn and improve over time |

---

## Event-Driven Ingest

**Pattern:** External system emits event -> webhook/integration catches it -> `memorize()` stores raw content -> extraction pipeline pulls structured properties.

**Why it matters:** Personize's extraction engine handles the hard work of turning unstructured data (emails, call transcripts, form submissions) into structured properties. You don't need to pre-process -- just send the raw content.

**Architecture:**

```
CRM/Source  -->  Webhook Endpoint  -->  memorize({ content, email/url })
                                              |
                                    Extraction Pipeline
                                              |
                                    Structured Properties in Collection
```

**Implementation:**

```typescript
// Webhook handler receives CRM event
app.post('/webhooks/hubspot', async (req, res) => {
    const { contact, event } = req.body;

    await client.memory.memorize({
        content: `${event.type}: ${event.details}`,
        email: contact.email,
        tags: [`source:hubspot`, `event:${event.type}`],
    });

    res.sendStatus(200);
});
```

**Key decisions:**
- Tag by source system so you can filter later with `recall({ tags: ['source:hubspot'] })`
- Use `email` or `website_url` as the CRM key -- Personize generates deterministic record IDs from these
- For high-volume sources, use `memorizeBatch()` instead of individual calls
- Let extraction handle property mapping -- define good property descriptions in your collection schema

---

## CQRS for AI Context

**Pattern:** Write path (memorize) and read path (recall/smartDigest) are separate, optimized differently.

**Why it matters:** Write operations go through extraction and indexing. Read operations go through vector search and context compilation. Optimizing them independently gives better results than a unified path.

**Write path (optimized for completeness):**

```typescript
// Store everything -- extraction will structure it
await client.memory.memorize({
    content: fullCallTranscript,  // Don't pre-filter
    email: contact.email,
    tags: ['source:gong', 'type:call-transcript'],
});
```

**Read path (optimized for relevance):**

```typescript
// Recall retrieves only what's relevant to the current task
const context = await client.memory.recall({
    query: 'pricing objections and budget concerns',
    email: contact.email,
    limit: 10,
});

// SmartDigest compiles a structured overview
const digest = await client.memory.smartDigest({
    email: contact.email,
    type: 'Contact',
    token_budget: 3000,
});
```

**Key decisions:**
- Write liberally -- store raw content, let extraction do the work
- Read precisely -- use specific queries, set token budgets, filter by tags
- Never pre-filter data on the write side to "help" the read side -- you lose information
- Use `smartDigest` for broad entity understanding, `recall` for specific questions

---

## Workspace-as-Coordination

**Pattern:** An entity's record becomes a shared workspace -- like a patient chart -- where multiple agents and humans read and write. The workspace schema defines what can be contributed (context, updates, tasks, notes, issues).

**Why it matters:** Without a shared surface, agents duplicate work, miss each other's findings, and lose context between runs. The workspace is the coordination mechanism -- no message bus or orchestrator needed.

**Architecture:**

```
Agent A (scheduled)  --->  |                          |
Agent B (event-driven) ->  |  Workspace (5 properties) |  <-- Human (via MCP/UI)
System webhook  -------->  |  context, updates, tasks,  |
                           |  notes, issues              |
```

**The 5-property starter:**

| Property | Semantics | Purpose |
|---|---|---|
| `context` | replace | Living summary -- current state, rewritten by whoever has freshest understanding |
| `updates` | append, immutable | Timeline -- what happened, who did it, when |
| `tasks` | append, mutable | Action items -- any contributor can create or claim |
| `notes` | append, immutable | Knowledge and observations that don't fit elsewhere |
| `issues` | append, mutable | Problems, blockers, risks -- mutable because they get resolved |

**Key decisions:**
- Start with 5 properties -- add more only when you feel a gap
- Every entry must include an `author` field -- without attribution, the workspace is a mystery
- Use `replace` for current-state (context), `append` for history (updates, notes)
- Critical issues are implicit escalations -- no separate escalation mechanism needed
- Read the workspace digest before contributing to avoid duplication

---

## Progressive Enrichment

**Pattern:** Start with basic data (name, email, company), then enrich over time with external APIs, agent observations, and interaction history. Each enrichment cycle adds more properties.

**Why it matters:** You rarely have all the data upfront. Progressive enrichment lets you start with minimal data and build a complete picture over time, without waiting for a "complete" import.

**Stages:**

```
Stage 1: Basic Import       ->  name, email, company (from CRM)
Stage 2: External Enrichment ->  industry, funding, tech stack (from Clearbit/Apollo)
Stage 3: Behavioral Data     ->  usage patterns, feature adoption (from product analytics)
Stage 4: Agent Observations   ->  sentiment, risk signals, opportunities (from AI analysis)
Stage 5: Interaction History  ->  call summaries, email threads, support tickets (ongoing)
```

**Implementation:**

```typescript
// Stage 1: Basic import
await client.memory.memorize({
    content: `Contact: ${name} at ${company}, role: ${role}`,
    email: contact.email,
    tags: ['source:crm', 'stage:import'],
});

// Stage 2: Enrichment (scheduled agent)
const enrichment = await fetchFromClearbit(contact.email);
await client.memory.memorize({
    content: `Company enrichment: ${JSON.stringify(enrichment)}`,
    email: contact.email,
    tags: ['source:clearbit', 'stage:enrichment'],
});

// Stage 3+: Ongoing -- each new data source adds depth
```

**Key decisions:**
- Don't wait for "complete" data before starting -- the system works with partial information
- Tag each memorization with its source and stage for traceability
- Use `smartDigest` to see the compiled view at any point -- it synthesizes whatever is available
- Schedule enrichment agents to run periodically, not just once

---

## Governance-as-Guardrails

**Pattern:** Organizational guidelines constrain AI outputs without prescribing exact behavior. Guidelines define the boundaries; the AI exercises judgment within them.

**Why it matters:** Multiple agents and humans using multiple AI tools need consistent rules. Without governance, each invocation invents its own voice, its own compliance rules, its own version of "how we talk to customers." Governance ensures consistency across all AI-generated touchpoints.

**The three constraint levels (RFC 2119):**

| Level | Keyword | Meaning |
|---|---|---|
| Hard constraint | MUST / REQUIRED | Non-negotiable. Violation = failure. |
| Best practice | SHOULD / RECOMMENDED | Strong default. Override with stated reasoning. |
| Reference | MAY / OPTIONAL | Agent discretion. |

**Implementation:**

```typescript
// Fetch governance before generating anything
const governance = await client.ai.smartGuidelines({
    message: 'writing a follow-up email to a healthcare prospect',
    mode: 'deep',
});

// The governance context includes matched guidelines, constraint levels,
// and section-level routing -- only relevant rules are returned
const result = await client.ai.prompt({
    context: governance.data?.compiledContext,
    instructions: [
        { prompt: 'Apply governance rules to this email draft...', maxSteps: 3 },
    ],
});
```

**Key decisions:**
- Write guidelines with clear MUST/SHOULD/MAY levels -- pure MUST guidelines over-constrain
- Keep guidelines focused (one concern per guideline, 300-800 words)
- Use `alwaysOn: true` sparingly (2-3 max) -- each consumes a retrieval slot
- Front-load key terms in the first paragraph -- the first ~1,000 characters drive routing accuracy
- Test routing after creating guidelines with a `smartGuidelines` call

---

## Memory-First Architecture

**Pattern:** Every agent action starts with recall (what do we already know?) and ends with memorize (what did we learn?). The agent's knowledge compounds over time.

**Why it matters:** Without memory-first, agents start from zero every invocation. With it, each run builds on everything learned before -- across all agents, all interactions, all data sources.

**The recall-act-store loop:**

```
1. RECALL  -- What do we know about this entity/situation?
2. REASON  -- Given what we know + governance rules, what should we do?
3. ACT     -- Generate content, make decisions, take actions
4. STORE   -- What did we learn? What changed? What should we remember?
```

**Implementation:**

```typescript
// 1. Recall
const [digest, relevant] = await Promise.all([
    client.memory.smartDigest({ email, type: 'Contact', token_budget: 2500 }),
    client.memory.recall({ query: 'recent interactions and open issues', email }),
]);

// 2. Reason + 3. Act
const result = await client.ai.prompt({
    context: [digest.data?.compiledContext, relevant.data].filter(Boolean).join('\n\n'),
    instructions: [
        { prompt: 'Analyze current situation based on all available context...', maxSteps: 3 },
        { prompt: 'Generate the appropriate response/action...', maxSteps: 5 },
    ],
});

// 4. Store
await client.memory.memorize({
    content: `Action taken: ${result.data?.output}. Outcome: [observed result]`,
    email,
    tags: ['source:agent', 'type:action-log'],
});
```

**Key decisions:**
- Always recall before acting, even if you think you know the answer -- context may have changed
- Store outcomes, not just actions -- "sent email" is less useful than "sent email about pricing, they responded positively"
- Tag agent observations differently from raw data -- enables filtering by source
- Use `smartDigest` for entity-level recall, `recall` for situation-specific queries
- The compounding effect is the main value -- each agent run makes all future runs smarter
