# Advanced Patterns — Full Reference

Each pattern: **When to use → Context wiring → Error tiers → ❌ BAD → ✅ GOOD → Diff summary**

---

## Pattern A. Conditional Specialize

**When to use:** One operation, but the artifact shape depends on an upstream classification (enterprise gets 4-page brief, mid-market gets email sequence, SMB gets landing page).

**Context wiring:**
- `autoGuidelines: true` for brand voice + playbook via SmartContext
- Explicit `context:` for qualification rules AND all artifact specs (model needs to see all to pick)

**Error tiers:** T1 abort if input lacks fields to classify; T2 soft-degrade if confidence is low

### ❌ BAD

```ts
await client.ai.prompt({
  instructions: [
    // ❌ classification + generation collapsed into one instruction
    `Classify this account as enterprise/mid-market/SMB and write the
    appropriate outreach. Enterprise = 4-page brief, mid-market = email
    sequence, SMB = single landing page. Output the artifact.`,
  ],
  outputs: [
    { name: "artifact", required: true }, // ❌ what TYPE? caller cannot route
  ],
});
```

Fails because: model holds three templates in working memory while classifying (quality drops); single `artifact` output makes routing impossible; no abort on missing firmographics.

### ✅ GOOD

```ts
await client.ai.prompt({
  instructions: [
    // Instruction 1: classify ONLY. No artifact yet.
    `Classify the tier using the criteria above: enterprise / mid-market
    / smb. The account's firmographics are already in context.
    State your confidence (low/medium/high) and cite which facts drove the decision.

    If essential firmographics are missing (employee count, industry, AND
    revenue all unknown), emit:
        <abort reason='unclassifiable_account'>list missing fields</abort>

    Emit: <output name='tier'>enterprise|mid-market|smb</output>
          <output name='tier_confidence'>low|medium|high</output>
          <output name='tier_rationale'>one sentence with cited facts</output>`,

    // Instruction 2: branch on tier, generate the matching artifact
    `Based on the tier from instruction 1, generate the matching artifact:
       enterprise   → executive brief (per executive-brief-spec)
       mid-market   → 3-email sequence (per outreach-playbook)
       smb          → landing page hero + CTA (per landing-page-spec)

    Use ONLY the spec for the chosen tier.

    If tier_confidence from instruction 1 was 'low', prepend:
    "Auto-routing flagged for human review."

    Emit: <output name='artifact_type'>brief|sequence|landing_page</output>
          <output name='artifact_body'>the full artifact</output>`,
  ],
  context: [
    `# Account Qualification\n\n${guidelines["account-qualification"]}`,
    `# Executive Brief Spec\n\n${guidelines["executive-brief-spec"]}`,
    `# Outreach Playbook\n\n${guidelines["outreach-playbook"]}`,
    `# Landing Page Spec\n\n${guidelines["landing-page-spec"]}`,
  ].join("\n\n---\n\n"),
  outputs: [
    { name: "tier",             required: true, collectionId: "Company", propertyId: "tier" },
    { name: "tier_confidence",  required: true },
    { name: "tier_rationale" },
    { name: "artifact_type",    required: true },
    { name: "artifact_body",    required: true, collectionId: "Company", propertyId: "current_artifact" },
  ],
  tier: "pro",
  memorize: { websiteUrl: company.domain, type: "Company" },
});
```

**Diff:** Split classify and generate → each instruction owns one cognitive job. `artifact_type` lets caller route without re-parsing body. Abort guards the input contract.

---

## Pattern B. Multi-Source Reconciliation

**When to use:** Data about the same entity from multiple sources (CRM, web scrape, uploaded PDF) disagrees. Naive prompt produces whichever fact appeared last.

**Context wiring:**
- `autoGuidelines: true` for `account-research` (source-quality hierarchy)
- Per-instruction `attachments: []` for source documents, each tagged with a stable source key

**Error tiers:** T1 if majority of fact categories are MAJOR conflicts; T2 soft-degrade with populated `conflicts` output

### ❌ BAD

```ts
await client.ai.prompt({
  instructions: [
    `SOURCE A (CRM): "Acme HQ: SF, 500 employees"
     SOURCE B (LinkedIn): "Acme HQ: NY, 750 employees"
     SOURCE C (deck): "Acme HQ: London, 1200 employees"
     Write a company snapshot.`,
  ],
  outputs: [{ name: "snapshot", required: true }],
});
```

Fails because: model picks one without audit trail; deck treated as equal to live CRM; conflict baked into auto-memorize.

### ✅ GOOD

```ts
await client.ai.prompt({
  instructions: [
    // Instruction 1: list facts per source, do NOT synthesize
    `For each source, list claimed facts about Acme Corp as bullets.
    Do not synthesize. Tag each bullet with its source key (a, b, c).

    Sources:
      source-a: CRM record (updated within 30 days)
      source-b: LinkedIn company page (scraped today)
      source-c: Uploaded sales deck (date unknown)`,

    // Instruction 2: detect conflicts, apply source-quality hierarchy
    `Compare facts from instruction 1. Per category, classify:
       (a) AGREE: all sources match → record the value
       (b) MINOR: sources differ within tolerance → use highest-quality source
       (c) MAJOR: sources contradict beyond tolerance → record ALL versions with source keys

    Source-quality hierarchy: CRM (recent) > public web (today) > deck (unknown)

    If MAJOR conflicts on >50% of fact categories, emit:
        <abort reason='unreconcilable_data'>list categories</abort>

    Emit: <output name='conflicts'>JSON: [{category, severity, values}]</output>
          <output name='resolved_facts'>JSON of AGREE+MINOR values</output>`,

    // Instruction 3: synthesize with unresolved conflicts surfaced
    `Write a company snapshot using resolved_facts. For any MAJOR conflict:
       "<category>: contradicting sources (CRM: X, LinkedIn: Y). Recommend manual verification."
    Do not pick a side on MAJOR conflicts.

    Emit: <output name='snapshot'>the snapshot text</output>
          <output name='confidence'>high (no conflicts) | medium (only MINOR) | low (any MAJOR)</output>`,
  ],
  context: `# Account Research\n\n${guidelines["account-research"]}`,
  outputs: [
    { name: "snapshot",       required: true, collectionId: "Company", propertyId: "ai_snapshot" },
    { name: "confidence",     required: true },
    { name: "conflicts",                      collectionId: "Company", propertyId: "data_conflicts" },
    { name: "resolved_facts" },
  ],
  tier: "pro",
  memorize: { websiteUrl: company.domain, type: "Company" },
});
```

**Diff:** Instruction 1 inventories without judging (forces model to read each source). Instruction 2 applies explicit hierarchy with numerical tolerance. MAJOR conflicts surface in the snapshot instead of hiding. `conflicts` gives caller a programmatic hook to flag for review.

---

## Pattern C. Soft Degradation

**When to use:** Partial success beats zero success — scoring with thin data, summarizing a sparse record. Aborting throws away useful work.

**Context wiring:** `autoGuidelines: true`. Confidence cutoffs stay **inline** — don't externalize them to a guideline (one op's "low" becomes another's "medium").

**Error tiers:** T2 primary; T1 only as last resort (record genuinely empty)

### ❌ BAD

```ts
await client.ai.prompt({
  instructions: [
    `Score this contact's buying intent 0-100. If you don't have enough
    data, emit <abort reason='insufficient_data'>...</abort>.`,
  ],
  outputs: [{ name: "intent_score", required: true }],
});
```

Fails because: "enough data" is undefined (drifts run-to-run); aborting on thin data wastes valid signal; caller gets a 0-100 with no idea whether it came from one signal or twelve.

### ✅ GOOD

```ts
await client.ai.prompt({
  instructions: [
    // Instruction 1: inventory data categories
    `Inventory what data is available on this contact across:
    signals, engagement, firmographics, persona, conversations.
    List which categories have data (✓) and which are empty (✗).
    Empty categories are normal; do not abort.`,

    // Instruction 2: score with explicit confidence cliff
    `Score buying intent 0-100 using only categories with data.
    Confidence is a CLIFF, not a gradient:
       4+ categories present  → high
       2-3 categories present → medium
       1 category present     → low
       0 categories present   → emit:
            <abort reason='no_signal_categories'>contact is empty</abort>

    For each present category, list the 1-2 strongest evidence pieces.
    If a category is empty, write "(empty)" instead of inventing.

    Emit: <output name='intent_score'>integer 0-100</output>
          <output name='confidence'>high|medium|low</output>
          <output name='evidence_per_category'>structured list</output>
          <output name='warnings'>comma-separated list of empty categories</output>`,
  ],
  outputs: [
    { name: "intent_score", required: true, collectionId: "Contact", propertyId: "intent_score" },
    { name: "confidence",   required: true, collectionId: "Contact", propertyId: "intent_confidence" },
    { name: "evidence_per_category" },
    { name: "warnings" },
  ],
  tier: "basic",
  memorize: { email: contact.email, type: "Contact" },
});
```

**Diff:** Confidence is load-bearing (not the score itself). Abort threshold is **fully empty**, not thin. `warnings` gives campaigns/dashboards a programmatic way to suppress low-confidence scores.

---

## Pattern D. Compliance-Gated Generation

**When to use:** Artifact ships externally and a compliance/legal/brand rule could quietly be violated. Gate inline to prevent auto-memorize from writing a non-compliant draft.

**Context wiring:**
- Explicit `context:` for `compliance-policy` (legal phrasing must not be paraphrased)
- Explicit `context:` for `outreach-playbook`
- `autoGuidelines: true` for `brand-voice` via SmartContext

**Error tiers:** T1 if operation is non-compliant in concept (can't lawfully email this region); T3 self-correct for fixable violations; T2 soft-degrade if rewrite still falls short

### ❌ BAD

```ts
await client.ai.prompt({
  instructions: [
    `Write a cold email to this contact. Stay GDPR-compliant.`,
  ],
  outputs: [{ name: "email", required: true }],
});
```

Fails because: "Stay GDPR-compliant" is too abstract; no region check; no audit trail.

### ✅ GOOD

```ts
await client.ai.prompt({
  instructions: [
    // Instruction 1: gate the OPERATION (not the wording)
    `Before drafting, check the contact's region and consent status:
       (a) is cold outreach permitted in this region without prior consent?
       (b) does the contact have an active opt-in or lawful basis on file?
       (c) are there per-region content requirements (disclosures, unsubscribe placement)?

    If (a) is "no" AND (b) is "no", emit:
        <abort reason='no_lawful_basis'>region + consent state</abort>

    Otherwise, list the per-region content requirements the draft must include.`,

    // Instruction 2: draft with requirements visible
    `Draft the email body and subject. The body MUST include every
    requirement listed in instruction 1. Apply brand voice.
    Do not emit yet; instruction 3 audits.`,

    // Instruction 3: audit, self-correct, soft-degrade
    `Audit the draft against compliance, brand-voice, and playbook rules.

    For each violation, classify:
       FIXABLE     (mechanical rewrite): rewrite in place
       NON-FIXABLE (legal sign-off needed): flag in warnings

    If 2+ NON-FIXABLE violations remain after rewrite:
        <output name='confidence'>low</output>
        <output name='warnings'>list violations</output>
    (Caller queues for human review; do not abort — partial draft is useful.)

    Emit: <output name='email_subject'>final subject</output>
          <output name='email_body'>final HTML body</output>
          <output name='compliance_log'>JSON of checks + outcome</output>
          <output name='confidence'>high|medium|low</output>
          <output name='warnings'>any unresolved issues</output>`,
  ],
  context: [
    `# Compliance Policy\n\n${guidelines["compliance-policy"]}`,
    `# Outreach Playbook\n\n${guidelines["outreach-playbook"]}`,
  ].join("\n\n---\n\n"),
  outputs: [
    { name: "email_subject",  required: true },
    { name: "email_body",     required: true },
    { name: "compliance_log",                 collectionId: "Contact", propertyId: "compliance_log" },
    { name: "confidence",     required: true },
    { name: "warnings" },
  ],
  tier: "pro",
  evaluate: { criteria: "compliance + brand voice + format", serverSide: true },
  memorize: { email: contact.email, type: "Contact" },
});
```

**Diff:** Instruction 1 gates the *operation*, not just the wording (T1 aborts before writing a beautiful email to someone you cannot lawfully email). Instruction 3 separates fixable (T3 self-correct) from non-fixable (T2 soft-degrade). `compliance_log` is the audit trail.

---

## Pattern E. Multi-Recipient Fanout

**When to use:** One shared company context, N recipients with different personas. Per-recipient loop loses cross-variant consistency and pays N× for the same company recall.

**Context wiring:**
- `autoGuidelines: true` for `brand-voice` + `outreach-playbook`
- Recipients passed inline in instruction 1 so the model holds all in working memory while planning

**Error tiers:** T2 soft-degrade per recipient; T3 cross-variant consistency check; T4 bound blast radius (retry once, then mark skipped)

### ❌ BAD

```ts
// ❌ runs separately for each recipient
for (const recipient of recipients) {
  await client.ai.prompt({
    instructions: [`Write a personalized email to ${recipient.email} about Acme.`],
    outputs: [{ name: "email", required: true }],
  });
}
```

Fails because: N× recall cost on same company; no coordination between variants (CFO gets "we cut costs", CTO gets "increase spend on innovation" — deal dies); per-recipient failure has no structured record.

### ✅ GOOD

```ts
await client.ai.prompt({
  instructions: [
    // Instruction 1: one pass over company context, lock the spine
    `Company context for ${company.name} is already in context. Enumerate recipients:

    ${recipients.map((r, i) => `  R${i + 1}: ${r.email}, ${r.title}, persona: ${r.persona}`).join("\n")}

    Plan ONE coherent narrative that holds across all recipients (the "spine").
    Each recipient's email will angle this spine for their persona without
    contradicting the others.`,

    // Instruction 2: draft per recipient, soft-skip those lacking persona data
    `Using the spine from instruction 1, draft an email per recipient.
    Each draft must: share the spine's core claim, lead with the persona-specific
    angle, end with the persona-appropriate CTA.

    Output as JSON:
       [{ recipient: 'R1', subject: '...', body: '...' }, ...]

    If a recipient lacks persona data:
       { recipient: 'R3', subject: null, body: null, skip_reason: 'missing_persona_data' }
    Do not abort the whole run for one missing recipient.`,

    // Instruction 3: cross-variant consistency audit + emit
    `Audit drafts for cross-variant consistency:
       same product positioning across all variants
       no factual contradiction between variants
       tone variance is OK; factual variance is not

    Fix contradictions by aligning to the spine.

    Emit: <output name='variants'>final JSON array</output>
          <output name='skipped'>list of skipped recipient IDs and reasons</output>
          <output name='consistency_fixes'>what was corrected and why</output>`,
  ],
  outputs: [
    { name: "variants",          required: true },
    { name: "skipped" },
    { name: "consistency_fixes" },
  ],
  tier: "pro",
  memorize: { websiteUrl: company.domain, type: "Company" },
});
```

**Diff:** One company recall, N variants (cost: 1 + small fanout, not N×). "Spine" is the cross-variant invariant the audit instruction enforces. `skipped` array lets caller retry only missing recipients, not the whole batch.

---

## Pattern F. Tool-Bounded Research with Source Triangulation

**When to use:** Task needs current external data AND verifying across multiple sources matters — one bad source writing to the record is worse than slower research.

**Context wiring:**
- `agentTools: true` (required)
- `mcps: ["specific-id-1", "specific-id-2"]` allowlist
- `webSearch: { enabled: true, maxUsesPerStep: 3 }` as fallback
- `memorize.captureToolResults: true` so research becomes future memory
- Explicit `context:` for `account-research` (source-quality hierarchy)

**Error tiers:** T1 if zero sources verify entity exists; T2 soft-degrade by source count; T4 `maxSteps: 6` caps tool loop

### ❌ BAD

```ts
await client.ai.prompt({
  instructions: [`Research ${company.name} and write me a brief.`],
  agentTools: true,
  mcps: true,  // ❌ loads every MCP (~15K tokens of schema)
  outputs: [{ name: "brief", required: true }],
});
```

### ✅ GOOD

```ts
await client.ai.prompt({
  instructions: [
    // Instruction 1: multi-source research, capped tool budget
    {
      prompt: `Research ${company.name} using allowed tools:
         - news_search (last 90 days)
         - company_lookup (firmographics + funding)
         - web_search (verification + gap-filling)

      Goals: verify entity exists; gather recent funding, leadership changes, pain points;
      capture source URLs + dates per claim.

      Stop at 3 distinct sources OR 6 total tool calls, whichever comes first.

      Output per claim:
         CLAIM: <fact>
         SOURCES: <url-1>, <url-2>
         DATE: <date if available>
         CONFIDENCE: high|medium|low

      Do NOT synthesize a brief yet.`,
      maxSteps: 6,
    },

    // Instruction 2: triangulate sources
    `Triangulate findings using the source-quality hierarchy.

    Per CLAIM, count distinct sources:
       3+ sources → HIGH
       2 sources  → MEDIUM (multiple aggregators citing one origin = ONE source)
       1 source   → LOW ("preliminary")
       0 sources verify basic entity existence → emit:
           <abort reason='unverified_entity'>summarize what was searched</abort>

    Tag claims where sources DISAGREE on the same fact as CONFLICTED.

    Emit: <output name='triangulated_facts'>JSON list with confidence per claim</output>
          <output name='conflicts'>list of CONFLICTED claims with each source's value</output>`,

    // Instruction 3: write brief with citations
    `Using only HIGH and MEDIUM confidence facts, write a one-page company brief.
    Cite source URL inline per factual claim. For CONFLICTED facts:
       "(conflicting reports: <source-a> says X; <source-b> says Y)"
    Drop LOW-confidence facts unless explicitly requested.`,
  ],
  context: `# Account Research\n\n${guidelines["account-research"]}`,
  outputs: [
    { name: "company_brief",       required: true, collectionId: "Company", propertyId: "ai_brief" },
    { name: "triangulated_facts",                  collectionId: "Company", propertyId: "verified_facts" },
    { name: "conflicts",                           collectionId: "Company", propertyId: "data_conflicts" },
    { name: "research_confidence", required: true },
  ],
  tier: "pro",
  agentTools: true,
  mcps: ["user_perplexity_mcp", "user_clearbit_mcp", "user_news_mcp"],
  webSearch: { enabled: true, maxUsesPerStep: 3 },
  memorize: { websiteUrl: company.domain, type: "Company", captureToolResults: true },
});
```

**Diff:** `mcps: ["specific-ids"]` saves 10K+ tokens of unused schema. `maxSteps: 6` caps runaway. Abort on zero-source verification prevents writing fabricated companies into records. `captureToolResults: true` means downstream ops recall this research without re-running tools.

---

## Pattern G. Few-Shot Calibrated Classification

**When to use:** Classification with adjacent labels that drift run-to-run. "Soft no" vs "Hard no", "Question" vs "Positive interest" — zero-shot is inconsistent when labels are close.

**Context wiring:**
- `autoGuidelines: true` for `signal-definitions` + `reply-handling`
- Few-shot examples **inline** in the prompt (prompt-shaped, not org-shaped)
- `evaluate: true` so server-side eval can grade independently

**Error tiers:** T2 soft-degrade when no calibration example matches (caller routes to human review); T1 only on unparseable input

### Key Insight: WHY Rationale Is Required

Each calibration example MUST include WHY — the rationale distinguishing it from adjacent classes. INPUT + CLASS without WHY teaches phrasing memorization, not boundary judgment.

```ts
await client.ai.prompt({
  instructions: [
    // Instruction 1: extract evidence phrases
    `Read the reply and pull at most 3 verbatim phrases signaling sentiment,
    intent, or objection. Tag each with a label.

    If body is empty or unparseable:
        <abort reason='unreadable_reply'>describe what was received</abort>`,

    // Instruction 2: classify against few-shot anchors with WHY rationale
    `Classify into ONE of: 'Positive interest', 'Question', 'Referral',
    'Objection', 'Soft no', 'Hard no', 'OOO', 'Unsubscribe', 'Bounce'.

    --- CALIBRATION EXAMPLES ---

    INPUT: "Thanks for reaching out, but we're not in the market right now."
    CLASS: Soft no
    WHY:   "not in the market right now" is a TIME-BOUNDED deferral. No closure
           language ("never", "stop", "remove me"). Distinguishes from Hard no
           by absence of closure words.

    INPUT: "Stop emailing me. We will never use your product."
    CLASS: Hard no
    WHY:   "Stop emailing me" + "never" = unambiguous closure. Action verb +
           permanent qualifier. Distinguishes from Soft no by explicit shutoff.

    INPUT: "Interesting. Can you send pricing for the enterprise tier?"
    CLASS: Positive interest
    WHY:   Asks about pricing for a specific tier — buying-stage question, not
           information-gathering. Distinguishes from Question by specificity
           (tier named) + decision-shaped framing.

    INPUT: "Curious how this differs from <competitor>?"
    CLASS: Question
    WHY:   Comparison question. Without a buying-stage signal (pricing, timeline,
           decision-maker), default to Question. Distinguishes from Positive
           interest by absence of stage-specific commitment.

    INPUT: "I'm not the right person; try <colleague>."
    CLASS: Referral
    WHY:   Active redirect. Distinguishes from Soft no because contact offers an
           alternative path forward, not deferring or declining.

    --- END CALIBRATION ---

    Match by RATIONALE (not just phrasing). Confidence cliff:
       HIGH:   matches calibration anchor in form AND rationale
       MEDIUM: matches rationale, different phrasing
       LOW:    no anchor covers this case → flag for human review (calibration gap)

    Emit: <output name='classification'>...</output>
          <output name='confidence'>low|medium|high</output>
          <output name='matched_example'>which anchor drove the call, or "none"</output>
          <output name='evidence_phrases'>1-3 phrases from instruction 1</output>`,
  ],
  outputs: [
    { name: "classification",   required: true, collectionId: "Conversation", propertyId: "sentiment" },
    { name: "confidence",       required: true },
    { name: "matched_example" },
    { name: "evidence_phrases" },
  ],
  tier: "basic",
  evaluate: true,
  memorize: { email: reply.contact_email, type: "Contact" },
});
```

**Diff:** `matched_example` lets you analyze which anchors do real work (if 80% match anchor #2, others are dead). LOW-confidence runs go to human review — reviewer's classification becomes a new anchor over time. `evaluate: true` independently grades; persistent disagreement means rationale rules need rewriting.

---

## Pattern H. Checklist-Gated Workflow with Structured Stop

**When to use:** Workflow should only proceed when N pre-conditions are met (onboarding, account qualification, autonomous outbound). Stop-workflow returns `success: true`; abort returns `success: false`.

**Context wiring:**
- Explicit `context:` for workflow's eligibility rules
- `autoGuidelines: true` for tone/playbook used during action phase

**Error tiers:** T1 abort for data integrity issues only; T2 stop-workflow is the entire pattern

```ts
await client.ai.prompt({
  instructions: [
    // Instruction 1: run eligibility checklist
    `Run this checklist against the eligibility criteria above.
    For each check, output result ("pass"|"fail"|"unknown") + one-line reason.

       CHECK 1: ICP fit — is account in tier 1 or tier 2 ICP?
       CHECK 2: Recency — contacted within last 30 days?
       CHECK 3: Email verifiable — valid format + domain matches company?
       CHECK 4: Compliance — region permits cold outreach; consent on file where required?
       CHECK 5: Persona match — contact's role in target buying committee?

    "Unknown" = data needed for check is missing entirely. Treat as failing for gating.

    If account lacks basic identity (no name, no domain, no record), emit:
        <abort reason='malformed_account_record'>list missing fields</abort>

    Emit: <output name='gate_log'>JSON array of 5 check results</output>`,

    // Instruction 2: gate decision + branch
    `Compute gate result from gate_log:
       All 5 pass → workflow_status = "completed"; continue to instruction 3
       Any fail/unknown → workflow_status = "stopped"; emit stop_reason (first failed check)

    DO NOT abort here. This is a valid run that correctly decided not to act.

    If stopped:
       Emit:
          <output name='workflow_status'>stopped</output>
          <output name='stop_reason'>which check failed and why</output>
          <output name='action_payload'>null</output>
       Skip instruction 3.

    If completed:
       Emit:
          <output name='workflow_status'>completed</output>
          <output name='stop_reason'>null</output>`,

    // Instruction 3: do the work (only reached if all gates passed)
    `All eligibility gates passed. Draft the outreach email per playbook.

    Emit: <output name='action_payload'>{ subject, body }</output>`,
  ],
  outputs: [
    { name: "workflow_status", required: true, collectionId: "Contact", propertyId: "last_outreach_status" },
    { name: "stop_reason",                     collectionId: "Contact", propertyId: "last_outreach_skip_reason" },
    { name: "gate_log",        required: true, collectionId: "Contact", propertyId: "last_outreach_gate_log" },
    { name: "action_payload" },
  ],
  tier: "pro",
  memorize: { email: contact.email, type: "Contact" },
});
```

Caller routing becomes:
```ts
if (response.outputs.workflow_status === "completed") {
  sendEmail(response.outputs.action_payload);
} else {
  logSkip(response.outputs.stop_reason, response.outputs.gate_log);
}
```

**Diff:** `gate_log` always populated (analytics can identify which gate is the constraint: "ICP fit fails 60% → ICP definition too narrow"). `action_payload` is `null` when stopped, structured object when completed. Abort reserved for malformed runs only.

---

## Pattern I. Self-Reflective Refinement Loop

**When to use:** Quality matters more than speed. First drafts are 70% good; iterating with a quality rubric can reach 90%. Differs from Pattern 1 (one-pass audit) and Pattern 5 (adversarial attack) by multi-passing with scored termination.

**Load-bearing mechanism:** Each iteration emits both `quality_score` AND `confidence_in_improvement`. Loop terminates when score ≥ threshold OR confidence_in_improvement is LOW. Without the confidence gate, the loop shuffles words indefinitely.

**Context wiring:**
- Explicit `context:` for quality rubric (must not be paraphrased by auto-retrieval)
- `autoGuidelines: true` for tone/playbook
- `evaluate: { criteria: rubric, serverSide: true }` for independent grading after loop

**Error tiers:** T3 self-correct is the loop; T2 soft-degrade if loop terminates below threshold; T1 abort only on irrecoverable input

```ts
await client.ai.prompt({
  instructions: [
    // Instruction 1: draft v1 and self-score
    `Draft v1 of a one-page ${artifactType} for ${audience}.

    After drafting, score yourself 0..100 against each rubric dimension:
       clarity, evidence, relevance, flow, voice

    Be honest. Inflated self-scores poison rubric calibration over time.

    Emit: <output name='draft_v1'>...</output>
          <output name='scores_v1'>JSON of dimension → score</output>`,

    // Instruction 2: reflect and decide whether to iterate
    `Reflect on draft_v1's scores.

    Rubric thresholds:
       Total ≥ 425/500 (avg ≥ 85) → GOOD ENOUGH; no iteration
       Total 350..424 (avg 70..84) → REVISABLE; iterate to v2
       Total < 350 (avg < 70)      → may need full rewrite

    For the lowest-scoring dimension, write 2-3 specific, actionable edits.
       GOOD: "tighten opening paragraph by removing 3 throat-clearing sentences"
       BAD:  "improve clarity"

    Then estimate confidence_in_improvement (low|medium|high):
       HIGH:   proposed edits will measurably raise the score
       MEDIUM: edits should help; lift uncertain
       LOW:    draft is at structural ceiling; further iteration = word-shuffling

    Decision:
       GOOD ENOUGH                         → emit draft_v1 unchanged; skip 3-4
       REVISABLE + HIGH/MEDIUM confidence  → continue to instruction 3
       REVISABLE + LOW confidence          → emit draft_v1 with confidence='medium'
       Bottom band + LOW confidence        → emit:
            <abort reason='draft_unsalvageable'>structural issues</abort>

    Emit: <output name='reflection_v1'>scores + edits + confidence_in_improvement</output>
          <output name='loop_decision'>good_enough|revise|stop_at_ceiling|abort</output>`,

    // Instruction 3: produce v2 from the edit plan
    `If loop_decision was anything other than "revise", skip this instruction.

    Otherwise: apply edits from reflection_v1 to produce draft_v2.
    Touch ONLY the parts the edit plan calls out. Do NOT add new content;
    if fix requires content the draft doesn't have, flag it in v2's reflection.

    Emit: <output name='draft_v2'>...</output>
          <output name='scores_v2'>JSON of dimension → score</output>`,

    // Instruction 4: pick winner, emit final
    `Compare scores_v1 and scores_v2 (if v2 exists; otherwise final = v1).

    Termination:
       scores_v2 total ≥ 425              → final = draft_v2 (success)
       scores_v2 total ≥ scores_v1 + 30  → final = draft_v2 (meaningful improvement)
       scores_v2 ≤ scores_v1             → REVERT; final = draft_v1
                                            (v2 made it worse — safeguard against entropy)
       otherwise                         → final = draft_v2

    Emit: <output name='final_document'>chosen draft</output>
          <output name='final_score'>total of chosen draft</output>
          <output name='confidence'>high (≥425) | medium (350..424) | low (<350)</output>
          <output name='iteration_log'>v1 score, v2 score, why this draft was chosen</output>`,
  ],
  outputs: [
    { name: "final_document", required: true },
    { name: "final_score",    required: true },
    { name: "confidence",     required: true },
    { name: "iteration_log" },
    { name: "reflection_v1" },
    { name: "draft_v1" },
    { name: "draft_v2" },
    { name: "scores_v1" },
    { name: "scores_v2" },
  ],
  tier: "pro",
  evaluate: { criteria: "matches quality-rubric dimensions; final score honest, not inflated", serverSide: true },
});
```

**Diff:** Three termination conditions detected by the model itself (GOOD ENOUGH / REVISABLE-confident / STRUCTURAL CEILING). Revert-to-v1 when v2 scores worse is the critical safeguard — without it, multi-pass degrades quality through over-editing. `iteration_log` tells the team which artifacts converge in 1 iteration vs 2 vs hit the ceiling.
