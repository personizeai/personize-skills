---
name: verify-setup
description: "Verify that every layer of the Personize stack works after setup — memory, governance, pipelines, and workspaces. Includes per-layer verification actions and an ongoing health check. Use after setting up any Personize capability to confirm it works end-to-end."
license: Apache-2.0
compatibility: "Requires @personize/sdk or Personize MCP server and a Personize API key (sk_live_...)"
metadata: {"author": "personize-ai", "version": "1.0", "homepage": "https://personize.ai", "openclaw": {"emoji": "\u2705", "requires": {"env": ["PERSONIZE_SECRET_KEY"]}}}
---

# Skill: Verification & Testing

Verify that every layer of the Personize stack works after setup. Don't assume it works — prove it.

---

## When to Use This Skill

- Just finished memorizing data and want to confirm it's stored and recallable
- Just set up guidelines and want to confirm agents can see them
- Just wired a pipeline and want to run one record end-to-end
- Just set up a shared workspace and want to confirm agents can read/write
- Want to run a periodic health check across memory, governance, and pipelines

## When NOT to Use This Skill

- Need to store data → use **entity-memory**
- Need to create guidelines → use **governance**
- Need to build a pipeline → use **code-pipelines** or **data-sync**
- Need to diagnose a specific failure → use **troubleshooting**

---

## Works With Both SDK and MCP

| Interface | How it works | Best for |
|---|---|---|
| **SDK** (`@personize/sdk`) | Run verification scripts locally | Developers, CI/CD |
| **MCP** (Model Context Protocol) | Use `memory_recall_pro`, `ai_smart_guidelines` tools interactively | Claude Desktop, ChatGPT, Cursor |

---

## Actions

You have 5 actions available. Use whichever matches what the developer just set up. They are not sequential.

| Action | When to Use | Reference |
|---|---|---|
| **VERIFY-MEMORY** | After memorizing data — confirm it's stored and recallable | `reference/verify-memory.md` |
| **VERIFY-GOVERNANCE** | After setting up guidelines — confirm agents can see them | `reference/verify-governance.md` |
| **VERIFY-PIPELINE** | After wiring a pipeline — run one record end-to-end | `reference/verify-pipeline.md` |
| **VERIFY-WORKSPACE** | After setting up a shared workspace — confirm agents can read/write | `reference/verify-workspace.md` |
| **HEALTH-CHECK** | Ongoing — diagnose quality, performance, and coverage issues | `reference/health-check.md` |

---

## Quick Verification (All Layers)

If the developer just wants a quick smoke test of the entire stack, run this sequence:

### SDK

```typescript
import { Personize } from '@personize/sdk';
const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

// 1. Auth — can we connect?
const me = await client.me();
console.log(`✅ Connected: ${me.data.organization.name} (${me.data.plan.name})`);

// 2. Memory — can we store and retrieve?
await client.memory.memorize({
  email: 'verify-test@example.com',
  content: 'Test record for verification. This person works at Acme Corp as a VP of Engineering.',
  enhanced: true,
});
const recall = await client.memory.recall({
  query: 'Who works at Acme Corp?',
  email: 'verify-test@example.com',
});
console.log(`✅ Memory: ${recall.data.memories.length > 0 ? 'stored and recallable' : '❌ NOT recallable'}`);

// 3. Governance — can we fetch guidelines?
const guidelines = await client.ai.smartGuidelines({ message: 'test verification' });
console.log(`✅ Governance: ${guidelines.data.compiledContext ? 'responding' : '⚠️ no guidelines set up yet'}`);

// 4. Digest — can we compile context?
const digest = await client.memory.smartDigest({
  email: 'verify-test@example.com',
  include_properties: true,
  include_memories: true,
});
console.log(`✅ Digest: ${digest.data.compiledContext ? 'compiling context' : '❌ empty'}`);
```

### MCP

```
1. Call memory_store_pro with content "Test record for verification. Works at Acme Corp as VP Engineering." and email "verify-test@example.com"
2. Call memory_recall_pro with query "Who works at Acme Corp?" and email "verify-test@example.com"
3. Call ai_smart_guidelines with message "test verification"
4. Confirm each returns data
```

---

## Constraints

> Keywords follow [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119): **MUST** = non-negotiable, **SHOULD** = strong default (override with stated reasoning), **MAY** = agent discretion.

1. **MUST** run verification after every setup action (memorize, create guideline, wire pipeline) — because untested setups create false confidence and delayed failures.
2. **MUST** use real queries that match the developer's actual use case, not generic test strings — because verification with irrelevant queries can pass while real queries fail.
3. **SHOULD** show the developer the actual API response, not just pass/fail — because seeing the data builds understanding and catches quality issues (wrong extractions, missing fields).
4. **SHOULD** clean up test data after verification — because leftover test records pollute memory and confuse downstream agents.
5. **MAY** skip verification for identical re-runs of previously verified setups — because re-verification adds latency with diminishing returns.
