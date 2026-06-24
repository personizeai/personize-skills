# Personize Schedules — Reference

> **API surface:** Schedules currently live on **`/api/v1/schedules`** only — v1.1 does not yet expose a schedules surface (`src/modules/api/api.v1_1.router.ts` has no `schedules` mount). The v1 path continues to be the canonical surface until v1.1 catches up; the `/api/v1/*` deprecation sunset (2026-07-15) does **not** apply to schedules.
>
> **Tested against:** `@personize/sdk@0.12.0` (`client.schedules.{create,list,get,update,delete,executions}`) and `@personize/cli@0.5.0`. `ListSchedulesResponse` shape: `{ success, data: ScheduleRecord[], nextToken?, filtered?, rawCount? }`.

Automate **`/api/v1/prompt`** calls and notifications on a cron, rate, or one-time schedule. Each scheduled fire runs the same prompt path a user would hit directly — including governed-memory retrieval, MCPs, outputs, auto-memorize, evaluation, BYOK, and destination dispatch on `prompt.completed`.

> **Mental model**: a schedule is "do this `/api/v1/prompt` body at this time, on repeat or once." The result flows out via your wired destinations (webhook, S3) — schedules don't return results synchronously.

---

## When To Use

| User says | What to schedule |
|---|---|
| "Every Monday at 9am, summarize this account" | recurring `run_prompt`, `cron(0 9 ? * MON *)`, `memorize.recordId` set |
| "Remind me in 7 days to follow up with John" | one-time `send_notification`, `runAt` 7d from now |
| "Every 4 hours, refresh this lead's enrichment" | recurring `run_prompt`, `rate(4 hours)` |
| "Cancel all schedules for this contact" | `schedule_list` with recordId filter → `schedule_delete` each |
| "What's running for record rec_xyz?" | `schedule_list` with `recordId=rec_xyz` |

## When NOT To Use

- One-off prompts the user wants results from **right now** → call `/api/v1/prompt` directly.
- Long-running batch jobs over thousands of records → use bulk recipes from `personize-code`, not 1000 schedules.
- Triggering on data events (e.g. "when a new contact lands, score it") → use a **destination + EventBridge rule**, not a polling schedule.

---

## Two Interfaces — Same Behavior

| Interface | Methods |
|---|---|
| **SDK** | `client.schedules.create({...})`, `.list({recordId})`, `.get(id)`, `.update(id, patch)`, `.delete(id)`, `.executions(id)` |
| **MCP** | `schedule_create`, `schedule_list`, `schedule_get`, `schedule_update`, `schedule_delete`, `schedule_executions` |
| **REST** | `POST/GET/PATCH/DELETE /api/v1/schedules[:id]` |

---

## Anatomy of a `run_prompt` Schedule

The `taskPayload` for `run_prompt` mirrors the **entire `/api/v1/prompt` request body**. Anything that works there works here:

```ts
await client.schedules.create({
  name: 'daily-followup-john',           // kebab-case unique within org
  description: 'Draft a follow-up email for John each morning',
  taskType: 'run_prompt',
  taskPayload: {
    prompt: 'Draft a 2-line follow-up email for this contact.',
    tier: 'pro',
    memorize: { recordId: 'rec_abc', type: 'Contact' },  // ← governs recall + auto-memorize
    governedMemory: true,
    outputs: [{ name: 'email_body', required: true }],
    mcps: ['gmail-int-1'],                                // optional org MCPs
    webSearch: true,                                       // optional
  },
  recurring: true,
  pattern: 'rate(1 day)',                  // or 'cron(0 9 ? * MON-FRI *)'
  timezone: 'UTC',
});
```

The fire publishes to EventBridge as `prompt.completed` — wire a destination (webhook, S3) to receive the result. There is **no synchronous return** of the LLM output from the schedule.

## Anatomy of a `send_notification` Schedule

