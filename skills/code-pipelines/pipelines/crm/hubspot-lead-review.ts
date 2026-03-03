/**
 * HubSpot Lead Review Pipeline
 *
 * Scheduled task that regularly:
 * 1. Pulls leads from HubSpot
 * 2. Enriches + researches them (Apollo, Tavily, Exa)
 * 3. Memorizes everything into Personize
 * 4. Reviews engagement history using Personize memory
 * 5. AI plans next actions (follow-up, escalate, nurture, or skip)
 * 6. Optionally auto-triggers follow-up sequences
 *
 * The AI agent compounds knowledge over time — each review cycle
 * builds on everything it already knows from prior interactions.
 */
import { task, schedules, wait } from "@trigger.dev/sdk/v3";
import { Client as HubSpotClient } from "@hubspot/api-client";
import { personize, generateWithTools, ALL_PERSONIZE_TOOLS } from "../lib/personize";
import { enrichWithApollo, searchWithTavily } from "../lib/enrichment";
import { notifySlack, formatLeadAlert } from "../lib/notifications";
import { multiTouchSequence } from "../outbound/multi-touch-sequence";

const hubspot = new HubSpotClient({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN!,
});

// ═════════════════════════════════════════════════════════
// 1. SCHEDULED: Review all active leads daily
// ═════════════════════════════════════════════════════════
export const hubspotDailyReview = schedules.task({
  id: "hubspot-daily-lead-review",
  cron: "0 8 * * 1-5", // 8am UTC, weekdays
  run: async () => {
    // Pull leads from HubSpot that need attention
    const leads = await hubspot.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            { propertyName: "lifecyclestage", operator: "EQ", value: "lead" },
            { propertyName: "hs_lead_status", operator: "NEQ", value: "UNQUALIFIED" },
          ],
        },
      ],
      properties: [
        "firstname", "lastname", "email", "phone", "company",
        "jobtitle", "lifecyclestage", "hs_lead_status",
        "notes_last_updated", "hubspot_owner_id",
        "hs_email_last_reply_date", "num_contacted_notes",
      ],
      limit: 50,
      after: "0",
      sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
    });

    const reviewResults = [];

    for (const lead of leads.results) {
      const email = lead.properties.email;
      if (!email) continue;

      // Process each lead (with rate limit spacing)
      const result = await reviewSingleLead.triggerAndWait({
        email,
        hubspotId: lead.id,
        properties: lead.properties,
      });

      if (result.ok) {
        reviewResults.push(result.output);
      }

      // Space out to respect API rate limits
      await wait.for({ seconds: 2 });
    }

    // Post summary to Slack
    const actionable = reviewResults.filter(
      (r: any) => r?.action && r.action !== "skip"
    );

    if (actionable.length > 0) {
      await notifySlack(
        process.env.SLACK_DEFAULT_CHANNEL || "sales-alerts",
        [
          `:clipboard: *HubSpot Daily Lead Review* — ${leads.results.length} leads reviewed`,
          "",
          ...actionable.map(
            (r: any) =>
              `• *${r.email}* — ${r.action}: ${r.reasoning}`
          ),
        ].join("\n")
      );
    }

    return {
      totalReviewed: leads.results.length,
      actionable: actionable.length,
    };
  },
});

