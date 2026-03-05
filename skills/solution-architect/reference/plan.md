# Reference: PLAN Action

Complete implementation plan template, data intelligence guide, 10-step agentic loop, SDK methods, code examples, recipes, delivery channels, scheduling, and rate limits.

---

## Prerequisites

- Node.js 18+ with TypeScript
- `@personize/sdk` installed
- `PERSONIZE_SECRET_KEY` env var set to an `sk_live_...` key

```typescript
import { Personize } from '@personize/sdk';
import 'dotenv/config';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
```

---

## Data Intelligence Guide — What to Memorize

| Category | What to Store | `extractMemories` | Why It Matters |
|---|---|---|---|
| **Identity & Profile** | Name, email, title, company, role, plan tier | `false` | Foundation — every personalized message starts here |
| **Behavioral Signals** | Feature clicks, page views, login frequency, session duration | `false` | AI detects engagement patterns, power users, at-risk accounts |
| **Search Queries** | What users search for inside the app | `true` | Pure intent signal — reveals unmet needs |
| **Content Consumption** | Articles read, videos watched, docs browsed, webinars | `true` | Memorize the **content itself**. AI knows what the user *learned* |
| **User-Generated Content** | Uploads, files, documents, posts, comments, form data | `true` | Reveals priorities, communication style |
| **Expressed Preferences** | "I prefer email over calls", "We need SOC2" | `true` | Natural language — AI extracts actionable facts |
| **Interaction History** | Support tickets, chat transcripts, call notes | `true` | Rich text — AI extracts takeaways, sentiment, objections |
| **Purchase & Usage** | Plan tier, revenue, features used, expansion signals | `false` | Structured metrics for segmentation and triggers |
| **ML Model Outputs** | Churn predictions, lead scores, classifications | `true` | Store prediction + explanation |
| **Reports & Dashboards** | Pipeline, KPIs, metrics | `true` for interpretations | AI says "your pipeline grew 12%" in messages |
| **Developer Interpretations** | "If user dismisses team invite 3x → solo practitioner" | `true` | Domain knowledge as signal definitions |
| **Telemetry & Monitoring** | Infra metrics, uptime, RMM outputs | `true` for summaries | Aggregated health snapshots |
| **Relationship Graph** | Decision maker, champion, influencer roles | `false` | Structured relationships |
| **Content Engagement** | Opened email #3, clicked pricing page | `false` | Structured events for sequence tracking |
| **Generated Content** | Emails sent, proposals, call scripts | `true` | AI must know what was already communicated |
| **External Signals** | Funding rounds, job changes, company news | `true` | Rich external context |

### Smart Memorization Principles

1. **Memorize signals, not noise** — A ticket's *problem and sentiment* matter more than its ID
2. **Don't pre-process with LLM** — Just pass raw data with `enhanced: true`. Memorize handles extraction.
3. **Don't deduplicate** — Memorize deduplicates at cosine 0.92 and runs background consolidation.
4. **Design collections via the web app or SDK** — Use `client.collections.create()` for programmatic schema creation.
5. **Tag everything** — `tags: ['source:hubspot', 'type:interaction', 'team:sales']`
6. **Include timestamps** — So AI knows what's recent vs stale
7. **Store your own outputs** — Generated content must be memorized for feedback loop

---

## The 10-Step Agentic Loop

```
   ┌──────────────────────────────────────────────────────────────┐
   │                                                              │
   │   OBSERVE → REMEMBER → RECALL → REASON → PLAN → DECIDE     │
   │       → GENERATE → ACT → UPDATE → REPEAT                    │
   │                                                              │
   └──────────────────────────────────────────────────────────────┘
```

Steps can be skipped or combined. A simple notification = Recall → Generate → Act. A full campaign uses all 10.

### SDK Methods by Step

| Step | SDK Method | What It Does |
|---|---|---|
| OBSERVE | `client.memory.search(opts)` | Query records, detect changes |
| REMEMBER | `client.memory.memorize(opts)` | Store single item with AI extraction |
| REMEMBER | `client.memory.memorizeBatch(opts)` | Batch store with per-property control |
| RECALL | `client.memory.recall(opts)` | Semantic search across memories |
| RECALL | `client.memory.smartDigest(opts)` | Compiled context for one entity |
| RECALL | `client.ai.smartGuidelines(opts)` | Fetch governance variables |
| REASON/PLAN/DECIDE | `client.ai.prompt(opts)` | Multi-step AI with `instructions[]` |
| GENERATE | `client.ai.prompt(opts)` | Produce the content |
| ACT | External (SendGrid, Slack, etc.) | Deliver the content |
| UPDATE | `client.memory.memorize(opts)` | Store what was generated back in memory |

---

## Step-by-Step Code

### Step 1: OBSERVE — Detect What Changed

