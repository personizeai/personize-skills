# Billing FAQ

**Q: How do credits work?**
Most operations cost 1 credit: memorize (per item), recall, smartContext. Deep mode costs 2 credits due to extended processing. Guideline CRUD and workspace operations are free. Credits are deducted atomically at operation time.

**Q: How do I check my credit balance?**
Call `analytics_overview` from any skill or `GET /api/v1/usage/current` directly. Both return your current balance, credits used this period, and your plan limits.

**Q: How can I reduce credit costs?**
Default to fast mode — it costs 1 credit vs 2 for deep. Use batch memorize for bulk ingestion (same 1 credit per item, lower per-call overhead). Avoid deep recall unless synthesis quality is required.

**Q: What operations are free?**
Guidelines CRUD (`guideline_create`, `guideline_update`, `guideline_delete`, `guideline_get`), workspace property reads, `smart_guidelines` retrieval, and key management operations do not cost credits.

**Q: Does batch memorize cost more per item?**
No — batch costs the same 1 credit per item as single memorize. The advantage of batch is lower per-call overhead and shared extraction context, not a credit discount.
