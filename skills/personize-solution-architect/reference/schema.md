# Action: SCHEMA — Design Memory Schemas

Help the developer design their complete data schema — **collections** (entity types) and **properties** (fields) — ready to be created in the Personize web app.

> **Principle:** A well-designed schema is the foundation of great personalization. The AI can only extract, recall, and reason about what the schema defines. Invest time here — it pays compound interest on every pipeline you build later.

---

## Schema Reference Files

This action includes ready-to-use schema definitions and examples:

| File | Contents |
|---|---|
| `reference/schemas/property-definition-schema.json` | JSON Schema (draft 2020-12) defining valid property fields — use to validate designs |
| `reference/schemas/property-definition-schema.json` | Also includes property types, schema lifecycle, and constraints for valid designs |
| **Core Entity Schemas** | |
| `reference/schemas/examples/contact-schema.json` | 19-property Contact schema — profile fields + AI-extracted relationship intelligence (personas, pain points, sentiment, ICP match) |
| `reference/schemas/examples/company-schema.json` | 17-property Company schema — enrichment firmographics + AI signals (ICPs, buying signals, account health, competitors) |
| `reference/schemas/examples/employee-schema.json` | 18-property Employee schema — HR profile data + AI insights (skills, career goals, flight risk, performance trend) |
| `reference/schemas/examples/member-schema.json` | 16-property Member schema — registration data + AI engagement intelligence (expertise, goals, satisfaction, mentor/mentee) |
| `reference/schemas/examples/product-user-schema.json` | 18-property Product User schema — system data + AI signals (use case, friction points, churn risk, expansion ready) |
| **Operational Schemas** | |
| `reference/schemas/examples/agent-memory-schema.json` | 8-property Agent Memory schema — the AI agent's workspace (context, tasks, insights, decisions, alerts, monitors, messages sent) |
| **Use-Case Schemas** | |
| `reference/schemas/examples/sales-contact-schema.json` | 10-property sales-specific overlay (Deal Stage, Deal Value, Expected Close Date, Competitors Mentioned) |
| `reference/schemas/examples/support-ticket-schema.json` | 8-property support ticket classification (Issue Category, Severity, Sentiment, Resolution Status) |
| `reference/schemas/examples/pulse-agent-schema.json` | Original 6-property Pulse schema (legacy — see agent-memory-schema.json for the refined version) |

**Before designing a schema**, read the relevant example file to ground your recommendations in proven patterns.

---

## When to Use This Action

- Developer is starting fresh and needs to decide what data to track
- Developer wants to add a new collection for a new use case
- Developer has data sources (CRM, transcripts, emails) and needs structured fields to extract into
- Developer says "what should my schema look like?" or "how should I organize my data?"

---

## Collections Can Be Created via SDK or Web App

Collections and properties can be designed and created via the **Personize web app** or programmatically via the SDK. The SDK provides full CRUD + history: `client.collections.list()`, `.create()`, `.update()`, `.delete()`, `.history(id, { mode: 'diff' })`.

**Your role in this action is to:**
1. Help the developer **design** the right collections and properties
2. Output a ready-to-use schema specification, then create it with `client.collections.create()` or guide the developer to create it in the web app
3. Verify the schema was created with `client.collections.list()`

---

## Schema Design Workflow

### Phase 1: Understand the Data Landscape

Ask these questions (2-3 at a time, conversationally):

1. **What types of entities does your product deal with?**
   - People (contacts, leads, users, patients, students)?
   - Organizations (companies, accounts, vendors)?
   - Objects (deals, tickets, orders, listings)?
   - Content (articles, campaigns, products)?

2. **What data sources feed into these entities?**
   - CRM data (HubSpot, Salesforce)
   - Call transcripts (Gong, Fireflies)
   - Email threads
   - Support tickets (Zendesk, Intercom)
   - Product usage events
   - Manual notes

