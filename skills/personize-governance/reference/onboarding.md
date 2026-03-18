# Reference: Onboarding

Guide for first-time setup — when a user has 0-2 guidelines.

---

## Detection

Call `guideline_list` (MCP) or `client.guidelines.list()` (SDK). If the result has 0-2 variables, trigger the onboarding flow.

---

## The Onboarding Conversation

### Step 1: Understand the Organization

Ask these questions conversationally — 2-3 at a time, not as a checklist:

- "What does your company do? What's your product or service?"
- "Who are your ideal customers? What industries, company sizes, job titles?"
- "What's your team structure? Sales, marketing, engineering, support?"
- "What tone does your brand use? Formal? Casual? Technical? Friendly?"

### Step 2: Identify High-Impact Guidelines

Based on their answers, prioritize:

- If they have a **sales team** → brand voice, ICP definitions, cold outreach guidelines, objection handling
- If they have an **engineering team** → coding standards, security requirements, API patterns, incident runbook
- If they do **content/marketing** → brand voice, content templates, messaging guidelines, SEO rules
- If they do **customer support** → escalation procedures, refund policies, FAQ, response templates

### Step 3: Draft Starter Guidelines

For each high-priority variable:

1. Draft the full variable with proper markdown structure
2. Use their answers to populate real content (not "fill in later")
3. Organize into clear `## sections` with actionable rules
4. Show the draft and ask: "Does this capture how your team operates? What would you change?"
5. On approval, create the variable

**Quick Quality Checklist (for every new guideline):**
- [ ] Has a clear `# Title` and brief opening sentence
- [ ] Uses `##` headers for each major topic (enables section-level delivery — saves 50-80% tokens)
- [ ] Hard rules use explicit language: "Never...", "Must always...", "Required:" (auto-tagged as `<HARD_CONSTRAINT>` at save time)
- [ ] Has at least one GOOD/BAD contrasted example
- [ ] Is 300-800 words (check `qualityWarnings` in the API response)
- [ ] Name is a search query: `sales-cold-outreach` not `doc-v3`

### Step 4: Verify and Educate

1. After creating variables, call `ai_smart_guidelines` / `client.ai.smartGuidelines()` with a relevant query to demonstrate
2. Show them: "Now when any AI agent asks about [topic], it gets this answer"
3. Explain how to update guidelines going forward (section-level edits, historyNotes)

---

## Starter Variable Templates

When creating the first guidelines, use these as structural guides:

### Brand Voice

```markdown
# Brand Voice Guidelines

Our voice is [adjective], [adjective], and [adjective].

## Tone

- **Default tone:** [Professional but approachable / Technical and precise / Casual and friendly]
- **When writing to prospects:** [More formal / Consultative / Peer-to-peer]
- **When writing to customers:** [Supportive / Direct / Celebratory]

## Language Rules

- **Do:** Use active voice, short sentences, concrete numbers
- **Don't:** Use jargon without explanation, exclamation marks in emails, "just" or "simply"
- **Always:** Address the reader's pain point before our solution
- **Never:** Make claims without data or social proof

## Examples

| Context | Good | Bad |
|---|---|---|
| Subject line | "3 ways to reduce churn by 40%" | "Our Amazing New Feature!!!" |
| Opening line | "You mentioned scaling is a priority—" | "I hope this email finds you well" |
| CTA | "Worth a 15-min call this week?" | "Please let me know if you'd like to schedule a demo" |
```

### ICP Definitions

```markdown
# Ideal Customer Profiles

## Primary ICP: [Title]

- **Industry:** [...]
- **Company size:** [...]
- **Job titles:** [...]
- **Budget range:** [...]
- **Pain points:** [...]
- **Buying triggers:** [...]
- **Disqualifiers:** [...]

## Secondary ICP: [Title]

[Same structure]

## Qualification Criteria

| Signal | Strong Fit | Weak Fit | Disqualified |
|---|---|---|---|
| Company size | [range] | [range] | [range] |
| Budget | [range] | [range] | [range] |
| Timeline | [range] | [range] | [range] |
```

---

## Handling Existing Content

When users say "I already have guidelines" or paste content:

1. Analyze the pasted content for structure, rules, and policies
2. Reorganize into proper guideline format (clear `## sections`, actionable rules)
3. Suggest splitting into multiple variables if the content covers multiple topics
4. Show the restructured draft and ask for approval
5. Offer to extract additional content ("I also noticed guidelines about X — want me to create a separate guideline for that?")
