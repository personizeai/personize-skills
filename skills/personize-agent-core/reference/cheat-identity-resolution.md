# Identity Resolution

## Quick Reference

| Scenario | Strategy |
|----------|----------|
| Same person, different emails | `memory_save` shape:"identifiers": add both as aliases |
| Company + contact in same content | `memory_save` with email + website_url (dual write) |
| CRM ID mapping | `memory_save` shape:"identifiers": add hubspot_id, salesforce_id as custom keys |
| Dedup before import | REST/SDK retrieve mode:'similar' on seed records, merge if score > 0.9 |
| Name only, no email | name + parent_identifier (weaker, use as last resort) |

## Multi-Source Import Workflow

When the same entity exists across multiple sources (Apollo, HubSpot, LinkedIn, manual):

1. **First import** (e.g., Apollo CSV): `memory_save` with `email` as primary key, tag `source:apollo` (via a shortform save)
2. **Second import** (e.g., HubSpot): before saving, check if email already exists via `memory_retrieve`
   - If exists: `memory_save` shape:"identifiers" to add `hubspot_id` as alias. New content merges into same record.
   - If new: `memory_save` normally, tag `source:hubspot` (via a shortform save)
3. **Dedup pass**: after import, run a similar-records lookup (REST/SDK `retrieve` with `mode:'similar'`) across records. Surface potential duplicates (score > 0.85) to user for manual review.
4. **Link CRM IDs**: `memory_save` shape:"identifiers" to add external IDs (hubspot_id, salesforce_id, apollo_id) as custom keys. This enables lookup by CRM ID in future syncs.

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
memory_save(shape="identifiers", record={email:"john@acme.com"}, add=[{name:"hubspot_id", value:"hs_12345"}])

# Batch key linking (max 100 records, 50 keys each): one memory_save shape:"identifiers" call per record
memory_save(shape="identifiers", record={email:"john@acme.com"}, add=[{name:"hubspot_id", value:"hs_12345"}])
memory_save(shape="identifiers", record={email:"jane@corp.com"}, add=[{name:"salesforce_id", value:"sf_67890"}])

# Verify keys
memory_retrieve(mode='fetch', record={email:"john@acme.com"}, fetch:{identifiers:true}) → shows all aliases
```

## Rules

MUST check for existing records before creating new ones.
MUST NOT create duplicate records -- always provide identity keys.
MUST tag imports with source for conflict resolution, using a shortform save (property/identifiers saves do not carry tags).
SHOULD run a similar-records lookup (REST/SDK) after bulk imports to catch near-duplicates.
