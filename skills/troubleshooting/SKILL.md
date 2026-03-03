---
name: troubleshooting
description: "Diagnose and fix common issues with the Personize stack — bad recall results, extraction problems, governance misses, rate limits, pipeline failures, and stale workspaces. Structured as a dispatch skill: jump to the action that matches the symptom. Use when something isn't working as expected."
license: Apache-2.0
compatibility: "Requires @personize/sdk or Personize MCP server and a Personize API key (sk_live_...)"
metadata: {"author": "personize-ai", "version": "1.0", "homepage": "https://personize.ai", "openclaw": {"emoji": "\U0001F527", "requires": {"env": ["PERSONIZE_SECRET_KEY"]}}}
---

# Skill: Troubleshooting

Diagnose and fix common issues with the Personize stack. Jump to the action that matches the symptom.

---

## When to Use This Skill

- Recall returns irrelevant, empty, or noisy results
- Memorized data isn't being extracted correctly
- Guidelines aren't reaching agents or return wrong content
- Getting 429 rate limit errors or partial batch syncs
- Trigger.dev or n8n workflows are failing
- Shared workspace is going stale or agents aren't contributing

## When NOT to Use This Skill

- Everything works and you want to confirm → use **verify-setup**
- Need to set up a new capability → use **entity-memory**, **governance**, **data-sync**, etc.
- Need to understand the architecture → use **personalization**

---

## Actions

You have 6 actions available. Jump to the one that matches the developer's symptom.

| Action | When to Use | Reference |
|---|---|---|
| **BAD-RECALL** | Recall returns irrelevant, empty, or noisy results | `reference/bad-recall.md` |
| **BAD-EXTRACTION** | Memorized data isn't being extracted correctly | `reference/bad-extraction.md` |
| **GOVERNANCE-MISS** | Guidelines aren't reaching agents or return wrong content | `reference/governance-miss.md` |
| **RATE-LIMITS** | Getting 429 errors or partial batch syncs | `reference/rate-limits.md` |
| **PIPELINE-FAILURE** | Trigger.dev/n8n workflows failing or producing bad output | `reference/pipeline-failure.md` |
| **WORKSPACE-STALE** | Agents not contributing or workspace going stale | `reference/workspace-stale.md` |

---

## Quick Diagnosis

If the developer isn't sure what's wrong, run this triage:

```typescript
import { Personize } from '@personize/sdk';
const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

// 1. Can we connect?
try {
  const me = await client.me();
  console.log(`✅ Auth: ${me.data.organization.name}`);
  console.log(`   Plan: ${me.data.plan.name}`);
  console.log(`   Rate limits:`, me.data.rateLimits);
} catch (e) {
  console.log('❌ Auth failed:', e.message);
  console.log('   → Check PERSONIZE_SECRET_KEY');
}

// 2. Can we recall?
try {
  const recall = await client.memory.recall({ query: 'test', limit: 1 });
  console.log(`✅ Recall: working (${recall.data.memories.length} results)`);
} catch (e) {
  console.log('❌ Recall failed:', e.message);
}

// 3. Can we fetch guidelines?
try {
  const guidelines = await client.ai.smartGuidelines({ message: 'test' });
  console.log(`✅ Guidelines: ${guidelines.data.compiledContext ? 'returning content' : '⚠️ empty (no guidelines set up?)'}`);
} catch (e) {
  console.log('❌ Guidelines failed:', e.message);
}

// 4. Can we memorize?
try {
  await client.memory.memorize({
    email: 'troubleshoot-test@example.com',
    content: 'Troubleshooting test entry',
  });
  console.log('✅ Memorize: working');
} catch (e) {
  console.log('❌ Memorize failed:', e.message);
  if (e.message.includes('429')) console.log('   → Rate limited. See RATE-LIMITS action.');
}
```

Based on results, jump to the appropriate action above.

---

## Constraints

> Keywords follow [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119): **MUST** = non-negotiable, **SHOULD** = strong default (override with stated reasoning), **MAY** = agent discretion.

1. **MUST** run diagnostic steps before suggesting fixes — because guessing wastes time and can introduce new problems.
2. **MUST** ask the developer what they expected vs. what they got — because the same symptom can have different root causes depending on expectations.
3. **SHOULD** rank root causes by likelihood and check the most likely first — because systematic diagnosis is faster than shotgun debugging.
4. **SHOULD** verify the fix worked by re-running the failing operation — because a fix that doesn't resolve the symptom isn't a fix.
5. **MAY** suggest preventive measures after fixing — because recurring issues waste developer time.
