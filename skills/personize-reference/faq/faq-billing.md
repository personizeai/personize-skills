# Billing FAQ

**Q: How do credits work?**
`memory_retrieve` costs 1 credit when no LLM runs (filter/fetch/scout with no message), and basic 2 / pro 4 / ultra 8 when a managed model runs; `memory_save` (all shapes) costs credits by tier and tokens, see the pricing page. The legacy smartContext/recall rate is: fast 1, deep 2. Document read, list and delete, and workspace operations are free in the UI and MCP; for API-key callers, list/get via `filter`/`fetch` costs 1 credit; document saves cost the smart-update rate. Credits are deducted atomically at operation time.

**Q: How do I check my credit balance?**
Call `analytics_overview` from any skill or `GET /api/v1/usage/current` directly. Both return your current balance, credits used this period, and your plan limits.

**Q: How can I reduce credit costs?**
Default to fast mode; it costs 1 credit vs 2 for deep. Use `client.memory.save({ shape:'shortform', items })` for bulk ingestion (credits depend on tier and content tokens, see the pricing page; lower per-call overhead). Avoid deep recall unless synthesis quality is required.

**Q: What operations are free?**
Document read and delete operations are free in the UI and MCP (for API-key callers, document list and get through `memory_retrieve` `mode='filter'`/`'fetch'` cost 1 credit per call), as are workspace property reads, and key management operations do not cost credits. A document save via `memory_save` with `shape:'document'` costs the smart-update rate when the AI rewrite runs (`aiExtraction` is on by default; minimum basic 1 / pro 2 / ultra 3). Doc-search calls (`/context/retrieve`, `memory_retrieve` with `sources.documents`) cost the retrieve rate (pro 4, basic 2). For API-key callers, document list/get via `filter`/`fetch`, `similar` and memory list cost 1 credit per call; they cost 0 in the UI and MCP.

**Q: Does batch save cost more per item?**
Batch is billed like single saves, by tier and tokens; the advantage is lower per-call overhead, not a credit discount.
