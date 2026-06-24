# VERIFY-PIPELINE — Run One Record End-to-End

## Pre-conditions

- Pipeline code is written and compiles (`npm run build` or `tsc` succeeds)
- `PERSONIZE_SECRET_KEY` and any required credentials (CRM, email, etc.) are set
- For Trigger.dev pipelines: `TRIGGER_SECRET_KEY` is set and `npx trigger.dev@latest dev` is running

## Steps

### Step 1: Prepare a Test Record

Create a single test record that exercises the full pipeline:

```typescript
// For outbound pipelines
const testPayload = {
  email: 'test-verify@example.com',
  name: 'Test Person',
  company: 'Acme Corp',
  title: 'VP of Engineering',
};

// For inbound pipelines
const testPayload = {
  fromEmail: 'test-verify@example.com',
  subject: 'Re: Our conversation',
  body: 'Thanks for the info. Can you send me pricing?',
};
```

### Step 2: Trigger the Pipeline

```typescript
// Trigger.dev
import { myPipeline } from './src/trigger/my-pipeline';
const run = await myPipeline.trigger(testPayload);
console.log('Run ID:', run.id);

// Direct SDK (non-Trigger.dev)
const result = await runPipeline(testPayload);
console.log('Result:', JSON.stringify(result, null, 2));
```

### Step 3: Verify Each Pipeline Stage

Check that each stage produced expected output:

```typescript
// 1. Did it recall existing context?
const recall = await client.memory.recall({
  query: 'test verification',
  email: testPayload.email,
});
console.log('Recall:', recall.data.memories.length, 'memories found');

// 2. Did it fetch governance?
// (check pipeline logs for smartGuidelines call)

// 3. Did it generate content?
// (check pipeline output — email body, Slack message, etc.)

// 4. Did it memorize the interaction?
const afterRecall = await client.memory.recall({
  query: 'What happened in the latest interaction?',
  email: testPayload.email,
});
console.log('Post-pipeline memories:', afterRecall.data.memories.length);
```

### Step 4: Check for Side Effects

- **Email pipelines**: Verify the email was sent (check sent folder or use a test mode flag)
- **CRM pipelines**: Verify the CRM record was updated correctly
- **Notification pipelines**: Verify Slack/email notification arrived
- **Scheduled pipelines**: Verify the next run is scheduled (check Trigger.dev dashboard)

## Common Failure Modes

| Symptom | Likely Cause | Fix |
|---|---|---|
| Pipeline hangs | Waiting for external API that's not configured | Check all env vars; use mock/sandbox credentials for testing |
| Empty AI generation | No context found (recall returned empty) | Memorize test data first; check email matches |
| Rate limit errors | Too many API calls in dev loop | Add delays; use `client.me()` to check remaining credits |
| Pipeline succeeds but nothing memorized | Missing `memorize()` call or `memorize:` param in `ai.prompt()` | Check pipeline code for the memorize step |
| Trigger.dev task not found | Dev server not running or task not registered | Run `npx trigger.dev@latest dev` and check task registration |

## Success Criteria

- [ ] Pipeline runs to completion without errors
- [ ] Each stage (recall → governance → generate → memorize) produces output
- [ ] Post-pipeline `recall()` shows the interaction was memorized
- [ ] Side effects (email sent, CRM updated, notification posted) are visible
- [ ] Test data can be distinguished from production data (use test emails/tags)
