# Reference: Operations

Complete workflows, SDK/MCP code, and conversation patterns for all guideline operations.

---

## SDK Methods Reference

### Reading

```typescript
// List all variables (name, id, tags, description)
const all = await client.variables.list();
// → { actions: [{ id, type, payload: { name, value, tags, description } }], count }

// Get section headings (TOC) for a variable
const structure = await client.variables.getStructure(variableId);
// → { data: { headings: ['## Section 1', '## Section 2', ...] } }

// Get content of a single section
const section = await client.variables.getSection(variableId, { header: '## Cold Email Guidelines' });
// → { data: { header, content } }

// View change history for a variable (start with limit: 1, increase if user wants more)
const history = await client.variables.history(variableId, { limit: 1 });
// → { data: { actionId, history: [{ timestamp, modifiedByEmail, note, payload, ... }], count } }

// Check what agents see for a topic (verify your changes work)
const context = await client.ai.smartContext({ message: 'cold outreach best practices' });
// → { data: { compiledContext: '...', selection: [...] } }
```

### Writing

```typescript
// Create a new variable
await client.variables.create({
    name: 'sales-playbook',
    value: '# Sales Playbook\n\n## Cold Outreach\n...',
    tags: ['sales', 'governance'],
    description: 'Sales team playbook and best practices',
});

// Full replace
await client.variables.update(variableId, {
    value: '# Sales Playbook\n\n(entire new content...)',
    updateMode: 'replace',
    historyNote: 'Complete rewrite to reflect new pricing model — requested by admin',
});

// Update a single section (by header)
await client.variables.update(variableId, {
    value: '(new content for this section only)',
    updateMode: 'section',
    sectionHeader: '## Cold Email Guidelines',
    historyNote: 'Updated cold email section with new subject line rules',
});

// Append a new section to the end
await client.variables.update(variableId, {
    value: '\n\n## GDPR Compliance\n\nAll outreach must...',
    updateMode: 'append',
    historyNote: 'Added GDPR compliance section — new regulatory requirement',
});

// Append content to an existing section
await client.variables.update(variableId, {
    value: '\n- New rule: Always include unsubscribe link',
    updateMode: 'appendToSection',
    sectionHeader: '## Email Rules',
    historyNote: 'Added unsubscribe link requirement to Email Rules section',
});

// Delete a variable
await client.variables.delete(variableId);
```

---

## CREATE — Full Workflow

**When:** Admin shares raw content (docs, notes, paste) or describes what they want.

1. Ask the admin for the topic, audience, and any source material they want to include
2. If admin pastes or shares content, analyze it and extract the key information
3. List existing variables (`client.variables.list()`) to check for overlap
4. If overlap exists, suggest updating the existing variable instead of creating a duplicate
5. Draft the variable with proper markdown structure:
   - Clear `# Title` as H1
   - Logical `## Section` headers (H2)
   - Bullet points, numbered lists, tables where appropriate
   - Concise, actionable language — these are reference docs, not prose
6. Propose a kebab-case name, relevant tags, and a one-line description
7. **Show the full draft to the admin and ask for approval**
8. On approval, call `client.variables.create()`
9. Verify with `client.ai.smartContext()` that the new variable surfaces for relevant queries

**Naming conventions:**
- Use kebab-case: `sales-playbook`, `brand-voice-guidelines`
- Be specific: `cold-email-guidelines` not `email-stuff`
- Use category prefixes for large orgs: `sales-playbook`, `sales-objection-handling`, `cs-health-check-process`

**Tagging conventions:**
- Department: `sales`, `marketing`, `cs`, `product`, `engineering`, `hr`
- Type: `governance`, `policy`, `best-practice`, `checklist`, `how-to`, `faq`, `playbook`
- Audience: `internal`, `customer-facing`, `leadership`
- Example: `tags: ['sales', 'governance', 'playbook']`

---

## UPDATE — Full Workflow

**Choose the right update mode based on the scope of change:**

| Scope | Mode | When |
|---|---|---|
| Single section | `section` | "Update the Cold Email section" |
| Add to a section | `appendToSection` | "Add a new rule to the Email Rules section" |
| Add new section | `append` | "Add a GDPR section to the data policy" |
| Multiple sections | Multiple `section` calls | "Update sections 2 and 4" |
| Full rewrite | `replace` | "Completely rewrite this variable" |

**Workflow (Section-Level):**

1. Admin says what they want to change (e.g., "update the cold email section of our sales playbook")
2. List variables to find the target: `client.variables.list()`
3. Get the structure: `client.variables.getStructure(variableId)`
4. Show the admin the TOC so they can confirm which section(s)
5. Read the target section: `client.variables.getSection(variableId, { header: '## Cold Email Guidelines' })`
6. Draft the updated section content
7. **Show the before/after to the admin and ask for approval**
8. On approval, call `client.variables.update()` with the appropriate `updateMode` and `sectionHeader`
9. Include a descriptive `historyNote` explaining what changed and why

**Workflow (Full Replace):**

1. Read the entire variable value from the list response
2. Draft the complete new version
3. **Show a summary of changes to the admin**
4. On approval, call `client.variables.update()` with `updateMode: 'replace'`

---

## IMPROVE — Full Workflow

**When:** Admin asks to clean up, restructure, or improve the writing of a variable.

**What to improve:**
- **Headers:** Make them consistent, descriptive, and scannable (H2 for major sections, H3 for subsections)
- **Structure:** Logical flow — overview → details → examples → exceptions
- **Formatting:** Use bullet points for lists, numbered lists for steps, tables for comparisons, bold for key terms
- **Language:** Active voice, imperative mood for instructions ("Do X" not "X should be done"), concise sentences
- **Consistency:** Uniform terminology, consistent formatting patterns across sections
- **Completeness:** Flag missing sections (e.g., a policy without exceptions or an FAQ without common questions)

