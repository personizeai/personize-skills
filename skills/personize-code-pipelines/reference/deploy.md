# Reference: Deployment, Monitoring & Iteration

Complete guide for deploying pipelines to production, setting up monitoring, verifying they work, and iterating based on feedback.

---

## Prerequisites

Before deploying, ensure:

1. **Trigger.dev account** — Sign up at [trigger.dev](https://trigger.dev). Free tier includes 50,000 runs/month.
2. **Personize API key** — `sk_live_...` from [app.personize.ai](https://app.personize.ai) → Settings → API Keys
3. **Node.js 20+** — `node --version` to verify
4. **Project initialized** — scaffold copied, dependencies installed, `.env` configured

---

## Step 1: Local Development

### Initialize Trigger.dev in the project

```bash
# First time only — connects your project to Trigger.dev
npx trigger.dev@latest init
```

This creates `trigger.config.ts` in your project root (the scaffold already includes one).

### Start dev mode

```bash
npx trigger.dev@latest dev
```

This connects to Trigger.dev cloud and registers your tasks. You'll see them in the Trigger.dev dashboard.

### Test a task manually

**Option A: Trigger.dev Dashboard**
1. Open dashboard → your project → Tasks
2. Find the task → click "Test"
3. Paste a test payload (JSON)
4. Click "Run" → watch logs in real-time

**Option B: CLI trigger**
```bash
# From another terminal while dev is running
npx trigger.dev@latest trigger <task-id> --payload '{"email": "test@example.com"}'
```

**Option C: Programmatic trigger (for webhook/API integration)**
```typescript
import { myTask } from './src/trigger/my-task';
await myTask.trigger({ email: 'test@example.com' });
```

### Verify it works

Check three things:
1. **Trigger.dev dashboard** — task ran successfully, no errors in logs
2. **Personize dashboard** — data was memorized (check Records → find by email)
3. **Delivery channel** — email sent, Slack message posted, CRM updated

---

## Step 2: Environment Variables

### Required for all pipelines

```bash
PERSONIZE_SECRET_KEY=sk_live_...    # Personize API key
TRIGGER_SECRET_KEY=tr_dev_...       # Trigger.dev project API key (use tr_prod_... for production)
```

### Per-integration (only set what you use)

```bash
# CRM
HUBSPOT_ACCESS_TOKEN=pat-...        # HubSpot private app token
SALESFORCE_USERNAME=user@company.com
SALESFORCE_PASSWORD=...
SALESFORCE_SECURITY_TOKEN=...

# Email
GMAIL_SERVICE_ACCOUNT_KEY='{...}'   # Google service account JSON (stringified)
GMAIL_DELEGATED_USER=sender@company.com
SENDGRID_API_KEY=SG....

# Enrichment
APOLLO_API_KEY=...
TAVILY_API_KEY=tvly-...
EXA_API_KEY=...

# Notifications
SLACK_BOT_TOKEN=xoxb-...
SLACK_ALERT_CHANNEL=C0123456789     # Channel ID for alerts
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...
```

### Setting env vars in Trigger.dev

For production, set env vars in the Trigger.dev dashboard (not `.env`):

1. Dashboard → your project → Environment Variables
2. Add each variable for the **Production** environment
3. Variables are encrypted at rest and injected at runtime

---

## Step 3: Production Deployment

```bash
npx trigger.dev@latest deploy
```

This:
- Bundles your TypeScript code
- Uploads to Trigger.dev cloud
- Registers all tasks and schedules
- Uses **production** environment variables

### Verify deployment

```bash
# List deployed tasks
npx trigger.dev@latest list
```

Or check the Trigger.dev dashboard → Deployments → latest deployment shows all registered tasks.

### Scheduled tasks

Scheduled tasks (cron) start running automatically after deployment. Verify:

1. Dashboard → Schedules → confirm your cron expressions are registered
2. Wait for the first execution → check logs
3. Common cron patterns:
   - `0 8 * * 1-5` — 8 AM UTC weekdays (morning lead review)
   - `0 17 * * 1-5` — 5 PM UTC weekdays (daily digest)
   - `0 */6 * * *` — every 6 hours (account monitoring)
   - `0 9 * * 1` — 9 AM UTC Mondays (weekly report)

---

## Step 4: Monitoring

### Built-in monitoring (Trigger.dev dashboard)

- **Runs** — see every execution, status, duration, logs
- **Errors** — failed runs with full stack traces
- **Schedules** — upcoming scheduled executions
- **Metrics** — run counts, success rates, average duration

### Personize-side monitoring

Check that memory is accumulating:

```typescript
// Verify records exist
const me = await client.me();
console.log('Plan:', me.data.plan.name);
console.log('API calls this month:', me.data.usage?.apiCalls);

// Search for recently memorized data
const recent = await client.memory.search({
    type: 'Contact',
    filters: { conditions: [{ property: 'lifecycle_stage', operator: 'IS_SET' }] },
});
console.log('Records with lifecycle_stage:', recent.data?.totalMatched);
```

### Add a daily digest pipeline

Every production deployment should include a daily digest. Copy `pipelines/signals/daily-digest.ts` and customize:

```typescript
// Add to your project — this pipeline reports what happened today
// Scheduled at 5 PM UTC weekdays
// Posts to Slack with: new leads processed, emails sent, replies received, errors
```

This gives the user a daily report without them checking dashboards.

### Slack error alerts

Add error notifications to catch failures immediately:

```typescript
import { task } from '@trigger.dev/sdk/v3';

export const myPipeline = task({
    id: 'my-pipeline',
    retry: { maxAttempts: 3 },
    onFailure: async (payload, error, params) => {
        // Post failure alert to Slack
        await fetch(process.env.SLACK_WEBHOOK_URL!, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: `⚠️ Pipeline failed: ${params.ctx.task.id}\nError: ${error.message}\nRun: ${params.ctx.run.id}`,
            }),
        });
    },
    run: async (payload) => {
        // ... pipeline logic
    },
});
```

---

## Step 5: Iteration Workflow

### How to update a running pipeline

1. **Make code changes** locally
2. **Test** with `npx trigger.dev@latest dev`
3. **Deploy** with `npx trigger.dev@latest deploy`
4. New deployment immediately replaces the old one — no downtime, in-flight runs complete on the old version

### Common iteration scenarios

#### "The emails are too formal / too casual"

Don't change code. Update the governance variable:

```typescript
await client.guidelines.update({
    id: existingGuidelineId,
    content: 'Updated tone: more casual, use contractions, shorter sentences. Still professional — just warmer.',
});
```

Redeploy is NOT needed — the pipeline calls `smartGuidelines()` at runtime, so it picks up the new rules immediately.

#### "It's missing context about the lead"

Add more data sources to the memorization step, or increase `token_budget` on `smartDigest()`:

```typescript
// Before: limited context
const digest = await client.memory.smartDigest({ email, type: 'Contact', token_budget: 1500 });

// After: richer context
const digest = await client.memory.smartDigest({
    email, type: 'Contact', token_budget: 3000,
    include_properties: true, include_memories: true,
});
```

#### "I want to add a new step"

Add a new step to the pipeline's `instructions[]` or add a new task in the pipeline chain:

```typescript
// Add a qualification step before outreach
instructions: [
    { prompt: 'Qualify this lead: ICP fit, engagement level, timing signals. Score 1-100.', maxSteps: 3 },
    { prompt: 'If score > 60: write personalized email. If <= 60: output SKIP.', maxSteps: 5 },
],
```

#### "I want to change the schedule"

Update the cron expression and redeploy:

```typescript
export const myScheduledTask = schedules.task({
    id: 'my-scheduled-task',
    cron: '0 9 * * 1-5',  // Changed from 8 AM to 9 AM
    run: async () => { /* ... */ },
});
```

Then `npx trigger.dev@latest deploy`.

#### "It's too expensive"

Reduce costs by:
- Using `mode: 'fast'` on `smartRecall()` (~50% faster, slightly less thorough)
- Reducing `token_budget` on `smartDigest()` (less context but cheaper)
- Using `mode: 'fast'` on `smartGuidelines()` (~200ms vs ~3s)
- Batching operations where possible
- Reducing enrichment calls (cache in memory, don't re-enrich)

---

## Step 6: Scaling

### Rate limits

Always read your actual limits:

```typescript
const me = await client.me();
const maxPerMinute = me.data.plan.limits.maxApiCallsPerMinute;
// Each lead uses ~4-6 API calls, so: maxPerMinute / 6 = leads per minute
```

Add rate limiting in batch pipelines:

```typescript
for (const lead of leads) {
    await processLead(lead);
    await wait.for({ seconds: 2 }); // Stay within rate limits
}
```

### Concurrency control

Trigger.dev supports concurrency limits to prevent overwhelming APIs:

```typescript
export const myTask = task({
    id: 'process-lead',
    queue: { concurrencyLimit: 5 }, // Max 5 concurrent executions
    run: async (payload) => { /* ... */ },
});
```

### Idempotency

Prevent duplicate processing:

```typescript
// Use a unique key per lead per day
await myTask.trigger(payload, {
    idempotencyKey: `lead-${email}-${new Date().toISOString().slice(0, 10)}`,
});
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Task not appearing in dashboard | `trigger.config.ts` doesn't include the file | Add file path to `triggerDirectories` in config |
| "Unauthorized" from Personize | Wrong or expired API key | Check `PERSONIZE_SECRET_KEY` in env vars |
| Scheduled task not firing | Cron only runs after deploy (not in dev mode) | Deploy to production, or trigger manually in dev |
| "Rate limit exceeded" | Too many API calls per minute | Add `wait.for()` between calls, reduce batch size |
| Gmail "unauthorized" | Service account not delegated | Enable domain-wide delegation in Google Admin |
| Memorized data not appearing | Eventual consistency (~5 min) | Wait, then check. Or use `recall()` instead of `search()` |
| Pipeline runs but no email sent | SendGrid/Gmail credentials wrong | Test delivery separately before integrating |
| "Task timed out" | Run exceeded 5 min (free tier) | Break into child tasks or upgrade Trigger.dev plan |
