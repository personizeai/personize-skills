# Schema Design Guide: Property Definitions and Display Types

| Display Type | Data Shape | When to Use | Auto-Detected By |
|---|---|---|---|
| `text` | String/number/boolean | Default for simple values | Default fallback |
| `number` | Numeric | Counts, scores, quantities | -- |
| `date` | ISO 8601 string | Dates, timestamps | -- |
| `select` | String (from options) | Single-choice categorical values | `options` field |
| `multi-select` | String array (from options) | Multi-choice categorical values | `options` field |
| `url` / `link` | URL string | Links, profile URLs | `url`, `link`, `website` in name |
| `email` | Email string | Email addresses | `email` in name (without `body`/`content`) |
| `phone` | Phone string | Phone numbers | -- |
| `currency` | Number | Monetary values | -- |
| `percent` | Number (0-100) | Percentages, ratios | -- |
| `rating` | Number (1-5) | Scores, satisfaction ratings | -- |
| `boolean` | true/false | Flags, toggles | -- |
| `json` | Object | Structured data blobs | Object value shape |
| `array` | Array | Lists, collections | Array value shape |
| `rich-text` | HTML/Markdown string | Long-form formatted content | `summary`, `notes`, `content` in name |

---

## Property Definition Anatomy

Every property in a Personize collection has these fields:

```typescript
{
    propertyName: string;    // kebab-case identifier (e.g., "job-title")
    type: string;            // text, number, date, select, multi-select, array, options
    description: string;     // CRITICAL: drives extraction accuracy (see below)
    options?: string;        // Comma-separated for select/multi-select
    autoSystem?: boolean;    // true = AI can extract/update from unstructured content
    updateSemantics?: string; // replace | append
    update?: boolean;        // true = entries can be modified after creation
    tags?: string[];         // For filtering and organization
    // AI extraction is always on for memory_store_pro. Use memory_update_property for code-managed values.
}
```

---

## Property Descriptions: The Extraction Optimizer

The `description` field is the single most important factor in extraction quality. It tells the AI extraction engine exactly what to look for and how to structure it.

### Good vs Bad Descriptions

**Bad (vague):**
```
description: "The person's role"
```

**Good (specific, with examples):**
```
description: "Current job title and role at their company. Extract the most specific title mentioned (e.g., 'VP of Engineering' not just 'VP'). If multiple titles are mentioned, use the most recent one."
```

**Bad (too broad):**
```
description: "Information about the company"
```

**Good (bounded and structured):**
```
description: "Company name, industry vertical, and approximate employee count. Format: '{company} - {industry} - {size range}'. Size ranges: startup (<50), SMB (50-500), mid-market (500-5000), enterprise (5000+)."
```

### Description Best Practices

1. **State what to extract** -- "Current job title" not "role information"
2. **Give format examples** -- "Format: '{city}, {state}'" or "ISO 8601 date"
3. **Handle ambiguity** -- "If multiple values, use the most recent"
4. **Set boundaries** -- "Max 3 items" or "One sentence summary"
5. **Include edge cases** -- "If not mentioned, leave empty (don't infer)"

---

## Display Type Deep Dive

### Text Types

#### `text` (default)
Plain inline text. Use for short string values.

```typescript
{ propertyName: 'job-title', type: 'text', description: 'Current job title' }
{ propertyName: 'company-name', type: 'text', description: 'Company they work at' }
```

#### `rich-text` / Long Text
Expandable text block. Auto-detected when property name contains: `summary`, `description`, `notes`, `content`, `body`, `context`, `script`, `playbook`, `section`, `introduction`, `overview`, `personalization`.

```typescript
{ propertyName: 'call-summary', type: 'text', description: 'Summary of latest sales call' }
// Renders as expandable block because "summary" is in the name
```

#### Email Viewer
Monospace bordered block. Auto-detected when property name contains `email` + (`body`, `content`, or `template`).

