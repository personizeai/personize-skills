# Property Schemas

Property schemas define the typed, structured information that the dual extraction pipeline extracts alongside open-set facts. Each schema is a collection of property definitions with names, types, descriptions, and extraction hints.

## Schema Structure

A property collection contains:

```json
{
  "id": "col_sales_contacts",
  "name": "Sales Contact Properties",
  "entityType": "Contact",
  "description": "Properties extracted from sales interactions with contacts.",
  "properties": [
    {
      "id": "prop_tech_stack",
      "name": "Technology Stack",
      "systemName": "technology_stack",
      "type": "text",
      "description": "The primary technology infrastructure used by the company...",
      "extractionHints": "Look for mentions of programming languages, frameworks, cloud platforms..."
    }
  ]
}
```

## Property Types

| Type | Description | Example Value |
|---|---|---|
| `text` | Free-form text | `"AWS, React, PostgreSQL"` |
| `number` | Numeric value | `450000` |
| `date` | ISO 8601 date | `"2026-03-15"` |
| `boolean` | True/false | `true` |
| `options` | One of predefined values | `"Enterprise"` (from: Startup, Mid-Market, Enterprise) |
| `array` | List of values | `["Python", "Java", "Go"]` |

## Schema Definition

See [`property-definition-schema.json`](property-definition-schema.json) for the JSON Schema that property definitions must conform to.

## Examples

| Example | Description |
|---|---|
| [`examples/sales-contact-schema.json`](examples/sales-contact-schema.json) | Properties for sales contact enrichment |
| [`examples/support-ticket-schema.json`](examples/support-ticket-schema.json) | Properties for support ticket classification |

## Schema Lifecycle

Schemas are not static. The system supports:

1. **AI-Assisted Authoring** -- Generate schemas from natural language descriptions
2. **Interactive Enhancement** -- Refine individual properties through natural language feedback
3. **Automated Refinement** -- Per-property diagnosis and optimization based on extraction performance

See the [paper (Section 7)](../paper/) for the full schema lifecycle architecture.

## Writing Effective Property Definitions

The quality of extraction depends heavily on property descriptions. Good descriptions:

- **Specify scope clearly** -- "The primary technology stack" vs "The company's technology" (too vague)
- **Include examples** -- "e.g., Python, Java, React, AWS"
- **Define boundaries** -- "Focus on infrastructure decisions, not product/SaaS tool usage"
- **Note edge cases** -- "If multiple values exist, return the primary/current one"
- **Match the content type** -- Descriptions should reference the kind of content being processed (transcripts, emails, etc.)

See the worked example in the paper (Section 7.7) for a before/after refinement illustration.
