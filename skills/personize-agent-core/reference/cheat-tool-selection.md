# Tool Selection Quick Reference

Three verbs: save, retrieve, delete. Name the target with the `record` block (for example `record:{email}`).

| Task | Tool | Key Params |
|------|------|-----------|
| Store rich text/notes/transcripts | memory_save | content, record:{email}, tier:"pro" (default shortform shape; no `shape` needed) |
| Store structured data (direct write, known field values) | memory_save | shape:"property", record:{email}, operations:[{op:'set', property, value}] |
| Batch store content needing AI extraction | memory_save | shape:"shortform", items[] (do not put `identifiers` inside `items[]`) |
| Any retrieval (default, fast) | memory_retrieve | mode:'scout', record:{email}, message |
| Full entity picture | memory_retrieve | mode:'brief', record:{email} |
| Specific question (deep, synthesized) | memory_retrieve | mode:'brief', record:{email}, message |
| Read specific properties | memory_retrieve | mode:'fetch', fetch:{recordIds:[id]} (resolve the id first) |
| Search/filter records | memory_retrieve | mode:'filter', filters, limit |
| Update single property | memory_save | shape:"property", record:{email}, operations:[{op:'set', property, value}] |
| Add workspace task | memory_save | shape:"property", record:{email}, operations:[{op:'push', property:'Tasks', value}] |
| Delete a record, memory or property | memory_delete | type, record:{id, entityType} (record) or record:{id} + propertyNames (type:'property') or ids:[...] (memory); resolve the id first, record:{email} is rejected |
| Find similar records | REST/SDK only | retrieve mode:'similar' with a seed (not available on MCP) |
| Create or evolve a guideline/doc | memory_save (shape:'document') | type, content, name |
| Check governance rules / doc search | memory_retrieve (mode='scout', sources.documents) | message, intent.perSource.documents.types |
| Platform skill guidance | personize_md | topic='bulk' with message, or detail |
| Multi-step orchestration | responses API | instructions, steps, tools |
| Bootstrap session | personize_md | (no params) |
| Check usage/credits | analytics_overview | (no params) |
