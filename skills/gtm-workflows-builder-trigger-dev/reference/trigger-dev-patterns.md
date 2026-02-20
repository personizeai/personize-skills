# Trigger.dev Patterns for GTM Pipelines

Quick reference for Trigger.dev v4 patterns used in GTM pipelines.

---

## Task Definition

```typescript
import { task } from "@trigger.dev/sdk/v3";

export const myPipeline = task({
  id: "my-pipeline",              // unique, kebab-case
  retry: { maxAttempts: 3 },      // auto-retry on failure
  run: async (payload: MyType) => {
    // your logic
    return { status: "done" };
  },
});
```

## Scheduled Task (Cron)

```typescript
import { schedules } from "@trigger.dev/sdk/v3";

export const dailySync = schedules.task({
  id: "daily-sync",
  cron: "0 9 * * 1-5",   // 9am UTC, weekdays
  run: async () => {
    // runs on schedule
  },
});
```

## Durable Wait

```typescript
import { wait } from "@trigger.dev/sdk/v3";

// Inside a task's run function:
await wait.for({ days: 3 });      // survives restarts
await wait.for({ hours: 2 });
await wait.for({ minutes: 30 });
await wait.until({ date: new Date("2026-03-01") });
```

**Key**: During `wait`, the container is checkpointed and torn down. You are NOT billed for compute during wait time. The process resumes from the exact line of code.

## Self-Scheduling (Delayed Trigger)

```typescript
// From inside one task, schedule another with a delay
await followUpTask.trigger(
  { email: "lead@company.com", attempt: 2 },
  { delay: "3d" }   // triggers in 3 days
);

// Or use specific time formats:
{ delay: "30m" }    // 30 minutes
{ delay: "2h" }     // 2 hours
{ delay: "7d" }     // 7 days
```

## Child Tasks

```typescript
// Fire-and-forget (non-blocking)
const handle = await enrichTask.trigger({ email: "..." });

// Block until child completes
const result = await enrichTask.triggerAndWait({ email: "..." });
if (result.ok) {
  console.log(result.output);
}
```

## Batch Triggering

```typescript
// Process items in parallel
const results = await enrichTask.batchTriggerAndWait(
  contacts.map(c => ({ payload: { email: c.email } }))
);

for (const run of results.runs) {
  if (run.ok) console.log(run.output);
}
```

## Concurrency Control

```typescript
export const slowApiTask = task({
  id: "slow-api",
  queue: {
    concurrencyLimit: 5,  // max 5 concurrent runs
  },
  run: async (payload) => { /* ... */ },
});

// Per-entity queuing (one at a time per customer):
await myTask.trigger(payload, {
  concurrencyKey: `customer-${customerId}`,
});
```

## Idempotency

```typescript
// Prevent duplicate processing
await myTask.trigger(payload, {
  idempotencyKey: `lead-${email}-${Date.now()}`,
});
```

## Error Handling

```typescript
export const robustTask = task({
  id: "robust-task",
  retry: {
    maxAttempts: 5,
    factor: 2,                // exponential backoff
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 60000,
  },
  onFailure: async ({ payload, error }) => {
    // Called after ALL retries exhausted
    await notifySlack("errors", `Task failed: ${error.message}`);
  },
  onSuccess: async ({ payload, output }) => {
    // Called on successful completion
  },
  run: async (payload) => {
    // If this throws, it retries automatically
  },
});
```

## Metadata and Tags

```typescript
await myTask.trigger(payload, {
  tags: ["outbound", "sequence-step-1"],
  metadata: { leadSource: "hubspot", campaign: "q1-2026" },
});
```

## Environment Variables

All `process.env` values are available in Trigger.dev tasks. Set them in:
- `.env` file for local dev
- Trigger.dev dashboard > Project > Environment Variables for production
- CI/CD pipeline for automated deploys
