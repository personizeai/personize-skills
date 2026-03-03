/**
 * Bring-Your-Own-LLM helpers.
 *
 * Use Personize as the memory + governance layer with ANY LLM provider.
 * These helpers show the pattern for:
 *   1. Injecting Personize context into your LLM prompt
 *   2. Giving your LLM Personize tools (recall, memorize, smart_guidelines)
 *   3. Running a full tool-calling loop with any LLM
 *
 * Supports: OpenAI, Anthropic Claude, or any OpenAI-compatible API.
 */
import { personize } from "./personize";
import { OPENAI_TOOLS, ANTHROPIC_TOOLS, executePersonizeTool } from "./personize-tools";

// ─── Pattern 1: Context Injection (simplest) ────────────
// Call Personize directly, inject results into your LLM prompt.
// Works with ANY LLM, no tool calling needed.

/**
 * Build a context-enriched prompt for any LLM.
 * Fetches memory + guidelines from Personize and prepends them to your prompt.
 */
export async function buildContextualPrompt(opts: {
  prompt: string;
  email?: string;
  guidelinesQuery?: string;
  guidelineTags?: string[];
}): Promise<string> {
  const sections: string[] = [];

  // Fetch entity context from Personize memory
  if (opts.email) {
    const digest = await personize.memory.smartDigest({
      email: opts.email,
      include_properties: true,
      include_memories: true,
      token_budget: 2000,
    });
    if (digest.data?.compiledContext) {
      sections.push(`## Contact Context\n${digest.data.compiledContext}`);
    }
  }

  // Fetch org guidelines from Personize Smart Guidelines
  if (opts.guidelinesQuery) {
    const ctx = await personize.ai.smartGuidelines({
      message: opts.guidelinesQuery,
      tags: opts.guidelineTags,
    });
    if (ctx.data?.compiledContext) {
      sections.push(`## Organizational Guidelines\n${ctx.data.compiledContext}`);
    }
  }

  // Combine: context first, then the actual prompt
  if (sections.length > 0) {
    return `${sections.join("\n\n---\n\n")}\n\n---\n\n## Task\n${opts.prompt}`;
  }
  return opts.prompt;
}

// ─── Pattern 2: OpenAI with Personize Tools ─────────────

/**
 * Run an OpenAI chat completion with Personize tools.
 * The LLM can autonomously call recall, memorize, smart_guidelines, and smart_digest.
 *
 * Requires: `npm install openai`
 *
 * @example
 * ```typescript
 * import OpenAI from "openai";
 * const openai = new OpenAI();
 *
 * const result = await runOpenAIWithPersonize(openai, {
 *   model: "gpt-4o",
 *   systemPrompt: "You are a sales assistant.",
 *   userPrompt: "Write a follow-up email for john@acme.com",
 * });
 * console.log(result.content); // The generated email
 * ```
 */
export async function runOpenAIWithPersonize(
  openai: any, // OpenAI client instance
  opts: {
    model?: string;
    systemPrompt?: string;
    userPrompt: string;
    maxToolRounds?: number;
  }
): Promise<{ content: string; toolCalls: string[] }> {
  const model = opts.model || "gpt-4o";
  const maxRounds = opts.maxToolRounds || 5;
  const toolCallLog: string[] = [];

  const messages: any[] = [];
  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }
  messages.push({ role: "user", content: opts.userPrompt });

  for (let round = 0; round < maxRounds; round++) {
    const response = await openai.chat.completions.create({
      model,
      messages,
      tools: OPENAI_TOOLS,
    });

    const choice = response.choices[0];
    const message = choice.message;
    messages.push(message);

    // If no tool calls, we're done
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return { content: message.content || "", toolCalls: toolCallLog };
    }

    // Execute each tool call
    for (const toolCall of message.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await executePersonizeTool(toolCall.function.name, args);

      toolCallLog.push(`${toolCall.function.name}(${JSON.stringify(args)})`);

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }

  // If we hit max rounds, get a final response without tools
  const finalResponse = await openai.chat.completions.create({
    model,
    messages,
  });

  return {
    content: finalResponse.choices[0].message.content || "",
    toolCalls: toolCallLog,
  };
}

