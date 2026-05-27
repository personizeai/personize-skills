# Auth FAQ

**Q: What is the API key format?**
Production keys start with `sk_live_` and test keys start with `sk_test_`. Keys are passed in the `Authorization: Bearer sk_live_...` header on every request. Never commit keys to source code.

**Q: What causes 401 errors?**
Most 401s are caused by: missing `Authorization: Bearer` prefix, an expired or revoked key, or using a test key against a production endpoint (or vice versa). Check the key prefix matches the environment.

**Q: How does rate limiting work?**
Rate limits depend on your plan — check your current limits via `GET /api/v1/me`. When exceeded, the API returns a `rate_limit_error` with a `retryAfterSeconds` field. Back off for that duration before retrying.

**Q: How is auth configured for MCP?**
MCP tools authenticate via the MCP server config, not per-call headers. Provide your API key in the server configuration file once. Individual tool calls do not require auth parameters.

**Q: What is the Internal API Key and when is it used?**
The Internal API Key (`X-Internal-API-Key` header) gates `/internal/*` endpoints — memory search, compact-all, privacy operations. It is separate from the public API key and is set via SSM in production.
