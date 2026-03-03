/**
 * Salesforce Lead Review Pipeline
 *
 * Same pattern as HubSpot: regularly pull leads, enrich, memorize,
 * review engagement, and plan follow-ups.
 *
 * Uses jsforce with username/password auth (no OAuth dance needed).
 */
import { task, schedules, wait } from "@trigger.dev/sdk/v3";
import jsforce from "jsforce";
import { personize, generateWithTools } from "../lib/personize";
import { enrichWithApollo, searchWithTavily } from "../lib/enrichment";
import { notifySlack, formatLeadAlert } from "../lib/notifications";
import { multiTouchSequence } from "../outbound/multi-touch-sequence";

async function getSalesforceConnection(): Promise<jsforce.Connection> {
  const conn = new jsforce.Connection({
    loginUrl: process.env.SALESFORCE_LOGIN_URL || "https://login.salesforce.com",
  });
  await conn.login(
    process.env.SALESFORCE_USERNAME!,
    process.env.SALESFORCE_PASSWORD! + (process.env.SALESFORCE_SECURITY_TOKEN || "")
  );
  return conn;
}

// ═════════════════════════════════════════════════════════
// 1. SCHEDULED: Review Salesforce leads daily
// ═════════════════════════════════════════════════════════
export const salesforceDailyReview = schedules.task({
  id: "salesforce-daily-lead-review",
  cron: "0 8 * * 1-5", // 8am UTC, weekdays
  run: async () => {
    const sf = await getSalesforceConnection();

    // Query open leads
    const result = await sf.query<{
      Id: string;
      Email: string;
      Name: string;
      FirstName: string;
      LastName: string;
      Company: string;
      Title: string;
      Status: string;
      LeadSource: string;
      LastActivityDate: string;
      NumberOfEmployees: number;
      Industry: string;
    }>(
      `SELECT Id, Email, Name, FirstName, LastName, Company, Title,
              Status, LeadSource, LastActivityDate, NumberOfEmployees, Industry
       FROM Lead
       WHERE IsConverted = false
         AND Status != 'Disqualified'
       ORDER BY CreatedDate DESC
       LIMIT 50`
    );

    const reviewResults = [];

    for (const lead of result.records) {
      if (!lead.Email) continue;

      const review = await reviewSalesforceLead.triggerAndWait({
        email: lead.Email,
        salesforceId: lead.Id,
        name: lead.Name,
        company: lead.Company,
        title: lead.Title || "",
        status: lead.Status,
        leadSource: lead.LeadSource || "",
        lastActivity: lead.LastActivityDate || "",
        industry: lead.Industry || "",
        employeeCount: lead.NumberOfEmployees || 0,
      });

      if (review.ok) {
        reviewResults.push(review.output);
      }

      await wait.for({ seconds: 2 });
    }

    // Summary to Slack
    const actionable = reviewResults.filter(
      (r: any) => r?.action && r.action !== "skip"
    );

    if (actionable.length > 0) {
      await notifySlack(
        process.env.SLACK_DEFAULT_CHANNEL || "sales-alerts",
        [
          `:cloud: *Salesforce Daily Lead Review* — ${result.records.length} leads reviewed`,
          "",
          ...actionable.map(
            (r: any) => `• *${r.email}* (${r.company}) — ${r.action}: ${r.reasoning}`
          ),
        ].join("\n")
      );
    }

    return {
      totalReviewed: result.records.length,
      actionable: actionable.length,
    };
  },
});

