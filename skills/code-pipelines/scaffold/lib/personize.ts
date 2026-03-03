/**
 * Personize SDK client singleton.
 *
 * Usage:
 *   import { personize } from "@/lib/personize";
 *   const digest = await personize.memory.smartDigest({ email: "..." });
 */
import { Personize } from "@personize/sdk";

export const personize = new Personize({
  secretKey: process.env.PERSONIZE_SECRET_KEY!,
  maxRetries: 3,
  retryDelay: 1000,
});

/**
 * Generate AI content with Personize.
 *
 * Built-in tools (recall, memorize, smart_guidelines, guidelines, etc.)
 * are available automatically — no configuration needed.
 *
 * If you've connected external MCP servers (e.g. Tavily, Zapier, HubSpot)
 * via the Personize dashboard, you can optionally pass them via `mcpTools`.
 */
export async function generateWithTools(opts: {
  prompt: string;
  email?: string;
  outputs?: Array<{ name: string }>;
  model?: string;
  mcpTools?: Array<{ mcpId: string; enabledTools: string[] }>;
}) {
  return personize.ai.prompt({
    prompt: opts.prompt,
    ...(opts.mcpTools ? { mcpTools: opts.mcpTools } : {}),
    outputs: opts.outputs,
    memorize: opts.email
      ? { email: opts.email, captureToolResults: true }
      : undefined,
    model: opts.model,
  });
}

/**
 * Run a Personize agent.
 *
 * Built-in tools are available by default.
 */
export async function runAgent(opts: {
  agentId: string;
  inputs?: Record<string, unknown>;
  email?: string;
}) {
  return personize.agents.run(opts.agentId, {
    inputs: opts.inputs,
    email: opts.email,
  });
}