```typescript
import * as fs from 'fs';

const STATE_FILE = '.pipeline-state.json';

interface PipelineState {
    lastRunAt?: string;
    processedRecordIds: string[];
}

function loadState(): PipelineState {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); }
    catch { return { processedRecordIds: [] }; }
}

function saveState(state: PipelineState) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function observe(): Promise<{ recordId: string; properties: Record<string, any> }[]> {
    const state = loadState();
    const result = await client.memory.search({
        type: 'Contact',
        returnRecords: true,
        pageSize: 100,
    });

    const records = result.data?.records || {};
    const newOrChanged: { recordId: string; properties: Record<string, any> }[] = [];

    for (const [recordId, props] of Object.entries(records)) {
        if (state.processedRecordIds.includes(recordId)) continue;
        newOrChanged.push({ recordId, properties: props });
    }

    console.log(`OBSERVE: ${Object.keys(records).length} total, ${newOrChanged.length} new/changed`);
    return newOrChanged;
}
```

### Schedule Recommendations

| Use Case | Frequency |
|---|---|
| Sales outreach | Every 4 hours |
| Product usage alerts | Daily |
| Customer success health | Daily |
| Content personalization | Weekly |
| Meeting prep | On-demand |

### Step 2: REMEMBER — Memorize

**Single item (real-time):**
```typescript
// Prepend identity hints to ensure demographic fields are captured alongside content-relevant ones
await client.memory.memorize({
    content: 'Also extract First Name, Last Name, Company Name, and Job Title if mentioned.\n\nJohn mentioned their vendor lacks SOC2 compliance. Security team approval needed. Q2 timeline.',
    speaker: 'Demo Call Notes',
    enhanced: true,
    tags: ['interaction', 'demo-call', 'objection:security'],
    email: 'john@acme.com',
});
```

**Batch (sync):**
```typescript
await client.memory.memorizeBatch({
    source: 'Product Analytics',
    mapping: {
        entityType: 'contact',
        email: 'email',
        runName: `usage-sync-${Date.now()}`,
        properties: {
            email:         { sourceField: 'email',         collectionId: 'col_std', collectionName: 'Standard' },
            plan:          { sourceField: 'plan_tier',     collectionId: 'col_std', collectionName: 'Standard' },
            usage_summary: {
                sourceField: 'monthly_usage_report',
                collectionId: 'col_gen', collectionName: 'Generated Content',
                extractMemories: true,
            },
        },
    },
    rows: analyticsData,
    chunkSize: 1,
});
```

### Step 3: RECALL — Assemble Context

```typescript
async function assembleContext(email: string, task: string): Promise<string> {
    // 1. Governance rules
    const variables = await client.ai.smartGuidelines({
        message: task,
        tags: ['sales', 'governance'],
    });

    // 2. Entity context
    const digest = await client.memory.smartDigest({
        email,
        type: 'Contact',
        token_budget: 2000,
        include_properties: true,
        include_memories: true,
    });

    // 3. Task-specific facts
    const recalled = await client.memory.recall({
        query: task,
        email,
        limit: 10,
        minScore: 0.5,
        include_property_values: true,
    });

    const sections: string[] = [];
    if (variables.data?.compiledContext) sections.push('## Guidelines\n' + variables.data.compiledContext);
    if (digest.data?.compiledContext) sections.push('## Contact\n' + digest.data.compiledContext);
    if (recalled.data) {
        const memories = Array.isArray(recalled.data) ? recalled.data : [];
        if (memories.length > 0) {
            sections.push('## Relevant Memories\n' + memories.map((m: any) =>
                `- ${m.text || m.content || JSON.stringify(m)}`
            ).join('\n'));
        }
    }
    return sections.join('\n\n---\n\n');
}
```

**Pattern:** `smartGuidelines` (rules) + `smartDigest` (who) + `recall` (what).

### Steps 4-7: REASON → PLAN → DECIDE → GENERATE

```typescript
const result = await client.ai.prompt({
    context: assembledContext,
    instructions: [
        { prompt: 'Analyze: role, pain points, past communications, objections.', maxSteps: 3 },
        { prompt: 'Plan: best angle, what to avoid, what content type.', maxSteps: 3 },
        { prompt: 'Decide: channel (email/slack/sms), urgency, content type.', maxSteps: 2 },
        { prompt: 'Generate: follow guidelines, reference specific facts, clear CTA.', maxSteps: 5 },
    ],
    evaluate: true,
    evaluationCriteria: 'References 2+ facts, follows guidelines, clear CTA, nothing repeated.',
    metadata: { recordId },
});
```

### Reasoning Patterns