// ═════════════════════════════════════════════════════════
// 2. SINGLE LEAD REVIEW
// ═════════════════════════════════════════════════════════
export const reviewSalesforceLead = task({
  id: "salesforce-review-single-lead",
  retry: { maxAttempts: 2 },
  run: async (payload: {
    email: string;
    salesforceId: string;
    name: string;
    company: string;
    title: string;
    status: string;
    leadSource: string;
    lastActivity: string;
    industry: string;
    employeeCount: number;
  }) => {
    const { email, salesforceId, name, company } = payload;

    // ── Check if already enriched ───────────────────────
    const existing = await personize.memory.recall({
      email,
      query: "enrichment data",
      fast_mode: true,
    });

    const needsEnrichment = !existing.data?.results?.some(
      (r) => r.text.includes("Apollo") || r.text.includes("Enrichment")
    );

    if (needsEnrichment) {
      const [apollo, research] = await Promise.all([
        enrichWithApollo(email),
        company !== "Unknown"
          ? searchWithTavily(`"${company}" ${payload.industry} news`, {
              maxResults: 3,
              days: 90,
            })
          : Promise.resolve({ results: [] }),
      ]);

      const content = [
        `## Salesforce Lead Imported — ${new Date().toISOString()}`,
        `Salesforce ID: ${salesforceId}`,
        `Name: ${name}`,
        `Company: ${company}`,
        `Title: ${payload.title}`,
        `Industry: ${payload.industry}`,
        `Size: ${payload.employeeCount} employees`,
        `Lead Source: ${payload.leadSource}`,
        `Status: ${payload.status}`,
        "",
        apollo
          ? [
              `### Enrichment (Apollo)`,
              `- Title: ${apollo.title}`,
              `- Seniority: ${apollo.seniority}`,
              apollo.linkedin_url ? `- LinkedIn: ${apollo.linkedin_url}` : "",
              apollo.organization?.technologies?.length
                ? `- Tech stack: ${apollo.organization.technologies.slice(0, 10).join(", ")}`
                : "",
            ]
              .filter(Boolean)
              .join("\n")
          : "",
        research.results.length > 0
          ? [
              `### Recent News`,
              ...research.results.map((r) => `- ${r.title}`),
            ].join("\n")
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      await personize.memory.memorize({
        email,
        content,
        speaker: "salesforce-sync",
        enhanced: true,
        tags: ["enrichment", "salesforce"],
      });
    }

    // ── Sync latest Salesforce status ────────────────────
    await personize.memory.memorize({
      email,
      content: [
        `[SALESFORCE SYNC] ${new Date().toISOString()}`,
        `Status: ${payload.status}`,
        `Last activity: ${payload.lastActivity || "None"}`,
        `Lead source: ${payload.leadSource}`,
      ].join("\n"),
      speaker: "salesforce-sync",
      tags: ["salesforce", "status-update"],
    });

    // ── AI reviews and recommends action ────────────────
    const review = await generateWithTools({
      prompt: [
        `You are reviewing Salesforce lead ${email} (${name} @ ${company}).`,
        `Title: ${payload.title}, Industry: ${payload.industry}, Size: ${payload.employeeCount} employees.`,
        `Current status: ${payload.status}. Last activity: ${payload.lastActivity || "None"}.`,
        "",
        `Instructions:`,
        `1. Use recall to get everything we know about this lead.`,
        `2. Use smart_guidelines to check our lead engagement guidelines.`,
        `3. Decide the next action:`,
        `   - "follow_up": Send a personalized outreach`,
        `   - "escalate": High-value lead, route to AE immediately`,
        `   - "nurture": Not ready, keep in nurture track`,
        `   - "research": Need more info (trigger deeper research)`,
        `   - "skip": Recently contacted or already engaged`,
        `4. Explain your reasoning briefly.`,
      ].join("\n"),
      email,
      outputs: [
        { name: "action" },
        { name: "reasoning" },
        { name: "follow_up_days" },
        { name: "engagement_score" },
      ],
    });

    const action = String(review.data?.outputs?.action || "skip");
    const reasoning = String(review.data?.outputs?.reasoning || "");
    const followUpDays = Number(review.data?.outputs?.follow_up_days) || 3;
    const score = Number(review.data?.outputs?.engagement_score) || 0;

    // ── Act on recommendation ───────────────────────────
    if (action === "follow_up") {
      await multiTouchSequence.trigger(
        { email, company, attempt: 0 },
        { delay: `${followUpDays}d` }
      );
    }

    if (action === "escalate") {
      await notifySlack(
        process.env.SLACK_DEFAULT_CHANNEL || "sales-alerts",
        formatLeadAlert({ email, name, company, score, route: "AE", reason: reasoning })
      );
    }

    // ── Update Salesforce status ────────────────────────
    if (action === "follow_up" || action === "escalate") {
      try {
        const sf = await getSalesforceConnection();
        await sf.sobject("Lead").update({
          Id: payload.salesforceId,
          Status: action === "escalate" ? "Working" : "Contacted",
          Description: `[Personize AI] ${reasoning}`,
        });
      } catch (err) {
        // Don't fail the whole task if SF update fails
        console.error("Salesforce update failed:", err);
      }
    }

    return { email, name, company, action, reasoning, score };
  },
});
