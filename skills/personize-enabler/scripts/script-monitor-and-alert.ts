/**
 * =============================================================================
 * MASTERCLASS SCRIPT: Monitor and Alert
 * =============================================================================
 *
 * PATTERN: Ongoing -- search --> evaluate --> create workspace issues --> notify
 *
 * This script teaches the monitoring pattern: periodically scan your data for
 * conditions that need attention, then create issues and send notifications.
 * Designed to run on a schedule (cron, Trigger.dev, CI/CD).
 *
 * THE SEQUENCE:
 *   1. SEARCH   -- find entities matching a broad query (org-wide, not entity-scoped)
 *   2. EVALUATE -- check each entity against conditions/thresholds
 *   3. DEDUPE   -- check if an alert already exists (idempotency)
 *   4. ACT      -- create workspace issues and/or send notifications
 *   5. REPORT   -- summary of what was checked, flagged, and acted on
 *
 * WHY MONITORING IS SEARCH-FIRST:
 *   You search broadly, then evaluate locally. This is the opposite of polling
 *   individual records. Searching is one API call that returns all candidates.
 *   Polling 1000 records individually would be 1000 API calls.
 *
 * WHY IDEMPOTENCY MATTERS:
 *   This script runs on a schedule. If it runs every hour and the same risk
 *   condition persists, you do NOT want 24 duplicate alerts per day. The dedupe
 *   step checks if an alert already exists before creating a new one.
 *
 * HOW TO ADAPT:
 *   - Change the search query for your monitoring scenario
 *   - Change the evaluation logic (thresholds, conditions, scoring)
 *   - Change the notification channel (Slack, email, Personize notifications)
 *   - Run on your preferred schedule (cron, Trigger.dev, GitHub Actions)
 *
 * CRON PATTERN:
 *   Run this hourly/daily via Trigger.dev, cron, or CI/CD schedule.
 *   # Every day at 9am UTC
 *   0 9 * * * PERSONIZE_SECRET_KEY=sk_... npx ts-node script-monitor-and-alert.ts --live
 *
 * USAGE:
 *   # Dry run -- show what would be flagged
 *   npx ts-node script-monitor-and-alert.ts --query "accounts with declining engagement"
 *
 *   # Live with Slack notification
 *   npx ts-node script-monitor-and-alert.ts \
 *     --query "accounts with no activity in 30 days" \
 *     --threshold 7 \
 *     --slack-webhook https://hooks.slack.com/services/T.../B.../xxx \
 *     --live
 *
 * =============================================================================
 */

import { Personize } from '@personize/sdk';

// =============================================================================
// Step 0: CLI Argument Parsing
// =============================================================================

const args = process.argv.slice(2);
const get = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const has = (flag: string) => args.includes(flag);

// =============================================================================
// Step 1: Configuration
// =============================================================================

const dryRun = !has('--live');
const monitorQuery = get('--query') || 'accounts with declining engagement or risk signals';
const threshold = parseInt(get('--threshold') || '5', 10);  // Severity threshold (1-10)
const slackWebhookUrl = get('--slack-webhook');

if (!process.env.PERSONIZE_SECRET_KEY) {
  console.error(JSON.stringify({ error: 'PERSONIZE_SECRET_KEY environment variable not set' }));
  process.exit(1);
}

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

// =============================================================================
// Step 2: Search for Candidate Entities
// =============================================================================
// WHY org-wide search (not entity-scoped): Monitoring scans across ALL records
// to find problems. Entity-scoped recall only looks at one entity at a time.
// One search call can surface 50 at-risk accounts. Checking them individually
// would take 50 separate API calls.
//
// WHY semantic search: The query "accounts with declining engagement" is fuzzy.
// Deterministic filters can not express this -- you would need to define exactly
// which properties and thresholds constitute "declining engagement". Semantic
// search lets the AI interpret intent across all stored memories and properties.

