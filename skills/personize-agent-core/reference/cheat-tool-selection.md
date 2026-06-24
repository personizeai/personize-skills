# Tool Selection Quick Reference

| Task | Tool | Key Params |
|------|------|-----------|
| Store rich text/notes/transcripts | memory_save | content, email, tier:"pro" |
| Store structured data (direct write) | memory_update_property | email, propertyName, operation, value |
| Batch upsert structured records (known field values) | memory_upsert | records[] (single or batch, no AI extraction) |
| Batch store content needing AI extraction | client.memory.saveBatch() / personize_cookbook | records[], tier |
| Any retrieval (default) | smartRecall | message, identifiers, token_budget |
| Full entity picture | memory_digest | email, type, token_budget |
| Specific question (fast) | memory_recall_pro | query, email, mode:"fast" |
| Specific question (deep) | memory_recall_pro | query, email, mode:"deep" |
| Update single property | memory_update_property | email, propertyName, operation, value |
| Find similar records | memory_find_similar | seed email, dimensions |
| Segment audience | memory_segment | dimensions, tiers |
| Search/filter records | memory_search | filters, limit |
| Create guideline | context_save | name, value, tags |
| Check governance rules | ai_smart_guidelines | message, mode |
| Platform skill guidance | personize_skill | message, focus |
| Multi-step orchestration | responses API | instructions, steps, tools |
| Add workspace task | memory_update_property | propertyName, operation:"push" |
| Bootstrap session | personize_context | (no params) |
| Check usage/credits | analytics_overview | (no params) |
