# GROW — Expand the Workspace

When the 5-property starter isn't enough, add new properties. Each expansion is a response to a real need — something you've actually felt while using the workspace, not a theoretical "what if."

---

## When to Grow

**Add a property when** you notice a recurring pattern that doesn't fit the existing 5:
- You keep writing notes that are really decisions with reasoning → Add **Decisions**
- You keep creating tasks to "check on X next week" → Add **Monitors**
- Multiple contributors need to know what messages were sent → Add **Messages Sent**
- Stakeholders who don't use the workspace need summaries → Add **Reports**
- You need to know who's active and what they're responsible for → Add **Participants**
- Issues need human attention but nobody checks the workspace → Add **Alerts**

**Don't add a property when** you can express it with the existing 5. A task with a good description covers most "action" needs. A note covers most "knowledge" needs. Only add structure when the existing properties force you to work around them.

---

## Expansion Properties

### Decisions

Track autonomous agent decisions with full reasoning — the explainability and governance layer.

**Add when:** Agents are making choices (which account to prioritize, what message to send, whether to escalate) and you need transparency into why.

```json
{
    "name": "Decisions",
    "systemName": "decisions",
    "type": "array",
    "description": "Record of decisions made about this entity, with full reasoning. Each entry is an object: { question (what was being decided), decision (chosen action or conclusion), reasoning (why this choice — include data points and logic), alternatives (array of other options considered with brief rationale for rejection), confidence (low | medium | high), autonomous (boolean — true if agent decided alone, false if human-approved), approvedBy (user ID or null if autonomous), timestamp (ISO 8601) }. Immutable — decisions are historical record. If a decision is reversed, add a new decision entry explaining why.",
    "autoSystem": true,
    "updateSemantics": "append",
    "update": false,
    "tags": ["workspace", "explainability", "governance", "immutable"]
}
```

**Entry schema:**
```typescript
interface WorkspaceDecision {
    question: string;         // "Should we offer a 20% discount to prevent churn?"
    decision: string;         // "Yes — offer 15% with annual commitment"
    reasoning: string;        // "Usage declining but NPS is 8/10. They like the product..."
    alternatives: string[];   // ["No discount — let them evaluate", "20% no strings"]
    confidence: 'low' | 'medium' | 'high';
    autonomous: boolean;
    approvedBy?: string;
    timestamp: string;
}
```

---

### Messages Sent

Track outbound communications so the workspace knows what was already said. Closes the feedback loop — agents stop repeating themselves.

**Add when:** Multiple contributors send messages to or about this entity and you need a record of what was communicated.

```json
{
    "name": "Messages Sent",
    "systemName": "messages_sent",
    "type": "array",
    "description": "Record of outbound communications related to this entity. Each entry is an object: { channel (email | slack | sms | push | in_app | webhook), recipient (email or identifier), subject (if applicable), summary (concise description of what was sent — not the full message body), sentAt (ISO 8601), triggeredBy (task ID, agent name, or 'manual'), status (sent | failed | scheduled) }. Immutable — the communication record should never be altered after the fact.",
    "autoSystem": true,
    "updateSemantics": "append",
    "update": false,
    "tags": ["workspace", "communication", "audit", "immutable"]
}
```

**Entry schema:**
```typescript
interface WorkspaceMessage {
    channel: 'email' | 'slack' | 'sms' | 'push' | 'in_app' | 'webhook';
    recipient: string;
    subject?: string;
    summary: string;          // "Follow-up about pricing — included cost breakdown PDF"
    sentAt: string;
    triggeredBy: string;      // "cs-health-agent" | "jane.doe" | "task-123"
    status: 'sent' | 'failed' | 'scheduled';
}
```

---

### Monitors

Persistent watchlist items that agents check on each cycle. Proactive surveillance instead of reactive observation.

**Add when:** You need agents to watch for specific conditions over time (thresholds, changes, absences) rather than just observing what they happen to notice.

