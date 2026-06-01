# BYOK (Bring Your Own Key) Reference

## What is BYOK?

BYOK lets you use your own LLM provider API key with Personize. You get full control over which models power each function, while Personize handles orchestration, memory, governance, and billing.

## Supported Providers

| Provider | Example models |
|----------|---------------|
| OpenAI | gpt-4.1, gpt-4.1-mini, o4-mini |
| Anthropic | claude-sonnet-4, claude-haiku-3.5 |
| Google | gemini-2.5-flash, gemini-2.5-pro |
| DeepSeek | deepseek-chat, deepseek-reasoner |
| AWS Bedrock | Any Bedrock model in your account |
| Any OpenAI-compatible | Custom endpoints, local models |

## Per-Function Model Selection

You can assign different models to different Personize functions:

| Function | What it powers |
|----------|---------------|
| `memorize` | Memory extraction from content |
| `recall` | RAG-powered memory retrieval |
| `smartContext` | Context document routing |
| `smartUpdate` | Document evolution and analysis |
| `generate` | Chat completions and responses |

Example: Use a fast model for memorize (high volume) and a premium model for recall (quality matters).

## How to Set Up

Configure per-function models via the settings API:

```json
{
  "memorize": {
    "provider": "openai",
    "model": "gpt-4.1-mini"
  },
  "recall": {
    "provider": "anthropic",
    "model": "claude-sonnet-4"
  }
}
```

Functions without explicit config use Personize's managed models automatically.

## Credit Impact

BYOK customers get reduced credit rates since you cover your own LLM costs. Personize credits cover platform services (memory storage, vector indexing, embeddings, orchestration).

| Tier | BYOK benefit |
|------|-------------|
| `basic` | Lowest platform-only rate |
| `pro` | Balanced rate (default) |
| `ultra` | Premium orchestration features |

## Best Practices

- **Start with one function**: Try BYOK on `memorize` first (highest volume, easiest to evaluate)
- **Match model to task**: Use cheaper models for extraction, premium for customer-facing recall
- **Keep a fallback**: If your key has rate limits, Personize falls back to managed models automatically
- **Monitor usage**: Your provider dashboard shows actual LLM costs; Personize dashboard shows platform credits

## Limitations

- Embeddings always use Personize's managed model (consistency required for vector search)
- BYOK keys are stored encrypted and never logged
- Provider rate limits are your responsibility
- Some features (like prompt caching) are only available with specific providers