async function findCandidates(): Promise<Array<{
  recordId: string;
  email?: string;
  websiteUrl?: string;
  type?: string;
  properties?: Record<string, unknown>;
  memories?: string[];
  score?: number;
}>> {
  // Use smartRecall for semantic search across the entire org
  // WHY smartRecall over search: smartRecall returns memories with relevance
  // scores and can generate an answer. For monitoring, the memories themselves
  // are what we evaluate against our conditions.
  const result = await client.memory.smartRecall({
    query: monitorQuery,
    mode: 'deep',  // WHY deep: We need thorough results, not just the top match.
                   // Monitoring is a background job; latency is acceptable.
    limit: 50,     // Cast a wide net, evaluate locally
  });

  const rawResults = result.data || [];

  // Group results by entity (smartRecall returns memories, not entities)
  // WHY group: A single entity might have 5 matching memories. We want to
  // evaluate the entity once, not create 5 separate alerts.
  const entityMap = new Map<string, {
    recordId: string;
    email?: string;
    websiteUrl?: string;
    type?: string;
    properties: Record<string, unknown>;
    memories: string[];
    score: number;
  }>();

  for (const item of (Array.isArray(rawResults) ? rawResults : [])) {
    const key = item.recordId || item.email || item.websiteUrl || 'unknown';

    if (!entityMap.has(key)) {
      entityMap.set(key, {
        recordId: item.recordId || key,
        email: item.email,
        websiteUrl: item.websiteUrl,
        type: item.type,
        properties: item.properties || {},
        memories: [],
        score: 0,
      });
    }

    const entity = entityMap.get(key)!;
    const memoryText = item.text || item.content || item.memory || '';
    if (memoryText) {
      entity.memories.push(memoryText);
    }
    // Track highest relevance score
    if (item.score && item.score > entity.score) {
      entity.score = item.score;
    }
  }

  return Array.from(entityMap.values());
}

// =============================================================================
// Step 3: Evaluate Conditions
// =============================================================================
// WHY evaluate locally: The search finds candidates, but you need to decide
// which ones actually need attention. This is where you apply your business
// logic -- thresholds, rules, scoring models.
//
// TO ADAPT: Replace this evaluation logic with your own conditions.
//   - Churn risk: check last_activity_date, support_tickets, NPS_score
//   - Revenue risk: check deal_stage, days_in_stage, contract_end_date
//   - Compliance: check data_consent_date, gdpr_status, data_retention
//   - SLA: check response_time, resolution_time, escalation_count

interface AlertCandidate {
  recordId: string;
  identity: string;
  type?: string;
  severity: number;       // 1-10 scale
  reason: string;         // Why this entity was flagged
  evidence: string[];     // Supporting memories/data
  recommendation: string; // What to do about it
}

