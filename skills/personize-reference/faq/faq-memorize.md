# Memorize FAQ

**Q: How does AI extraction work with memory_store_pro?**
AI extraction is always on with `memory_store_pro` — it extracts structured properties and freeform memories from any content you store. For direct property writes without AI extraction (e.g., code-managed CRM fields), use `memory_update_property` instead.

**Q: Which identity key should I use?**
Use `email` for contacts/people, `website_url` for companies/organizations, and `record_id` when you have a direct Personize ID. Only one key is needed per call; Personize merges records automatically.

**Q: When should I use batch vs single memorize?**
Use batch for 10+ items — it shares extraction overhead and is more efficient. Use single when you need per-item extraction control or immediate confirmation of a specific record being stored.

**Q: What tags should I always include?**
Always include `source:X` (e.g. `source:hubspot`, `source:email`). Add type tags (`type:contact`, `type:deal`) and time context (`period:q1-2026`) when relevant. Tags boost recall relevance scoring.

**Q: Which tier should I choose?**
Use `basic` for pre-structured data (no AI extraction needed). Use `pro` (default) for most rich text. Use `ultra` for complex multi-entity documents where deep extraction quality matters most.

### What's the difference between memorize and memory/save?
They're the same endpoint. `POST /memory/save` is the canonical name. `POST /memorize` and `POST /memorize_pro` are aliases kept for backward compatibility.
