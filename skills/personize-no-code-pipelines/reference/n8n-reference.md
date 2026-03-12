# n8n Reference Documentation & Search Queries

When generating workflows, fetch these URLs for the latest node parameters, JSON format, and expression syntax. Use `WebFetch` or `WebSearch` if available.

## n8n Official Docs (fetch for up-to-date details)

| Topic | URL |
|---|---|
| Workflow JSON data structure | https://docs.n8n.io/data/data-structure/ |
| HTTP Request node | https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/ |
| Loop Over Items (Split in Batches) | https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.splitinbatches/ |
| Code node (JavaScript/Python) | https://docs.n8n.io/code/code-node/ |
| Schedule Trigger | https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/ |
| Webhook node | https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/ |
| Error handling | https://docs.n8n.io/flow-logic/error-handling/ |
| Looping patterns | https://docs.n8n.io/flow-logic/looping/ |
| Sub-workflows | https://docs.n8n.io/flow-logic/subworkflows/ |
| Expressions syntax | https://docs.n8n.io/code/expressions/ |
| Credential types (HTTP auth) | https://docs.n8n.io/integrations/builtin/credentials/httprequest/ |
| Import/export workflows | https://docs.n8n.io/workflows/export-import/ |
| All built-in nodes list | https://docs.n8n.io/integrations/builtin/node-options/ |

## App-Specific Node Docs

When the user names a specific app, fetch its node docs at:
```
https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.<appname>/
```

Examples:
- HubSpot: `https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.hubspot/`
- Salesforce: `https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.salesforce/`
- Google Sheets: `https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlesheets/`
- Slack: `https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.slack/`
- Postgres: `https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/`
- Airtable: `https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.airtable/`

## Trigger Node Docs

```
https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.<appname>trigger/
```

## Community Workflow Templates

Browse real workflows for inspiration:
- https://n8n.io/workflows/ — searchable library of 1000+ community templates
- Search: `https://n8n.io/workflows/?q=<keyword>` (e.g., `?q=hubspot`, `?q=google+sheets`)

## Suggested Search Queries

When you need the latest info about a specific n8n feature, use these web search queries:

| Need | Search Query |
|---|---|
| Node JSON parameters | `n8n <node name> node parameters JSON example` |
| Latest typeVersion | `n8n <node name> typeVersion site:docs.n8n.io` |
| Batch processing | `n8n split in batches loop over items example` |
| Pagination | `n8n pagination HTTP request loop` |
| Credential setup | `n8n <app name> credentials setup` |
| Error handling | `n8n error handling retry workflow` |
| Expression syntax | `n8n expressions reference $json $input` |
| Workflow JSON import | `n8n import workflow JSON format structure` |
| Rate limiting | `n8n wait node rate limit batch processing` |
| Specific integration | `n8n <app name> node workflow example` |

## Version Notes

- Node `typeVersion` numbers change with n8n releases. If a generated workflow fails to import, try decrementing the version (e.g., `4.2` → `4` for httpRequest).
- The `"settings": { "executionOrder": "v1" }` field is required for n8n 1.6+ (2024 onwards).
- Always check the n8n changelog for breaking changes: https://docs.n8n.io/reference/release-notes/
