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
| responses API | varies | varies | Model-dependent |

Check balance: analytics_overview or the usage endpoint
