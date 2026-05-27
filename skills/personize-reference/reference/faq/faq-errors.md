# Errors FAQ

**Q: How do I handle rate_limit_error?**
Back off immediately and wait the number of seconds in the `retryAfterSeconds` field before retrying. If you hit rate limits frequently, check your plan limits via `/api/v1/me` and consider batching operations.

**Q: What causes authentication_error?**
The key format is wrong, the Bearer prefix is missing, or the key has been revoked. Verify the key starts with `sk_live_` (or `sk_test_`), the header is `Authorization: Bearer <key>`, and the key is active in your dashboard.

**Q: What causes not_found_error?**
The record ID or identity key does not match any stored record. Try alternate identity keys: if `record_id` fails, try `email` or `website_url`. The record may not have been memorized yet.

**Q: What causes validation_error?**
A required parameter is missing, a value has the wrong type, or an enum value is invalid. Check the error `details` field — it names the failing parameter. Common causes: missing `orgId`, wrong tier string, or invalid operation type.

**Q: What should I do with server_error?**
Retry once after a short delay (2-5 seconds). Transient infrastructure errors usually resolve immediately. If the error persists across multiple retries, report the `requestId` from the error response to support.
