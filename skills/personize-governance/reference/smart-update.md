# SMART UPDATE -- AI-Powered Governance & Schema Evolution

## When to Use

Use SMART UPDATE when the admin has **raw unstructured material** and wants AI to figure out what guidelines or collections need to change. This is the "just handle it" action -- the admin provides the "what" and the AI handles the "where" and "how."

**Choose SMART UPDATE over manual UPDATE when:**
- The admin pastes a doc, email, or notes and says "incorporate this"
- Multiple guidelines or collections might need changes
- The admin doesn't know which sections to target
- You want conflict detection before writing
- Processing batch feedback, post-mortems, or policy docs

**Choose manual UPDATE when:**
- The admin knows exactly which section to edit → `context_manage_update`
- The change is a simple word/phrase replacement → `context_manage_update` (section mode)
- Only one guideline needs a targeted fix → `context_manage_update`
- Creating a new doc with explicit name/tags/type (no AI routing needed) → `context_manage_create`

---

## SDK and MCP

| Interface | Method |
|---|---|
| **SDK** | `client.context.save({ type, instruction, material, strategy?, targetIds?, aiExtraction?, tier?, pipelinePreset?, agentDocType? })` |
| **MCP** | `context_save(type, instruction, material, strategy?, target_ids?, ai_extraction?, tier?, pipeline_preset?, agent_doc_type?)` |

### Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `type` | `'guideline' \| 'collection' \| 'agentdoc'` | Yes | -- | What to update |
| `instruction` | `string` | Yes | -- | What to do with the material |
| `material` | `string` | Yes | -- | Raw content (max 800K chars) |
| `strategy` | `'suggest' \| 'safe' \| 'force'` | No | `'suggest'` | Execution strategy |
| `targetIds` | `string[]` | No | -- | Specific IDs to target |
| `aiExtraction` | `boolean` | No | `true` | AI mode (true) or Direct mode (false) |
| `tier` | `'basic' \| 'pro' \| 'ultra'` | No | `'pro'` | Intelligence tier (AI mode only) |
| `pipelinePreset` | `'fast' \| 'standard' \| 'thorough'` | No | `'standard'` | Pipeline depth (AI mode only) |
| `agentDocType` | `'guideline' \| 'playbook' \| 'reference' \| 'template' \| 'brief'` | No | `'guideline'` | Doc subtype (when type='agentdoc') |

### Strategies

| Strategy | What it does | When to use |
|---|---|---|
| `suggest` | Returns plan only, writes nothing | Default. Review before applying. |
| `safe` | Applies non-conflicting items, skips conflicts | When you trust the AI but want to protect existing content. |
| `force` | Applies everything including overrides | When you've reviewed the plan and want all changes. |

### Direct Mode (aiExtraction=false)

When `aiExtraction` is set to `false`, the material is saved directly without AI processing. This is useful for:
- Importing pre-structured content that doesn't need AI analysis
- Bulk loading guidelines from an existing knowledge base
- Cost-sensitive operations (Direct mode costs 0 credits)

```typescript
const result = await client.context.save({
    type: 'guideline',
    instruction: 'Save this pre-formatted policy as-is',
    material: preFormattedContent,
    aiExtraction: false,
    strategy: 'force',
});
```

### Pipeline Presets (AI Mode)

When `aiExtraction` is `true` (default), the `pipelinePreset` controls how deep the AI analysis goes:

| Preset | Steps | Latency | When to use |
|---|---|---|---|
| `fast` | Extract only, no verification | ~5s | Quick imports, trusted material |
| `standard` | Expand + verify + conflict detection | ~15s | Default. Balanced quality and speed. |
| `thorough` | All steps + cross-encoder reranking | ~30s | Critical policies, compliance docs, high-stakes content |

---

## SMART UPDATE -- Full Workflow

### For Guidelines

**When:** Admin provides raw material (policy doc, meeting notes, feedback batch, competitor analysis, post-mortem) and wants guidelines updated.

1. Confirm the admin's intent: "You want me to analyze this material and propose changes to your guidelines?"
2. Call `context.save` with `strategy: 'suggest'` to get the plan first:

```typescript
const plan = await client.context.save({
    type: 'guideline',
    instruction: 'Update our sales guidelines with this post-mortem',
    material: adminProvidedContent,
    strategy: 'suggest',
});
```

3. Present the plan to the admin clearly:
   - For each item: show action, target, reasoning, and before/after preview
   - Highlight any conflicts (items with `hasConflict: true`)
   - Show the summary

4. Ask the admin which items to apply:
   - If all look good: re-call with `strategy: 'safe'` or `strategy: 'force'`
   - If only some look good: use the standard `client.guidelines.update()` to apply specific items manually
   - If none look good: iterate on the instruction

5. After applying, verify with `client.ai.smartGuidelines()` that changes are retrievable

### For Collections

**When:** Admin provides data samples, CRM exports, or extraction gap reports and wants collection schemas updated.