function evaluateEntity(entity: {
  recordId: string;
  email?: string;
  websiteUrl?: string;
  type?: string;
  properties: Record<string, unknown>;
  memories: string[];
  score: number;
}): AlertCandidate | null {
  const identity = entity.email || entity.websiteUrl || entity.recordId;
  const reasons: string[] = [];
  const evidence: string[] = [];
  let severity = 0;

  // Rule 1: High relevance score to risk query means strong signal
  // WHY score-based: The search relevance score tells us how closely this
  // entity matches the monitoring query. Higher score = more relevant = more risk.
  if (entity.score > 0.8) {
    severity += 3;
    reasons.push('Strong match to risk query');
  } else if (entity.score > 0.6) {
    severity += 2;
    reasons.push('Moderate match to risk query');
  }

  // Rule 2: Check memory content for risk keywords
  // WHY keyword scanning: Memories contain free-text insights. Scanning for
  // risk signals is a fast heuristic. For more accuracy, use an LLM evaluation
  // (see the responses.create approach in script-recall-and-act.ts).
  const riskKeywords = [
    'complaint', 'unhappy', 'cancel', 'competitor', 'delay', 'overdue',
    'escalat', 'churn', 'dissatisf', 'frustrated', 'unresolved', 'late',
  ];

  for (const memory of entity.memories) {
    const lowerMemory = memory.toLowerCase();
    for (const keyword of riskKeywords) {
      if (lowerMemory.includes(keyword)) {
        severity += 1;
        evidence.push(memory.substring(0, 200));
        break;  // One match per memory is enough
      }
    }
  }

  // Rule 3: Check properties for risk signals
  // WHY properties: Structured data (deal_stage, last_contact_date) gives
  // precise signals. Combine with memory-based signals for a complete picture.
  const dealStage = String(entity.properties['deal_stage'] || '').toLowerCase();
  if (dealStage === 'at_risk' || dealStage === 'churned' || dealStage === 'lost') {
    severity += 3;
    reasons.push(`Deal stage: ${dealStage}`);
  }

  // Cap severity at 10
  severity = Math.min(severity, 10);

  // WHY threshold filtering: Not every match needs an alert. The threshold
  // controls sensitivity. Low threshold = more alerts (noisy). High threshold
  // = fewer alerts (might miss things). Default of 5 is a reasonable middle ground.
  if (severity < threshold) {
    return null;  // Below threshold, do not alert
  }

  // Generate recommendation based on severity
  let recommendation: string;
  if (severity >= 8) {
    recommendation = 'URGENT: Immediate human review required. Escalate to account manager.';
  } else if (severity >= 6) {
    recommendation = 'Schedule a check-in call within the next 48 hours.';
  } else {
    recommendation = 'Add to watch list. Review in next weekly pipeline meeting.';
  }

  return {
    recordId: entity.recordId,
    identity,
    type: entity.type,
    severity,
    reason: reasons.join('; ') || 'Matched monitoring query',
    evidence: evidence.slice(0, 5),  // Cap at 5 evidence items
    recommendation,
  };
}

// =============================================================================
// Step 4: Idempotent Alert Creation
// =============================================================================
// WHY idempotency: This script runs on a schedule (e.g., daily). If an account
// stays at-risk for 7 days, you want ONE alert -- not 7 duplicate alerts.
//
// HOW: Before creating an alert, recall recent memories for this entity with
// tag "monitor-alert". If a recent one exists, skip creation.
//
// WHY memories over a local database: The alert is stored IN Personize, visible
// to all agents and humans. A local SQLite database would create a silo that
// other tools cannot access.

async function alertAlreadyExists(entity: AlertCandidate): Promise<boolean> {
  try {
    // Check if we already created an alert for this entity recently
    // WHY recall with tag: We tag all monitor alerts with 'monitor-alert'.
    // Recalling by tag finds only our alerts, not general memories.
    const recallPayload: any = {
      query: `monitor alert for ${entity.identity}`,
      mode: 'fast',  // WHY fast: We just need to check existence, not get a deep answer
      limit: 3,
    };

    if (entity.identity.includes('@')) {
      recallPayload.email = entity.identity;
    } else if (entity.identity.includes('.')) {
      recallPayload.websiteUrl = entity.identity;
    } else {
      recallPayload.recordId = entity.recordId;
    }

    const result = await client.memory.recall(recallPayload);
    const memories = result.data || [];

    // Check if any recent alert exists (within last 7 days)
    // WHY 7-day window: Alerts older than a week are stale. If the condition
    // persists for 7+ days without resolution, a new alert is warranted.
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    for (const memory of (Array.isArray(memories) ? memories : [])) {
      const text = memory.text || memory.content || memory.memory || '';
      if (text.includes('monitor-alert') && memory.timestamp && memory.timestamp > sevenDaysAgo) {
        return true;  // Recent alert exists, skip
      }
    }

    return false;
  } catch {
    // If recall fails, assume no existing alert (safe to create)
    return false;
  }
}

