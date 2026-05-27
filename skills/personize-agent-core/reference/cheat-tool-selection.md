# Tool Selection Quick Reference

| Task | Tool | Key Params |
|------|------|-----------|
| Store rich text/notes/transcripts | memory_store_pro | content, email, tier:"pro" |
| Store structured data (direct write) | memory_update_property | email, propertyName, operation, value |
| Batch store 10+ items | memory_batch_store | items[], tier |
| Any retrieval (default) | smartRecall | message, identifiers, token_budget |
| Full entity picture | memory_digest | email, type, token_budget |
| Specific question (fast) | memory_recall_pro | query, email, mode:"fast" |
| Specific question (deep) | memory_recall_pro | query, email, mode:"deep" |
| Update single property | memory_update_property | email, propertyName, operation, value |
| Find similar records | memory_find_similar | seed email, dimensions |
| Segment audience | memory_segment | dimensions, tiers |
| Search/filter records | memory_search | filters, limit |
| Create guideline | guideline_create | name, value, tags |
| Check governance rules | ai_smart_guidelines | message, mode |
| Platform skill guidance | personize_skill | message, focus |
| Multi-step orchestration | responses API | instructions, steps, tools |
| Add workspace task | memory_update_property | propertyName, operation:"push" |
| Bootstrap session | personize_context | (no params) |
| Check usage/credits | analytics_overview | (no params) |
