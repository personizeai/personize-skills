# Credit Costs Quick Reference

| Operation | Credits | Latency | Notes |
|-----------|---------|---------|-------|
| memory_save (any tier) | 1 | 1-5s | Per item |
| memory_retrieve (mode='scout') | 1 | ~500ms | Recommended default |
| memory_retrieve (mode='brief') | With synthesis (`synthesize:true`) by quality tier: basic 2 / pro 4 (default) / ultra 8. 1 when the org uses its own model, and 1 for brief without synthesis | ~1-3s | Tier rate applies only when Personize's model synthesizes. Scout with a `message` is billed at the tier rate too |
| memory_retrieve (mode='filter' / 'fetch') | 1 per call for API-key callers, 0 in the UI and MCP | ~1s | Document list/get and memory list |
| similar | 1 per call for API-key callers, 0 in the UI and MCP | ~2-5s | REST/SDK only |
| memory_retrieve on documents (doc search) | retrieve rate: pro 4, basic 2 | ~200ms-5s | Same rate as retrieve |
| guideline CRUD | 0 | <1s | Free |
| workspace ops | 0 | <1s | Included in save |
| batch save | 1/item | async | Lower overhead |
| agent run (`agent_run`) | Measured usage, billed like a pro-tier own-key prompt: 0.1 / 1K input tokens + 0.3 / 1K output tokens + 1 per compute minute, plus web search | seconds to minutes | Own model key required. Compute minutes = measured model-call time, not wall-clock or queue time. A run that never took a step costs 0 |
| sweep preview (`sweep_preview`) | 0 | ~1-5s | Returns a per-run and total estimate; `query` is translated with the org's own model |
| sweep (`sweep_launch`) | Sum of its agent runs | minutes to hours | Pilot first (default 10 records); `sweep_status` shows `pilot.projection` for the rest |

Agent run and sweep figures are the default rates; the published pricing page is authoritative. A 402 `insufficient_credits` on a run means do not retry: add credits. A sweep that runs out of credits pauses (`pausedReason: insufficient_credits`).

Check balance: analytics_overview or the usage endpoint