```ts
await client.schedules.create({
  name: 'remind-john-tuesday',
  description: 'Tuesday morning reminder',
  taskType: 'send_notification',
  taskPayload: {
    contentMode: 'static',
    title: 'Follow up with John',
    body: 'You said you would email him by today.',
    recipientUserId: 'user-1',
    channels: ['IN_APP', 'EMAIL'],
    priority: 'MEDIUM',
  },
  recurring: false,
  runAt: '2026-05-26T13:00:00Z',
  timezone: 'UTC',
});
```

For AI-generated content, use `contentMode: 'smart'` + `topic: 'weekly engagement summary'` — the smart path calls a tiny LLM at delivery time.

---

## Filters That Matter

`schedule_list` supports these query filters out of the box:

| Filter | Matches |
|---|---|
| `recordId=rec_abc` | `taskPayload.recordId`, `taskPayload.memorize.recordId`, `taskPayload.metadata.recordId` |
| `email=a@b.com` | `taskPayload.email`, `taskPayload.memorize.email` |
| `websiteUrl=https://b.com` | `taskPayload.websiteUrl`, `taskPayload.memorize.websiteUrl` |
| `taskType=run_prompt` | `run_prompt` or `send_notification` |

Use these to answer **"what's running for this contact?"** in one call instead of scanning the org's whole list.

---

## Recurrence Patterns (cheat sheet)

- `rate(N minutes|hours|days|weeks)` — fixed interval
- `cron(MIN HOUR DOM MON DOW YEAR)` — AWS-flavored 6-field cron
- Shorthand: `1D`, `2H`, `30M`
- One-time: omit `pattern`, set `runAt` to ISO8601 UTC

---

## Guardrails (server-enforced, expect them)

| Code | Status | When it fires |
|---|---|---|
| `SCHEDULE_CAP_EXCEEDED` | 429 | Org is at `plan.limits.maxActiveSchedules`. Delete unused schedules or upgrade. |
| `RECORD_CAP_EXCEEDED` | 429 | Too many schedules already target this `recordId` for the plan. |
| `INSUFFICIENT_CREDITS` | 402 | Recurring schedule can't be funded for the next 7 days at ~5 credits/fire. Top up. |
| `DUPLICATE_NAME` | 409 | Schedule name already exists in this org. Names are unique per-org. |

Recurring `rate(...)` schedules with no user-supplied `startDate` get **±60s jitter** auto-applied, so 10,000 "every hour" schedules don't all fire at the same second.

---

## Recipes

### Per-record automation (most common)

```ts
// "Every Tuesday at 8am, draft a check-in email for this contact"
await client.schedules.create({
  name: `weekly-checkin-${recordId}`,
  taskType: 'run_prompt',
  taskPayload: {
    prompt: 'Draft a friendly check-in email based on the latest activity.',
    memorize: { recordId, type: 'Contact' },
    governedMemory: true,
    outputs: [{ name: 'subject' }, { name: 'body', required: true }],
  },
  recurring: true,
  pattern: 'cron(0 8 ? * TUE *)',
});
```

### Audit / list everything

```ts
let nextToken: string | undefined;
const all = [];
do {
  const page = await client.schedules.list({ limit: 200, nextToken });
  all.push(...page.data);
  nextToken = page.nextToken;
} while (nextToken);
```

### Bulk cancel for a record

```ts
const { data } = await client.schedules.list({ recordId });
await Promise.all(data.map(s => client.schedules.delete(s.id)));
```

### Pause without deleting

```ts
await client.schedules.update(scheduleId, { enabled: false });
// Resume:
await client.schedules.update(scheduleId, { enabled: true });
```

---

## Common Gotchas

- **No raw BYOK API keys in taskPayload.** Schedules use the org's saved BYOK vault key (Settings → AI Providers). Putting `apiKey`/`openrouterApiKey` inline gets rejected.
- **Names are kebab-case.** `daily-checkin-foo`, not `DailyCheckin foo`.
- **Recurring needs `pattern`, one-time needs `runAt`** — never both, schema rejects.
- **Result delivery is async.** Wire a destination if you want results, or poll `schedule_executions` for the latest run's status.
- **`PATCH taskPayload` is a full replacement of that field**, validated against the schedule's existing taskType. Patch fewer fields if you only want to change one.