// ─── Pattern 3: Anthropic Claude with Personize Tools ───

/**
 * Run an Anthropic Claude completion with Personize tools.
 *
 * Requires: `npm install @anthropic-ai/sdk`
 *
 * @example
 * ```typescript
 * import Anthropic from "@anthropic-ai/sdk";
 * const anthropic = new Anthropic();
 *
 * const result = await runClaudeWithPersonize(anthropic, {
 *   systemPrompt: "You are a sales assistant.",
 *   userPrompt: "Prep me for a call with sarah@startup.io",
 * });
 * ```
 */
export async function runClaudeWithPersonize(
  anthropic: any, // Anthropic client instance
  opts: {
    model?: string;
    systemPrompt?: string;
    userPrompt: string;
    maxToolRounds?: number;
  }
): Promise<{ content: string; toolCalls: string[] }> {
  const model = opts.model || "claude-sonnet-4-5-20250929";
  const maxRounds = opts.maxToolRounds || 5;
  const toolCallLog: string[] = [];

  const messages: any[] = [
    { role: "user", content: opts.userPrompt },
  ];

  for (let round = 0; round < maxRounds; round++) {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system: opts.systemPrompt || "",
      messages,
      tools: ANTHROPIC_TOOLS,
    });

    // Collect text blocks and tool_use blocks
    const textBlocks = response.content.filter((b: any) => b.type === "text");
    const toolUseBlocks = response.content.filter((b: any) => b.type === "tool_use");

    // If no tool calls, return the text
    if (toolUseBlocks.length === 0 || response.stop_reason === "end_turn") {
      return {
        content: textBlocks.map((b: any) => b.text).join("\n"),
        toolCalls: toolCallLog,
      };
    }

    // Add assistant message with all content blocks
    messages.push({ role: "assistant", content: response.content });

    // Execute tool calls and add results
    const toolResults: any[] = [];
    for (const toolUse of toolUseBlocks) {
      const result = await executePersonizeTool(toolUse.name, toolUse.input);
      toolCallLog.push(`${toolUse.name}(${JSON.stringify(toolUse.input)})`);

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  // Final round without tools
  const finalResponse = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: opts.systemPrompt || "",
    messages,
  });

  return {
    content: finalResponse.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n"),
    toolCalls: toolCallLog,
  };
}

// ─── Pattern 4: Simple recall + generate + memorize ─────

/**
 * The simplest BYOLLM pattern: recall context, call your LLM, memorize the result.
 * Works with any `generateFn` that takes a prompt string and returns text.
 *
 * @example
 * ```typescript
 * const result = await recallGenerateMemorize({
 *   email: "john@acme.com",
 *   task: "Write a personalized cold email",
 *   guidelinesQuery: "cold outbound email guidelines",
 *   generateFn: async (prompt) => {
 *     const res = await openai.chat.completions.create({
 *       model: "gpt-4o",
 *       messages: [{ role: "user", content: prompt }],
 *     });
 *     return res.choices[0].message.content || "";
 *   },
 * });
 * ```
 */
export async function recallGenerateMemorize(opts: {
  email: string;
  task: string;
  guidelinesQuery?: string;
  guidelineTags?: string[];
  generateFn: (prompt: string) => Promise<string>;
  memorizeResult?: boolean;
  memorizeSpeaker?: string;
  memorizeTags?: string[];
}): Promise<{ generated: string; contextUsed: boolean }> {
  // 1. Build context-enriched prompt
  const prompt = await buildContextualPrompt({
    prompt: opts.task,
    email: opts.email,
    guidelinesQuery: opts.guidelinesQuery,
    guidelineTags: opts.guidelineTags,
  });

  // 2. Call YOUR LLM
  const generated = await opts.generateFn(prompt);

  // 3. Memorize the result back into Personize
  if (opts.memorizeResult !== false) {
    await personize.memory.memorize({
      email: opts.email,
      content: `[AI GENERATED] ${new Date().toISOString()}\nTask: ${opts.task}\nOutput: ${generated}`,
      speaker: opts.memorizeSpeaker || "byollm",
      tags: opts.memorizeTags || ["generated"],
    });
  }

  return { generated, contextUsed: prompt.length > opts.task.length };
}
