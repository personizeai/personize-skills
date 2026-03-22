/**
 * Recipe: Product Intelligence — Memorize Everything of Value
 *
 * Shows how to memorize ALL types of product data so the AI has deep, rich
 * context about every user. This is the foundation for hyper-personalization.
 *
 * What to memorize:
 *   - Feature usage & click events
 *   - Search queries inside your app
 *   - Content consumption (articles read, videos watched — including content itself)
 *   - User-generated content (uploads, files, written text — summaries or full)
 *   - ML model outputs (predictions, scores, classifications, recommendations)
 *   - Reports & dashboard data (the same data shown in your UI)
 *   - Developer-defined interpretations ("if user does X, it means Y")
 *   - Telemetry & monitoring data (MSP data, infra metrics, end-user behavior)
 *   - Session recordings & behavioral patterns
 *
 * The goal: give the AI the same (or better) understanding of each user
 * that your best product manager has — then let it act on that knowledge.
 *
 * Usage:
 *   PERSONIZE_SECRET_KEY=sk_live_... npx ts-node recipes/product-intelligence.ts
 */

import { Personize } from '@personize/sdk';
import 'dotenv/config';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. FEATURE USAGE & CLICK EVENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Your app tracks which features users click, how often, in what order.
// Memorize the patterns, not every raw click.

interface FeatureUsageEvent {
    email: string;
    feature: string;        // 'dashboard', 'reports', 'settings', 'export'
    action: string;         // 'viewed', 'clicked', 'configured', 'dismissed'
    count?: number;         // how many times in this period
    duration_seconds?: number;
    metadata?: Record<string, any>;
}

async function memorizeFeatureUsage(events: FeatureUsageEvent[]) {
    // Group events by user for richer context
    const byUser = new Map<string, FeatureUsageEvent[]>();
    for (const e of events) {
        const list = byUser.get(e.email) || [];
        list.push(e);
        byUser.set(e.email, list);
    }

    for (const [email, userEvents] of byUser) {
        // Build a narrative summary — not raw JSON, but something the AI can reason about
        const summary = userEvents.map(e => {
            const parts = [`Used "${e.feature}" (${e.action})`];
            if (e.count && e.count > 1) parts.push(`${e.count} times`);
            if (e.duration_seconds) parts.push(`spent ${Math.round(e.duration_seconds / 60)}min`);
            if (e.metadata?.context) parts.push(`context: ${e.metadata.context}`);
            return parts.join(', ');
        }).join('\n');

        await client.memory.memorize({
            content: `[FEATURE USAGE] Week of ${new Date().toISOString().split('T')[0]}:\n${summary}`,
            speaker: 'System: Product Analytics',
            enhanced: true,  // AI extracts patterns and stores as searchable memories
            tags: ['product', 'feature-usage', 'analytics'],
            email,
        });

        console.log(`Memorized ${userEvents.length} feature events for ${email}`);
    }
}

// Example call:
// await memorizeFeatureUsage([
//     { email: 'jane@acme.com', feature: 'Dashboard', action: 'viewed', count: 12, duration_seconds: 340 },
//     { email: 'jane@acme.com', feature: 'Export CSV', action: 'clicked', count: 3 },
//     { email: 'jane@acme.com', feature: 'API Settings', action: 'configured' },
//     { email: 'jane@acme.com', feature: 'Team Invite', action: 'dismissed', count: 2 },
// ]);


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. SEARCH QUERIES INSIDE YOUR APP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// What users search for reveals what they need but can't find.
// This is pure intent signal — memorize it.

interface SearchEvent {
    email: string;
    query: string;
    resultsCount: number;
    clickedResult?: string;
    timestamp: string;
}

