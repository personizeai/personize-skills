# Personize Private — What It Is and What to Ask About

Self-hosted Personize: one Docker image (`ghcr.io/personizeai/personize-gateway`) plus one Postgres. No AWS, no proprietary vector store, no data leaving the customer's infrastructure. Internally the module is called the **gateway** and runs with `GATEWAY_MODE=true`, so that is the term you will see in code, logs, and env vars.

**This file is a map, not a manual.** It gives you enough to size an opportunity, use the right words, and know what to go read. Anything version-specific (exact endpoints, flags, image tags, caps) changes per release: read the source or ask the Personize team rather than quoting from here.

## When it is the answer

Reach for Private when the customer says any of:

- "Our data cannot leave our network."
- "We are not on AWS." (Azure, GCP, DigitalOcean, on-prem, bare metal)
- "It has to run offline / air-gapped."
- "We already have a Postgres and we want to keep our data in it."
- "We need to own the model endpoint too." (pairs with a local Ollama or vLLM)

If the driver is instead *"we want the full hosted platform, in our own AWS account"*, that is BYOC, not Private. See [`deployment-mode.md`](./deployment-mode.md) for the three-way decision tree.

## Vocabulary

Terms an agent needs to recognise and search for. Each one is a real concept in the product, not a synonym for something in SaaS.

| Term | What it means |
|---|---|
| **gateway** / `GATEWAY_MODE` | The internal name for Private. All code lives under `src/modules/gateway/`, served by a separate app entrypoint (`src/gateway-app.ts`). |
| **connected licensing** | The box validates against Personize with a `PERSONIZE_API_KEY`. A free plan is sufficient. This is the supported default. |
| **air-gapped licensing** | A signed JWT license bundle Personize issues, for customers with no outbound network. |
| **entitlements guard** | License state gates the background workers (scheduler, ingest, job runner), not just the HTTP surface. An unlicensed box refuses business routes with `403`. |
| **usage caps** | Saves, retrieves, and prompts per month, enforced by middleware and counted in the customer's own Postgres. |
| **RLS** | Postgres row-level security, the isolation mechanism for multi-principal access control. |
| **PiiGuard** | A pluggable PII egress layer applied at embeddings, document rewrite, and retrieve, with a provenance audit trail. |
| **Dreaming** | Offline memory consolidation. Runs on a stage machine with a write guard, a daily cap, and an emergency stop. |
| **kits** | Declarative schema provisioning. The main onboarding path in Private, and the same kit format as SaaS. |
| **bundled MCP** | A 13-tool MCP server built into the image, served over JSON-RPC at `POST /mcp`. Not the 60+ tool managed surface. |
| **import boundary** | Gateway code reaches shared managed-mode logic through lazy `await import(...)` inside handlers, never static top-level imports, so the gateway app never statically pulls hosted-only surfaces. |

## The three things architects get wrong

1. **"It is the same API."** It is not. Private serves a focused memory-layer surface: save, retrieve, search, kits, schema, prompt, schedules, and the bundled MCP. Verify any specific endpoint before you promise it.
2. **"It needs AWS."** It does not. That is BYOC. Private is one container and one Postgres, anywhere Docker runs.
3. **"Licensing is a formality."** It is enforced. An unlicensed box will not serve business routes, and license state also gates autonomous background work.

## Where to read

Everything below is in the `ai-fargate` repo. Read the source; do not rely on this page for current detail.

| You need | Read |
|---|---|
| The full developer and agent guide | `Docs/Personize Private/personize-private-handbook.md` |
| Positioning and the deploy-target matrix | `Docs/Personize Private/why-personize-private.md` |
| Five-minute setup | `Docs/Personize Private/personize-gateway-quickstart.md` |
| Feature catalogue, per release | `Docs/Personize Private/features.md`, `personize-gateway-CHANGELOG.md` |
| Running it, day two | `Docs/Personize Private/personize-gateway-operations.md` |
| Offline install | `Docs/Personize Private/personize-gateway-airgapped.md`, `personize-gateway-tarball-install.md` |
| Access control, RLS, PII | `personize-private-access-control.md`, `personize-private-rls-retrofit-spec.md`, `personize-private-data-flow-and-pii.md` |
| Caps and pricing | `Docs/Personize Private/gateway-usage-caps-and-pricing-spec.md` |
| Authoring a kit | `Docs/Personize Private/kit-authoring-guide.md` |
| Hosting the database | `Docs/Personize Private/integrations/` (Neon, Render, Azure Postgres, Amazon RDS, LangGraph + MCP) |
| Code architecture and sync rules | `repo-context/34-gateway/module.md`, `Docs/runbooks/managed-to-gateway-sync-playbook.md` |
| Running CRM AI Operators on Private | `crm-ai-operators` repo, `docs/PERSONIZE-PRIVATE.md` |

**When a customer commitment depends on the answer, confirm current state with the Personize team.** Private ships on its own release cadence and the feature set moves faster than any summary.