```json
{
    "name": "Monitors",
    "systemName": "monitors",
    "type": "array",
    "description": "Persistent conditions to watch for on each agent cycle. Each entry is an object: { target (what to watch — e.g., 'login frequency', 'support ticket count', 'no reply in 7 days'), description (full context of why this matters), type (threshold | change_detection | schedule | absence), frequency (every_pulse | daily | weekly), action (notify | escalate | auto_act — what to do when triggered), status (active | paused | retired), createdBy (who set up this monitor), lastChecked (ISO 8601), lastResult (ok | triggered | error) }. Agents update status and lastChecked on each cycle.",
    "autoSystem": true,
    "updateSemantics": "append",
    "update": true,
    "tags": ["workspace", "proactive", "monitoring", "operational"]
}
```

**Entry schema:**
```typescript
interface WorkspaceMonitor {
    target: string;           // "login frequency > 5/day"
    description: string;      // "Track daily logins to detect engagement drops"
    type: 'threshold' | 'change_detection' | 'schedule' | 'absence';
    frequency: 'every_pulse' | 'daily' | 'weekly';
    action: 'notify' | 'escalate' | 'auto_act';
    status: 'active' | 'paused' | 'retired';
    createdBy: string;
    lastChecked?: string;
    lastResult?: 'ok' | 'triggered' | 'error';
}
```

---

### Alerts

Notifications that need human attention. Unlike issues (which track problems), alerts are push-oriented — they demand a response.

**Add when:** Issues aren't enough because nobody checks the workspace proactively. You need the workspace to push signals to the right people.

```json
{
    "name": "Alerts",
    "systemName": "alerts",
    "type": "array",
    "description": "Notifications requiring human attention or awareness. Each entry is an object: { title, severity (info | warning | critical), category (anomaly | threshold | reminder | escalation | opportunity), message (full alert context), targetAudience (user | team | manager — who should see this), action (notify | escalate | auto_act), status (open | acknowledged | resolved | dismissed), acknowledgedBy (user ID or null), resolvedAt (ISO 8601 or null), timestamp (ISO 8601) }. Agents create alerts. Humans acknowledge or dismiss them.",
    "autoSystem": true,
    "updateSemantics": "append",
    "update": true,
    "tags": ["workspace", "notification", "escalation", "operational"]
}
```

**Entry schema:**
```typescript
interface WorkspaceAlert {
    title: string;
    severity: 'info' | 'warning' | 'critical';
    category: 'anomaly' | 'threshold' | 'reminder' | 'escalation' | 'opportunity';
    message: string;
    targetAudience: 'user' | 'team' | 'manager';
    action: 'notify' | 'escalate' | 'auto_act';
    status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
    acknowledgedBy?: string;
    resolvedAt?: string;
    timestamp: string;
}
```

---

### Reports

Periodic summaries for stakeholders who don't read the workspace directly. The workspace produces its own executive view.

**Add when:** You need to share workspace intelligence with people who won't read individual entries — managers, executives, external stakeholders.

```json
{
    "name": "Reports",
    "systemName": "reports",
    "type": "array",
    "description": "Periodic summaries generated from workspace activity. Each entry is an object: { title (e.g., 'Weekly Account Health Report'), content (the report itself — markdown formatted), period (e.g., 'week of 2026-02-17'), generatedBy (agent name or 'manual'), audience (who this report is for), highlights (array of key findings — 3-5 bullet points), timestamp (ISO 8601) }. Immutable — reports are snapshots in time.",
    "autoSystem": true,
    "updateSemantics": "append",
    "update": false,
    "tags": ["workspace", "reporting", "summary", "immutable"]
}
```

**Entry schema:**
```typescript
interface WorkspaceReport {
    title: string;
    content: string;          // Markdown-formatted report
    period: string;           // "week of 2026-02-17" | "Q1 2026"
    generatedBy: string;
    audience: string;         // "account-managers" | "leadership" | "client"
    highlights: string[];     // Top 3-5 findings
    timestamp: string;
}
```

---

### Participants

Registry of everyone contributing to this workspace. The workspace becomes self-aware of its own team.

**Add when:** You need to know who's active, who's silent, and what each contributor is responsible for — typically when 4+ participants are involved.

