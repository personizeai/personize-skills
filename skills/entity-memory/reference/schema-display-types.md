# Reference: Schema Display Types

How property names and JSON value shapes affect rendering in the Personize dashboard. Use this when designing collections (`collections.create()`) to get rich UI components for free.

---

## How It Works

The dashboard auto-detects display types from **two signals**, checked in order:

1. **Property name keywords** — zero-cost string matching on the property name
2. **Value shape** — inspects the actual JSON structure at render time

You control signal #1 at schema design time. Signal #2 kicks in automatically based on what your extraction produces.

---

## Property Name Keywords (Auto-Detection)

Name your properties to include these keywords and the dashboard renders them as rich components automatically:

| Keywords in property name | Renders as | Example property names |
|---|---|---|
| `email` + (`body` / `content` / `template`) | Email viewer (monospace, bordered) | `email_body`, `email_content` |
| `summary`, `description`, `notes`, `content`, `body`, `context`, `script`, `playbook`, `section`, `introduction`, `overview`, `personalization` | Long text (expandable block) | `call_summary`, `meeting_notes`, `product_description` |
| `task`, `todo`, `checklist` | Task cards (checkbox + status badges) | `action_tasks`, `meeting_todo` |
| `url`, `link`, `website` | Clickable link | `linkedin_url`, `company_website` |
| `image`, `photo`, `avatar`, `logo` | Image thumbnail (click to zoom) | `company_logo`, `profile_photo` |

**No keyword match?** Rendered as plain text. The value-shape detector (Layer 2) may still upgrade it.

### Naming Cheat Sheet

```
Good (auto-detected):
  "call_summary"          → long-text
  "email_body"            → email
  "action_tasks"          → task cards
  "linkedin_url"          → link
  "company_logo"          → image
  "meeting_notes"         → long-text
  "personalization_intro" → long-text
  "playbook_section"      → long-text

Plain text (no keyword match):
  "status"                → plain text
  "score"                 → plain text
  "category"              → plain text
```

---

## JSON Value Shapes (Auto-Detection)

If the property name doesn't match any keyword, the dashboard inspects the value. Structure your extraction output in these shapes for automatic rich rendering:

### Task List

```json
[
  {
    "name": "Follow up on proposal",
    "status": "open",
    "priority": "High",
    "dueDate": "2025-03-15",
    "owner": "John"
  }
]
```

**Required:** `name` or `title` field. **Optional:** `status`, `priority`, `dueDate`, `owner`.
Renders as checkbox cards with status/priority badges. Collapsed to 5 items by default.

### Timeline / Events

```json
[
  {
    "title": "Discovery Call",
    "date": "2025-02-20",
    "type": "call",
    "description": "Discussed requirements and timeline"
  }
]
```

**Required:** `date` or `timestamp` field, plus `title` or `name`. **Optional:** `type` (badge), `description`.
Renders as vertical dot timeline. Collapsed to 5 items by default.

### Tabular Data

```json
[
  { "product": "Enterprise", "status": "Active", "value": "$50k", "renewal": "2025-12" }
]
```

Any array of objects without `name`/`title`/`date` keys → rendered as a table with sticky headers. Up to 6 columns, cells truncated at 80 chars. Collapsed to 3 rows by default.

### File Reference

```json
{
  "url": "https://storage.example.com/doc.pdf",
  "name": "Q4_Report.pdf",
  "type": "application/pdf",
  "size": "2.4 MB"
}
```

**Required:** `url` + (`name` or `type`). Renders as file icon + download link.

### Single Object (Key-Value)

```json
{ "industry": "Technology", "employees": 500, "revenue": "$10M" }
```

Any single object → rendered as a one-row table with keys as columns.

---

## All Supported Display Types

### Text

| Type | Rendering | Data Shape |
|---|---|---|
| `auto` / `text` | Plain inline text, arrays as badges | String, number, boolean, scalar arrays |
| `long-text` | Monospace block, expandable (3-line clamp) | String |
| `badge` | Single colored badge | Scalar value |

### Rich Content

| Type | Rendering | Data Shape |
|---|---|---|
| `email` | Monospace email body, bordered, expandable | String |
| `html` | Rendered HTML with Preview/Source toggle | HTML string |

### Structured Data

| Type | Rendering | Data Shape |
|---|---|---|
| `json-table` | Table with sticky headers, 6 cols max, 3 rows collapsed | Array of objects or single object |
| `task` | Checkbox cards with status/priority/owner badges, 5 items collapsed | Array of `{name, status?, priority?, dueDate?, owner?}` |
| `timeline` | Vertical dot timeline with date/type badges, 5 items collapsed | Array of `{title, date?, type?, description?}` |

### Media

| Type | Rendering | Data Shape |
|---|---|---|
| `image` | Clickable thumbnail with modal zoom | URL string |
| `image-gallery` | Thumbnail grid with modal zoom | Array of URL strings |
| `file-link` | File icon + download link | `{url, name?, type?, size?}` or URL string |
| `audio` | HTML5 audio player | URL string |
| `video` | HTML5 video player | URL string |
| `link` | Clickable external link with icon | URL string |

---

## Applying This to Schema Design

When creating collections, combine property naming (for auto-detection) with good `description` fields (for extraction accuracy):

```typescript
await client.collections.create({
  name: 'Sales Contacts',
  entityType: 'Contact',
  properties: [
    // Plain text — no special rendering needed
    { name: 'job-title', type: 'text', description: 'Current role and title' },
    { name: 'company-name', type: 'text', description: 'Company they work for' },

    // Long text — keyword "summary" triggers expandable block
    { name: 'call-summary', type: 'text', description: 'Summary of latest sales call' },

    // Long text — keyword "notes" triggers expandable block
    { name: 'meeting-notes', type: 'text', description: 'Raw notes from meetings' },

    // Task list — keyword "tasks" + JSON shape triggers task cards
    { name: 'action-tasks', type: 'array', description: 'Action items with status and owner' },

    // Link — keyword "url" triggers clickable link
    { name: 'linkedin-url', type: 'text', description: 'LinkedIn profile URL' },

    // Options — rendered as badge
    { name: 'deal-stage', type: 'options', options: 'prospect,qualified,negotiation,closed-won,closed-lost' },
  ],
});
```

### Skill Output → Property Name Mapping

When your AI agents or pipelines write extracted data back to memory, use these property names for optimal rendering:

| Output content | Suggested property name | Auto-detected as |
|---|---|---|
| Call transcript summary | `call_summary` | long-text |
| Email draft | `email_body` or `email_content` | email |
| Competitor analysis | `competitor_overview` | long-text |
| Action items from meeting | `meeting_tasks` or `action_todo` | task cards |
| Interaction history | `interaction_timeline` | timeline (via value shape) |
| Company profile data | `company_profile` | json-table (via value shape) |
| LinkedIn profile URL | `linkedin_url` | link |
| Company logo | `company_logo` | image |
| Personalized intro | `personalization_intro` | long-text |
| Sales playbook section | `playbook_section` | long-text |
| Objection handling guide | `objection_handling` | long-text |