// =============================================================================
// Step 5: Create Alerts (Memorize + Notify)
// =============================================================================
// WHY both memorize AND notify:
//   - Memorize creates a persistent record (tracked, searchable, visible to all agents)
//   - Notifications are fire-and-forget (immediate visibility, but ephemeral)
//   - Slack webhooks reach humans who are not in the Personize dashboard
//
// Think of it as: memorize = filing the incident report, notify = calling the fire dept.

async function createAlert(alert: AlertCandidate): Promise<boolean> {
  try {
    // Store the alert as a memory on the entity
    // WHY store on the entity: Any future agent or human looking at this entity
    // will see the alert. It becomes part of the entity's history.
    const memorizePayload: any = {
      content: [
        `[monitor-alert] Risk alert generated on ${new Date().toISOString()}`,
        `Severity: ${alert.severity}/10`,
        `Reason: ${alert.reason}`,
        `Recommendation: ${alert.recommendation}`,
        alert.evidence.length > 0
          ? `Evidence:\n${alert.evidence.map(e => `  - ${e}`).join('\n')}`
          : '',
      ].filter(Boolean).join('\n'),
      type: alert.type || 'Record',
      tags: ['monitor-alert', `severity-${alert.severity}`],
      tier: 'basic',  // WHY basic: Alert text is structured, not free-form to extract from
    };

    // Scope to entity
    if (alert.identity.includes('@')) {
      memorizePayload.email = alert.identity;
    } else if (alert.identity.includes('.')) {
      memorizePayload.website_url = alert.identity;
    } else {
      memorizePayload.record_id = alert.recordId;
    }

    await client.memory.memorize(memorizePayload);

    // Send Personize notification
    // WHY Personize notifications: They appear in the dashboard, can be acted on,
    // and are tracked (read/dismissed status). Slack is great for immediate attention
    // but lacks tracking.
    await client.notifications.broadcast({
      title: `Risk Alert: ${alert.identity}`,
      body: `Severity ${alert.severity}/10 - ${alert.reason}. ${alert.recommendation}`,
      priority: alert.severity >= 8 ? 'urgent' : alert.severity >= 6 ? 'high' : 'normal',
      channel: 'monitor',
      metadata: {
        recordId: alert.recordId,
        severity: alert.severity,
        action: alert.recommendation,
      },
    } as any);

    // Optional: Slack webhook
    // WHY Slack is optional: Not everyone uses Slack. The script should work
    // without it. Personize notifications are the primary channel.
    if (slackWebhookUrl) {
      await sendSlackAlert(alert);
    }

    return true;
  } catch (error: any) {
    console.error(JSON.stringify({
      status: 'alert_creation_failed',
      identity: alert.identity,
      error: error.message,
    }));
    return false;
  }
}

// =============================================================================
// Step 6: Slack Integration (Optional)
// =============================================================================
// WHY a separate function: Slack is one of many possible notification channels.
// Keeping it isolated makes it easy to replace with Teams, PagerDuty, email, etc.
//
// TO ADAPT: Replace this with your notification channel:
//   - Microsoft Teams: POST to Teams webhook URL with adaptive card payload
//   - PagerDuty: POST to PagerDuty Events API v2
//   - Email: Use your email service (SendGrid, SES, etc.)

