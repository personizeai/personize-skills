# Self-Correction Patterns

| Problem | Diagnosis | Fix |
|---------|-----------|-----|
| Empty recall | Wrong identity key | Try email -> website_url -> record_id -> org-wide |
| Poor extraction | Wrong tier or no hints | Re-memorize: tier:"pro", schema:{} |
| Irrelevant results | Query too broad/narrow | Refine query, add type filter, use collectionNames |
| Governance violation | Missed MUST constraint | Re-read guidelines, regenerate with constraint |
| Unexpected high cost | Wrong mode or tier | Switch deep->fast for simple queries |
| Duplicate records | Missing identity key | Always provide email/website_url, check first |
| Batch partial fail | Some items invalid | Retry only failed items |
| 404 after memorize | Record not indexed yet (async, 1-3s delay) | Retry with backoff: wait 1s, 2s, 3s before memory_update_properties |
| Property update silent fail | Wrong casing (`status` vs `Status`) | MUST use Title Case: `Status`, `Workspace Name`, `Pending Tasks` |
| Array overwritten | Used `propertyValue` on append-only property | Use `arrayPush: { items: [...], unique: false }` for Notes, Updates, Tasks, Issues |
| filterByProperty no results | Wrong operator syntax | Use `equals` not `EQ`. Field is `propertyName` not `property` |
| filterByProperty wrong field | Used snake_case | Use Title Case: `propertyName: 'Status'` not `propertyName: 'status'` |
| `about:'self'` returns empty | No memories stored on self-record yet | Fallback: `smartRecall` with user's name or domain. Then store identity on self-record for next session. |

Pattern: act -> verify -> diagnose -> adjust -> retry
Never repeat the same failing approach.
