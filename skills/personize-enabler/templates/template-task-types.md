# Example Task Types -- Reference Catalog

**Description:** 35 example task types showing the Typed Task Dispatch pattern in practice. Use these as-is for sales/GTM, or as inspiration to design task types for any vertical (healthcare, education, insurance, membership).

**Tags:** `workspace`, `dispatch`, `automation`, `batch`, `task-types`

---

## How to Use This

Each task type is a **contract** between the task creator and the task executor. Tasks live inside the `Pending Tasks` array on entity records. The `type` field in each task entry identifies which contract applies.

1. **Use directly** -- copy a task type for your use case
2. **Adapt** -- change the input/output fields for your domain (e.g., `enrich-contact` becomes `enrich-patient`)
3. **Create new** -- follow the same contract format for domain-specific tasks

## How Tasks Are Stored

Tasks are entries in the `Pending Tasks` array property on any record (contact, company, project):

```json
Pending Tasks: [
  { "taskId": "t_1", "type": "enrich-contact", "input": {"email":"john@acme.com","fields":["title"]},
    "priority": "P1", "status": "pending", "createdBy": "operator", "createdAt": "2026-04-11T09:00:00Z" },
  { "taskId": "t_2", "type": "write-email", "input": {"step":1,"angle":"roi"},
    "priority": "P2", "status": "pending", "depends": "t_1", "createdBy": "operator", "createdAt": "2026-04-11T09:00:00Z" }
]
```

## Contract Format

```
id:          kebab-case identifier (matches the "type" field in Pending Tasks entries)
requiresAI:  false = pipeline (0 credits, <1s) | true = ai.prompt
tier:        basic | pro | ultra (only if requiresAI)
credits:     estimated per execution
input:       required fields in the task entry's "input" object
output:      guaranteed result fields
after:       post-execution side effects
creates:     follow-up task type (if any)
```

---

## Sales -- Lead Management

| Task Type | AI? | Credits | Input | Output | After |
|---|---|---|---|---|---|
| `enrich-contact` | yes | ~3 | email, fields[] | title, company, industry, confidence | memory_update_properties contact, append Notes |
| `score-icp` | yes | ~3 | email, criteria | icp_score (1-5), reasoning, signals | update ICP Score, if >= 4 → MQL |
| `qualify-lead` | yes | ~4 | email, framework (BANT/MEDDIC) | qualified, scores, next_step | update stage, if qualified → creates `schedule-meeting` |
| `update-stage` | no | 0 | email, new_stage | previous_stage | update Campaign Stage, append Updates |
| `assign-sender` | no | 0 | email, channel, sender | sender, channel | update sender property, append Updates |

## Sales -- Outreach

| Task Type | AI? | Credits | Input | Output | After |
|---|---|---|---|---|---|
| `write-email` | yes | ~4 | email, campaign, step, angle, sender | subject, body, cta_type, word_count | store draft in Messages Sent |
| `send-email` | no | 0 | email, subject, body, sender | sent_at, message_id, status | append Messages Sent, update stage + count |
| `write-linkedin-message` | yes | ~3 | email, linkedin_url, message_type, angle | message, note (300 chars for connect) | store draft |
| `send-linkedin` | no | 0 | linkedin_url, message, sender, type | sent_at, status | append Messages Sent, update touch count |
| `schedule-meeting` | yes | ~3 | email, meeting_type, booking_link | reply_draft, suggested_times | update stage → Meeting Set |

## Sales -- Reply Handling

| Task Type | AI? | Credits | Input | Output | After |
|---|---|---|---|---|---|
| `classify-reply` | yes | ~2 | email, reply_text, campaign | classification, sentiment, next_action | update Reply Classification; creates: `schedule-meeting` (positive), `handle-opt-out` (unsubscribe), `reply-to-question` (question) |
| `reply-to-question` | yes | ~4 | email, question | reply_draft, references, needs_human | if needs_human → Open Issues, else draft |
| `handle-opt-out` | no | 0 | email, reason, channel | opted_out_at | set Opted Out=true, add to opt-out list, cancel pending tasks |

## Data -- Research & Enrichment

| Task Type | AI? | Credits | Input | Output | After |
|---|---|---|---|---|---|
| `research-company` | yes | ~5 | website_url, fields[] | summary, industry, headcount, funding, tech_stack, icp_fit | memory_update_properties company; if icp_fit → create enrich tasks for contacts |
| `find-contacts` | yes | ~5 | company, titles[], max_results | contacts[] (name, title, email, linkedin) | create `enrich-contact` per found contact |
| `detect-buying-signals` | yes | ~3 | website_url | signals[] (type, detail, strength) | append Buying Signals; if strong → create outreach task |
| `deduplicate-contacts` | no | ~1 | email, threshold | duplicates[], action (merge/review) | merge or create review task |
| `import-contacts` | no | ~1/contact | source, file_path, max_records | imported, skipped, errors | batch memorize, dedup, skip opt-outs |