async function sendSlackAlert(alert: AlertCandidate): Promise<void> {
  if (!slackWebhookUrl) return;

  const severityEmoji = alert.severity >= 8 ? ':rotating_light:' : alert.severity >= 6 ? ':warning:' : ':eyes:';

  const payload = {
    text: `${severityEmoji} *Risk Alert: ${alert.identity}*`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            `${severityEmoji} *Risk Alert: ${alert.identity}*`,
            `*Severity:* ${alert.severity}/10`,
            `*Reason:* ${alert.reason}`,
            `*Recommendation:* ${alert.recommendation}`,
          ].join('\n'),
        },
      },
      ...(alert.evidence.length > 0 ? [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Evidence:*\n${alert.evidence.map(e => `> ${e.substring(0, 150)}`).join('\n')}`,
        },
      }] : []),
    ],
  };

  try {
    // WHY native fetch: Avoids adding axios/node-fetch as a dependency just for
    // one webhook call. Node 18+ has built-in fetch.
    await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error: any) {
    // WHY catch and log (not throw): Slack failure should not stop the monitoring run.
    // The alert is already stored in Personize. Slack is best-effort.
    console.error(JSON.stringify({
      status: 'slack_notification_failed',
      identity: alert.identity,
      error: error.message,
    }));
  }
}

// =============================================================================
// Step 7: Main
// =============================================================================

async function main() {
  try {
    console.log(JSON.stringify({
      status: 'starting',
      query: monitorQuery,
      threshold,
      dryRun,
      slackEnabled: !!slackWebhookUrl,
    }));

    // Search for candidates
    const candidates = await findCandidates();

    console.log(JSON.stringify({
      status: 'candidates_found',
      count: candidates.length,
    }));

    // Evaluate each candidate
    const alerts: AlertCandidate[] = [];
    let checked = 0;
    let belowThreshold = 0;

    for (const candidate of candidates) {
      checked++;
      const alert = evaluateEntity(candidate);

      if (alert) {
        alerts.push(alert);
      } else {
        belowThreshold++;
      }
    }

    console.log(JSON.stringify({
      status: 'evaluation_complete',
      checked,
      flagged: alerts.length,
      belowThreshold,
      threshold,
    }));

    // Dry-run: preview alerts without creating them
    if (dryRun) {
      console.log(JSON.stringify({
        status: 'dry_run_preview',
        message: 'Pass --live to create alerts and send notifications',
        alertsWouldCreate: alerts.length,
        alerts: alerts.map(a => ({
          identity: a.identity,
          severity: a.severity,
          reason: a.reason,
          recommendation: a.recommendation,
          evidenceCount: a.evidence.length,
        })),
      }));

      console.log(JSON.stringify({
        status: 'complete',
        total: checked, succeeded: 0, failed: 0, skipped: alerts.length, dryRun: true,
      }));
      return;
    }

    // Live: check idempotency and create alerts
    let created = 0;
    let duplicatesSkipped = 0;
    let failed = 0;

    for (const alert of alerts) {
      // Idempotency check
      // WHY check before creating: This is the key to safe scheduled execution.
      // Without this, running the script daily would create 7 duplicate alerts
      // for the same persisting issue.
      const exists = await alertAlreadyExists(alert);

      if (exists) {
        duplicatesSkipped++;
        console.log(JSON.stringify({
          status: 'alert_skipped_duplicate',
          identity: alert.identity,
          message: 'Recent alert already exists for this entity (within 7 days)',
        }));
        continue;
      }

      const success = await createAlert(alert);
      if (success) {
        created++;
        console.log(JSON.stringify({
          status: 'alert_created',
          identity: alert.identity,
          severity: alert.severity,
          reason: alert.reason,
        }));
      } else {
        failed++;
      }
    }

    // Final summary
    // WHY structured summary: When this runs on cron, the summary is what gets
    // logged and monitored. A structured JSON summary can be parsed by log
    // aggregators (Datadog, CloudWatch) to trigger meta-alerts ("monitoring
    // script itself is failing").
    console.log(JSON.stringify({
      status: 'complete',
      total: checked,
      succeeded: created,
      failed,
      skipped: belowThreshold + duplicatesSkipped,
      dryRun: false,
      details: {
        entitiesChecked: checked,
        alertsFlagged: alerts.length,
        alertsCreated: created,
        duplicatesSkipped,
        belowThreshold,
        alertsFailed: failed,
      },
    }));
  } catch (error: any) {
    console.error(JSON.stringify({
      status: 'fatal_error',
      error: error.message || 'Unknown error',
      stack: error.stack,
    }));
    process.exit(1);
  }
}

main();
