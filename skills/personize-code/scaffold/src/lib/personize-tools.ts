/**
 * Personize SDK methods exposed as LLM function tools.
 *
 * Use these with ANY LLM that supports function/tool calling:
 * - OpenAI (functions / tools)
 * - Anthropic Claude (tools)
 * - Google Gemini (function_declarations)
 * - Vercel AI SDK (tools)
 * - LangChain (tools)
 *
 * The LLM decides WHEN to recall, memorize, or check guidelines.
 * You handle the tool execution by calling the Personize SDK.
 *
 * Usage:
 *   import { PERSONIZE_TOOLS, executePersonizeTool } from "@/lib/personize-tools";
 *
 *   // Pass tools to your LLM
 *   const response = await openai.chat.completions.create({
 *     model: "gpt-4o",
 *     messages,
 *     tools: PERSONIZE_TOOLS.openai,
 *   });
 *
 *   // Execute tool calls
 *   for (const toolCall of response.choices[0].message.tool_calls) {
 *     const result = await executePersonizeTool(toolCall.function.name, JSON.parse(toolCall.function.arguments));
 *   }
 */
import { personize } from "./personize";

// ─── Tool Definitions (OpenAI format) ───────────────────

const recallTool = {
  type: "function" as const,
  function: {
    name: "personize_recall",
    description:
      "Search Personize memory for information about a contact or company. " +
      "Returns semantic matches from all stored memories, properties, and prior interactions. " +
      "Use this to check what we already know before writing emails or making decisions.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Natural language search query (e.g., 'what pricing concerns did they raise')",
        },
        email: {
          type: "string",
          description: "Contact email to search memories for",
        },
        website_url: {
          type: "string",
          description: "Company website to search memories for (alternative to email)",
        },
        include_properties: {
          type: "boolean",
          description: "Include structured properties (title, company, etc.) in results",
          default: true,
        },
      },
      required: ["query"],
    },
  },
};

const smartDigestTool = {
  type: "function" as const,
  function: {
    name: "personize_smart_digest",
    description:
      "Get a compiled context digest for a specific contact or company. " +
      "Returns all known properties and memories formatted as a ready-to-use summary. " +
      "Use this for meeting prep, email personalization, or understanding a contact's full history.",
    parameters: {
      type: "object",
      properties: {
        email: {
          type: "string",
          description: "Contact email",
        },
        website_url: {
          type: "string",
          description: "Company website (alternative to email)",
        },
        token_budget: {
          type: "number",
          description: "Max tokens for the compiled context (default: 2000)",
          default: 2000,
        },
      },
      required: [],
    },
  },
};

const memorizeTool = {
  type: "function" as const,
  function: {
    name: "personize_memorize",
    description:
      "Store information about a contact or company in Personize memory. " +
      "The content is AI-processed to extract structured properties and semantic memories. " +
      "Use this to save research findings, conversation notes, or engagement data.",
    parameters: {
      type: "object",
      properties: {
        email: {
          type: "string",
          description: "Contact email to associate this memory with",
        },
        website_url: {
          type: "string",
          description: "Company website to associate with (alternative to email)",
        },
        content: {
          type: "string",
          description: "The content to memorize (research notes, email text, meeting notes, etc.)",
        },
        speaker: {
          type: "string",
          description: "Source label (e.g., 'sales-call', 'email-outbound', 'research')",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags for categorization (e.g., ['outbound', 'step-1'])",
        },
      },
      required: ["content"],
    },
  },
};

const smartGuidelinesTool = {
  type: "function" as const,
  function: {
    name: "personize_smart_guidelines",
    description:
      "Retrieve organizational guidelines, policies, and best practices relevant to a task. " +
      "Returns matched guidelines as compiled markdown. " +
      "Use this to check tone-of-voice rules, compliance policies, email templates, playbooks, etc. before generating content.",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Describe what you're doing (e.g., 'writing a cold outbound email to a VP of Sales')",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter guidelines by tags (e.g., ['outbound', 'email'])",
        },
      },
      required: ["message"],
    },
  },
};

// ─── Exported Tool Sets ─────────────────────────────────

/** OpenAI-compatible tool definitions */
export const OPENAI_TOOLS = [
  recallTool,
  smartDigestTool,
  memorizeTool,
  smartGuidelinesTool,
];

/** Anthropic Claude-compatible tool definitions */
export const ANTHROPIC_TOOLS = OPENAI_TOOLS.map((t) => ({
  name: t.function.name,
  description: t.function.description,
  input_schema: t.function.parameters,
}));

/** Tool definitions grouped by provider format */
export const PERSONIZE_TOOLS = {
  openai: OPENAI_TOOLS,
  anthropic: ANTHROPIC_TOOLS,
};

// ─── Tool Executor ──────────────────────────────────────

/**
 * Execute a Personize tool call from any LLM.
 * Call this in your tool execution loop after the LLM returns a tool_call.
 */
export async function executePersonizeTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "personize_recall": {
      const result = await personize.memory.smartRecall({
        query: args.query as string,
        email: args.email as string | undefined,
        website_url: args.website_url as string | undefined,
        include_property_values: (args.include_properties as boolean) ?? true,
        mode: "deep",
        generate_answer: true,
      });
      // Return a formatted string the LLM can use
      const answer = result.data?.answer?.text || "";
      const memories = result.data?.results
        ?.slice(0, 5)
        .map((r) => `- ${r.text}`)
        .join("\n") || "No memories found.";
      const properties = result.data?.property_values
        ?.map((p: any) => `- ${p.property_name}: ${p.value}`)
        .join("\n") || "";
      return [
        answer ? `Summary: ${answer}` : "",
        memories ? `\nMemories:\n${memories}` : "",
        properties ? `\nProperties:\n${properties}` : "",
      ].filter(Boolean).join("\n");
    }

    case "personize_smart_digest": {
      const result = await personize.memory.smartDigest({
        email: args.email as string | undefined,
        websiteUrl: args.website_url as string | undefined,
        includeProperties: true,
        includeMemories: true,
        tokenBudget: (args.token_budget as number) || 2000,
      });
      return result.data?.compiledContext || "No data found for this entity.";
    }

    case "personize_memorize": {
      await personize.memory.memorize({
        email: args.email as string | undefined,
        website_url: args.website_url as string | undefined,
        content: args.content as string,
        speaker: (args.speaker as string) || "llm-tool",
        enhanced: true,
        tags: (args.tags as string[]) || [],
      });
      return "Memorized successfully.";
    }

    case "personize_smart_guidelines": {
      const result = await personize.ai.smartGuidelines({
        message: args.message as string,
        tags: (args.tags as string[]) || undefined,
      });
      return result.data?.compiledContext || "No matching guidelines found.";
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}
