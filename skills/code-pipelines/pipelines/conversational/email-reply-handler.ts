/**
 * Email Reply Handler
 *
 * Handles inbound emails (replies to outreach, new inquiries).
 * Uses full Personize memory to understand the relationship context
 * and generates informed replies following org guidelines.
 *
 * Trigger: Webhook from Gmail push notification or polled by scheduled task.
 *
 * Flow:
 *   Read email → Strip quoted text → Recall full history → Get guidelines
 *   → Classify intent → Generate reply → Send → Memorize → Schedule follow-up
 *
 * Self-scheduling: If the reply warrants a follow-up in X days,
 * the task schedules itself automatically.
 */
import { task, schedules } from "@trigger.dev/sdk/v3";
import { personize, generateWithTools } from "../lib/personize";
import {
  createGmailClient,
  extractBody,
  getHeader,
  extractEmail,
  stripQuotedReply,
  buildReplyRaw,
} from "../lib/gmail";
import { notifySlack } from "../lib/notifications";

// ═════════════════════════════════════════════════════════
// 1. HANDLE A SINGLE INBOUND EMAIL
// ═════════════════════════════════════════════════════════
export const handleInboundEmail = task({
  id: "handle-inbound-email",
  retry: { maxAttempts: 2 },
  run: async (payload: {
    messageId: string;
    // OR pass raw data if triggered from webhook
    from?: string;
    subject?: string;
    body?: string;
    threadId?: string;
  }) => {
    let from: string;
    let subject: string;
    let body: string;
    let threadId: string | undefined;
    let inReplyTo: string | undefined;
    let references: string | undefined;

    // ── Read from Gmail if messageId provided ───────────
    if (payload.messageId && !payload.body) {
      const gmail = createGmailClient();
      const message = await gmail.users.messages.get({
        userId: "me",
        id: payload.messageId,
        format: "full",
      });

      from = getHeader(message.data, "From");
      subject = getHeader(message.data, "Subject");
      body = extractBody(message.data);
      threadId = message.data.threadId || undefined;
      inReplyTo = getHeader(message.data, "Message-ID");
      references = getHeader(message.data, "References");
    } else {
      from = payload.from || "";
      subject = payload.subject || "";
      body = payload.body || "";
      threadId = payload.threadId;
    }

    const senderEmail = extractEmail(from);
    const cleanBody = stripQuotedReply(body);

    if (!senderEmail || !cleanBody) {
      return { status: "skipped", reason: "no sender or empty body" };
    }

    // ── Memorize the inbound message ────────────────────
    await personize.memory.memorize({
      email: senderEmail,
      content: [
        `[EMAIL RECEIVED] ${new Date().toISOString()}`,
        `From: ${from}`,
        `Subject: ${subject}`,
        `Body: ${cleanBody}`,
      ].join("\n"),
      speaker: "inbound-email",
      tags: ["inbound", "email"],
    });

    // ── AI handles everything via MCP tools ─────────────
    // The AI will:
    // - Recall all prior interactions with this contact
    // - Check org guidelines for reply tone/rules
    // - Classify intent
    // - Draft a reply (or recommend escalation)
    const result = await generateWithTools({
      prompt: [
        `Inbound email received from ${senderEmail}:`,
        `Subject: ${subject}`,
        `Body: ${cleanBody}`,
        "",
        `Instructions:`,
        `1. Use recall to get our FULL history with ${senderEmail}:`,
        `   - Did we send them outreach? What step were they on?`,
        `   - Do we have enrichment data (title, company, etc.)?`,
        `   - Any prior conversations or notes?`,
        `2. Use smart_guidelines to get our email reply guidelines.`,
        `3. Classify their intent:`,
        `   - "interested": Wants to learn more / book a call`,
        `   - "question": Has a specific question we should answer`,
        `   - "objection": Pushing back on something`,
        `   - "not_interested": Polite decline or unsubscribe`,
        `   - "out_of_office": Auto-reply`,
        `   - "spam": Not relevant`,
        `4. If we should reply (interested, question, objection):`,
        `   - Write a contextual reply that references our conversation history`,
        `   - Follow our guidelines for tone and length`,
        `   - If interested: propose a specific next step`,
        `   - If question: answer directly, then propose next step`,
        `   - If objection: address it thoughtfully`,
        `5. Recommend follow-up timing (0 = no follow-up needed).`,
        `6. Should we escalate to an AE? (true/false)`,
      ].join("\n"),
      email: senderEmail,
      outputs: [
        { name: "intent" },
        { name: "should_reply" },
        { name: "reply_body" },
        { name: "reply_subject" },
        { name: "should_escalate" },
        { name: "escalate_reason" },
        { name: "follow_up_days" },
      ],
    });

    const outputs = result.data?.outputs || {};
    const intent = String(outputs.intent || "unknown");
    const shouldReply = outputs.should_reply === true || outputs.should_reply === "true";
    const shouldEscalate = outputs.should_escalate === true || outputs.should_escalate === "true";
    const followUpDays = Number(outputs.follow_up_days) || 0;

    // ── Send reply if appropriate ───────────────────────
    if (shouldReply && outputs.reply_body) {
      const gmail = createGmailClient();
      const replyRaw = buildReplyRaw({
        to: senderEmail,
        from: process.env.GMAIL_DELEGATED_USER || process.env.SENDER_EMAIL || "",
        subject: String(outputs.reply_subject || subject),
        body: String(outputs.reply_body),
        inReplyTo,
        references,
      });

      await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw: replyRaw, threadId },
      });

      // Memorize our reply
      await personize.memory.memorize({
        email: senderEmail,
        content: [
          `[EMAIL SENT - REPLY] ${new Date().toISOString()}`,
          `Subject: ${outputs.reply_subject || subject}`,
          `In response to their ${intent}`,
          `Body: ${outputs.reply_body}`,
        ].join("\n"),
        speaker: "outbound-reply",
        tags: ["outbound", "reply", intent],
      });
    }

    // ── Escalate if needed ──────────────────────────────
    if (shouldEscalate) {
      // Get a digest for the AE
      const digest = await personize.memory.smartDigest({
        email: senderEmail,
        includeProperties: true,
        includeMemories: true,
        tokenBudget: 2000,
      });

      await notifySlack(
        process.env.SLACK_DEFAULT_CHANNEL || "sales-alerts",
        [
          `:rotating_light: *Escalation: ${senderEmail}*`,
          `Intent: ${intent}`,
          `Reason: ${outputs.escalate_reason || "AI recommended escalation"}`,
          "",
          `*Context:*`,
          digest.data?.compiledContext?.substring(0, 500) || "No context available",
        ].join("\n")
      );
    }

    // ── Schedule follow-up ──────────────────────────────
    if (followUpDays > 0) {
      await scheduledEmailFollowUp.trigger(
        { email: senderEmail, context: `Follow up on their ${intent}`, attempt: 1 },
        { delay: `${followUpDays}d` }
      );
    }

    return {
      email: senderEmail,
      intent,
      replied: shouldReply,
      escalated: shouldEscalate,
      followUpScheduled: followUpDays > 0,
    };
  },
});

