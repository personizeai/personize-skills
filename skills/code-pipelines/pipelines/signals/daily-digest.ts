/**
 * Daily Engagement Digest
 *
 * End-of-day summary of all lead engagement activity.
 * Uses Personize memory to compile a comprehensive report
 * and posts it to Slack.
 *
 * Covers:
 * - New inbound leads
 * - Replies received
 * - Follow-ups sent
 * - Leads that need attention
 * - Account signals detected
 */
import { schedules } from "@trigger.dev/sdk/v3";
import { personize, generateWithTools } from "../lib/personize";
import { notifySlack } from "../lib/notifications";

export const dailyEngagementDigest = schedules.task({
  id: "daily-engagement-digest",
  cron: "0 17 * * 1-5", // 5pm UTC, weekdays
  run: async () => {
    // ── AI generates the digest using Personize memory ──
    // The AI has MCP tool access to recall and export data
    const digest = await generateWithTools({
      prompt: [
        `Generate a daily engagement digest for the sales team.`,
        `Today is ${new Date().toISOString().split("T")[0]}.`,
        "",
        `Instructions:`,
        `1. Use recall to find all engagement from today across all contacts:`,
        `   - Search for "EMAIL RECEIVED" to find inbound messages`,
        `   - Search for "OUTBOUND EMAIL SENT" to find outreach sent`,
        `   - Search for "FOLLOW-UP SENT" to find follow-ups`,
        `   - Search for "SEQUENCE STOPPED" to find engaged leads`,
        `   - Search for "Account Signals" to find today's signals`,
        `2. Compile a digest with these sections:`,
        `   **Inbound Activity**: New replies and inquiries received`,
        `   **Outbound Activity**: Emails and follow-ups sent`,
        `   **Engaged Leads**: Leads that responded positively`,
        `   **Signals**: Account intelligence detected today`,
        `   **Needs Attention**: Leads that may need manual follow-up`,
        `3. For each lead mentioned, include their email and company.`,
        `4. Highlight the top 3 hottest leads and explain why.`,
        `5. Keep it concise — scannable in under 2 minutes.`,
        `6. Use Slack formatting (bold, bullet points).`,
      ].join("\n"),
    });

    const digestText = digest.data?.text || "No engagement data found for today.";

    // ── Post to Slack ───────────────────────────────────
    await notifySlack(
      process.env.SLACK_DEFAULT_CHANNEL || "sales-alerts",
      `:bar_chart: *Daily Engagement Digest — ${new Date().toLocaleDateString()}*\n\n${digestText}`
    );

    // ── Also post a quick pipeline health check ─────────
    // Use Personize search with countOnly for pipeline stats
    const [activeLeads, engagedLeads, stalledLeads] = await Promise.all([
      personize.memory.search({
        groups: [{
          conditions: [{ property: "lifecycle_stage", operator: "EQ", value: "lead" }],
        }],
        type: "Contact",
        countOnly: true,
      }),
      personize.memory.search({
        groups: [{
          conditions: [{ property: "engagement_status", operator: "EQ", value: "engaged" }],
        }],
        type: "Contact",
        countOnly: true,
      }),
      personize.memory.search({
        groups: [{
          conditions: [{ property: "engagement_status", operator: "EQ", value: "stalled" }],
        }],
        type: "Contact",
        countOnly: true,
      }),
    ]);

    const pipelineStats = [
      `:chart_with_upwards_trend: *Pipeline Health*`,
      `• Active leads: ${activeLeads.data?.totalMatched || 0}`,
      `• Engaged: ${engagedLeads.data?.totalMatched || 0}`,
      `• Needs attention: ${stalledLeads.data?.totalMatched || 0}`,
    ].join("\n");

    await notifySlack(
      process.env.SLACK_DEFAULT_CHANNEL || "sales-alerts",
      pipelineStats
    );

    return { posted: true };
  },
});
