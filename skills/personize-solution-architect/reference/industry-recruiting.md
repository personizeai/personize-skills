# Industry Guide: Recruiting / HR Tech / Staffing

Recruiting is a matching problem with massive personalization surface. The industry is plagued by "spray and pray" -- generic outreach that talented candidates ignore, rejections with no feedback, and client updates that say nothing. Every candidate communication, job description, interview prep brief, and client status update can be deeply personalized. Personize enables recruiters to treat every candidate as an individual while scaling across hundreds of open requisitions.

---

## Recommended Entity Types

- **Candidate** -- Individual candidate with skills, experience, preferences, and pipeline status
- **Job-Requisition** -- Open role with requirements, team culture, and hiring process details
- **Client-Company** -- Employer with culture, hiring velocity, and relationship history
- **Placement** -- Completed placements tracked for 30/60/90-day outcomes

---

## Starter Schema

### Candidate
| Property | Type | Description |
|---|---|---|
| `skills` | array | Primary skill set (technical and soft) |
| `experience-years` | number | Total years of relevant experience |
| `desired-role` | text | Target role or function |
| `work-preference` | select | remote, hybrid, onsite, flexible |
| `availability-date` | date | Earliest available start date |
| `interview-stage` | select | sourced, contacted, screened, interviewing, offer, placed, rejected |
| `source-channel` | select | linkedin, referral, inbound, event, database |
| `culture-preferences` | text | AI-extracted preferred work environment and team style |

### Job-Requisition
| Property | Type | Description |
|---|---|---|
| `title` | text | Role title |
| `urgency` | select | low, medium, high, critical |
| `salary-range` | text | Compensation band (required in salary-transparency jurisdictions) |
| `interview-process` | text | Steps and format of the interview process |
| `team-culture` | text | How the team works and what they value |
| `growth-path` | text | Career progression opportunities for this role |

### Placement
| Property | Type | Description |
|---|---|---|
| `status` | select | active, 30-day, 60-day, 90-day, retained, churned |
| `satisfaction-90-day` | rating | Candidate and client satisfaction at 90 days (1-5) |
| `placement-fee` | select | Fee band -- for pipeline value tracking |

---

## Common Use Cases

1. **Personalized candidate outreach** -- Lead with specific details from their background that connect to the opportunity; zero generic "exciting opportunity" language
2. **Rejection with value** -- Every rejection includes what was strong, what was missing, and whether to stay in touch for future roles -- turns worst touchpoint into brand builder
3. **Client status updates** -- Weekly update with actual pipeline data, market context, and specific next steps; saves hours of manual reporting
4. **Offer negotiation intelligence** -- Brief for hiring manager synthesizing candidate's stated expectations, competing offers, and market data
5. **Passive candidate nurture** -- Monthly drip with market insights and career advice, not job pitches -- builds the relationship before there's a role to fill

---

## Integration Patterns

**ATS (Greenhouse, Lever, Workable):** Daily `memorizeBatch()`. Candidate profiles, application status, interview feedback, hiring manager notes. This is the foundation.

**LinkedIn/sourcing data:** Memorize per candidate with extraction. Skills, career trajectory, publications, side projects. Builds richer profiles than the ATS alone.

**Interview feedback:** Memorize per interview immediately after. Strengths observed, concerns, technical scores. Use this for synthesized scorecard generation and rejection communications.

**Candidate conversations:** Memorize every phone screen and meeting with extraction. Career goals, compensation expectations, deal-breakers, motivations. This is the relationship intelligence layer.

**Placement outcomes:** Memorize 30/60/90-day check-ins. Retention data and satisfaction scores inform future matching quality.

**Client company updates:** Memorize per update. Hiring need changes, team structure, culture shifts, new benefits. Client relationship intelligence accumulates over time.

---

## Key Governance Variables

| Variable | Purpose |
|---|---|
| `eeoc-compliance` | Never reference age, race, gender, religion, national origin, disability -- focus solely on qualifications |
| `salary-transparency` | Always include range in applicable jurisdictions; never ask about salary history |
| `candidate-experience` | Respond within 48h; always close the loop even with rejections; personalize; confirm meetings |
| `diversity-sourcing` | Inclusive language in JDs; no unnecessary degree requirements; ensure diverse candidate pools before advancing |
| `data-retention` | Delete on request; no sharing between clients without consent; GDPR compliance for EU candidates |

