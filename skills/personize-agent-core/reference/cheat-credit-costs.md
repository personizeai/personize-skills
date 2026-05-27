# Credit Costs Quick Reference

| Operation | Credits | Latency | Notes |
|-----------|---------|---------|-------|
| memorize (any tier) | 1 | 1-5s | Per item |
| smartRecall (fast) | 1 | ~500ms | Recommended default |
| smartRecall (deep) | 2 | ~10-20s | Research, complex |
| memory_digest | 1 | ~1-3s | Compiled context |
| recall_pro (fast) | 1 | ~500ms | Specific questions |
| recall_pro (deep) | 2 | ~10-20s | Synthesized answer |
| search/filter | 1 | ~1s | Per query |
| similar/segment | 1 | ~2-5s | Per query |
| smart_guidelines | 0 | ~200ms-5s | Free |
| guideline CRUD | 0 | <1s | Free |
| workspace ops | 0 | <1s | Included in memorize |
| batch memorize | 1/item | async | Lower overhead |
| responses API | varies | varies | Model-dependent |

Check balance: analytics_overview or GET /api/v1/usage/current
