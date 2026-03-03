/**
 * Hello Personize — 5-Minute Quickstart Pipeline
 *
 * The simplest possible pipeline that demonstrates the full Personize cycle:
 *   1. Validate input (Zod)
 *   2. Recall existing memory for a contact
 *   3. Fetch governance rules (smartGuidelines)
 *   4. Generate a personalized reply using Personize AI
 *   5. Memorize the interaction
 *
 * No external integrations needed — just PERSONIZE_SECRET_KEY and TRIGGER_SECRET_KEY.
 *
 * Copy this file into scaffold/src/trigger/ and run:
 *   npx trigger.dev@latest dev
 *
 * Then trigger via the Trigger.dev dashboard or API:
 *   { "email": "john@acme.com", "message": "Tell me about your product" }
 */
import { task } from "@trigger.dev/sdk/v3";
import { personize, generateWithTools } from "@/lib/personize";
import { QuickstartInput } from "@/lib/schemas";

export const helloPersonize = task({
    id: "hello-personize",
    retry: { maxAttempts: 2 },
    run: async (rawPayload: unknown) => {
        // ── Step 1: Validate input ──────────────────────
        const { email, message } = QuickstartInput.parse(rawPayload);

        // ── Step 2: Recall what we know ─────────────────
        const memories = await personize.memory.recall({
            email,
            query: "all context about this contact",
            include_property_values: true,
            fast_mode: false,
        });

        const context = memories.data?.results
            ?.slice(0, 5)
            .map((r) => `- ${r.text}`)
            .join("\n") || "No prior data.";

        // ── Step 3: Fetch governance rules ──────────────
        // These come from your Personize dashboard → Governance Variables.
        // Set up rules like "tone of voice", "compliance rules", "CTA guidelines".
        const guidelines = await personize.ai.smartGuidelines({
            message: "email reply guidelines, tone of voice, compliance",
            tags: ["email", "outbound"],
        });

        // ── Step 4: Generate personalized response ──────
        const result = await generateWithTools({
            prompt: [
                `## Organizational Guidelines`,
                guidelines.data?.compiledContext || "No guidelines configured yet.",
                "",
                `## Contact Context`,
                context,
                "",
                `## Task`,
                `A contact (${email}) sent this message: "${message}"`,
                `Write a helpful, personalized reply that:`,
                `- References any known context about them`,
                `- Follows the organizational guidelines above`,
                `- Is concise (under 100 words)`,
                `- Has a clear next step`,
            ].join("\n"),
            email,
            outputs: [
                { name: "reply" },
                { name: "suggested_next_step" },
            ],
        });

        const reply = String(result.data?.outputs?.reply || result.data?.text || "");
        const nextStep = String(result.data?.outputs?.suggested_next_step || "");

        // ── Step 5: Memorize the interaction ─────────────
        await personize.memory.memorize({
            email,
            content: [
                `[QUICKSTART INTERACTION] ${new Date().toISOString()}`,
                `Inbound: ${message}`,
                `AI Reply: ${reply}`,
                nextStep ? `Next step: ${nextStep}` : "",
            ].filter(Boolean).join("\n"),
            speaker: "quickstart-pipeline",
            tags: ["quickstart", "interaction"],
        });

        return {
            email,
            reply,
            nextStep,
            memoryUsed: context !== "No prior data.",
            guidelinesApplied: !!guidelines.data?.compiledContext,
        };
    },
});
