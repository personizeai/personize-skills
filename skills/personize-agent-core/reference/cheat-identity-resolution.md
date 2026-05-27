# Identity Resolution

## Quick Reference

| Scenario | Strategy |
|----------|----------|
| Same person, different emails | `update_keys`: add both as aliases |
| Company + contact in same content | Memorize with email + website_url (dual write) |
| CRM ID mapping | `update_keys`: add hubspot_id, salesforce_id as custom keys |
| Dedup before import | `memory_find_similar` on seed records, merge if score > 0.9 |
| Name only, no email | name + parent_identifier (weaker, use as last resort) |

## Multi-Source Import Workflow

When the same entity exists across multiple sources (Apollo, HubSpot, LinkedIn, manual):

1. **First import** (e.g., Apollo CSV): memorize with `email` as primary key, tag `source:apollo`
2. **Second import** (e.g., HubSpot): before memorizing, check if email already exists via `smartRecall`
   - If exists: `update_keys` to add `hubspot_id` as alias. New content merges into same record.
   - If new: memorize normally, tag `source:hubspot`
3. **Dedup pass**: after import, run `memory_find_similar` across records. Surface potential duplicates (score > 0.85) to user for manual review.
4. **Link CRM IDs**: `update_keys` to add external IDs (hubspot_id, salesforce_id, apollo_id) as custom keys. This enables lookup by CRM ID in future syncs.

## Property Conflict Resolution

When two sources have different values for the same property (e.g., Apollo says "Series A", HubSpot says "Series B"):

| Source | Priority | Why |
|--------|----------|-----|
| CRM (HubSpot, Salesforce) | Highest | System of record, human-maintained |
| User input (manual correction) | High | Explicit human decision |
| AI-extracted (from content) | Medium | May be wrong, depends on extraction quality |
| Inferred (from signals) | Lowest | Weakest signal |

Tag every import with source. When conflicts arise, higher-priority source wins.

## Key Linking Patterns

```
# Single key addition
update_keys(email="john@acme.com", keys=[{keyName:"hubspot_id", keyValue:"hs_12345"}])

# Batch key linking (max 100 records, 50 keys each)
updateKeysBatch(records=[
  {email:"john@acme.com", keys:[{keyName:"hubspot_id", keyValue:"hs_12345"}]},
  {email:"jane@corp.com", keys:[{keyName:"salesforce_id", keyValue:"sf_67890"}]}
])

# Verify keys
list_keys(email="john@acme.com") → shows all aliases
```

## Rules

MUST check for existing records before creating new ones.
MUST NOT create duplicate records -- always provide identity keys.
MUST tag imports with source for conflict resolution.
SHOULD run `memory_find_similar` after bulk imports to catch near-duplicates.