async function memorizeSearchBehavior(searches: SearchEvent[]) {
    const byUser = new Map<string, SearchEvent[]>();
    for (const s of searches) {
        const list = byUser.get(s.email) || [];
        list.push(s);
        byUser.set(s.email, list);
    }

    for (const [email, userSearches] of byUser) {
        const summary = userSearches.map(s => {
            const found = s.resultsCount > 0 ? `found ${s.resultsCount} results` : 'NO RESULTS';
            const clicked = s.clickedResult ? `, clicked "${s.clickedResult}"` : '';
            return `Searched: "${s.query}" → ${found}${clicked}`;
        }).join('\n');

        // Developer interpretation layer: add meaning
        const noResults = userSearches.filter(s => s.resultsCount === 0);
        let interpretation = '';
        if (noResults.length > 0) {
            interpretation = `\n\nInterpretation: User searched for ${noResults.length} things that returned no results. ` +
                `These are unmet needs: ${noResults.map(s => `"${s.query}"`).join(', ')}. ` +
                `Consider this a feature request or documentation gap signal.`;
        }

        await client.memory.memorize({
            content: `[SEARCH BEHAVIOR] ${new Date().toISOString().split('T')[0]}:\n${summary}${interpretation}`,
            speaker: 'System: Search Analytics',
            enhanced: true,
            tags: ['product', 'search-queries', 'intent-signals'],
            email,
        });
    }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. CONTENT CONSUMPTION — Articles, Videos, Documentation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// When users read articles, watch videos, or browse docs — memorize BOTH
// what they consumed AND the content itself. The AI then knows what the
// user learned, not just that they "watched a video."

interface ContentConsumption {
    email: string;
    contentType: 'article' | 'video' | 'documentation' | 'webinar' | 'tutorial';
    title: string;
    url?: string;
    // The actual content or a summary — this is what makes it powerful
    contentBody?: string;          // full text of article / transcript of video
    contentSummary?: string;       // or a shorter summary if full text is too large
    durationMinutes?: number;
    completionPercent?: number;    // 0-100
    timestamp: string;
}

async function memorizeContentConsumption(items: ContentConsumption[]) {
    for (const item of items) {
        // Determine what to memorize about the content itself
        let contentNote = '';
        if (item.contentBody && item.contentBody.length <= 2000) {
            // Short enough — memorize the full content
            contentNote = `\n\nContent of "${item.title}":\n${item.contentBody}`;
        } else if (item.contentBody) {
            // Too long — use a truncated version (AI will extract key facts via extractMemories)
            contentNote = `\n\nContent excerpt from "${item.title}":\n${item.contentBody.substring(0, 2000)}...`;
        } else if (item.contentSummary) {
            contentNote = `\n\nSummary of "${item.title}":\n${item.contentSummary}`;
        }

        const completion = item.completionPercent !== undefined
            ? ` (${item.completionPercent}% completed)` : '';
        const duration = item.durationMinutes
            ? `, spent ${item.durationMinutes} minutes` : '';

        await client.memory.memorize({
            content: `[CONTENT CONSUMED] ${item.contentType}: "${item.title}"${completion}${duration}.` +
                (item.url ? ` URL: ${item.url}` : '') +
                contentNote,
            speaker: 'System: Content Tracking',
            enhanced: true,  // AI extracts what the user learned from this content
            tags: ['product', 'content-consumption', `type:${item.contentType}`],
            email: item.email,
        });

        console.log(`Memorized ${item.contentType} "${item.title}" for ${item.email}`);
    }
}

// Example: Memorize a video transcript so the AI knows what the user watched
// await memorizeContentConsumption([{
//     email: 'jane@acme.com',
//     contentType: 'video',
//     title: 'Advanced Dashboard Customization',
//     contentBody: 'In this tutorial, we cover how to create custom widgets, set up filtered views...',
//     durationMinutes: 12,
//     completionPercent: 100,
//     timestamp: new Date().toISOString(),
// }]);


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. USER-GENERATED CONTENT — Uploads, Files, Written Text
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// When users upload files, write posts, create documents, or add data —
// memorize a summary or the full content. This tells the AI what the user
// cares about, what they're working on, and their communication style.

interface UserContent {
    email: string;
    type: 'upload' | 'document' | 'post' | 'comment' | 'form-submission' | 'configuration';
    title?: string;
    filename?: string;
    // The content itself — full text or summary
    body: string;               // full content, or summary if too large
    isSummary?: boolean;        // true if body is a summary, not full content
    fileType?: string;          // 'pdf', 'csv', 'xlsx', 'png', 'docx'
    sizeBytes?: number;
    timestamp: string;
}

async function memorizeUserContent(items: UserContent[]) {
    for (const item of items) {
        const label = item.title || item.filename || item.type;
        const summaryNote = item.isSummary ? ' (summarized)' : '';
        const fileInfo = item.filename
            ? `File: ${item.filename}${item.fileType ? ` (${item.fileType})` : ''}${item.sizeBytes ? `, ${Math.round(item.sizeBytes / 1024)}KB` : ''}\n`
            : '';

        await client.memory.memorize({
            content: `[USER CONTENT] ${item.type}: "${label}"${summaryNote}\n${fileInfo}${item.body}`,
            speaker: 'System: User Content',
            enhanced: true,  // AI extracts topics, intent, key facts from the content
            tags: ['product', 'user-content', `type:${item.type}`],
            email: item.email,
        });
    }
}

// Example: User uploads a requirements doc
// await memorizeUserContent([{
//     email: 'jane@acme.com',
//     type: 'upload',
//     filename: 'Q1-requirements.pdf',
//     fileType: 'pdf',
//     body: 'Summary: 12-page requirements document covering SSO integration, RBAC permissions, and audit logging. Key priorities: SOC2 compliance by March, SSO for 500+ employees, custom role definitions.',
//     isSummary: true,
//     sizeBytes: 245000,
//     timestamp: new Date().toISOString(),
// }]);


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. ML MODEL OUTPUTS — Predictions, Scores, Classifications
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// If your product runs ML models (churn prediction, lead scoring,
// content recommendations, anomaly detection) — memorize the outputs.
// The AI can then reference these in personalized messages.

interface MLOutput {
    email: string;
    modelName: string;          // 'churn-predictor', 'lead-scorer', 'segment-classifier'
    modelVersion?: string;
    prediction: string | number;  // 'high-risk', 0.87, 'Enterprise Buyer'
    confidence?: number;        // 0-1
    explanation?: string;       // "High churn risk due to 40% drop in logins over 30 days"
    features?: Record<string, any>;  // input features used
    timestamp: string;
}

async function memorizeMLOutputs(outputs: MLOutput[]) {
    for (const ml of outputs) {
        const confidenceNote = ml.confidence !== undefined
            ? ` (confidence: ${(ml.confidence * 100).toFixed(0)}%)` : '';
        const featureNote = ml.features
            ? `\nKey factors: ${Object.entries(ml.features).map(([k, v]) => `${k}=${v}`).join(', ')}` : '';

        await client.memory.memorize({
            content: `[ML OUTPUT] Model "${ml.modelName}"${ml.modelVersion ? ` v${ml.modelVersion}` : ''}: ` +
                `prediction = ${ml.prediction}${confidenceNote}` +
                (ml.explanation ? `\nExplanation: ${ml.explanation}` : '') +
                featureNote,
            speaker: 'System: ML Pipeline',
            enhanced: true,  // AI stores this as searchable fact for future recall
            tags: ['product', 'ml-output', `model:${ml.modelName}`],
            email: ml.email,
        });
    }
}

// Example:
// await memorizeMLOutputs([{
//     email: 'jane@acme.com',
//     modelName: 'churn-predictor',
//     modelVersion: '2.1',
//     prediction: 'high-risk',
//     confidence: 0.87,
//     explanation: 'Login frequency dropped 40% over 30 days. Support tickets up 3x. No feature adoption in 2 weeks.',
//     features: { loginDrop: '40%', supportTickets: 5, featureAdoption: 0, daysSinceLastActive: 8 },
//     timestamp: new Date().toISOString(),
// }]);


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. REPORTS & DASHBOARD DATA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// The same data you show in your UI dashboards — memorize a copy.
// Now the AI can reference "your pipeline is at $2.3M" or "your team
// resolved 94% of tickets this month" in personalized messages.

interface ReportData {
    email: string;
    reportName: string;         // 'Weekly Pipeline Report', 'Monthly Usage Summary'
    period: string;             // '2026-W07', '2026-01', 'Q1 2026'
    metrics: Record<string, string | number>;
    // Developer's interpretation of what these metrics mean
    interpretation?: string;
}

async function memorizeReportData(reports: ReportData[]) {
    for (const report of reports) {
        const metricsText = Object.entries(report.metrics)
            .map(([key, val]) => `  ${key}: ${val}`)
            .join('\n');

        await client.memory.memorize({
            content: `[REPORT] ${report.reportName} — ${report.period}:\n${metricsText}` +
                (report.interpretation ? `\n\nInterpretation: ${report.interpretation}` : ''),
            speaker: 'System: Reports',
            enhanced: true,
            tags: ['product', 'report', `report:${report.reportName.toLowerCase().replace(/\s+/g, '-')}`],
            email: report.email,
        });
    }
}

// Example:
// await memorizeReportData([{
//     email: 'jane@acme.com',
//     reportName: 'Weekly Pipeline Report',
//     period: '2026-W07',
//     metrics: {
//         'Total Pipeline': '$2.3M',
//         'New Opportunities': 12,
//         'Closed Won': 3,
//         'Closed Lost': 1,
//         'Win Rate': '75%',
//         'Avg Deal Size': '$45K',
//     },
//     interpretation: 'Pipeline is healthy. Win rate above target (70%). ' +
//         'New opportunity volume is up 20% week-over-week. ' +
//         'One lost deal (Initech) cited "timing" — likely re-engageable in Q2.',
// }]);


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. DEVELOPER-DEFINED INTERPRETATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// You know your product better than the AI. Tell it what user actions mean.
// This is a signal dictionary that adds semantic meaning to raw events.

interface SignalInterpretation {
    signal: string;             // 'dismissed-team-invite-3x'
    meaning: string;            // 'User is likely a solo practitioner, not ready for team features'
    suggestedAction?: string;   // 'Show individual-focused value props instead of team features'
    confidenceLevel?: string;   // 'high', 'medium', 'low'
}

const SIGNAL_DICTIONARY: SignalInterpretation[] = [
    {
        signal: 'dismissed-team-invite-3x',
        meaning: 'User is likely a solo practitioner or not the decision-maker for team purchases. Not ready for team features.',
        suggestedAction: 'Focus on individual productivity value props. Stop showing team prompts.',
    },
    {
        signal: 'exported-data-to-csv-5x',
        meaning: 'User needs data in external tools. May be doing reporting outside our platform, or evaluating alternatives.',
        suggestedAction: 'Show them the API/integration options. If they have a BI tool, suggest our native connector.',
    },
    {
        signal: 'visited-pricing-page-3x-no-upgrade',
        meaning: 'User is considering upgrading but has objections — likely price sensitivity or feature uncertainty.',
        suggestedAction: 'Send a personalized comparison of their current plan vs next tier, highlighting features they actually use.',
    },
    {
        signal: 'created-then-deleted-item-repeatedly',
        meaning: 'User is struggling with the creation flow. UX friction or confusion about the feature.',
        suggestedAction: 'Send a tutorial or offer onboarding help for that specific feature.',
    },
    {
        signal: 'long-session-no-actions',
        meaning: 'User is browsing or reading but not taking action. Might be overwhelmed or exploring.',
        suggestedAction: 'Send a "getting started" nudge with the top 3 things to try first.',
    },
    {
        signal: 'api-key-created',
        meaning: 'User is a developer or technical user starting to build on our platform. High intent signal.',
        suggestedAction: 'Send developer-focused content: API docs, code examples, integration guides.',
    },
    {
        signal: 'support-ticket-after-feature-use',
        meaning: 'Feature may have a bug or UX issue. The user tried it and immediately needed help.',
        suggestedAction: 'Flag to product team. Send proactive follow-up once the issue is resolved.',
    },
];

async function memorizeWithInterpretation(email: string, signal: string, rawEvent: string) {
    const interp = SIGNAL_DICTIONARY.find(s => s.signal === signal);

    let content = `[SIGNAL] ${rawEvent}`;
    if (interp) {
        content += `\n\nInterpretation: ${interp.meaning}`;
        if (interp.suggestedAction) {
            content += `\nSuggested action: ${interp.suggestedAction}`;
        }
    }

    await client.memory.memorize({
        content,
        speaker: 'System: Signal Intelligence',
        enhanced: true,
        tags: ['product', 'signal', `signal:${signal}`],
        email,
    });
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. TELEMETRY & MSP DATA — End-User Monitoring
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// For MSPs, SaaS platforms, or any company monitoring end users:
// memorize aggregated telemetry so the AI understands each customer's
// technical environment and health.

interface TelemetrySnapshot {
    email: string;              // customer's email
    source: string;             // 'datadog', 'new-relic', 'custom-agent', 'rmm-tool'
    period: string;             // '2026-02-12'
    metrics: Record<string, string | number>;
    alerts?: string[];          // active alerts/incidents
    interpretation?: string;    // what this data means for this customer
}

async function memorizeTelemetry(snapshots: TelemetrySnapshot[]) {
    for (const snap of snapshots) {
        const metricsText = Object.entries(snap.metrics)
            .map(([k, v]) => `  ${k}: ${v}`)
            .join('\n');
        const alertsText = snap.alerts?.length
            ? `\nActive alerts:\n${snap.alerts.map(a => `  ⚠ ${a}`).join('\n')}` : '';

        await client.memory.memorize({
            content: `[TELEMETRY] Source: ${snap.source} — ${snap.period}\n${metricsText}${alertsText}` +
                (snap.interpretation ? `\n\nInterpretation: ${snap.interpretation}` : ''),
            speaker: `System: ${snap.source}`,
            enhanced: true,
            tags: ['product', 'telemetry', `source:${snap.source}`],
            email: snap.email,
        });
    }
}

// Example: MSP monitoring a customer's infrastructure
// await memorizeTelemetry([{
//     email: 'it-admin@clientcorp.com',
//     source: 'rmm-tool',
//     period: '2026-02-12',
//     metrics: {
//         'Endpoints monitored': 247,
//         'Endpoints online': 241,
//         'Patch compliance': '89%',
//         'Avg CPU usage': '34%',
//         'Disk alerts': 3,
//         'Failed backups': 1,
//     },
//     alerts: [
//         'Server DC-SQL-01: disk usage 92%',
//         'Workstation HR-PC-17: backup failed 2 consecutive times',
//         '6 endpoints missing critical patch KB5034441',
//     ],
//     interpretation: 'Infrastructure generally healthy but 3 items need attention. ' +
//         'SQL server disk is urgent (production DB). Backup failure pattern may indicate hardware issue. ' +
//         'Patch compliance below 90% target — the 6 missing endpoints are in HR department.',
// }]);


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 9. BATCH MEMORIZE ALL DATA TYPES TOGETHER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// For structured data (metrics, scores, statuses), use memorizeBatch
// with extractMemories: false for structured fields, true for text fields.

async function batchMemorizeProductData(rows: Record<string, any>[]) {
    // First, discover your collections
    const collections = await client.collections.list();
    const colList = collections.data?.actions || [];
    console.log('Available collections:', colList.map((c: any) => `${c.payload.collectionName} (${c.payload.collectionId})`));

    // Use the first collection or specify your own
    const stdCol = colList[0]?.payload.collectionId || 'col_YOUR_STANDARD';
    const stdColName = colList[0]?.payload.collectionName || 'Standard';
    const genCol = colList[1]?.payload.collectionId || 'col_YOUR_GENERATED';
    const genColName = colList[1]?.payload.collectionName || 'Generated Content';

    await client.memory.memorizeBatch({
        source: 'Product Intelligence',
        mapping: {
            entityType: 'contact',
            email: 'email',
            runName: `product-intel-${Date.now()}`,
            properties: {
                // Structured fields — stored directly, no AI extraction
                email:            { sourceField: 'email',          collectionId: stdCol, collectionName: stdColName },
                plan_tier:        { sourceField: 'plan',           collectionId: stdCol, collectionName: stdColName },
                last_login:       { sourceField: 'last_login',     collectionId: stdCol, collectionName: stdColName },
                login_count_30d:  { sourceField: 'logins_30d',     collectionId: stdCol, collectionName: stdColName },
                churn_score:      { sourceField: 'churn_score',    collectionId: stdCol, collectionName: stdColName },
                nps_score:        { sourceField: 'nps',            collectionId: stdCol, collectionName: stdColName },
                mrr:              { sourceField: 'mrr',            collectionId: stdCol, collectionName: stdColName },

                // AI extraction — rich text fields that AI should analyze
                usage_narrative: {
                    sourceField: 'usage_summary',
                    collectionId: genCol,
                    collectionName: genColName,
                    extractMemories: true,  // AI reads "Used reports 12x, ignored API docs" → extracts actionable facts
                },
                recent_searches: {
                    sourceField: 'search_queries',
                    collectionId: genCol,
                    collectionName: genColName,
                    extractMemories: true,  // AI extracts intent from search queries
                },
                ml_churn_explanation: {
                    sourceField: 'churn_explanation',
                    collectionId: genCol,
                    collectionName: genColName,
                    extractMemories: true,  // AI stores the explanation as searchable memory
                },
                content_consumed: {
                    sourceField: 'content_summary',
                    collectionId: genCol,
                    collectionName: genColName,
                    extractMemories: true,  // AI knows what articles/videos the user consumed
                },
            },
        },
        rows,
        chunkSize: 1,
    });
}

// Example rows:
// await batchMemorizeProductData([
//     {
//         email: 'jane@acme.com',
//         plan: 'Pro',
//         last_login: '2026-02-12T14:30:00Z',
//         logins_30d: 22,
//         churn_score: 0.12,
//         nps: 9,
//         mrr: 299,
//         usage_summary: 'Power user of dashboards and reports. Created 8 custom views. Exports data to CSV 3x/week. Has not used API or integrations. Team of 1 — declined all team invite prompts.',
//         search_queries: 'Searched for: "salesforce integration", "bulk import contacts", "API rate limits", "webhook setup"',
//         churn_explanation: 'Low churn risk. High engagement (22 logins/month), positive NPS (9), growing usage pattern. Only concern: frequent CSV exports suggest need for native integration.',
//         content_summary: 'Read: "Getting Started with Integrations" (100%), "API Authentication Guide" (60%), watched "Custom Dashboard Tutorial" video (100%)',
//     },
// ]);


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPLETE EXAMPLE: Scheduled Product Intelligence Pipeline
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function runProductIntelligencePipeline() {
    const { data: me } = await client.me();
    if (!me) throw new Error('Auth failed');
    console.log(`Product Intelligence Pipeline — org: ${me.organization.id}\n`);

    // In production, fetch this data from your analytics DB, event stream, or data warehouse.
    // Below is a mock showing the shape of data you'd pass in.

    const mockUsers = [
        {
            email: 'jane@acme.com',
            featureEvents: [
                { feature: 'Dashboard', action: 'viewed', count: 12, duration_seconds: 340 },
                { feature: 'Reports', action: 'exported', count: 3 },
                { feature: 'Team Invite', action: 'dismissed', count: 2 },
            ] as Omit<FeatureUsageEvent, 'email'>[],
            searches: [
                { query: 'salesforce integration', resultsCount: 2, clickedResult: 'Salesforce Setup Guide' },
                { query: 'bulk import csv', resultsCount: 1 },
                { query: 'custom webhook', resultsCount: 0 },
            ] as Omit<SearchEvent, 'email' | 'timestamp'>[],
            contentConsumed: [
                { contentType: 'article' as const, title: 'Getting Started with Integrations', completionPercent: 100, contentSummary: 'Guide covering OAuth setup, field mapping, and sync scheduling for CRM integrations.' },
            ] as Omit<ContentConsumption, 'email' | 'timestamp'>[],
            mlOutputs: [
                { modelName: 'churn-predictor', prediction: 'low-risk', confidence: 0.88, explanation: 'High engagement, positive NPS, growing usage.' },
            ] as Omit<MLOutput, 'email' | 'timestamp'>[],
        },
    ];

    for (const user of mockUsers) {
        console.log(`\n── Processing: ${user.email} ──\n`);

        // Memorize feature usage
        await memorizeFeatureUsage(
            user.featureEvents.map(e => ({ ...e, email: user.email }))
        );

        // Memorize search behavior
        await memorizeSearchBehavior(
            user.searches.map(s => ({ ...s, email: user.email, timestamp: new Date().toISOString() }))
        );

        // Memorize content consumption
        await memorizeContentConsumption(
            user.contentConsumed.map(c => ({ ...c, email: user.email, timestamp: new Date().toISOString() }))
        );

        // Memorize ML outputs
        await memorizeMLOutputs(
            user.mlOutputs.map(m => ({ ...m, email: user.email, timestamp: new Date().toISOString() }))
        );

        // Memorize interpreted signals
        await memorizeWithInterpretation(
            user.email,
            'dismissed-team-invite-3x',
            'User dismissed team invite prompt 2 times this week',
        );

        console.log(`Done processing ${user.email}`);

        await new Promise(r => setTimeout(r, 2000)); // rate-limit pause
    }

    console.log('\nProduct intelligence pipeline complete.');
}

runProductIntelligencePipeline().catch(err => {
    console.error('Fatal:', err.message || err);
    process.exit(1);
});
