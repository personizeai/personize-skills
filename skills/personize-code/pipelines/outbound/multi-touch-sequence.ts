/**
 * Multi-Touch Sequence Pipeline
 *
 * Self-scheduling follow-up sequence with durable waits.
 * After each step, checks if the lead replied. If not, generates
 * and sends a follow-up using full conversation history from Personize memory.
 *
 * Flow per step:
 *   Check for reply (recall) → Generate follow-up (AI + MCP tools) → Send → Memorize → Schedule next
 *
 * The AI agent grows smarter with each step because Personize memory
 * compounds — it knows every prior email, enrichment data, and engagement signal.
 */
import { task, wait } from "@trigger.dev/sdk/v3";
import { personize, generateWithTools } from "../lib/personize";
import { sendEmail, notifySlack } from "../lib/notifications";

const MAX_SEQUENCE_STEPS = 3;
const WAIT_DAYS_PER_STEP = [3, 4, 5]; // days to wait before each follow-up

export const multiTouchSequence = task({
  id: "multi-touch-sequence",
  retry: { maxAttempts: 2 },
  run: async (payload: {
    email: string;
    company: string;
    attempt: number;
  }) => {
    const { email, company, attempt } = payload;

    // ── Check if they replied since last touch ──────────
    const replyCheck = await personize.memory.smartRecall({
      email,
      query: "did this contact reply to our email or respond in any way",
      mode: "fast",
      include_property_values: false,
    });

    const hasEngaged = replyCheck.data?.results?.some(
      (r) =>
        r.text.toLowerCase().includes("replied") ||
        r.text.toLowerCase().includes("responded") ||
        r.text.toLowerCase().includes("inbound") ||
        r.text.toLowerCase().includes("meeting booked")
    );

    if (hasEngaged) {
      await personize.memory.memorize({
        email,
        content: `[SEQUENCE STOPPED] Contact engaged — stopping sequence at step ${attempt + 1}.`,
        speaker: "sequence-engine",
        tags: ["sequence", "engaged"],
      });

      await notifySlack(
        process.env.SLACK_DEFAULT_CHANNEL || "sales-alerts",
        `:tada: *${email}* engaged! Sequence stopped at step ${attempt + 1}. Check inbox.`
      );

      return { status: "engaged", stoppedAtStep: attempt + 1 };
    }

    // ── Check if max attempts reached ───────────────────
    if (attempt >= MAX_SEQUENCE_STEPS) {
      await personize.memory.memorize({
        email,
        content: `[SEQUENCE COMPLETED] ${MAX_SEQUENCE_STEPS} touches sent, no response. Moving to nurture.`,
        speaker: "sequence-engine",
        tags: ["sequence", "completed"],
      });

      return { status: "completed", totalSteps: MAX_SEQUENCE_STEPS };
    }

    // ── Generate follow-up with full context ────────────
    // The AI has access to all prior emails, enrichment, and guidelines via MCP tools
    const stepNumber = attempt + 1;
    const result = await generateWithTools({
      prompt: [
        `This is follow-up #${stepNumber} for ${email} at ${company}.`,
        "",
        `Instructions:`,
        `1. Use recall to review our FULL conversation history with this contact.`,
        `   Look for: previous emails sent, enrichment data, any known interests.`,
        `2. Use smart_guidelines to get our follow-up email guidelines.`,
        `3. Write a follow-up email that:`,
        `   - Does NOT repeat the same message as previous emails`,
        `   - Adds NEW value (case study, insight, relevant news)`,
        `   - References the previous outreach naturally`,
        `   - Is shorter than the previous email`,
        stepNumber === MAX_SEQUENCE_STEPS
          ? `   - This is the FINAL follow-up. Use a polite "breakup" tone. Keep the door open.`
          : `   - Keeps the conversation warm without being pushy`,
        `4. Keep it under ${150 - stepNumber * 20} words.`,
        "",
        `Previous emails were sent as step 1 through ${attempt}. Do not repeat them.`,
      ].join("\n"),
      email,
      outputs: [
        { name: "email_subject" },
        { name: "email_body" },
        { name: "next_follow_up_days" },
      ],
    });

    const subject = String(
      result.data?.outputs?.email_subject || `Re: Following up — ${company}`
    );
    const body = String(result.data?.outputs?.email_body || result.data?.text || "");

    // ── Send ────────────────────────────────────────────
    await sendEmail({ to: email, subject, html: body });

    // ── Memorize ────────────────────────────────────────
    await personize.memory.memorize({
      email,
      content: [
        `[OUTBOUND EMAIL SENT] ${new Date().toISOString()}`,
        `Sequence step: ${stepNumber}`,
        `Subject: ${subject}`,
        `Body: ${body}`,
      ].join("\n"),
      speaker: "outbound-sequence",
      tags: ["outbound", `step-${stepNumber}`],
    });

    // ── Schedule next follow-up ─────────────────────────
    if (stepNumber < MAX_SEQUENCE_STEPS) {
      const nextWaitDays =
        Number(result.data?.outputs?.next_follow_up_days) ||
        WAIT_DAYS_PER_STEP[stepNumber] ||
        5;

      await multiTouchSequence.trigger(
        { email, company, attempt: stepNumber },
        { delay: `${nextWaitDays}d` }
      );

      return { status: "sent", step: stepNumber, nextFollowUpDays: nextWaitDays };
    }

    return { status: "sent", step: stepNumber, final: true };
  },
});
