# Capacity Planning

| Operation | Credits | Estimate for 10K records |
|-----------|---------|------------------------|
| Save (any tier) | 1/item | 10,000 credits |
| Fast retrieve (mode='scout') per record (note: scout with a `message` uses the tier rate, pro 4) | 1/item | 10,000 credits |
| Brief retrieve with synthesis (mode='brief', synthesize:true, default pro tier) per record | 4/item | 40,000 credits |
| Brief without synthesis or own-model org (mode='brief') | 1/item | 10,000 credits |
| Batch save | 1/item | 10,000 credits |
| Filter/fetch list calls | 1/call for API-key callers, 0 in the UI and MCP | 1-10 credits |
| Guidelines | 0 | 0 credits |

Before large operations:
1. Estimate: records x credits_per_op = total credits
2. Check balance: analytics.credits()
3. Check rate limits: /me -> maxApiCallsPerMinute
4. Estimate time: batches x ~2s/batch
5. Present to human: "This will use ~X credits, take ~Y min. Proceed?"

MUST get human approval before operations exceeding 1000 credits.
