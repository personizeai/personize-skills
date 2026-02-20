/**
 * Cold Outreach Pipeline
 *
 * Trigger: Programmatic or webhook (e.g., new lead added to target list)
 * Flow: Enrich (Apollo) → Research (Tavily/Exa) → Memorize → AI Generate → Send → Memorize
 *
 * The AI agent has access to Personize MCP tools and autonomously:
 * - Recalls any existing memory about the lead
 * - Checks org guidelines for outbound email tone/rules
 * - Generates a personalized email using all context
 * - Auto-memorizes the interaction
 */
import { task } from "@trigger.dev/sdk/v3";
import { personize, generateWithTools } from "../lib/personize";
import { enrichWithApollo, searchWithTavily, searchWithExa } from "../lib/enrichment";
import { sendEmail } from "../lib/notifications";
import { multiTouchSequence } from "./multi-touch-sequence";

export const coldOutreachPipeline = task({
  id: "cold-outreach-pipeline",
  retry: { maxAttempts: 3 },
  run: async (payload: {
    email: string;
    company?: string;
    source?: string;
    startSequence?: boolean; // if true, triggers multi-touch sequence after first email
  }) => {
    const { email, source = "manual" } = payload;

    // ── Step 1: Enrich via Apollo ────────────────────────
    const apollo = await enrichWithApollo(email);
    const company = payload.company || apollo?.organization?.name || "Unknown";

    // ── Step 2: Research via Tavily + Exa ────────────────
    const [tavily, exa] = await Promise.all([
      searchWithTavily(`"${company}" recent news product launches`, {
        maxResults: 5,
        days: 90,
      }),
      searchWithExa(`${company} company overview products services`, {
        numResults: 3,
      }),
    ]);

    // ── Step 3: Memorize enrichment data ────────────────
    const enrichmentContent = [
      `## Enrichment — ${new Date().toISOString()}`,
      `Source: ${source}`,
      "",
      apollo
        ? [
            `### Contact (Apollo)`,
            `- Name: ${apollo.first_name} ${apollo.last_name}`,
            `- Title: ${apollo.title}`,
            `- Seniority: ${apollo.seniority}`,
            apollo.linkedin_url ? `- LinkedIn: ${apollo.linkedin_url}` : "",
            apollo.organization
              ? [
                  `- Company: ${apollo.organization.name}`,
                  `- Industry: ${apollo.organization.industry}`,
                  `- Size: ${apollo.organization.estimated_num_employees} employees`,
                  apollo.organization.technologies?.length
                    ? `- Tech: ${apollo.organization.technologies.slice(0, 10).join(", ")}`
                    : "",
                ]
                  .filter(Boolean)
                  .join("\n")
              : "",
          ]
            .filter(Boolean)
            .join("\n")
        : "### Contact: No Apollo data found",
      "",
      tavily.results.length > 0
        ? [
            `### Recent News (Tavily)`,
            ...tavily.results.map((r) => `- ${r.title}: ${r.content.substring(0, 200)}`),
          ].join("\n")
        : "",
      exa.results.length > 0
        ? [
            `### Company Research (Exa)`,
            ...exa.results.map((r) => `- ${r.title}: ${r.highlights?.[0] || r.text?.substring(0, 200) || ""}`),
          ].join("\n")
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    await personize.memory.memorize({
      email,
      content: enrichmentContent,
      speaker: "enrichment-pipeline",
      enhanced: true,
      tags: ["enrichment", "outbound"],
    });

    // ── Step 4: AI generates personalized email ─────────
    // The AI has MCP tools: it can recall memories, check guidelines autonomously
    const result = await generateWithTools({
      prompt: [
        `You are writing a cold outreach email to ${email}.`,
        `Their name is ${apollo?.first_name || "there"}, title: ${apollo?.title || "Unknown"}, company: ${company}.`,
        "",
        `Instructions:`,
        `1. Use recall to check if we have any prior relationship or context with this person.`,
        `2. Use smart_context to get our outbound email guidelines (tone, length, CTA rules).`,
        `3. Write a personalized cold email that:`,
        `   - References something specific about their company from the research`,
        `   - Connects our value prop to their role/industry`,
        `   - Has a clear, low-friction CTA (e.g., "worth a 15-min chat?" not "book a demo")`,
        `   - Follows our org guidelines for tone and compliance`,
        `4. Keep it under 150 words.`,
      ].join("\n"),
      email,
      outputs: [
        { name: "email_subject" },
        { name: "email_body" },
        { name: "personalization_hook" },
      ],
    });

    const subject = String(result.data?.outputs?.email_subject || `Quick question about ${company}`);
    const body = String(result.data?.outputs?.email_body || result.data?.text || "");

    // ── Step 5: Send the email ──────────────────────────
    await sendEmail({
      to: email,
      subject,
      html: body,
    });

    // ── Step 6: Memorize the outreach ───────────────────
    await personize.memory.memorize({
      email,
      content: [
        `[OUTBOUND EMAIL SENT] ${new Date().toISOString()}`,
        `Subject: ${subject}`,
        `Personalization hook: ${result.data?.outputs?.personalization_hook || "N/A"}`,
        `Body: ${body}`,
        `Source: ${source}`,
        `Sequence step: 1`,
      ].join("\n"),
      speaker: "outbound-sequence",
      tags: ["outbound", "step-1"],
    });

    // ── Step 7: Optionally start multi-touch sequence ───
    if (payload.startSequence) {
      await multiTouchSequence.trigger(
        { email, company, attempt: 1 },
        { delay: "3d" } // first follow-up in 3 days
      );
    }

    return {
      status: "sent",
      email,
      subject,
      enriched: !!apollo,
      sequenceStarted: !!payload.startSequence,
    };
  },
});