3. **What does your team need to know about each entity to personalize?**
   - Identity facts (who they are)
   - Behavioral patterns (what they do)
   - Preferences (what they want)
   - Status/stage (where they are in a journey)
   - Relationships (who they're connected to)

4. **What decisions do you make based on knowing about an entity?**
   - This reveals what properties actually matter for personalization

### Phase 2: Design Collections

For each entity type the developer needs, propose a collection with these attributes:

#### Collection (Entity Type) Specification

| Field | Description | Example |
|-------|-------------|---------|
| **name** | Singular name | `Contact` |
| **pluralLabel** | Plural for UI | `Contacts` |
| **slug** | Machine ID (lowercase, underscores, starts with letter) | `contact` |
| **description** | What this entity represents | `Individual people your organization interacts with` |
| **icon** | Lucide icon name | `User`, `Building2`, `ShoppingCart`, `Ticket` |
| **color** | Hex color for UI | `#3B82F6` |
| **primaryKeyField** | Property systemName used as unique ID | `email` |
| **identifierColumn** | Vector store field mapping | `email`, `websiteUrl`, `phoneNumber`, `postalCode`, `deviceId`, `contentId` |

#### Collection Recommendations by Product Type

| Product Type | Recommended Collections | Primary Key | Identifier Column |
|---|---|---|---|
| **B2B SaaS** | Contacts, Companies, Deals | email / websiteUrl / email | email / websiteUrl / email |
| **E-commerce** | Customers, Products, Orders | email / contentId / email | email / contentId / email |
| **Marketplace** | Buyers, Sellers, Listings | email / email / contentId | email / email / contentId |
| **Content Platform** | Users, Content, Subscriptions | email / contentId / email | email / contentId / email |
| **MSP / IT Services** | Clients, Endpoints, Tickets | email / deviceId / email | email / deviceId / email |
| **Healthcare** | Patients, Providers, Appointments | email / email / email | email / email / email |
| **Education** | Students, Courses, Enrollments | email / contentId / email | email / contentId / email |
| **Real Estate** | Contacts, Properties, Listings | email / contentId / contentId | email / contentId / contentId |
| **Recruiting** | Candidates, Positions, Clients | email / contentId / email | email / contentId / email |
| **Financial Services** | Clients, Accounts, Advisors | email / email / email | email / email / email |

#### System Collections

Contact and Company are **system collections** — auto-created and cannot be deleted. The developer already has them. Additional collections are custom.

**Available templates** (quick-add in the web app):
Employee, Partner, Subscriber, Citizen, Member, Student, Mobile Contact, Mobile Citizen

### Phase 3: Design Properties for Each Collection

For each collection, design the properties (fields) that the AI will extract and track.

#### Property Field Specification

| Field | Required | Description |
|-------|----------|-------------|
| **propertyName** | Yes | Display name (e.g., `Job Title`) |
| **systemName** | Auto-generated | Lowercase underscore form (e.g., `job_title`) — auto-generated from propertyName, immutable after creation |
| **type** | Yes | One of: `text`, `number`, `date`, `boolean`, `options`, `array` |
| **options** | If type=options | Comma-separated allowed values (e.g., `Discovery, Qualification, Proposal, Negotiation, Closed Won, Closed Lost`) |
| **description** | Yes (critical) | Detailed extraction instructions for the AI — this is the MOST important field |
| **autoSystem** | Optional | UI helper — when true, systemName is auto-generated from propertyName. |
| **update** | Optional | `true` (replace) / `false` (append). `true` for current-state fields (title, stage). `false` for accumulating data (pain points, notes). |
| **tags** | Optional | Tags for property selection boosting. +15% score boost per match. Common: identity, firmographic, qualification, engagement, ai-extracted. |

#### The `update` Flag and AI Agent Property Operations

The `update` boolean on each property tells AI agents which properties they can overwrite vs which they should append to:

- **`update: true`** (replaceable) — The property holds current-state data (e.g., job title, deal stage). AI agents can use `set` operations to replace the value. The `memory_update_property` MCP tool enforces this server-side.
- **`update: false`** (append-only) — The property accumulates data over time (e.g., pain points, interaction notes). AI agents can only `push` new values. Attempts to `set` will be rejected.

The `POST /api/v1/properties` endpoint returns each property with its `update` flag, so AI agents can inspect which operations are allowed before writing. Response fields per property: `name`, `value`, `type`, `description`, `update`, `collectionId`, `collectionName`.

#### How to Think About Tags

Tags answer: **"When should this property be extracted?"** During memorization, Personize uses vector similarity to decide which properties to extract from a piece of content. Tags give specific properties a boost when the memorize request includes matching tags — making extraction context-aware rather than purely similarity-based.

**Why this matters:** Without tags, property selection relies entirely on how well a property's name and description match the content's embedding. A property like "First Name" has weak similarity to most content (it matches *everything* weakly), so it might be skipped in favor of more content-specific properties. By tagging it `["identity"]` and passing `tags: ["identity"]` on your memorize call, you guarantee it gets a +15% boost and stays in the selection set.

**How to assign tags — think in categories:**

| Tag | Use for | Example properties |
|---|---|---|
| `identity` | Who someone is — always worth capturing | First Name, Last Name, Email, Phone, LinkedIn |
| `firmographic` | Company-level facts | Industry, Company Size, Revenue, Country |
| `qualification` | Sales/pipeline relevance | Job Level, Decision Maker, Budget, ICP Match |
| `engagement` | Interaction signals | Email Opens, Sentiment, Responsiveness |
| `ai-extracted` | Fields the AI infers (not from CRM) | Pain Points, Personas, Communication Style |
| `enrichment` | Data from external sources | LinkedIn URL, Tech Stack, Purchase Timeline |
| `pipeline` | Deal-specific progression | Deal Stage, Expected Close, Next Steps |
| `messaging` | Used for personalized content | Pain Points, Interests, Communication Style |

**Rules of thumb:**
- A property should have 1-3 tags. More is noise.
- If two properties always need to be extracted together, give them the same tag.
- Tags on the memorize request should match the *purpose* of the content: CRM sync → `["identity", "firmographic"]`, call notes → `["qualification", "ai-extracted"]`, engagement webhook → `["engagement"]`.

#### API Field Format

The API accepts two equivalent formats for property definitions:

| Field | Native Format | Human-Friendly Format |
|---|---|---|
| **Property name** | `propertyName: "Job Title"` | `name: "Job Title"` |
| **Options** | `options: "A, B, C"` (comma-separated string) | `options: ["A", "B", "C"]` (array) |
| **Update behavior** | `update: true` (replace) / `update: false` (append) | `updateSemantics: "replace"` / `updateSemantics: "append"` |

Both formats are accepted on every write endpoint (`saveAction`, `collections.create`, `collections.update`). The human-friendly format is auto-normalized to the native format on save. The example schema files in `reference/schemas/examples/` use the human-friendly format.

#### Property Types Reference

| Type | When to Use | Example Value | Notes |
|---|---|---|---|
| **text** | Free-form information | `"VP of Engineering"` | Best for identity, descriptions, notes |
| **number** | Numeric metrics | `450000` | Revenue, counts, scores |
| **date** | Temporal data | `"2026-03-15"` | ISO 8601 format |
| **boolean** | Yes/no flags | `true` | Decision-maker, opt-in status |
| **options** | Constrained categories | `"Enterprise"` | Must define allowed values |
| **array** | Multi-value lists | `["Python", "React"]` | Pain points, tags, skills |

#### Property Categories and Design Patterns

| Category | autoSystem | update (replace) | Examples |
|---|---|---|---|
| **Identity** (structured facts) | `true` | `true` (replace) | email, name, title, company, plan_tier |
| **Metrics** (numeric tracking) | `true` | `true` (replace) | login_count, revenue, nps_score |
| **Dates** (temporal markers) | `true` | `true` (replace) | created_at, last_active, trial_ends |
| **Status/Stage** (current state) | `true` | `true` (replace) | deal_stage, onboarding_step, health_score |
| **Rich text** (unstructured) | `true` | `false` (append) | notes, call_summaries, feedback |
| **Lists** (accumulating) | `true` | `false` (append) | pain_points, feature_requests, competitors |
| **Generated content** | `false` | `true` (replace) | last_email_sent, last_recommendation |

### Phase 4: Write Descriptions That Drive Great Extraction

The `description` field is the single most important factor in extraction quality. Coach the developer on writing great descriptions:

#### Description Writing Rules

1. **Specify scope clearly** — "The contact's current job title or role" vs "Title" (too vague)
2. **Include examples** — "e.g., VP of Engineering, Head of Product, Senior Developer"
3. **Define boundaries** — "Focus on their role at the current company, not past positions"
4. **Handle ambiguity** — "If multiple titles are mentioned, use the most recent or primary one"
5. **Match the content type** — Reference what kind of content will be processed (emails, transcripts, tickets, etc.)
6. **Guide formatting** — "Each pain point should be a concise phrase (5-15 words)"

#### Good vs Bad Descriptions

**Bad:**
```
"The company's technology"
```

**Good:**
```
"The primary technology infrastructure used by the contact's company, including programming languages (e.g., Python, Java), frameworks (e.g., React, Django), cloud platforms (e.g., AWS, Azure), and databases (e.g., PostgreSQL, MongoDB). Focus on technical stack decisions rather than product or SaaS tool usage."
```

**Bad:**
```
"Deal stage"
```

**Good:**
```
"Current stage of the sales process with this contact. Infer from conversation context: initial outreach = Discovery, product discussion = Qualification, pricing discussed = Proposal, contract terms = Negotiation."
```

---

## Output Format

When presenting the designed schema to the developer, use this format for each collection:

### Collection: [Name]

```
Entity Type:
  Name:            [Singular name]
  Plural:          [Plural name]
  Slug:            [lowercase_underscored]
  Description:     [What this entity represents]
  Icon:            [Lucide icon name]
  Color:           [Hex color]
  Primary Key:     [systemName of the unique ID property]
  Identifier:      [email | websiteUrl | phoneNumber | postalCode | deviceId | contentId]
```

Then for each property:

```
Property: [Display Name]
  System Name:     [auto: lowercase_underscored]
  Type:            [text | number | date | boolean | options | array]
  Options:         [comma-separated values, if type=options]
  Auto Extract:    [true/false]
  Update Mode:     [replace/append]
  Description:     [Detailed extraction instructions]
```

### Full Example: B2B SaaS Contact Collection

```
Entity Type:
  Name:            Contact
  Plural:          Contacts
  Slug:            contact
  Description:     Individual people your organization interacts with — prospects, customers, and partners.
  Icon:            User
  Color:           #3B82F6
  Primary Key:     email
  Identifier:      email
```

```
Property: Job Title
  System Name:     job_title
  Type:            text
  Auto Extract:    true
  Update Mode:     replace
  Description:     The contact's current job title or role. Extract the most specific title mentioned
                   (e.g., 'VP of Engineering' rather than just 'VP'). If multiple titles are mentioned,
                   use the most recent or primary one.

Property: Company Name
  System Name:     company_name
  Type:            text
  Auto Extract:    true
  Update Mode:     replace
  Description:     The name of the company or organization the contact works for. Use the formal
                   company name, not abbreviations (e.g., 'Acme Corporation' not 'Acme').

Property: Company Size
  System Name:     company_size
  Type:            options
  Options:         1-10, 11-50, 51-200, 201-1000, 1000+
  Auto Extract:    true
  Update Mode:     replace
  Description:     The approximate size of the contact's company by employee count. Infer from
                   explicit mentions or contextual clues (e.g., 'our team of 50 engineers' suggests
                   mid-market).

Property: Deal Stage
  System Name:     deal_stage
  Type:            options
  Options:         Discovery, Qualification, Proposal, Negotiation, Closed Won, Closed Lost
  Auto Extract:    true
  Update Mode:     replace
  Description:     Current stage of the sales process with this contact. Infer from conversation
                   context: initial outreach = Discovery, product discussion = Qualification,
                   pricing discussed = Proposal, contract terms = Negotiation.

Property: Pain Points
  System Name:     pain_points
  Type:            array
  Auto Extract:    true
  Update Mode:     append
  Description:     Business problems or challenges the contact has expressed. Each pain point should
                   be a concise phrase (5-15 words). Extract both explicitly stated problems and
                   strongly implied ones. Examples: 'slow deployment cycles', 'vendor lock-in concerns'.

Property: Decision Maker
  System Name:     decision_maker
  Type:            boolean
  Auto Extract:    true
  Update Mode:     replace
  Description:     Whether this contact has final purchasing authority. True if they explicitly state
                   they can sign, approve budget, or make the decision. False if they mention needing
                   approval from someone else.

Property: Next Steps
  System Name:     next_steps
  Type:            text
  Auto Extract:    true
  Update Mode:     replace
  Description:     The agreed-upon next actions from the most recent interaction. Include who is
                   responsible, what they will do, and any timeline mentioned.
```

---

## Schema Starter Templates

Use these as starting points, then customize based on the developer's specific needs.

### Sales / Revenue Team

| Collection | Properties to Include |
|---|---|
| **Contacts** | job_title, company_name, company_size, industry, deal_value, deal_stage, expected_close_date, pain_points, decision_maker, competitors_mentioned, next_steps, communication_preference |
| **Companies** | industry, employee_count, annual_revenue, technology_stack, fiscal_year_end, key_decision_makers, active_deals_count |
| **Deals** | deal_name, deal_value, stage, probability, close_date, primary_contact, competition, proposal_status |

### Customer Success

| Collection | Properties to Include |
|---|---|
| **Contacts** | account_tier, health_score, last_login, feature_adoption, nps_score, renewal_date, escalation_history, primary_use_case |
| **Companies** | mrr, contract_start, contract_end, seats_purchased, seats_active, integration_count, support_tickets_open |
| **Tickets** | issue_category, severity, product_area, steps_to_reproduce, error_message, customer_sentiment, resolution_status |

### Marketing

| Collection | Properties to Include |
|---|---|
| **Contacts** | lead_source, lead_score, icp_match, content_engagement, webinar_attendance, email_open_rate, last_campaign_response, persona_segment |
| **Companies** | target_account, industry_vertical, buying_signals, intent_score, competitor_customer |
| **Campaigns** | campaign_name, channel, audience_segment, send_date, open_rate, click_rate, conversion_rate, top_performing_variant |

### Product / Engineering

| Collection | Properties to Include |
|---|---|
| **Contacts** (Users) | signup_date, onboarding_completed, feature_usage, last_active, plan_tier, api_usage, integration_setup, feedback_submitted |
| **Feature Requests** | feature_name, requester_count, priority, status, related_tickets, estimated_impact |

### Recruiting

| Collection | Properties to Include |
|---|---|
| **Candidates** | current_role, desired_role, skills, experience_years, salary_expectation, availability, interview_stage, culture_fit_notes, references |
| **Positions** | title, department, location, salary_range, required_skills, hiring_manager, pipeline_stage, time_to_fill |
| **Clients** | company_name, industry, engagement_type, fee_structure, active_positions, key_contact |

### Healthcare

| Collection | Properties to Include |
|---|---|
| **Patients** | primary_condition, medications, allergies, last_visit, next_appointment, provider_assigned, insurance_type, care_plan_status |
| **Providers** | specialty, availability, patient_load, certifications, location |

---

## Verification Step

After the developer creates the collections and properties in the web app, verify with:

```typescript
const collections = await client.collections.list();
console.log(JSON.stringify(collections, null, 2));
```

Check that:
- All designed collections appear
- Property names and types match the design
- `entityType` values are correct
- Properties with `options` type have the right allowed values

Then use the real `collectionId` and `collectionName` values in `memorizeBatch()` mappings:

```typescript
await client.memory.memorizeBatch({
    items: records.map(record => ({
        content: record.notes || '',
        email: record.email,
        enhanced: true,
        collectionName: 'Sales Contact Properties',  // exact name from collections.list()
        tags: ['crm', 'sync'],
        properties: {
            job_title: record.title,
            company_name: record.company,
            deal_stage: record.stage,
            // ... map each property by systemName
        },
    })),
});
```

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| Too many properties per collection | Start with 5-10 high-value properties. Add more as you learn what the AI extracts well. |
| Vague descriptions | Be specific. "Technology" → "Primary technology stack including languages, frameworks, and cloud platforms" |
| Using `text` when `options` is better | If there are < 15 known categories, use `options` for consistent extraction |
| All properties set to `replace` | Use `append` for accumulating data: pain points, feature requests, interaction history |
| Missing `autoSystem: true` | If you want the AI to extract this property automatically during memorization, it must be `true` |
| No verification after creation | Always run `client.collections.list()` to confirm the schema was created correctly |
| Designing properties the data won't support | Match properties to actual data sources. Don't create `salary_range` if no salary data flows in. |
