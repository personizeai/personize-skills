# Capacity Planning

| Operation | Credits | Estimate for 10K records |
|-----------|---------|------------------------|
| Memorize (any tier) | 1/item | 10,000 credits |
| Fast recall per record | 1/item | 10,000 credits |
| Deep recall per record | 2/item | 20,000 credits |
| Batch memorize | 1/item | 10,000 credits |
| Search/filter | 1/query | 1-10 credits |
| Guidelines | 0 | 0 credits |

Before large operations:
1. Estimate: records x credits_per_op = total credits
2. Check balance: analytics.credits()
3. Check rate limits: /me -> maxApiCallsPerMinute
4. Estimate time: batches x ~2s/batch
5. Present to human: "This will use ~X credits, take ~Y min. Proceed?"

MUST get human approval before operations exceeding 1000 credits.
