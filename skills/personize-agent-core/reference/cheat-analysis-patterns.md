# Analysis Patterns

| Analysis Type | Tool | Key Params | Example |
|---------------|------|-----------|---------|
| Entity deep-dive | memory_digest | email, token_budget:2000 | "Everything about Sarah" |
| Cross-entity | smartRecall | no entity scope, groupByRecord:true | "Who has churn risk?" |
| Comparison | smartRecall | comparative query | "Compare Sarah vs Mike" |
| Trends | recall_pro | prefer_recent:true, half_life:30 | "What changed this month?" |
| Segmentation | memory_segment | dimensions, tiers | "Bucket by engagement" |
| Aggregation | smartRecall | count intent | "How many in healthcare?" |
| Similarity | memory_find_similar | seed email, dimensions | "Accounts like Acme" |

Always state confidence and evidence count. Never invent data.
