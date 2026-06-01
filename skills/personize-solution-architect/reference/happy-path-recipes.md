# Happy-Path Recipes — End-to-End Sequences

Each recipe is a complete runnable sequence for a common "I want to do X" goal. Copy the call sequence; substitute your own values; you'll have a working flow in under five steps.

Recipes here are deliberately the **golden path** — no edge cases, no error handling, no branching. Once the golden path works, add governance and edge cases per the rest of the cookbook.

> **MCP tool names** are the source of truth. CLI flags shown for parity; see [CLI parity](../../personize-reference/reference/cli-parity.md) in the reference skill.

---

## Recipe 1 — First-org setup

**Goal:** stand up a new org and verify orientation works.

| Step | Call | Args |
|---|---|---|
| 1 | `personize_md` | `{ detail: 'first-visit' }` — get org identity, profile, collections, manifest |
| 2 | `list_organizations` | `{}` — confirm the org appears |
| 3 | `select_organization` | `{ organizationId: '<from step 2>' }` |
| 4 | `personize_md` | `{ detail: 'returning' }` — confirm orientation now scoped to the selected org |

**Done when:** step 4 returns a manifest with at least one collection or a "no records yet" banner. You are oriented.

**Next:** Recipe 2 (first record) or Recipe 4 (first guideline).

---

## Recipe 2 — First record (memory + properties)

**Goal:** save a fact about a person and retrieve it back.

| Step | Call | Args |
|---|---|---|
| 1 | `memory_save` | `{ email: 'sarah@acme-corp.io', content: 'Sarah Chen is the CTO of Acme Corp. Based in SF. Prefers Slack.' }` |
| 2 | `memory_retrieve` | `{ email: 'sarah@acme-corp.io' }` |
| 3 | `memory_get_properties` | `{ email: 'sarah@acme-corp.io' }` |

**Done when:** step 2 returns the saved memory; step 3 returns extracted properties (role, company, city, channel-preference).

**Watch for:** if step 3 returns zero properties, extraction is async — wait 5-10 seconds and retry. If still empty, see [memory-extraction troubleshooting](./schema-design-guide.md#extraction).

---

## Recipe 3 — First pipeline (bulk memorize)

**Goal:** load 50+ records from a CSV/JSON in one go, with rate-limit-safe batching.

| Step | Call | Args |
|---|---|---|
| 1 | `personize_cookbook` | `{ query: 'bulk import 50 records' }` — get the proven recipe for your scale |
| 2 | `memory_batch_validate` | `{ items: [{email, content}, ...] }` — dry run, catches schema issues |
| 3 | `memory_batch_store` | `{ items: [{email, content}, ...] }` — actual write, async per item |

**Done when:** step 3 returns a job ID. Poll status via the returned URL (or list `memory_retrieve` on a sample after ~30s).

**Why this beats hand-looping:** 50 sequential `memory_save` calls = 50 turns × tool-menu tax + 50 rate-limit slots. Batch = one turn, one queue.

---

## Recipe 4 — First guideline (governance)

**Goal:** save an org-wide policy that future agents must follow, and verify they fetch it.

| Step | Call | Args |
|---|---|---|
| 1 | `context_save` | `{ type: 'guideline', name: 'healthcare-prospect-handling', content: 'When prospect is in healthcare: confirm HIPAA BAA before sending samples. Never include PHI in emails.' }` |
| 2 | `context_retrieve` | `{ query: 'healthcare prospect policy' }` — confirm it surfaces |
| 3 | `context_manage_list` | `{ type: 'guideline' }` — confirm it appears in the index |

**Done when:** step 2 returns the saved guideline content. Future agent turns asking about "our healthcare policy" will hit it via `context_retrieve`.

**Watch for:** if step 2 returns a low-confidence result, the embedding hasn't indexed yet. Wait 10-15 seconds and retry.

---

## Recipe 5 — First end-to-end agent flow (RGAS in 4 turns)

**Goal:** the canonical "recall + govern + act + store" loop on a single record.

| Turn | Call | Purpose |
|---|---|---|
| 1 | `memory_retrieve({ email: 'sarah@acme-corp.io' })` | **Recall** — what does the org know? |
| 2 | `context_retrieve({ query: 'outreach to a CTO in saas' })` | **Govern** — what guidelines apply? |
| 3 | *(agent drafts an email locally, no tool call)* | **Act** — produce the output |
| 4 | `memory_save({ email: 'sarah@acme-corp.io', content: 'Sent outreach email <date>. Pitched <topic>. Awaiting reply.' })` | **Store** — log what happened |

**Done when:** a subsequent `memory_retrieve` shows the new "sent outreach" memory alongside the original CTO facts.

**Why all four turns matter:** skipping step 1 = hallucinated facts. Skipping step 2 = off-brand or non-compliant output. Skipping step 4 = the next agent has no memory of this turn.

---

## Recipe 6 — Re-orient after long workflow (avoid context drift)

**Goal:** an agent that has been running for 10+ turns wants to confirm what it's working on without re-fetching everything.

| Step | Call | Args |
|---|---|---|
| 1 | `personize_md` | `{ detail: 'session' }` — returns recent tool calls + key args from this session |
| 2 | *(agent inspects the brief; decides what to re-fetch)* | |
| 3a | `memory_retrieve` | for the record the brief reminds it of |
| 3b | `context_retrieve` | for the guidelines the brief lists |

**Done when:** the agent re-anchors without re-asking the user "what were we working on?"

**Watch for:** if `detail: 'session'` returns empty, the session has been compacted server-side or you're on a fresh container. Fall back to `detail: 'returning'`.

---

## Common pitfalls

- **Don't loop `memory_save` 50 times.** Use Recipe 3 (batch).
- **Don't `memory_retrieve` before you have a key.** If you only have a name, start with `memory_search` and grab the recordId/email from the hit.
- **Don't `context_retrieve` for facts about a record.** Guidelines are how-to-act; records are who-the-entity-is. Pick the right tool.
- **Don't skip `personize_md` on session 1.** It sets the manifest and tool-routing rules in the agent's working context.

## Where to go next

- **Scale operations (1000+ records):** `personize_cookbook` → matches the recipe to your scale tier.
- **Custom entity types:** [schema-design-guide.md](./schema-design-guide.md).
- **Industry-specific patterns:** see `industry-*.md` files in this folder.
- **Production hardening:** [production-patterns.md](./production-patterns.md).
