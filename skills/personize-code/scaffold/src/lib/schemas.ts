/**
 * Zod input schemas for all pipeline task payloads.
 *
 * Import the relevant schema in your pipeline and call `.parse()` at the top
 * of your `run()` function. This gives you type-safe, validated payloads and
 * clear error messages for bad input.
 *
 * @example
 * ```typescript
 * import { ColdOutreachInput } from "@/lib/schemas";
 *
 * export const coldOutreach = task({
 *   id: "cold-outreach",
 *   run: async (rawPayload) => {
 *     const payload = ColdOutreachInput.parse(rawPayload);
 *     // payload.email is now typed and validated
 *   },
 * });
 * ```
 */
import { z } from "zod";

// ─── Outbound ───────────────────────────────

export const ColdOutreachInput = z.object({
    email: z.string().email("Valid email required"),
    company: z.string().optional(),
    source: z.string().optional(),
    startSequence: z.boolean().optional().default(true),
});

export const MultiTouchInput = z.object({
    email: z.string().email(),
    company: z.string(),
    attempt: z.number().int().min(0).max(10),
});

export const ColdOutreachBYOLLMInput = z.object({
    email: z.string().email(),
    company: z.string(),
});

// ─── Conversational ─────────────────────────

export const InboundEmailInput = z.object({
    messageId: z.string().optional(),
    from: z.string().optional(),
    subject: z.string().optional(),
    body: z.string().optional(),
    threadId: z.string().optional(),
});

export const EmailFollowUpInput = z.object({
    email: z.string().email(),
    context: z.string(),
    attempt: z.number().int().min(0).max(5),
});

export const SlackMessageInput = z.object({
    text: z.string().min(1),
    userId: z.string(),
    channelId: z.string(),
    threadTs: z.string().optional(),
    ts: z.string(),
});

export const MeetingPrepInput = z.object({
    email: z.string().email(),
    channelId: z.string(),
    threadTs: z.string().optional(),
});

// ─── CRM ────────────────────────────────────

export const HubSpotLeadReviewInput = z.object({
    email: z.string().email(),
    hubspotId: z.string(),
    properties: z.record(z.string()),
});

export const HubSpotContactCreatedInput = z.object({
    hubspotId: z.string(),
});

export const SalesforceLeadReviewInput = z.object({
    email: z.string().email(),
    salesforceId: z.string(),
    name: z.string(),
    company: z.string(),
    title: z.string().optional().default(""),
    status: z.string(),
    leadSource: z.string().optional().default(""),
    lastActivity: z.string().optional().default(""),
    industry: z.string().optional().default(""),
    employeeCount: z.number().optional().default(0),
});

// ─── Quickstart ─────────────────────────────

export const QuickstartInput = z.object({
    email: z.string().email("Valid email required"),
    message: z.string().min(1, "Message cannot be empty"),
});