// ═════════════════════════════════════════════════════════
// 2. SINGLE LEAD REVIEW — enrich, memorize, plan action
// ═════════════════════════════════════════════════════════
export const reviewSingleLead = task({
  id: "hubspot-review-single-lead",
  retry: { maxAttempts: 2 },
  run: async (payload: {
    email: string;
    hubspotId: string;
    properties: Record<string, string>;
  }) => {
    const { email, hubspotId, properties } = payload;
    const company = properties.company || "Unknown";
    const name = `${properties.firstname || ""} ${properties.lastname || ""}`.trim();

    // ── Enrich if we haven't before ─────────────────────
    const existingMemory = await personize.memory.recall({
      email,
      query: "enrichment data from Apollo",
      fast_mode: true,
    });

    const hasEnrichment = existingMemory.data?.results?.some(
      (r) => r.text.includes("Apollo") || r.text.includes("Enrichment")
    );

    if (!hasEnrichment) {
      // First time seeing this lead — full enrichment
      const [apollo, research] = await Promise.all([
        enrichWithApollo(email),
        searchWithTavily(`"${company}" recent news`, { maxResults: 3, days: 90 }),
      ]);

      const enrichContent = [
        `## HubSpot Lead Imported — ${new Date().toISOString()}`,
        `HubSpot ID: ${hubspotId}`,
        `Name: ${name}`,
        `Company: ${company}`,
        `Title: ${properties.jobtitle || "Unknown"}`,
        `Status: ${properties.hs_lead_status || "NEW"}`,
        "",
        apollo
          ? [
              `### Enrichment (Apollo)`,
              `- Full name: ${apollo.first_name} ${apollo.last_name}`,
              `- Title: ${apollo.title}`,
              `- Seniority: ${apollo.seniority}`,
              apollo.linkedin_url ? `- LinkedIn: ${apollo.linkedin_url}` : "",
              apollo.organization
                ? `- Company size: ${apollo.organization.estimated_num_employees} employees\n- Industry: ${apollo.organization.industry}`
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
        content: enrichContent,
        speaker: "hubspot-sync",
        enhanced: true,
        tags: ["enrichment", "hubspot"],
      });
    }

    // ── Sync latest HubSpot properties ──────────────────
    await personize.memory.memorize({
      email,
      content: [
        `[HUBSPOT SYNC] ${new Date().toISOString()}`,
        `Status: ${properties.hs_lead_status || "N/A"}`,
        `Lifecycle: ${properties.lifecyclestage || "N/A"}`,
        `Last reply: ${properties.hs_email_last_reply_date || "Never"}`,
        `Times contacted: ${properties.num_contacted_notes || "0"}`,
      ].join("\n"),
      speaker: "hubspot-sync",
      tags: ["hubspot", "status-update"],
    });

    // ── AI reviews engagement and plans next action ─────
    const review = await generateWithTools({
      prompt: [
        `You are reviewing lead ${email} (${name} @ ${company}) from HubSpot.`,
        "",
        `Instructions:`,
        `1. Use recall to get EVERYTHING we know about this lead:`,
        `   - Enrichment data, engagement history, prior emails, notes`,
        `2. Use smart_guidelines to check our lead engagement guidelines.`,
        `3. Based on all context, decide the next action:`,
        `   - "follow_up": We should send a personalized follow-up`,
        `   - "escalate": Hot lead, needs AE attention now`,
        `   - "nurture": Not ready, add to nurture track`,
        `   - "research": Need more info before engaging`,
        `   - "skip": Already engaged or recently contacted`,
        `4. Explain your reasoning in 1-2 sentences.`,
        `5. If follow_up: suggest when (days from now).`,
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

    // ── Act on the recommendation ───────────────────────
    if (action === "follow_up") {
      await multiTouchSequence.trigger(
        { email, company, attempt: 0 },
        { delay: `${followUpDays}d` }
      );
    }

    if (action === "escalate") {
      await notifySlack(
        process.env.SLACK_DEFAULT_CHANNEL || "sales-alerts",
        formatLeadAlert({
          email,
          name,
          company,
          score,
          route: "AE",
          reason: reasoning,
        })
      );
    }

    return { email, name, company, action, reasoning, score };
  },
});

// ═════════════════════════════════════════════════════════
// 3. WEBHOOK: Handle new HubSpot contact creation
// ═════════════════════════════════════════════════════════
export const hubspotContactCreated = task({
  id: "hubspot-contact-created",
  retry: { maxAttempts: 3 },
  run: async (payload: {
    hubspotId: string;
  }) => {
    // Fetch full contact from HubSpot
    const contact = await hubspot.crm.contacts.basicApi.getById(
      payload.hubspotId,
      [
        "firstname", "lastname", "email", "phone", "company",
        "jobtitle", "lifecyclestage", "hs_lead_status",
      ]
    );

    const email = contact.properties.email;
    if (!email) return { status: "skipped", reason: "no email" };

    // Trigger a full review
    const result = await reviewSingleLead.triggerAndWait({
      email,
      hubspotId: payload.hubspotId,
      properties: contact.properties,
    });

    return result.ok ? result.output : { status: "failed" };
  },
});