```json
{
    "name": "Participants",
    "systemName": "participants",
    "type": "array",
    "description": "Registry of all agents, humans, and systems contributing to this workspace. Each entry is an object: { participantId (unique identifier — agent ID, user email, system name), type (agent | human | system), role (owner | contributor | observer | approver — descriptive, not enforced), scope (what this participant focuses on — e.g., 'sales intelligence', 'health monitoring', 'executive oversight'), lastActive (ISO 8601 — last contribution timestamp), status (active | paused | retired) }. Updated when participants join, leave, or change roles.",
    "autoSystem": true,
    "updateSemantics": "append",
    "update": true,
    "tags": ["workspace", "team", "coordination"]
}
```

**Entry schema:**
```typescript
interface WorkspaceParticipant {
    participantId: string;    // "cs-health-agent" | "jane.doe@company.com" | "crm-webhook"
    type: 'agent' | 'human' | 'system';
    role: 'owner' | 'contributor' | 'observer' | 'approver';
    scope: string;            // "sales intelligence" | "health monitoring"
    lastActive: string;
    status: 'active' | 'paused' | 'retired';
}
```

---

## Maturity Stages

### Stage 1: Starter (5 properties)

Context, Updates, Tasks, Notes, Issues. Enough for most use cases. The workspace provides shared visibility and basic coordination.

**Typical contributors:** 1-2 agents + 1 human.

### Stage 2: Accountable (+ Decisions, Messages Sent)

Agents explain their reasoning. The workspace tracks what was communicated. You have a full audit trail.

**Typical contributors:** 2-3 agents + 1-2 humans.

### Stage 3: Proactive (+ Monitors, Alerts)

Agents don't just observe — they watch for specific conditions and push notifications. The workspace reaches out instead of waiting to be read.

**Typical contributors:** 3+ agents + multiple humans.

### Stage 4: Self-Organizing (+ Reports, Participants)

The workspace produces its own summaries and knows its own team. It's a fully autonomous collaboration surface.

**Typical contributors:** 5+ agents + a team of humans + external systems.

---

## Adding a Property

When you've identified a gap, adding a property is straightforward:

### Via Personize Web App

1. Go to Collections → select the workspace collection
2. Add a new property with the specification from above
3. Start contributing to it immediately

### Via SDK

```typescript
// Add Decisions property to an existing workspace collection
await client.collections.update(collectionId, {
    properties: [
        // ... existing properties stay as-is
        {
            name: 'Decisions',
            systemName: 'decisions',
            type: 'array',
            description: 'Record of decisions made about this entity...',
            // ... full spec from above
        },
    ],
});
```

### Verify the Addition

After adding a property, write a test entry and read it back:

```typescript
// Write a test decision
await client.memory.memorize({
    content: JSON.stringify({
        question: 'Test decision — should workspace grow?',
        decision: 'Yes — adding Decisions property',
        reasoning: 'Need to track agent reasoning for accountability',
        alternatives: ['Keep using Notes for decisions'],
        confidence: 'high',
        autonomous: false,
        approvedBy: 'setup-test',
        timestamp: new Date().toISOString(),
    }),
    email: 'sarah@acme.com',
    enhanced: true,
    tags: ['workspace:decisions', 'source:setup-test'],
});

// Read it back
const decisions = await client.memory.smartRecall({
    query: 'decisions reasoning',
    email: 'sarah@acme.com',
    limit: 5,
    fast_mode: true,
});

console.log('Decisions:', decisions.data);
```

---

## Common Growth Mistakes

| Mistake | Fix |
|---|---|
| Adding properties you don't need yet | Wait until you feel the gap. Premature properties get ignored. |
| Duplicating existing properties | "Alerts" that are just Issues with a different name. Check if the existing 5 cover it first. |
| Making everything mutable | Only Tasks, Issues, Monitors, Alerts, and Participants need `update: true`. Everything else is immutable history. |
| Skipping the entry schema | Define the structure before you start writing. Inconsistent entries are hard to query. |
| Not updating tags | New properties need new tags (`workspace:decisions`, `workspace:alerts`, etc.) for filtered recall. |
