# Data Quality Patterns

| Check | How | When |
|-------|-----|------|
| Duplicate detection | REST/SDK retrieve mode:'similar', threshold > 0.9 | Before batch import |
| Missing identity keys | Validate email/website_url before memory_save | Every memory_save call |
| Stale records | memory_retrieve mode:'filter' with prefer_recent, flag inactive > 90 days | Weekly cleanup |
| Extraction quality | evaluate/memorization-accuracy on sample | After schema changes |
| Property conflicts | Source priority: CRM > manual > inferred | On merge/update |
| Malformed data | Validate email format, URL format before memory_save | Pre-processing |

Source priority for conflicting properties:
  1. CRM (hubspot, salesforce) -- system of record
  2. Human input (manual corrections)
  3. AI-extracted (may be wrong, lower confidence)
  4. Inferred (weakest signal)

Tag everything with source: source:crm, source:manual, source:ai, source:inferred (tags are set through a shortform save)
