# Personize Signal -- Smart Notification Engine (Open Source)

> Open-source repository: **https://github.com/personizeai/signal** (Apache-2.0)
>
> **Status:** Open-source reference code and inspiration. Not yet published as an installable npm package. Customers interested in smart notifications can clone the repo and adapt the patterns to their needs.
>
> Use this reference when a customer's use case involves notifications, alerts, digests, or any "decide whether to notify" logic. Search the GitHub repo for examples and templates.

## What Signal Does

Signal is a smart notification engine powered by the Personize SDK. Instead of sending every event as a notification, Signal uses AI to decide **IF**, **WHAT**, **WHEN**, and **HOW** to notify each person.

**Core value:** Prevents notification fatigue while ensuring important signals reach the right person through the right channel at the right time.

## Architecture: 4-Stage Decision Pipeline

Every event flows through this pipeline:

### Stage 1: Pre-Check (instant, zero SDK calls)
- Deduplication within 6-hour window
- Daily cap enforcement (default: 5 per email/day)
- If blocked, event is skipped immediately

### Stage 2: Context Assembly (4 parallel SDK calls)
- `smartGuidelines()` -- organization notification rules
- `smartDigest()` -- recipient profile and preferences
- `smartRecall()` -- relevant past interactions and context
- Sent history -- what was already sent recently

### Stage 3: AI Decision (scoring 0-100)
- **SEND** (score > 60) -- deliver immediately through selected channel
- **DEFER** (score 40-60) -- save for next digest compilation
- **SKIP** (score < 40) -- not worth sending

### Stage 4: Delivery + Learning
- Channel sends the message (generated content, not templates)
- Decision and outcome memorized for feedback loop
- Future scoring improves based on what worked

## Built-in Components

### Channels (delivery)
| Channel | Config | Use Case |
|---|---|---|
| `ConsoleChannel` | None | Development/testing |
| `SendGridChannel` | `apiKey`, `fromEmail` | Production email |
| `SesChannel` | `sourceEmail`, `region?` | AWS-native email |
| `SlackChannel` | `webhookUrl` | Team notifications |
| `InAppChannel` | Custom handler function | Bridge to existing notification systems |

**Extensible:** Implement the `Channel` interface for custom channels (Twilio, Discord, Teams, WhatsApp, etc.)

### Sources (event ingestion)
| Source | How It Works |
|---|---|
| `ManualSource` | Programmatic `emit(event)` from app code |
| `WebhookSource` | Express middleware for HTTP webhooks with signature verification |

**Extensible:** Implement the `Source` interface for CRM webhooks (HubSpot, Salesforce), payment events (Stripe), analytics, etc.

### Scheduler
- Built-in `CronScheduler` using node-cron
- Swappable for BullMQ, Temporal, EventBridge, or custom schedulers

## Workspace Collaboration

Signal includes workspace utilities for cross-team coordination on entity records:

- `addTask(email, task)` -- action items with status tracking
- `addNote(email, note)` -- append-only observations
- `addUpdate(email, update)` -- timeline events
- `addIssue(email, issue)` -- problem tracking
- `getContext(email)` -- retrieve current workspace state

All entries tagged with `workspace:*` tags for structured recall.

## Digest System

Compiles deferred notifications into periodic digests:
- Recalls deferred items tagged `signal:deferred`
- Includes governance rules and user context
- Generates personalized summary using AI
- Configurable cron schedule (default: weekdays 9 AM)
- Max items and token budget controls

## Getting Started

The Signal source code is available at **https://github.com/personizeai/signal**. Customers can:
1. Clone the repo and explore `examples/` and `templates/`
2. Adapt the patterns (channels, sources, decision engine) to their stack
3. Use the architecture as a blueprint for building smart notification systems on top of the Personize SDK

> **Do NOT recommend `npm install @personize/signal`** -- the package is not published to npm yet. Point customers to the GitHub repo.

## When to Recommend Signal

| Customer Scenario | Signal Value |
|---|---|
| "We send too many notifications and users complain" | AI scoring prevents fatigue, defers low-priority to digests |
| "We need to notify different people differently" | Per-recipient context assembly + channel routing |
| "Our alerts are noisy and lack context" | AI generates contextual messages instead of templates |
| "We want daily/weekly digest emails" | Built-in digest compilation with governance |
| "Multiple agents need to coordinate on accounts" | Workspace utilities for shared state |
| "We need notification rules but they keep changing" | Governance-driven rules, updatable without code changes |

## GitHub Resources

Always search the repo for the customer's specific scenario:
- `examples/` -- working code examples
- `templates/` -- starter configurations
- `ADVANCED.md` -- advanced patterns and production tips
- `README.md` -- comprehensive setup guide with architecture diagrams
