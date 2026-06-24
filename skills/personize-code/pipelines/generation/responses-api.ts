/**
 * Recipe: Personize Responses API — Generation Patterns
 *
 * The Responses API (`POST /api/v1/responses`) is the primary generation endpoint.
 * It supports multi-step orchestration, governance, memory, client-executed tools,
 * structured outputs, streaming, and BYOK (bring your own LLM key).
 *
 * Patterns shown:
 *   1. Single-step generation with governance + memory
 *   2. Multi-step orchestration (research → draft → review)
 *   3. Client-executed tools (SDK handles the loop automatically)
 *   4. BYOK — use your own OpenAI / Anthropic / Google / OpenRouter key
 *
 * Usage:
 *   PERSONIZE_SECRET_KEY=sk_live_... npx ts-node pipelines/generation/responses-api.ts
 */

import { Personize } from '@personize/sdk';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

// ─── 1. Single-step with governance + memory ──────────────────────────────────
//
// Fetch guidelines by ID and recall entity context automatically.
// Use session_id across requests to enable SmartContext deduplication.

async function generateWithGovernanceAndMemory() {
    const result = await client.responses.create({
        steps: [
            { prompt: 'Write a personalized follow-up based on everything we know about this contact.' },
        ],
        session_id: 'session_abc123',
        personize: {
            governance: {
                // Get guideline IDs from client.guidelines.list()
                guideline_ids: ['gdl_brand_voice', 'gdl_outbound_rules', 'gdl_icp'],
                mode: 'fast',  // 'fast' (~200ms, embedding routing) | 'deep' (~3s, LLM-powered)
            },
            memory: {
                record_id: 'rec_abc123',
                recall: true,      // Injects entity context before generation
                memorize: true,    // Stores the output after generation (1 credit)
            },
        },
    });

    console.log(result.output[0].content[0].text);
    // result.steps[0].usage → { prompt_tokens, completion_tokens, total_tokens }
}

// ─── 2. Multi-step orchestration ─────────────────────────────────────────────
//
// Steps execute sequentially with shared context.
// Each step can scope its own tools and max roundtrips.
// Use for: research → draft → review pipelines.

async function multiStepOrchestration() {
    const result = await client.responses.create({
        steps: [
            {
                prompt: 'Research the company Acme Corp. Find their industry, size, and recent news.',
                tools: ['web_search', 'memory_recall_pro'],
                max_steps: 5,
            },
            {
                prompt: 'Based on the research above, draft a personalized outreach email that highlights how our product solves their specific challenges.',
                tools: ['memory_recall_pro'],
            },
            {
                // No tools — pure synthesis/review step
                prompt: 'Review the draft email for factual accuracy, tone, and brand voice. Output the final version only.',
            },
        ],
        system_prompt: 'You are a senior sales development representative.',
        temperature: 0.7,
        personize: {
            governance: {
                guideline_ids: ['gdl_brand_voice', 'gdl_outbound_rules'],
                mode: 'fast',
            },
        },
    });

    // result.steps is an array of StepResult — one per step
    // Each step: { order, text, tool_calls, usage }
    console.log('Final output:', result.output[0].content[0].text);
    console.log('Steps:', result.steps?.length);
}

// ─── 3. Client-executed tools ─────────────────────────────────────────────────
//
// Define tools with JSON schemas + execute functions.
// The SDK auto-loops: request → server returns requires_action → SDK calls execute()
//   → sends results → repeats until completed (max 20 rounds).
// HMAC-signed conversation state prevents tampering between roundtrips.

async function clientExecutedTools() {
    const result = await client.responses.create({
        steps: [
            { prompt: 'Look up the customer in our database and draft a personalized renewal email.' },
        ],
        tools: [
            {
                type: 'function',
                function: {
                    name: 'lookup_customer',
                    description: 'Look up a customer by email in our internal database.',
                    parameters: {
                        type: 'object',
                        properties: {
                            email: { type: 'string', description: 'Customer email address' },
                        },
                        required: ['email'],
                    },
                    // SDK calls this locally when the LLM invokes the tool
                    execute: async (args: { email: string }) => {
                        // Replace with your actual DB query
                        return {
                            name: 'Jane Smith',
                            plan: 'Growth',
                            renewal_date: '2025-08-01',
                            usage_pct: 87,
                        };
                    },
                },
            },
        ],
        // MUST NOT modify conversation between roundtrips — HMAC signature will fail
    });

    console.log(result.output[0].content[0].text);
}

// ─── 4. BYOK — Bring Your Own LLM Key ────────────────────────────────────────
//
// Use your own API key for any supported provider.
// MUST provide both model and provider when using llm_api_key.
// Supported: openai, anthropic, google, deepseek, xai, openrouter
//
// Personize orchestration, governance, memory, and tools all work the same.
// Credits are not charged for token usage — billed to your own key instead.

async function byokGeneration() {
    // OpenAI
    const openaiResult = await client.responses.create({
        model: 'gpt-4o',
        provider: 'openai',
        llm_api_key: process.env.OPENAI_API_KEY!,
        steps: [{ prompt: 'Analyze this sales call transcript and extract action items.' }],
    });

    // Anthropic
    const anthropicResult = await client.responses.create({
        model: 'claude-sonnet-4-20250514',
        provider: 'anthropic',
        llm_api_key: process.env.ANTHROPIC_API_KEY!,
        steps: [{ prompt: 'Write a technical blog post about distributed systems.' }],
    });

    // OpenRouter — access any model
    const openrouterResult = await client.responses.create({
        model: 'meta-llama/llama-3.1-405b-instruct',
        provider: 'openrouter',
        openrouter_api_key: process.env.OPENROUTER_API_KEY!,
        steps: [{ prompt: 'Generate a product comparison matrix.' }],
    });

    console.log(openaiResult.output[0].content[0].text);
}

// ─── Key constraints ──────────────────────────────────────────────────────────
//
// MUST provide at least one step with a non-empty prompt.
// MUST provide both model + provider when using llm_api_key.
// MUST NOT exceed 20 steps per request (hard API limit).
// MUST NOT modify the conversation array between roundtrips (HMAC will fail).
// SHOULD use steps over messages for multi-phase workflows.
// SHOULD set temperature 0.3–0.7 for production content generation.
// SHOULD include session_id across related requests for SmartContext dedup.
// SHOULD use SDK execute functions over manual loop — handles retries automatically.

async function main() {
    console.log('Pattern 1: governance + memory');
    await generateWithGovernanceAndMemory();

    console.log('\nPattern 2: multi-step orchestration');
    await multiStepOrchestration();

    console.log('\nPattern 3: client-executed tools');
    await clientExecutedTools();

    // Uncomment when you have a real API key:
    // console.log('\nPattern 4: BYOK');
    // await byokGeneration();
}

main().catch(console.error);
