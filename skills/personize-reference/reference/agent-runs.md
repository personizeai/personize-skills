# Agent Runs and Sweeps Reference

Durable agent runs (`/api/v1.1/agent/runs`) and sweeps, which run one agent run template over many records (`/api/v1.1/agent/sweeps`).

- **Managed cloud only.** Personize Private does not serve these routes or tools.
- **Own model key required (BYOK).** Without one: 403 `byok_required`.
- **Credits:** see `cheat-credit-costs.md` in `personize-agent-core`.

Contents: [Interfaces](#interfaces) · [Run request](#run-request) · [Run lifecycle](#run-lifecycle) · [Run errors](#run-errors) · [Sweeps](#sweeps) · [Sweep errors](#sweep-errors)

## Interfaces

| Operation | MCP tool | SDK (`client.agent`, 1.6.0) | CLI (1.7.0) | REST |
|---|---|---|---|---|
| Start a run | `agent_run` | `run(body)` | `agent-runs create` | `POST /api/v1.1/agent/runs` |
| Start from a `/prompt`-style body | -- | `runFromPrompt(body)` | `agent-runs create --body '{"format":"prompt",...}'` | same, with `format: "prompt"` |
| Read a run | `agent_run_get` | `get(runId)` | `agent-runs get <runId>` | `GET /api/v1.1/agent/runs/:runId` |
| Poll until finished | (call `agent_run_get` again) | `waitFor(runId, { timeoutMs?, intervalMs? })` | `create --follow [--timeout 600]` | poll `GET .../:runId` |
| List runs | -- | `list({ status?, outcome?, sweepId?, recordId?, limit?, cursor? })` | `agent-runs list [--all]` | `GET /api/v1.1/agent/runs` |
| Step events | `agent_run_get` with `includeEvents: true` | `events(runId, { after? })` | `agent-runs events <runId> [--after <seq>]` | `GET .../:runId/events` |
| Cancel a run | -- | `cancel(runId)` | `agent-runs cancel <runId>` | `POST .../:runId/cancel` |
| Sweep preview / launch / status / continue / cancel | `sweep_preview`, `sweep_launch`, `sweep_status`, `sweep_continue`, `sweep_cancel` | -- | -- | see [Sweeps](#sweeps) |
| Run on a timer | -- | -- | -- | `POST /api/v1.1/schedules` with `taskPayload.agentRun` |

MCP tools sit at the agent tier; read-only profiles do not list them. `agent_run` caps `wait` at 50 seconds. Scheduled runs need the v1.1 schedules route: `/api/v1/schedules` (which the `schedule_create` MCP tool calls) answers 400 `agent_run_requires_v1_1`, and the SDK schedule types have no `agentRun` field. A scheduled `agentRun` may not use `format: "prompt"`, inline tool headers or attachments.

## Run request

```jsonc
{
  "model": "anthropic/claude-sonnet-5-5",   // provider/model; default = the org's own-key generate model
  "instructions": "You are a B2B researcher...",
  "input": "Research this account and score fit.", // or [{ "role": "user"|"assistant", "content": "..." }]
  "tools": [{ "type": "mcp", "server_label": "crm", "server_url": "https://...", "headers": {} }], // max 5, https only
  "personize": {
    "record": { "email": "jane@acme.com", "create": false },  // exactly one of email | websiteUrl | recordId (+ entityType)
    "context": { "recordOverview": true, "graph": false, "governance": { "auto": true, "documentIds": [], "tags": [] } },
    "memoryTools": "read",            // off | read | read_write
    "webSearch": false,               // true, or { maxUsesPerStep 1-10, allowedDomains | blockedDomains (max 20 each) }
    "mcps": [],                       // ids of MCP servers registered in the org
    "outputs": [{ "name": "fit_score", "type": "number", "required": true }], // max 50; name [a-zA-Z0-9_-]{1,64}
    "save": { "properties": true, "summary": false },
    "limits": { "maxSteps": 50, "maxMinutes": 30, "maxWrites": 20 },
    "evaluate": { "rubric": "...", "passScore": 70, "maxRevisions": 1 },
    "wait": 0,                        // seconds to hold the request open, 0-240
    "webhook": true,
    "idempotencyKey": "acme-fit-2026-11"
  },
  "attachments": []                   // max 10
}
```

| Field | Default | Max |
|---|---|---|
| `limits.maxSteps` | 50 | 500 |
| `limits.maxMinutes` | 30 | 240 |
| `limits.maxWrites` | 20 | 500 |
| `wait` | 0 | 240 |
| `evaluate.maxRevisions` | 1 | 2 |
| `idempotencyKey` length | -- | 128 |

- `model` providers: `openai`, `anthropic`, `openrouter`, `google`, `deepseek`, `xai`, `bedrock`, `nvidia`.
- An output whose name matches a record property is saved to that record when the run ends with outcome `done`. If the name matches more than one property, the request fails with 400: pass `propertyId`.

## Run lifecycle

**Statuses:** `queued` → `running` → `completed` | `incomplete` | `failed` | `cancelled` (the last four are terminal).
**Outcome** (set by the agent): `done`, `skipped` or `needs_review`. `skipped` and `needs_review` save nothing.

| Response | Meaning |
|---|---|
| 202 `{ runId, status: "queued" }` | Accepted. With `wait > 0`, 202 also means it did not finish within `wait` |
| 200 full view | Finished within `wait`, **or an idempotent replay**: same `idempotencyKey` as an earlier run. A replay can still be `queued`/`running`, so always check `status` |

**Run view:** `runId`, `status`, `output.text`, `properties`, `sources`, `missingOutputs`, `outcome`, `evaluation`, `saved`, `usage` (`provider`, `model`, `inputTokens`, `outputTokens`, `steps`, `toolCalls`, `webSearchUses`), `timing` (`queuedAt`, `startedAt`, `completedAt`), plus `sweepId`, `ignoredFields` and `error` (failed runs) when present.

**Polling:** `GET .../:runId` until a terminal status. SDK `waitFor` polls every 2 s for up to 10 min and returns the last view on timeout (it does not throw).

**Events:** `GET .../:runId/events?after=<seq>` returns `{ events: [{ seq, type, at, data }] }`, `type` = `status` | `step` | `tool` | `limit` | `error`. Send `Accept: text/event-stream` for SSE; the stream closes after about 15 minutes, so reconnect with `?after=` or `Last-Event-ID`.

**List:** filters `status`, `outcome`, `sweepId`, `recordId`; `limit` 1-100 (default 20); `cursor` → `{ runs, nextCursor }`.

**Webhook events** (`webhook: true`): `agent.run.completed`, `agent.run.failed` (also cancelled runs), `agent.run.needs_review`.

## Run errors

| HTTP | Code | Do |
|---|---|---|
| 400 | `VALIDATION_ERROR` (with `issues`), `model_required`, `invalid_attachments` | Fix the body |
| 402 | `insufficient_credits` | Do not retry; add credits |
| 403 | `byok_required` | Add a model key in Settings → AI Providers |
| 404 | `run_not_found` | Check the runId (`run_` + 26 characters) |
| 409 | `idempotency_in_progress` (may carry `runId`) | A run with this key is still starting: repeat with the **same** key, or read the `runId` |
| 409 | `run_finished` / `cancel_conflict` | Cancel: already terminal / retry the cancel |
| 503 | `agent_runs_unavailable` | Retry later |

## Sweeps

Flow: **preview → launch (pilot) → review → continue**. One active sweep per organization.

| Step | REST | Body / notes |
|---|---|---|
| Preview | `POST /api/v1.1/agent/sweeps/preview` | Exactly one of `filter` (a retrieve filter; `filter.crmFilter.type` = entity type) or `query` (plain words, 1-2000 chars, + `entityType`, turned into a filter by the org's own model). Optional `model`, `updatedWithinDays`, `notUpdatedForDays` (1-3650). Returns `previewId`, `filter`, `count`, `overCap`, `cap` (10,000), `samples`, `estimate`, `expiresAt` (24 h). Nothing runs |
| Launch | `POST /api/v1.1/agent/sweeps` | `previewId`, `template` (a run request without `record`, `attachments`, `format`, `idempotencyKey`, or `wait > 0`), `rollout: { pilot 0-50 (10), autoContinue (false), concurrency 1-5 (5; at most 4 run at once) }`, `webhook` (true). 202 with the sweep. Launching the same preview again returns the existing sweep |
| Status | `GET /api/v1.1/agent/sweeps/:sweepId` | Progress, counts, usage; after the pilot, `pilot.projection` estimates the remaining cost and time |
| List | `GET /api/v1.1/agent/sweeps` | `status`, `limit` 1-100 (20), `cursor` |
| Continue | `POST .../:sweepId/continue` | Only from `awaiting_review` |
| Pause / resume | `POST .../:sweepId/pause`, `.../resume` | Pause from `pilot` or `running` |
| Cancel | `POST .../:sweepId/cancel` | No new runs start; live runs are cancelled. Repeating is safe |

**Statuses:** `pilot`, `awaiting_review`, `running`, `paused`, `cancelling`, `completed`, `cancelled`.

- A sweep pauses itself after 10 failures in a row, when credits run out, or when its credentials expire (`pausedReason`: `repeated_failures`, `insufficient_credits`, `credentials_expired`; `user` for a manual pause).
- A sweep left in `awaiting_review` or `paused` for 7 days is cancelled (`cancelReason: expired`).
- A failed record is retried once, except for errors that will not change (for example `record_not_found`, `insufficient_credits`, `byok_required`).
- Each record's run is a normal agent run: list them with `GET /api/v1.1/agent/runs?sweepId=...`.
- Webhook events: `agent.sweep.awaiting_review`, `agent.sweep.completed`.

## Sweep errors

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Bad body or template |
| 400 | `sweep_too_large` | Preview matched more than 10,000 records: narrow the filter |
| 400 | `sweep_empty` | No records match any more |
| 404 | `preview_not_found` / `sweep_not_found` | Unknown id |
| 409 | `count_changed` | More records match than at preview time: preview again |
| 409 | `sweep_active` (may carry `sweepId`) | The org already has an active sweep |
| 409 | `sweep_not_awaiting_review` / `sweep_not_pausable` / `sweep_not_paused` / `sweep_finished` | Wrong status for continue / pause / resume / cancel |
| 410 | `preview_expired` | Preview again |
| 503 | `agent_runs_unavailable` / `freeze_incomplete` | Retry later |