// ═════════════════════════════════════════════════════════
// 2. SCHEDULED FOLLOW-UP (self-scheduling)
// ═════════════════════════════════════════════════════════
export const scheduledEmailFollowUp = task({
  id: "scheduled-email-follow-up",
  retry: { maxAttempts: 2 },
  run: async (payload: {
    email: string;
    context: string;
    attempt: number;
  }) => {
    const { email, attempt } = payload;

    // Check if they've replied since we scheduled this
    const recent = await personize.memory.smartRecall({
      email,
      query: "any new messages or replies from this contact in the last week",
      fast_mode: true,
    });

    const hasNewActivity = recent.data?.results?.some(
      (r) =>
        r.text.includes("EMAIL RECEIVED") &&
        new Date(r.text.match(/\d{4}-\d{2}-\d{2}/)?.[0] || 0) >
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    if (hasNewActivity) {
      return { status: "cancelled", reason: "contact has new activity" };
    }

    if (attempt >= 3) {
      return { status: "ended", reason: "max follow-ups reached" };
    }

    // Generate and send follow-up
    const result = await generateWithTools({
      prompt: [
        `Generate a follow-up email for ${email}.`,
        `Context: ${payload.context}`,
        `This is follow-up attempt ${attempt}.`,
        "",
        `Use recall to review all prior interactions.`,
        `Use smart_guidelines to get follow-up guidelines.`,
        `Write a brief, value-adding follow-up. Not pushy.`,
      ].join("\n"),
      email,
      outputs: [
        { name: "subject" },
        { name: "body" },
        { name: "next_follow_up_days" },
      ],
    });

    if (result.data?.outputs?.body) {
      const gmail = createGmailClient();
      const raw = buildReplyRaw({
        to: email,
        from: process.env.GMAIL_DELEGATED_USER || process.env.SENDER_EMAIL || "",
        subject: String(result.data.outputs.subject || "Following up"),
        body: String(result.data.outputs.body),
      });

      await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw },
      });

      await personize.memory.memorize({
        email,
        content: `[FOLLOW-UP SENT] Attempt ${attempt}: ${result.data.outputs.body}`,
        speaker: "follow-up-engine",
        tags: ["outbound", "follow-up"],
      });
    }

    // Self-schedule next follow-up
    const nextDays = Number(result.data?.outputs?.next_follow_up_days) || 0;
    if (nextDays > 0 && attempt < 3) {
      await scheduledEmailFollowUp.trigger(
        { email, context: payload.context, attempt: attempt + 1 },
        { delay: `${nextDays}d` }
      );
    }

    return { status: "sent", attempt, nextFollowUpDays: nextDays };
  },
});

// ═════════════════════════════════════════════════════════
// 3. SCHEDULED: Poll Gmail for new emails (fallback if no push)
// ═════════════════════════════════════════════════════════
export const gmailPoller = schedules.task({
  id: "gmail-inbox-poller",
  cron: "*/5 * * * *", // every 5 minutes
  run: async () => {
    const gmail = createGmailClient();

    // Get unread messages from the last 10 minutes
    const since = Math.floor((Date.now() - 10 * 60 * 1000) / 1000);
    const response = await gmail.users.messages.list({
      userId: "me",
      q: `is:unread after:${since}`,
      maxResults: 10,
    });

    const messages = response.data.messages || [];
    let processed = 0;

    for (const msg of messages) {
      if (!msg.id) continue;

      await handleInboundEmail.trigger({ messageId: msg.id });
      processed++;

      // Mark as read
      await gmail.users.messages.modify({
        userId: "me",
        id: msg.id,
        requestBody: { removeLabelIds: ["UNREAD"] },
      });
    }

    return { polled: messages.length, triggered: processed };
  },
});
