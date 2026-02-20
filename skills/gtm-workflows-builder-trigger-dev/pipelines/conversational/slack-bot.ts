/**
 * Slack Bot Pipeline
 *
 * Responds to Slack messages/mentions with Personize-powered answers.
 * Useful for internal sales team queries like:
 *   "@bot what do we know about john@acme.com?"
 *   "@bot prep me for my call with Acme Corp"
 *   "@bot draft a follow-up for sarah@startup.io"
 *
 * The AI has full access to Personize memory and org guidelines via MCP tools.
 *
 * Trigger: Webhook from Slack Events API
 */
import { task } from "@trigger.dev/sdk/v3";
import { WebClient } from "@slack/web-api";
import { personize, generateWithTools } from "../lib/personize";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN!);

export const handleSlackMessage = task({
  id: "handle-slack-message",
  retry: { maxAttempts: 2 },
  run: async (payload: {
    text: string;
    userId: string;
    channelId: string;
    threadTs?: string;
    ts: string;
  }) => {
    const { text, channelId, threadTs, ts } = payload;

    // Extract email from the message if present
    const emailMatch = text.match(
      /[\w.+-]+@[\w-]+\.[\w.]+/
    );
    const email = emailMatch?.[0];

    // ── Generate response using Personize AI + MCP tools ─
    const result = await generateWithTools({
      prompt: [
        `A sales team member asked in Slack: "${text}"`,
        "",
        `Instructions:`,
        `1. If an email address is mentioned (${email || "none"}):`,
        `   - Use recall to get everything we know about that contact`,
        `   - Use smart_digest if they ask for a summary or meeting prep`,
        `2. Use smart_context to check any relevant org guidelines or playbooks.`,
        `3. Answer the question directly and helpfully.`,
        `4. If they ask to draft something (email, follow-up, brief):`,
        `   - Generate it using our guidelines and the contact's context`,
        `   - Format it so they can copy-paste`,
        `5. Keep your response concise — this is Slack, not a novel.`,
        `6. If you don't have enough information, say so honestly and suggest what data to add.`,
      ].join("\n"),
      email: email || undefined,
    });

    const responseText = result.data?.text || "I couldn't generate a response. Please try again.";

    // ── Reply in Slack thread ───────────────────────────
    await slack.chat.postMessage({
      channel: channelId,
      text: responseText,
      thread_ts: threadTs || ts,
      unfurl_links: false,
    });

    // ── Memorize the interaction if about a specific contact
    if (email) {
      await personize.memory.memorize({
        email,
        content: [
          `[SLACK QUERY] ${new Date().toISOString()}`,
          `Team member asked: ${text}`,
          `AI response provided (not shown to contact)`,
        ].join("\n"),
        speaker: "slack-bot",
        tags: ["internal", "slack"],
      });
    }

    return { responded: true, email: email || null };
  },
});

// ═════════════════════════════════════════════════════════
// Meeting Prep Command
// ═════════════════════════════════════════════════════════
export const meetingPrepCommand = task({
  id: "slack-meeting-prep",
  run: async (payload: {
    email: string;
    channelId: string;
    threadTs?: string;
  }) => {
    const { email, channelId } = payload;

    // Get full context digest
    const digest = await personize.memory.smartDigest({
      email,
      include_properties: true,
      include_memories: true,
      token_budget: 4000,
    });

    // AI generates a meeting prep brief
    const brief = await generateWithTools({
      prompt: [
        `Prepare a meeting brief for a call with ${email}.`,
        "",
        `Here is everything we know about them:`,
        digest.data?.compiledContext || "No data available.",
        "",
        `Instructions:`,
        `1. Use smart_context to get our meeting prep guidelines and discovery questions.`,
        `2. Generate a brief that includes:`,
        `   - Key facts about the person and company`,
        `   - Our prior interactions and conversation history`,
        `   - 3-5 tailored discovery questions based on their context`,
        `   - Suggested talking points and value props for their situation`,
        `   - Any potential objections to prepare for`,
        `3. Format for quick scanning in Slack (use bullet points and bold headers).`,
      ].join("\n"),
      email,
    });

    await slack.chat.postMessage({
      channel: channelId,
      text: brief.data?.text || "Could not generate meeting prep.",
      thread_ts: payload.threadTs,
    });

    return { sent: true };
  },
});