**Workflow:**

1. Read the variable content (from list or getSection)
2. Analyze issues: structure, clarity, formatting, completeness
3. Draft the improved version
4. **Show a summary of changes and the improved content to the admin**
5. On approval, apply via `update()` (section or replace depending on scope)

---

## AUDIT — Full Workflow

**When:** Admin reports a factual change that may affect multiple variables (e.g., "our pricing changed", "we rebranded", "we dropped the free tier").

**Workflow:**

1. Admin describes the change (e.g., "our refund window changed from 30 days to 14 days")
2. Call `client.variables.list()` to get ALL variables
3. Search through all variable values for mentions of the old fact
4. For each variable that contains the old fact:
   a. Identify the specific section(s) affected
   b. Draft the corrected text
   c. **Present all proposed changes to the admin as a batch**
5. On approval, apply each change with `updateMode: 'section'` and a `historyNote` referencing the audit (e.g., "Audit: updated refund window from 30 to 14 days per policy change")
6. Show a summary: "Updated 4 variables across 7 sections"

**Audit triggers (suggest this when admin mentions):**
- Pricing changes
- Product name or brand changes
- Policy changes (terms, SLA, compliance)
- Team structure changes
- Process changes
- Tool or vendor changes

---

## VERIFY — Full Workflow

**When:** After any create/update, or when admin asks "can agents see X?"

```typescript
// Test what agents see for a specific topic
const result = await client.ai.smartContext({
    message: 'What are our cold email guidelines?',
    tags: ['sales'],  // optional: narrow to specific tags
});

console.log('Variables surfaced:', result.data?.selection);
console.log('Compiled context:', result.data?.compiledContext);
```

**Always verify after changes** to confirm:
- The updated variable surfaces for relevant queries
- The specific changed content appears in the compiled context
- No stale/old content leaks through

---

## History Notes

Every update MUST include a `historyNote`. Write notes that explain **what** changed and **why**:

**Good notes:**
- `"Updated cold email section: added subject line best practices per admin request"`
- `"Audit: changed refund window from 30→14 days across all mentions"`
- `"Added GDPR compliance section — new EU regulation requirement"`
- `"Improved formatting: restructured FAQ into table format for readability"`
- `"Full rewrite: aligned sales playbook with new enterprise pricing model"`

**Bad notes:**
- `"Updated"` (too vague)
- `"Changed some stuff"` (not useful)
- `"Admin asked me to"` (doesn't say what changed)

---

## Variable Structure Best Practices

When creating or restructuring a variable, follow this template pattern:

```markdown
# Variable Title

Brief one-paragraph overview of what this document covers and who it's for.

## Section 1: [Topic]

Content organized with:
- Bullet points for lists of items
- **Bold** for key terms and emphasis
- `Code formatting` for specific values, thresholds, or technical terms

## Section 2: [Topic]

### Subsection 2a

For deeper topics, use H3 subsections under H2.

### Subsection 2b

Keep subsections focused on one aspect.

## Examples

| Scenario | Good | Bad | Why |
|---|---|---|---|
| ... | ... | ... | ... |

## Exceptions

When the rules above don't apply:
1. Exception case 1 — how to handle it
2. Exception case 2 — how to handle it

## Changelog

- 2026-02-13: Initial version (or latest major change)
```

**Structure rules:**
- H1 (`#`) for the document title — exactly one per variable
- H2 (`##`) for major sections — these are what `getStructure` returns and `updateMode: 'section'` targets
- H3 (`###`) for subsections within a section
- Keep sections self-contained — each H2 section should make sense on its own
- Put examples near the rules they illustrate, not in a separate section (unless the variable is an FAQ or reference)

---

## Conversation Patterns

### Admin shares a document

```
Admin: "Here's our sales playbook [pastes content]. Can you turn this into a guideline?"

You:
1. Analyze the pasted content
2. List existing variables to check for overlap
3. Propose: create new variable or update existing one
4. Draft with proper structure, headers, formatting
5. Show draft → get approval → create/update
6. Verify with smartContext
```

### Admin wants to update something specific

```
Admin: "Update the pricing section of our sales playbook — we now offer 3 tiers instead of 2"

You:
1. Find the variable: client.variables.list() → match "sales-playbook"
2. Get structure: client.variables.getStructure(id) → show TOC
3. Read section: client.variables.getSection(id, { header: '## Pricing' })
4. Draft updated section with 3 tiers
5. Show before/after → get approval → update with updateMode: 'section'
6. historyNote: "Updated pricing section: 2 tiers → 3 tiers (Starter, Pro, Enterprise)"
```

### Admin reports a factual change

```
Admin: "We changed our company name from Acme to Apex"

You:
1. List ALL variables
2. Search all values for "Acme"
3. For each match: identify section, draft replacement
4. Present batch: "Found 'Acme' in 5 variables across 8 sections. Here are the proposed changes..."
5. Get approval → apply all changes
6. historyNote on each: "Audit: rebranded Acme → Apex"
```

### Admin wants to improve quality

```
Admin: "Clean up our onboarding checklist — it's messy"

You:
1. Read the full variable
2. Analyze: structure, headers, formatting, clarity, completeness
3. Draft improved version
4. Show summary: "I restructured into 5 sections, converted steps to numbered lists, added missing 'Prerequisites' section, fixed inconsistent header levels"
5. Get approval → replace
```