| Pattern | Steps | Use Case |
|---|---|---|
| Recall → Generate | 2 | Simple personalized message |
| Analyze → Generate | 2 | Quick content with light reasoning |
| Analyze → Strategize → Generate | 3 | Outreach where angle matters |
| Research → Draft → Evaluate → Revise | 4 | High-stakes content |
| Segment → Prioritize → Generate → Route | 4 | Smart notifications |
| Analyze → Plan → Decide → Generate → Evaluate → Revise | 6 | Full agentic pipeline |

### Step 8: ACT — Deliver

**Email (SendGrid):**
```typescript
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
await sgMail.send({ to: contact.email, from: 'outreach@yourcompany.com', subject: generatedSubject, html: generatedBody });
```

**Slack:**
```typescript
await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `*New signal for ${contact.name}*\n${generatedMessage}` }),
});
```

**Webhook (generic):**
```typescript
await fetch('https://your-app.com/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.APP_API_KEY}` },
    body: JSON.stringify({ userId: contact.recordId, type: 'ai-generated', channel: decidedChannel, content: generatedContent }),
});
```

See `channels/sendgrid.md`, `channels/slack.md`, `channels/twilio.md`, `channels/webhook.md` for full templates.

### Step 9: UPDATE — Close the Loop

```typescript
await client.memory.memorize({
    content: `[OUTREACH-EMAIL] Delivered via ${channel} on ${new Date().toISOString()}.\nContent: ${content.substring(0, 500)}`,
    speaker: 'System: Content Pipeline',
    enhanced: true,
    tags: ['generated', 'pipeline-output', `channel:${channel}`, `type:${type}`],
    email,
});
```

### Step 10: REPEAT — Loop Decision

```typescript
const decision = await client.ai.prompt({
    prompt: `Based on the action taken, decide: "continue" (next contact), "pause" (wait), "escalate" (human review), "new-loop" (different pipeline). Respond with the word and reason.`,
});
```

---

## Recipes Reference

| Recipe | Script | What It Does |
|---|---|---|
| Cold Outreach Sequence | `recipes/cold-outreach-sequence.ts` | 3-email sequence with timing and state |
| Meeting Prep Brief | `recipes/meeting-prep-brief.ts` | One-page brief with talking points |
| Product Usage Alert | `recipes/product-usage-alert.ts` | Monitors engagement, generates nudges |
| Health Check-In | `recipes/health-check-message.ts` | Assesses health, auto-escalates |
| Smart Notification | `recipes/smart-notification.ts` | Uniquely personalized via `smartDigest()` |
| Product Intelligence | `recipes/product-intelligence.ts` | Memorize everything: usage, ML, searches, content |
| Web Personalization | `recipes/web-personalization.ts` | AI generates UI variables per user |
| Batch Pipeline | `recipes/batch-pipeline.ts` | Configurable generic pipeline |

---

## Branching Pipelines

```
                    ┌─ high urgency ──→ SMS (Twilio)
DECIDE ─────────────┼─ medium ────────→ Email (SendGrid)
                    ├─ internal alert ─→ Slack
                    └─ low priority ──→ Queue for weekly digest

                    ┌─ new lead ──────→ Cold Outreach Sequence
PLAN ───────────────┼─ active deal ───→ Meeting Prep Brief
                    ├─ at-risk ───────→ Health Check-In
                    └─ champion ──────→ Referral Ask
```

---

## Scheduling

### package.json
```json
{ "scripts": { "build": "tsc", "pipeline": "node dist/pipeline.js", "pipeline:dev": "npx ts-node src/pipeline.ts" } }
```

### Cron
```bash
0 */4 * * * cd /path/to/project && node dist/pipeline.js >> pipeline.log 2>&1
```

### GitHub Actions
```yaml
on:
  schedule:
    - cron: "0 */4 * * *"
  workflow_dispatch: {}
jobs:
  pipeline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "18" }
      - run: npm ci && npm run build
      - run: node dist/pipeline.js
        env:
          PERSONIZE_SECRET_KEY: ${{ secrets.PERSONIZE_SECRET_KEY }}
          SENDGRID_API_KEY: ${{ secrets.SENDGRID_API_KEY }}
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## Rate Limits

```typescript
const { data: me } = await client.me();
const perMinute = me!.plan.limits.maxApiCallsPerMinute;
// Each record uses ~4-6 API calls
const recordsPerMinute = Math.floor(perMinute / 6);
const delayBetweenRecords = Math.ceil(60_000 / recordsPerMinute);
```

Always call `client.me()` first to get actual limits — the response includes `plan.limits.maxApiCallsPerMinute` and `plan.limits.maxApiCallsPerMonth`. Each record uses ~4-6 API calls, so divide per-minute limit by 6 for estimated records/min throughput.

---

## Complete Pipeline Template

Full runnable script combining all steps:

```typescript
import { Personize } from '@personize/sdk';
import 'dotenv/config';
import * as fs from 'fs';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
const STATE_FILE = '.pipeline-state.json';

interface PipelineState { lastRunAt: string; processedRecordIds: string[]; }

function loadState(): PipelineState {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); }
    catch { return { lastRunAt: '', processedRecordIds: [] }; }
}
function saveState(state: PipelineState) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function runPipeline() {
    const { data: me } = await client.me();
    if (!me) throw new Error('Auth failed');
    console.log(`Pipeline running for org ${me.organization.id}\n`);

    const state = loadState();

    // OBSERVE
    const exported = await client.memory.search({
        type: 'Contact', returnRecords: true, pageSize: 50,
        groups: [{ id: 'g1', logic: 'AND', conditions: [{ field: 'email', operator: 'IS_SET' }] }],
    });
    const records = exported.data?.records || {};
    const newRecords = Object.entries(records).filter(([id]) => !state.processedRecordIds.includes(id));

    if (newRecords.length === 0) {
        console.log('Nothing to process.');
        saveState({ ...state, lastRunAt: new Date().toISOString() });
        return;
    }

    for (const [recordId, properties] of newRecords) {
        const email = (properties as any).email?.value;
        if (!email) continue;

        try {
            // RECALL
            const contextParts: string[] = [];
            const vars = await client.ai.smartGuidelines({ message: 'personalized outreach' });
            if (vars.data?.compiledContext) contextParts.push('## Guidelines\n' + vars.data.compiledContext);
            const digest = await client.memory.smartDigest({ email, type: 'Contact', token_budget: 2000 });
            if (digest.data?.compiledContext) contextParts.push('## Contact\n' + digest.data.compiledContext);
            const context = contextParts.join('\n\n---\n\n');

            // REASON → PLAN → DECIDE → GENERATE
            const result = await client.ai.prompt({
                context,
                instructions: [
                    { prompt: 'Analyze: needs, past communications, gaps.', maxSteps: 3 },
                    { prompt: 'Plan: best action, angle, what to avoid.', maxSteps: 3 },
                    { prompt: 'Decide: channel, urgency, content type.', maxSteps: 2 },
                    { prompt: 'Generate: follow guidelines, reference facts, clear CTA.', maxSteps: 5 },
                ],
                evaluate: true,
                evaluationCriteria: 'References specific facts, follows guidelines.',
                metadata: { recordId },
            });

            // ACT — replace with actual delivery
            console.log(`[PREVIEW] ${email}: ${String(result.data).substring(0, 200)}...`);

            // UPDATE
            await client.memory.memorize({
                content: `Pipeline output for ${email}: ${String(result.data).substring(0, 500)}`,
                speaker: 'System: Content Pipeline',
                enhanced: true,
                tags: ['generated', 'pipeline-output'],
                email,
            });

            state.processedRecordIds.push(recordId);
        } catch (err: any) {
            if (err?.response?.status === 429) {
                const retryAfter = err.response.data?.retryAfterSeconds || 60;
                console.log(`Rate limited. Waiting ${retryAfter}s...`);
                await new Promise(r => setTimeout(r, retryAfter * 1000));
            } else {
                console.error(`Error processing ${email}:`, err.message);
            }
        }
        await new Promise(r => setTimeout(r, 2000));
    }

    saveState({ lastRunAt: new Date().toISOString(), processedRecordIds: state.processedRecordIds });
    console.log('\nPipeline complete.');
}

runPipeline().catch(err => { console.error('Fatal:', err.message || err); process.exit(1); });
```

---

## Per-Team Memorization Patterns

| Team | What They Memorize | What They Generate |
|---|---|---|
| **Sales** | CRM data, call notes, deal stages, objections | Outreach sequences, call scripts, proposals |
| **Product** | Feature usage, NPS, feature requests, bug reports | Onboarding nudges, feature tips, release notes |
| **Customer Success** | Health scores, tickets, renewal dates, churn signals | Check-in messages, QBR prep, escalation alerts |
| **Marketing** | Campaign engagement, downloads, webinar attendance | Personalized nurture emails, event invites |
| **Support** | Ticket history, resolution patterns, CSAT scores | Response templates, escalation summaries |

---

## Product Intelligence — Memorize Everything

Full code examples for memorizing each data category (feature usage, search queries, content consumption, user uploads, ML outputs, reports, telemetry) are in `recipes/product-intelligence.ts`.

Key patterns:
- **Feature usage** → narrative summary, not raw JSON
- **Search queries** → include developer interpretation of what "no results" means
- **Content consumption** → memorize the CONTENT ITSELF, not just the event
- **User uploads** → memorize summary or full content
- **ML outputs** → store prediction + explanation + key factors
- **Reports** → include interpretation alongside raw metrics
- **Telemetry** → aggregated health snapshots with interpretation