```typescript
{ propertyName: 'email-body', type: 'text', description: 'Full email content' }
// Renders as email viewer because "email" + "body" in name
```

### Numeric Types

#### `number`
Raw numeric value. Use for counts, scores, quantities.

```typescript
{ propertyName: 'employee-count', type: 'number', description: 'Approximate number of employees' }
```

#### `currency`
Monetary value. Display includes currency symbol.

```typescript
{ propertyName: 'deal-value', type: 'currency', description: 'Total deal value in USD' }
```

#### `percent`
Percentage value (0-100). Display includes % symbol.

```typescript
{ propertyName: 'win-probability', type: 'percent', description: 'Estimated probability of winning this deal (0-100)' }
```

#### `rating`
Score on a fixed scale (typically 1-5). Rendered as stars or dots.

```typescript
{ propertyName: 'satisfaction-score', type: 'rating', description: 'Customer satisfaction rating (1-5)' }
```

### Date Type

#### `date`
ISO 8601 date or datetime. Use for any temporal value.

```typescript
{ propertyName: 'last-contact-date', type: 'date', description: 'Date of most recent interaction (ISO 8601)' }
{ propertyName: 'renewal-date', type: 'date', description: 'Contract renewal date' }
```

### Selection Types

#### `select` (single choice)
One value from a predefined set. Define options as comma-separated string.

```typescript
{
    propertyName: 'deal-stage',
    type: 'options',
    options: 'prospect,qualified,negotiation,closed-won,closed-lost',
    description: 'Current stage in the sales pipeline',
}
```

#### `multi-select` (multiple choices)
Multiple values from a predefined set.

```typescript
{
    propertyName: 'product-interests',
    type: 'options',
    options: 'memory,governance,workspaces,pipelines,analytics',
    description: 'Which Personize products this contact has expressed interest in',
}
```

### Contact Types

#### `email`
Email address. Rendered as mailto link.

```typescript
{ propertyName: 'contact-email', type: 'text', description: 'Primary email address' }
```

#### `phone`
Phone number. Rendered with click-to-call.

```typescript
{ propertyName: 'phone-number', type: 'text', description: 'Primary phone number with country code' }
```

#### `url` / `link`
Clickable URL. Auto-detected when property name contains `url`, `link`, or `website`.

```typescript
{ propertyName: 'linkedin-url', type: 'text', description: 'LinkedIn profile URL' }
{ propertyName: 'company-website', type: 'text', description: 'Company website URL' }
```

### Boolean Type

#### `boolean`
True/false flag. Rendered as toggle or badge.

```typescript
{ propertyName: 'is-decision-maker', type: 'boolean', description: 'Whether this contact has purchasing authority' }
```

### Structured Types

#### `json`
Arbitrary JSON object. Rendered as key-value table.

```typescript
{
    propertyName: 'tech-stack',
    type: 'json',
    description: 'Technology stack: { frontend, backend, database, hosting, analytics }',
}
```

#### `array`
Ordered list of items. Rendered based on item shape (task cards, timeline, table).

```typescript
{
    propertyName: 'action-tasks',
    type: 'array',
    description: 'Action items with status. Each: { title, status (pending|done), owner, dueDate }',
}
```

---

## Auto-Detection: Property Names That Trigger Rich Rendering

The Personize dashboard auto-detects display types from property name keywords:

| Keywords in Name | Renders As | Examples |
|---|---|---|
| `email` + `body`/`content`/`template` | Email viewer | `email_body`, `email_content` |
| `summary`, `description`, `notes`, `content`, `body`, `context`, `script`, `playbook`, `overview` | Long text (expandable) | `call_summary`, `meeting_notes` |
| `task`, `todo`, `checklist` | Task cards | `action_tasks`, `meeting_todo` |
| `url`, `link`, `website` | Clickable link | `linkedin_url`, `company_website` |
| `image`, `photo`, `avatar`, `logo` | Image thumbnail | `company_logo`, `profile_photo` |

