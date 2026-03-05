# PIPELINE-FAILURE — Workflows Failing or Producing Bad Output

## Symptoms

- Trigger.dev task fails with an error
- n8n workflow execution shows red (error) status
- Pipeline runs but produces empty or wrong output
- Pipeline hangs and never completes
- Scheduled pipeline stops running

## Diagnostic Steps

### Step 1: Check the Error

**Trigger.dev:**
- Open the Trigger.dev dashboard → Runs → find the failed run
- Check the error message and stack trace
- Note which step failed (recall, governance, generate, memorize, external API)

**n8n:**
- Open the n8n workflow → Executions → find the failed execution
- Click the red node to see the error
- Check the input data that caused the failure

### Step 2: Isolate the Failing Step

Run each pipeline step individually:

```typescript
// 1. Auth
const me = await client.me();
console.log('✅ Auth:', me.data.organization.name);

// 2. Recall
const recall = await client.memory.recall({ query: 'test', email: '<test-email>' });
console.log('✅ Recall:', recall.data.memories.length, 'results');

// 3. Governance
const guidelines = await client.ai.smartGuidelines({ message: 'test' });
console.log('✅ Governance:', guidelines.data.compiledContext ? 'has content' : 'empty');

// 4. Generate
const result = await client.ai.prompt({ prompt: 'Say hello', outputs: [{ name: 'greeting' }] });
console.log('✅ Generate:', result.data.outputs?.greeting);

// 5. External API (if applicable)
// Test the external API call independently
```

### Step 3: Check Environment Variables

```bash
# Verify all required env vars are set
echo "PERSONIZE_SECRET_KEY: ${PERSONIZE_SECRET_KEY:+set}"
echo "TRIGGER_SECRET_KEY: ${TRIGGER_SECRET_KEY:+set}"
# Add other env vars your pipeline needs
```

## Common Root Causes (ranked by likelihood)

1. **Missing or expired credentials** — env vars not set in deployment environment
2. **External API failure** — CRM, email, or enrichment API is down or credentials expired
3. **Rate limits** — too many API calls (see RATE-LIMITS action)
4. **Empty context** — recall returns nothing, so generation produces generic output
5. **Schema changes** — external API response format changed, breaking parsing
6. **Trigger.dev machine timeout** — task exceeds max duration

## Fixes

| Root Cause | Fix |
|---|---|
| Missing credentials | Verify env vars in deployment config; redeploy |
| External API failure | Test API independently; check status page; refresh OAuth tokens |
| Rate limits | Add retry logic; reduce batch size; stagger schedules |
| Empty context | Memorize data first; check email matching; see BAD-RECALL action |
| Schema changes | Update parsing logic; add defensive checks for optional fields |
| Machine timeout | Break into smaller tasks; use `wait.for()` for long operations |

### Trigger.dev Debugging Tips

```typescript
// Add logging to each step
import { logger, task } from '@trigger.dev/sdk/v3';

export const myTask = task({
  id: 'my-task',
  run: async (payload) => {
    logger.info('Step 1: Recall', { email: payload.email });
    const recall = await client.memory.recall({ /* ... */ });
    logger.info('Recall result', { count: recall.data.memories.length });

    // ... rest of pipeline with logging at each step
  },
});
```

### n8n Debugging Tips

- Use the **Debug** execution mode to step through nodes
- Add a **Set** node before the failing node to inspect the data shape
- Check that HTTP Header Auth credential is correctly configured for Personize

## Prevention

- Add logging at every pipeline step
- Set up error notifications (Slack, email) for failed runs
- Test pipelines with a single record before running batch
- Monitor pipeline health in weekly health checks (see HEALTH-CHECK action)
