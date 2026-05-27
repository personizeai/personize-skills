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
 * External MCP servers connected via the Personize dashboard (Tavily, HubSpot, etc.)
 * are automatically available during prompt execution.
 */
export async function generateWithTools(opts: {
  prompt: string;
  email?: string;
  outputs?: Array<{ name: string }>;
  tier?: 'basic' | 'pro' | 'ultra';
  attachments?: Array<{ name?: string; mimeType: string; data?: string; url?: string }>;
}) {
  return personize.ai.prompt({
    prompt: opts.prompt,
    outputs: opts.outputs,
    memorize: opts.email
      ? { email: opts.email, captureToolResults: true }
      : undefined,
    tier: opts.tier,
    attachments: opts.attachments,
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
