# Agentic Workflow Quick Reference

## ai.prompt -- Single-shot with superpowers
client.ai.prompt({
  prompt: "Summarize this contact for a meeting brief",
  email: "sarah@acme.com",         // auto-recalls context
  evaluate: { criteria: ["professional tone", "factual accuracy"], serverSide: true },
  memorize: true,                   // auto-saves output to memory
})

## responses.create -- Multi-step with client tools
client.responses.create({
  instructions: "For each contact, research and draft outreach",
  tools: {
    search_web: { description: "...", parameters: {...}, execute: async (args) => {...} }
  }
})
// SDK auto-loops: requires_action -> execute tools -> send results -> repeat (max 20 rounds)

## Batch-apply pattern
for (const record of records) {
  const context = await client.memory.smartDigest({ email: record.email });
  const result = await client.responses.create({ instructions: "...", input: context });
  await client.memory.memorize({ content: result.output, email: record.email });
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
