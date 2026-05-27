# CRM Keys FAQ

**Q: What are CRM keys?**
CRM keys are alias identifiers that link a Personize record to external systems — e.g. `hubspot_id:12345`, `salesforce_id:003xx`, or custom keys like `stripe_customer:cus_abc`. They let you look up records using your system's native IDs.

**Q: How do I add CRM keys to a record?**
Call `memory_update_keys` with the record's identity (`email` or `record_id`) and a `keys` object containing the aliases to add. Existing keys are preserved; only the new keys are added or updated.

**Q: Can one record have multiple CRM keys?**
Yes — a single record can hold any number of key aliases simultaneously: `email`, `hubspot_id`, `salesforce_id`, `stripe_customer_id`, and custom keys. All aliases resolve to the same record on lookup.

**Q: How do I add keys across many records at once?**
Use `updateKeysBatch` — pass an array of `{ identity, keys }` objects. Each entry adds aliases to one record. This is efficient for syncing a full CRM export without making one API call per record.
