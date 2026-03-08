/**
 * Account Signal Monitor
 *
 * Daily scan of target accounts for buying signals:
 * - Funding rounds, acquisitions
 * - Hiring surges (especially in relevant roles)
 * - Product launches, partnerships
 * - Leadership changes
 *
 * Uses Tavily for news and Exa for semantic/conceptual research.
 * Memorizes signals into Personize and alerts the sales team.
 */
import { schedules, wait } from "@trigger.dev/sdk/v3";
import { personize } from "../lib/personize";
import { searchWithTavily, searchWithExa } from "../lib/enrichment";
import { notifySlack } from "../lib/notifications";

export const accountSignalMonitor = schedules.task({
  id: "account-signal-monitor",
  cron: "0 7 * * 1-5", // 7am UTC, weekdays
  run: async () => {
    // ── Get target accounts from Personize ──────────────
    const accounts = await personize.memory.search({
      groups: [
        {
          conditions: [
            { property: "account_status", operator: "EQ", value: "target" },
            { property: "account_status", operator: "EQ", value: "active" },
            // Also include leads we're actively engaging
            { property: "lifecycle_stage", operator: "EQ", value: "opportunity" },
          ],
        },
      ],
      type: "Company",
      returnRecords: true,
      pageSize: 100,
    });

    const records = accounts.data?.records || {};
    const alerts: Array<{ company: string; signal: string; url: string; severity: string }> = [];
    let scanned = 0;

    for (const [recordId, props] of Object.entries(records)) {
      const company = props.company_name?.value || props.name?.value;
      const domain = props.website?.value || props.domain?.value;
      if (!company) continue;

      scanned++;

      // ── Search for signals via Tavily (news-focused) ──
      const [newsSignals, semanticSignals] = await Promise.all([
        searchWithTavily(
          `"${company}" funding OR acquisition OR hiring OR partnership OR launch`,
          { maxResults: 5, days: 7 }
        ),
        searchWithExa(
          `${company} company announcement news`,
          { numResults: 3, startPublishedDate: getOneWeekAgo() }
        ),
      ]);

      // ── Classify signals ──────────────────────────────
      const allResults = [
        ...newsSignals.results.map((r) => ({
          title: r.title,
          content: r.content,
          url: r.url,
          source: "tavily",
        })),
        ...semanticSignals.results.map((r) => ({
          title: r.title,
          content: r.text?.substring(0, 300) || r.highlights?.[0] || "",
          url: r.url,
          source: "exa",
        })),
      ];

      if (allResults.length === 0) continue;

      // ── Memorize the signals ──────────────────────────
      const signalContent = [
        `## Account Signals Detected — ${new Date().toISOString()}`,
        `Company: ${company}`,
        "",
        ...allResults.map(
          (r) => `### ${r.title}\nSource: ${r.source}\nURL: ${r.url}\n${r.content}`
        ),
      ].join("\n");

      const memorizeTarget = domain
        ? { website_url: domain }
        : { record_id: recordId };

      await personize.memory.memorize({
        ...memorizeTarget,
        content: signalContent,
        speaker: "signal-monitor",
        enhanced: true,
        tags: ["signals", "account-intelligence"],
      });

      // ── Classify severity ─────────────────────────────
      for (const r of allResults) {
        const combined = `${r.title} ${r.content}`.toLowerCase();
        let severity = "low";

        if (
          combined.includes("funding") ||
          combined.includes("raised") ||
          combined.includes("series") ||
          combined.includes("acquisition")
        ) {
          severity = "high";
        } else if (
          combined.includes("hiring") ||
          combined.includes("launch") ||
          combined.includes("partnership")
        ) {
          severity = "medium";
        }

        if (severity !== "low") {
          alerts.push({
            company,
            signal: r.title,
            url: r.url,
            severity,
          });
        }
      }

      // Rate limit spacing
      await wait.for({ seconds: 2 });
    }

    // ── Post alert summary to Slack ─────────────────────
    if (alerts.length > 0) {
      const highPriority = alerts.filter((a) => a.severity === "high");
      const medPriority = alerts.filter((a) => a.severity === "medium");

      const message = [
        `:satellite_antenna: *Daily Account Signal Report*`,
        `Scanned ${scanned} accounts | ${alerts.length} signals detected`,
        "",
        highPriority.length > 0
          ? [
              `:fire: *High Priority*`,
              ...highPriority.map(
                (a) => `• *${a.company}*: ${a.signal}`
              ),
            ].join("\n")
          : "",
        medPriority.length > 0
          ? [
              `:eyes: *Medium Priority*`,
              ...medPriority.map(
                (a) => `• *${a.company}*: ${a.signal}`
              ),
            ].join("\n")
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      await notifySlack(
        process.env.SLACK_DEFAULT_CHANNEL || "sales-alerts",
        message
      );
    }

    return {
      accountsScanned: scanned,
      signalsDetected: alerts.length,
      highPriority: alerts.filter((a) => a.severity === "high").length,
    };
  },
});

function getOneWeekAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}
