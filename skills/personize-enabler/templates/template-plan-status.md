# PLAN.md + STATUS.md Templates

**Description:** Human-agent interface pattern. Human writes intent (PLAN.md), agent writes status (STATUS.md). No sync conflicts.

**Tags:** `coordination`, `human-agent`, `project-management`

---

## PLAN.md (owned by HUMAN, read by agent)

```markdown
# [Project Name] -- Plan

## Vision
[One paragraph: what are we building and why]

## Active Goals
1. [Goal 1 -- what success looks like]
2. [Goal 2]

## Campaigns
| Name | Target | Angle | Status |
|------|--------|-------|--------|
| [Campaign 1] | [Who] | [Messaging hook] | [Draft/Active/Paused] |

## Decisions Log
| Date | Decision | Reasoning |
|------|----------|-----------|
| [Date] | [What was decided] | [Why] |

## Backlog
- [ ] [Future task 1]
- [ ] [Future task 2]

## Parking Lot
- [Ideas not yet prioritized]
```

---

## STATUS.md (owned by AGENT, read by human)

```markdown
# [Project Name] -- Status

> Last updated: **[ISO timestamp]**
> System health: [Healthy / Degraded / Error]

## Quick Stats
| Metric | Value |
|--------|-------|
| DRY_RUN | [ON/OFF] |
| Credits remaining | [N] |
| Active campaigns | [N] |
| Leads enrolled | [N] |
| Opted-out contacts | [N] |

## Active Campaigns
| Campaign | Status | Enrolled | Contacted | Replied | Reply Rate |
|----------|--------|----------|-----------|---------|------------|
| [Name] | [Status] | [N] | [N] | [N] | [%] |

## Open Issues
- [Issue 1: description]

## Pending Tasks
- [Task 1: description] (assigned to: [who])

## Recent Activity
- [Timestamp] [What happened]
```

---

## Usage

Human edits PLAN.md to set goals and priorities. Agent reads PLAN.md every session.
Agent regenerates STATUS.md from workspace records every session. Human reads STATUS.md to see progress.
Neither edits the other's file. No merge conflicts.
