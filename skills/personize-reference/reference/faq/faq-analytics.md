# Analytics FAQ

**Q: What does analytics_overview return?**
A summary of your org's activity: total memories stored, operations run this period, credit balance and consumption, active records count, and top activity by record type. Use it as a dashboard health check.

**Q: How do I see credit consumption breakdown?**
Call `analytics.credits` — returns credits used by operation type (memorize, recall, deep, batch) over a time window. Useful for identifying which workflows are consuming the most credits so you can optimize.

**Q: How do I view detailed operation history?**
Call `analytics.operations` with optional filters (date range, operation type, record ID). Returns a paginated log of individual operations with timestamps, credits used, and outcome. Use `LastEvaluatedKey` for pagination.

**Q: What does memory analytics show?**
`analytics.memory` returns per-record and aggregate stats: total records, memory count per record, property coverage (which fields are populated), and last activity timestamps. Useful for auditing data completeness.