## Campaign Management

| Task Type | AI? | Credits | Input | Output | After |
|---|---|---|---|---|---|
| `create-campaign` | yes | ~5 | name, target_audience, angle, channel, steps | campaign_slug, sequence, subject_lines | create workspace record, create child write-email tasks |
| `enroll-in-campaign` | no | 0 | email, campaign, step | enrolled_at, first_send | update Current Campaign, create write-email step 1 |
| `pause-campaign` | no | 0 | campaign, reason | paused_at, pending_cancelled | update status, cancel pending sends |
| `generate-report` | yes | ~5 | campaign, period | reply_rate, meetings_set, insights, recommendations | append to Reports |

## Content

| Task Type | AI? | Credits | Input | Output | After |
|---|---|---|---|---|---|
| `write-linkedin-post` | yes | ~4 | topic, tone, sender, max_words | post, hashtags, hook | store draft in Notes |
| `write-case-study-snippet` | yes | ~4 | company, problem, result | snippet, stat_line | store in Notes, tag for email use |
| `summarize-meeting` | yes | ~4 | email, transcript | summary, action_items, next_steps, sentiment | append Notes, create tasks for action items |

## Operations

| Task Type | AI? | Credits | Input | Output | After |
|---|---|---|---|---|---|
| `sync-crm` | no | 0 | email, crm, crm_id, direction, fields | synced_fields, conflicts | update properties, add CRM key |
| `check-sender-health` | no | ~1 | sender, channel | daily_sent, bounce_rate, health | if at_risk → pause, create alert |
| `rotate-sender` | no | 0 | campaign, channel | new_sender, reason, previous | reassign pending tasks |

## Support

| Task Type | AI? | Credits | Input | Output | After |
|---|---|---|---|---|---|
| `handle-bounce` | no | 0 | email, bounce_type, error_code | action (opt_out/retry/skip) | hard → opt out, soft → retry 48h |
| `handle-ooo` | yes | ~2 | email, ooo_text | return_date, delegate, action | reschedule follow-up, enrich delegate |
| `cleanup-stale-records` | no | ~1 | type, stale_days, action | stale_count, records | flag or archive stale records |

## Analysis

| Task Type | AI? | Credits | Input | Output | After |
|---|---|---|---|---|---|
| `analyze-campaign-performance` | yes | ~5 | campaign | best_angle, best_subject, recommendations | append Reports, store learnings as self-memory |
| `segment-audience` | yes | ~3 | criteria, min_score | segments[] (name, count, recommended_angle) | create campaign tasks per segment |
| `compare-ab-test` | yes | ~3 | campaign, variant_a, variant_b, metric | winner, confidence, recommendation | append Decisions, update campaign to winner |
| `weekly-digest` | yes | ~6 | period | summary, metrics, recommendations | append Reports, send notification |

---

## Adapting for Other Verticals

| GTM Task Type | Healthcare Equivalent | Education Equivalent | Insurance Equivalent |
|---|---|---|---|
| `enrich-contact` | `enrich-patient` | `enrich-student` | `enrich-policyholder` |
| `score-icp` | `assess-risk` | `assess-enrollment-readiness` | `score-renewal-likelihood` |
| `write-email` | `draft-follow-up` | `write-enrollment-email` | `draft-renewal-notice` |
| `classify-reply` | `triage-response` | `classify-inquiry` | `classify-claim-request` |
| `research-company` | `research-provider` | `research-institution` | `research-employer` |
| `create-campaign` | `create-care-plan` | `create-enrollment-drive` | `create-renewal-campaign` |
| `handle-opt-out` | `honor-consent-withdrawal` | `process-withdrawal` | `process-cancellation` |

The contract format stays the same. Only the nouns and domain-specific fields change.

---

## Cost Estimation

```
Total cost = (AI tasks × avg_credits_per_type) + (pipeline tasks × 0)

Example: 1,000 contacts through qualify → write-email → send-email
  qualify-lead:  1,000 × 4 credits = 4,000 credits (AI)
  write-email:   1,000 × 4 credits = 4,000 credits (AI)
  send-email:    1,000 × 0 credits = 0 credits (pipeline)
  Total: 8,000 credits, ~280 minutes at 30s/AI task
```
