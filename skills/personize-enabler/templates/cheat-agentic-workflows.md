# Agentic Workflow Quick Reference

## ai.prompt -- Single-shot with superpowers
client.ai.prompt({
  prompt: "Summarize this contact for a meeting brief",
  email: "sarah@acme.com",         // auto-recalls context
  evaluate: { criteria: ["professional tone", "factual accuracy"], serverSide: true },
  memorize: true,                   // auto-saves output to memory
})

## agent.run -- Durable multi-step run with tools (managed cloud, own model key)
client.agent.run({
  instructions: "For each contact, research and draft outreach",
  input: "Research this account and draft outreach",
  personize: { record: { email: "sarah@acme.com" }, webSearch: true, idempotencyKey: "acme-outreach-1" }
})
// Returns { runId }; poll with client.agent.waitFor(runId). See agent-runs.md in personize-reference

## Batch-apply pattern
for (const record of records) {
  const res = await client.memory.retrieve({ mode: 'scout', record: { email: record.email }, compile: true, message: 'everything relevant' });
  const context = res.documents?.compiledContext; // read documents.compiledContext
  const result = await client.ai.prompt({ prompt: `...

${context}` });
  await client.memory.save({ shape: 'text', content: result.text, record: { email: record.email } });
  // Checkpoint every 10 records to workspace
}

## Generate → host → notify pattern
// Agent generates a report, obtains a URL from any external host, then broadcasts with a button
const report = await client.ai.prompt({ prompt: "Generate Q2 pipeline report", memorize: true });
// Upload report markdown to S3, GCS, or any host -- get back a URL
const url = await uploadToExternalStorage(report.output); // your own upload step
await client.notifications.broadcast({
  recipientGroup: 'admins',
  title: 'Q2 Pipeline Report Ready',
  body: 'The report has been generated and is ready for review.',
  priority: 'normal',
  actions: [{ type: 'link', label: 'View Report', url }],
});
// Note: Personize does not provide a file upload endpoint -- host files in S3/GCS/CDN and pass the URL