**No keyword match?** The value shape detector kicks in:
- Array of `{ name/title, status?, priority? }` -> Task cards
- Array of `{ title/name, date/timestamp }` -> Timeline
- Array of objects (other) -> Table
- Single object -> Key-value table
- `{ url, name/type }` -> File link

---

## JSON Value Shapes for Auto-Detection

Structure your extraction output in these shapes for automatic rich rendering:

### Task List Shape

```json
[
    { "name": "Follow up on proposal", "status": "open", "priority": "High", "dueDate": "2025-03-15", "owner": "John" }
]
```
Required: `name` or `title`. Optional: `status`, `priority`, `dueDate`, `owner`.

### Timeline Shape

```json
[
    { "title": "Discovery Call", "date": "2025-02-20", "type": "call", "description": "Discussed requirements" }
]
```
Required: `date`/`timestamp` + `title`/`name`. Optional: `type`, `description`.

### Table Shape

```json
[
    { "product": "Enterprise", "status": "Active", "value": "$50k", "renewal": "2025-12" }
]
```
Any array of objects without task/timeline keys. Up to 6 columns, 3 rows collapsed.

---

## Schema Design Patterns

### Pattern 1: Contact Schema (Sales)

```typescript
properties: [
    { propertyName: 'job-title', type: 'text', description: 'Current job title and role' },
    { propertyName: 'company-name', type: 'text', description: 'Company name' },
    { propertyName: 'deal-stage', type: 'options', options: 'prospect,qualified,negotiation,closed-won,closed-lost' },
    { propertyName: 'call-summary', type: 'text', description: 'Summary of latest sales call' },
    { propertyName: 'action-tasks', type: 'array', description: 'Next steps with status and owner' },
    { propertyName: 'linkedin-url', type: 'text', description: 'LinkedIn profile URL' },
    { propertyName: 'deal-value', type: 'currency', description: 'Estimated deal value in USD' },
    { propertyName: 'last-contact-date', type: 'date', description: 'Date of most recent interaction' },
]
```

### Pattern 2: Company Schema (Account Management)

```typescript
properties: [
    { propertyName: 'industry', type: 'text', description: 'Industry vertical (e.g., SaaS, Healthcare, Finance)' },
    { propertyName: 'employee-count', type: 'number', description: 'Approximate employee count' },
    { propertyName: 'tech-stack', type: 'json', description: 'Technology stack: { frontend, backend, database, hosting }' },
    { propertyName: 'health-score', type: 'rating', description: 'Account health (1-5)' },
    { propertyName: 'renewal-date', type: 'date', description: 'Contract renewal date' },
    { propertyName: 'company-website', type: 'text', description: 'Company website URL' },
    { propertyName: 'account-notes', type: 'text', description: 'Running notes about this account' },
]
```

### Pattern 3: Entity-Type-Aware Descriptions

For the best extraction quality, write descriptions that are entity-type-aware:

```typescript
// For Contact entity
description: 'Extract the person\'s current job title. Use the most specific title mentioned (VP of Engineering, not VP). If they changed roles recently, use the new title.'

// For Company entity
description: 'Company industry vertical. Use standard categories: SaaS, Healthcare, Finance, Education, Manufacturing, Retail, Media, Government, Non-profit. If unclear, use the closest match.'

// For Deal entity
description: 'Estimated total deal value in USD. Include expansion/upsell amounts if discussed. If a range was given, use the midpoint.'
```

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| Vague descriptions ("company info") | Be specific: "Company name, industry, and employee count range" |
| Too many properties at creation | Start with 5-8 core properties, add more as needs emerge |
| Missing `options` for categorical data | Define options upfront -- extraction accuracy improves 30-40% |
| Using `text` for everything | Use typed properties (number, date, boolean) for structured data |
| Not testing extraction | Memorize sample content and check extracted properties |
| Property names without keywords | Use keywords like `summary`, `url`, `tasks` for auto-detection |
| Descriptions without examples | Include format examples: "Format: '{city}, {state}'" |