1. Same flow as guidelines, but with `type: 'collection'`
2. Pay special attention to conflict items -- these flag **duplicate properties** across collections (e.g., `job_title` already exists when trying to add `position`)
3. For collection creates, review the `createMetadata` (collectionName, entityType) and property types

```typescript
const plan = await client.context.save({
    type: 'collection',
    instruction: 'Make sure we can capture all data from these LinkedIn profiles',
    material: linkedInProfileSamples,
    strategy: 'suggest',
});
```

---

## Real-World Use Cases

### 1. Incorporate a New Policy

Admin pastes a legal document. Smart-update finds the right section and flags the conflict with existing rules.

```
Admin: "Legal just approved our new refund policy. Update the customer service guidelines."
[pastes refund policy]

You: Let me analyze this against your existing guidelines.
[calls context.save with strategy: 'suggest']

Result: 1 item -- update_section on ## Refunds in customer-service-playbook.
Conflict flagged: existing says "14 days, no exceptions", new policy says "30 days full refund."

You: I found one change needed. The Refunds section in your customer service playbook needs updating.
There's a conflict: your current policy says 14 days, the new one says 30 days.
Here's the proposed replacement: [show preview.after]
Should I apply this?
```

### 2. Learn from a Post-Mortem

Feed a post-mortem and smart-update creates new procedure sections + updates existing pricing info.

```
Admin: "We lost the Acme deal because our agent quoted wrong pricing. Here's the post-mortem."

Result: 2 items:
  - append_section: new ## Quoting Procedure with CRM tier check mandate
  - update_section: ## Pricing updated to distinguish standard vs enterprise

You: Two changes proposed:
1. New "Quoting Procedure" section requiring CRM tier check before quoting
2. Updated "Pricing" section clarifying standard vs enterprise rates
Apply both?
```

### 3. Batch Customer Feedback

Dump complaints and smart-update maps them to the right sections across the playbook.

```
Admin: "Here are 5 customer complaints from last month. Update our CS guidelines."

Result: 4 items targeting Issue Resolution, Escalation, and a new Channel Transfer Protocol section.

You: I analyzed 5 complaints and found 4 improvements needed:
1. Active listening rules in Issue Resolution (complaint about scripted responses)
2. Warm handoff requirement in Escalation (complaint about supervisor delays)
3. Follow-up commitments in Issue Resolution (24h promise not kept)
4. New Channel Transfer Protocol section (complaint about repeating info across channels)
```

### 4. Expand Collection Schema from Data Samples

Feed sample data and smart-update adds missing properties while catching duplicates.

```
Admin: "Make sure we can capture all data from these LinkedIn profiles."
[pastes 2 sample profiles]

Result: 4 new properties added (skills, experience_history, education_history, linkedin_connections).
No duplicates: correctly skipped job_title, company, and location which already exist.
```

### 5. Refine AI Extraction Quality

Feed examples of bad extractions and smart-update improves the property description.

```
Admin: "Our agents keep extracting job titles wrong. Here are the rules."

Result: 1 item -- update_property on job_title.
New description: "Must preserve seniority levels, numeric levels, dual roles. Do not abbreviate."
```

### 6. CRM Migration

Match CRM field exports to existing collections, flagging overlaps.

```
Admin: "We're migrating from HubSpot. Match these fields to our collections."

Result: Adds linkedin_url, twitter_handle, lead_source, lead_status, deal_amount, etc.
Flags first_name/last_name as overlapping with existing full_name.
Flags country as overlapping with existing location.
```

---

## Conversation Patterns

### Admin pastes raw material without clear instruction

```
Admin: [pastes a long document]

You: I see you've shared some content. To help me analyze this effectively, could you tell me:
1. Should this update existing guidelines or collection schemas?
2. What's the goal? (e.g., "incorporate this new policy", "update our playbook", "add these data fields")
```

### Plan has conflicts

```
You: I found 3 proposed changes. 1 has a conflict:

1. [safe] Append new escalation tier to ## Escalation
2. [safe] Add seniority_level property to Contact Properties
3. [CONFLICT] Update ## Pricing -- existing max discount is 10%, new material says 15%

Items 1 and 2 can be applied safely. Item 3 needs your decision.
Apply safe items now and decide on the conflict separately?
```

### Material produces no changes

```
You: I analyzed the material against your existing guidelines and collections.
No changes needed -- the material doesn't contain new information that isn't already covered.
Summary: [show LLM summary explaining why]
```

---

## Constraints

- MUST always start with `strategy: 'suggest'` to show the plan before applying
- MUST present all conflict items to the admin and get explicit approval before using `strategy: 'force'`
- SHOULD NOT use `strategy: 'force'` without the admin having reviewed the plan
- MAY use `strategy: 'safe'` without full review if the admin says "just do it, skip conflicts"
- MUST show before/after previews for update actions
- SHOULD call `client.ai.smartGuidelines()` after applying to verify retrievability
