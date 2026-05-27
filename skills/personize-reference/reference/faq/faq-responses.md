# Responses API FAQ

**Q: What is the difference between Responses API and Chat Completions?**
Responses API supports multi-step agentic flows and client-executed tools — the agent can pause and ask your code to run a tool. Chat Completions is an OpenAI-compatible drop-in for simple request/response generation without tool execution loops.

**Q: What is BYOK (Bring Your Own Key)?**
BYOK lets you supply your own model provider API key (OpenAI, Anthropic, Google) for generation calls. Your key is used for that request and never stored. This lets you use your own quota and billing with Personize orchestration.

**Q: How do client-executed tools work?**
When the agent needs a tool run by your code, the response returns `status: requires_action` with tool call details. Your application executes the tool, then continues the flow by submitting results back. The agent then proceeds with the output.

**Q: Does Responses API support streaming?**
Chat Completions supports SSE streaming for token-by-token output. The Prompt API supports `promptStream` for streaming responses. The agentic Responses flow does not stream mid-tool-execution steps.
