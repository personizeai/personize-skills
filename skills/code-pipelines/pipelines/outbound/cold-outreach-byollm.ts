/**
 * Cold Outreach Pipeline — Bring Your Own LLM
 *
 * Same flow as cold-outreach.ts, but uses YOUR LLM (OpenAI, Claude, etc.)
 * with Personize as the memory + governance layer only.
 *
 * This shows three patterns:
 *   Pattern A: Context injection — fetch from Personize, inject into your prompt
 *   Pattern B: LLM with Personize tools — LLM decides when to recall/memorize
 *   Pattern C: Simple recall → generate → memorize loop
 *
 * Personize SDK provides:
 *   - memory.memorize() — store enrichment data, emails, interactions
 *   - memory.recall() — semantic search across all stored memories
 *   - memory.smartDigest() — compiled context for a contact
 *   - ai.smartGuidelines() — org guidelines relevant to the task
 *
 * YOUR LLM provides:
 *   - The actual text generation (email writing, scoring, classification)
 */
import { task } from "@trigger.dev/sdk/v3";
import OpenAI from "openai";
import { personize } from "../lib/personize";
import { OPENAI_TOOLS, executePersonizeTool } from "../lib/personize-tools";
import { buildContextualPrompt, runOpenAIWithPersonize, recallGenerateMemorize } from "../lib/llm";
import { enrichWithApollo, searchWithTavily } from "../lib/enrichment";
import { sendEmail } from "../lib/notifications";

const openai = new OpenAI(); // uses OPENAI_API_KEY env var

// ═════════════════════════════════════════════════════════
// PATTERN A: Context Injection
// Simplest approach — no tool calling needed.
// Personize provides context, your LLM generates the email.
// ═════════════════════════════════════════════════════════
export const coldOutreachContextInjection = task({
  id: "cold-outreach-context-injection",
  retry: { maxAttempts: 3 },
  run: async (payload: { email: string; company: string }) => {
    const { email, company } = payload;

    // ── Step 1: Enrich and memorize ─────────────────────
    const apollo = await enrichWithApollo(email);
    const research = await searchWithTavily(`"${company}" recent news`, { maxResults: 3 });

    // Store in Personize memory (direct SDK call)
    await personize.memory.memorize({
      email,
      content: [
        `Enrichment for ${email}:`,
        apollo ? `Title: ${apollo.title}, Company: ${apollo.organization?.name}, Seniority: ${apollo.seniority}` : "No Apollo data",
        research.results.length > 0
          ? `Recent news: ${research.results.map(r => r.title).join("; ")}`
          : "No recent news found",
      ].join("\n"),
      speaker: "enrichment",
      enhanced: true,
      tags: ["enrichment"],
    });

    // ── Step 2: Get context from Personize ──────────────
    // smartDigest = everything we know about this contact
    const digest = await personize.memory.smartDigest({
      email,
      includeProperties: true,
      includeMemories: true,
      tokenBudget: 2000,
    });

    // smartGuidelines = org guidelines for this task
    const guidelines = await personize.ai.smartGuidelines({
      message: "cold outbound email guidelines, tone of voice, compliance rules",
      tags: ["outbound", "email"],
    });

    // ── Step 3: YOUR LLM generates the email ────────────
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: [
            "You are a sales email writer. Follow the organizational guidelines strictly.",
            "",
            "## Organizational Guidelines",
            guidelines.data?.compiledContext || "No guidelines found.",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            `Write a cold outreach email to ${email} at ${company}.`,
            "",
            "## What We Know About This Contact",
            digest.data?.compiledContext || "No prior data.",
            "",
            "Requirements:",
            "- Reference something specific about their company",
            "- Keep under 150 words",
            "- Clear, low-friction CTA",
            "- Follow the guidelines above",
          ].join("\n"),
        },
      ],
    });

    const emailBody = completion.choices[0].message.content || "";

    // ── Step 4: Send ────────────────────────────────────
    await sendEmail({ to: email, subject: `Quick question about ${company}`, html: emailBody });

    // ── Step 5: Memorize the outreach (direct SDK call) ─
    await personize.memory.memorize({
      email,
      content: `[OUTBOUND EMAIL SENT] ${new Date().toISOString()}\nSubject: Quick question about ${company}\nBody: ${emailBody}`,
      speaker: "outbound-sequence",
      tags: ["outbound", "step-1"],
    });

    return { status: "sent", email, pattern: "context-injection" };
  },
});

// ═════════════════════════════════════════════════════════
// PATTERN B: LLM with Personize Tools
// The LLM autonomously decides when to recall, memorize,
// and check guidelines. Most powerful but requires tool-calling support.
// ═════════════════════════════════════════════════════════
export const coldOutreachWithTools = task({
  id: "cold-outreach-llm-tools",
  retry: { maxAttempts: 3 },
  run: async (payload: { email: string; company: string }) => {
    const { email, company } = payload;

    // Enrich first (this is data work, not LLM work)
    const apollo = await enrichWithApollo(email);
    await personize.memory.memorize({
      email,
      content: apollo
        ? `Apollo enrichment: ${apollo.first_name} ${apollo.last_name}, ${apollo.title} at ${apollo.organization?.name}`
        : `No Apollo data found for ${email}`,
      speaker: "enrichment",
      enhanced: true,
    });

    // Let the LLM use Personize tools autonomously
    const result = await runOpenAIWithPersonize(openai, {
      model: "gpt-4o",
      systemPrompt:
        "You are a sales email writer with access to Personize memory and organizational guidelines. " +
        "Before writing, ALWAYS: (1) recall what we know about the contact, (2) check our outbound email guidelines via smart_guidelines. " +
        "After generating the email, memorize what you sent.",
      userPrompt: `Write a personalized cold outreach email to ${email} at ${company}. Keep it under 150 words with a clear CTA.`,
      maxToolRounds: 5,
    });

    // The LLM already recalled, checked guidelines, and memorized via tool calls
    await sendEmail({ to: email, subject: `Quick question about ${company}`, html: result.content });

    return {
      status: "sent",
      email,
      pattern: "llm-tools",
      toolsUsed: result.toolCalls,
    };
  },
});

// ═════════════════════════════════════════════════════════
// PATTERN C: Recall → Generate → Memorize (simplest loop)
// One function call that handles the full cycle.
// ═════════════════════════════════════════════════════════
export const coldOutreachSimple = task({
  id: "cold-outreach-simple",
  retry: { maxAttempts: 3 },
  run: async (payload: { email: string; company: string }) => {
    const { email, company } = payload;

    // Enrich and memorize
    const apollo = await enrichWithApollo(email);
    if (apollo) {
      await personize.memory.memorize({
        email,
        content: `${apollo.first_name} ${apollo.last_name}, ${apollo.title} at ${apollo.organization?.name}. Seniority: ${apollo.seniority}.`,
        speaker: "enrichment",
        enhanced: true,
      });
    }

    // One call: recall context → inject into prompt → generate → memorize result
    const result = await recallGenerateMemorize({
      email,
      task: `Write a personalized cold outreach email to ${email} at ${company}. Keep under 150 words. Clear CTA.`,
      guidelinesQuery: "cold outbound email guidelines and tone of voice",
      guidelineTags: ["outbound", "email"],
      generateFn: async (enrichedPrompt) => {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: enrichedPrompt }],
        });
        return completion.choices[0].message.content || "";
      },
      memorizeSpeaker: "outbound-sequence",
      memorizeTags: ["outbound", "step-1"],
    });

    await sendEmail({ to: email, subject: `Quick question about ${company}`, html: result.generated });

    return { status: "sent", email, pattern: "recall-generate-memorize" };
  },
});
