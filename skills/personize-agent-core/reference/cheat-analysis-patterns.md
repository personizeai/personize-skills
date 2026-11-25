# Analysis Patterns

| Analysis Type | Tool | Key Params | Example |
|---------------|------|-----------|---------|
| Entity deep-dive | memory_retrieve | mode:'brief', record:{email} | "Everything about Sarah" |
| Cross-entity | memory_retrieve | mode:'scout', no entity scope, groupByRecord:true | "Who has churn risk?" |
| Comparison | memory_retrieve | mode:'brief', comparative query | "Compare Sarah vs Mike" |
| Trends | memory_retrieve | mode:'filter', updatedAfter, sortOrder | "What changed this month?" |
| Segmentation | memory_retrieve | mode:'filter', filters on the segment properties | "Bucket by engagement" |
| Aggregation | memory_retrieve | mode:'scout', count intent | "How many in healthcare?" |
| Similarity | REST/SDK retrieve | mode:'similar', seed (not available on MCP) | "Accounts like Acme" |

Always state confidence and evidence count. Never invent data.