---

## Pipeline Stage Patterns

**Sourcing:** Memory anchors on candidate skills and career trajectory. Agents find connections between a specific candidate's background and the role -- concrete reasons why it's a fit, not generic reasons the role is "exciting."

**Screening:** Every phone screen is memorized immediately. Not just what the candidate said, but their motivations, concerns, and energy level. This context informs all downstream communication and matching.

**Interview coordination:** Agents generate interviewer briefs (what to probe based on candidate history and role requirements) and candidate prep guides (what to expect, who they'll meet, company culture context) from the same memory pool.

**Offer stage:** Memory surfaces the candidate's stated compensation expectations, competing processes, and motivations -- gives the hiring team an informed negotiation strategy rather than guessing.

**Post-placement:** 30/60/90-day check-ins are generated from placement context and early signals. Outcomes are memorized and feed back into matching quality for future similar roles.

---

## Hiring Velocity Signals

Track these in the `Client-Company` schema to diagnose pipeline health:
- Average days from submit to interview schedule
- Percentage of submits that advance to interview
- Offer acceptance rate
- 90-day retention rate

Agents generate per-client analysis when these metrics diverge from baseline -- "your time-to-interview-schedule has increased by 8 days this quarter, which is lengthening your offer pipeline" -- with data-backed process recommendations.

---

## Sourcing and Outreach Use Cases

### Personalized Outreach
The single biggest quality improvement in recruiting. Every outreach should cite 2-3 specific connections between the candidate's background and the role -- skills they've demonstrated, career goals they've expressed, types of problems they've solved that match what the team is working on. No "exciting opportunity" language. No buzzwords. Under 150 words. Specific enough that the candidate can tell this wasn't sent to 1,000 people.

### Passive Candidate Nurture
The best candidates are almost never actively looking. Monthly cadence of value-add content -- market insights for their specialty, career path analysis, salary benchmarks -- builds relationship before there's a role to fill. When a role opens that's a genuine fit, you're not a stranger. Never pitch a job in a nurture sequence unless the candidate has explicitly opted in.

### Rejection with Value
The worst touchpoint in recruiting is also the most impactful brand moment. Every rejection should include: what was genuinely strong about their background, what the deciding factor was (without disparaging them), and whether the relationship should continue for future roles. A well-crafted rejection turns a disappointed candidate into a brand ambassador who refers people to you.

### Candidate Re-engagement
After 6+ months since last contact, don't pitch a job. Send a genuine check-in: "How's the role at [company] working out? I remembered you were focused on [career goal] -- have you had the chance to pursue that?" This opens a conversation without pressure. Memory makes it authentic: the agent references what was actually discussed, not a generic template.

---

## Interview Process Use Cases

### Interview Prep Briefs (for Interviewers)
Every interviewer gets a brief before the interview: candidate background summary, what's already been assessed in prior stages, specific areas to probe based on the role requirements and what's still unclear, and any concerns raised by previous interviewers. No interviewer should ask a question the phone screener already answered.

### Candidate Prep Guides
Candidates who feel prepared interview better. 24 hours before each interview, send: who they'll meet, what format to expect, what the team values in this type of conversation, and 2-3 topics that are likely to come up based on the role. This improves the quality of the interview for both sides.

### Offer Negotiation Intelligence
Before the hiring manager makes an offer or counter-offer, the agent surfaces: the candidate's stated compensation expectations, any competing processes they mentioned, their key motivations (is this a career move or purely financial?), and market data for the role. The hiring team makes an informed decision rather than guessing.

---

## Multi-Requisition Memory Architecture

For high-volume recruiting (10+ open requisitions simultaneously), the memory architecture matters. Candidates should be linked to requisitions via tags, not stored once per req. A candidate being considered for 3 roles has one memory record; the req-specific context lives in tags and linked memories. This prevents profile fragmentation and ensures every agent working on any req has the candidate's full cross-req history -- including that they declined a similar role six months ago and why.

Client companies accumulate institutional knowledge over time. After 5+ placements with a client, the memory layer knows their hiring patterns, what kinds of candidates succeed vs churn, which interviewers give the best feedback, and what the company's stated vs revealed culture actually is. This knowledge makes every subsequent placement for that client better, and it's the most defensible competitive advantage a recruiting firm can build.
