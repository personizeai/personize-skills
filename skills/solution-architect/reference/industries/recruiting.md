# Industry Blueprint: Recruiting / HR Tech / Staffing

Recruiting is a matching problem with massive personalization surface. The industry is plagued by "spray and pray" — generic outreach that talented candidates ignore. Every candidate communication, job description, interview prep, and client update can be deeply personalized. Personize enables recruiters and HR teams to treat every candidate like a unique individual while scaling operations.

---

## Recommended Schema

| Collection | Key Properties | Why |
|---|---|---|
| `Candidate` | skills, experience_years, desired_role, desired_salary_range, preferred_locations, work_preference (remote/hybrid/onsite), availability_date, interview_stage, strengths, culture_preferences, career_goals, engagement_history, source_channel | Candidate matching and outreach |
| `Job-Requisition` | title, department, requirements, nice_to_haves, salary_range, hiring_manager, urgency, interview_process, team_culture, growth_path, benefits_highlights | Role intelligence |
| `Client-Company` | industry, company_size, culture_description, benefits, hiring_velocity, retention_rate, tech_stack, glassdoor_rating, employer_brand_strength | Employer matching |
| `Placement` | candidate_email, company, role, start_date, salary, placement_fee, status, satisfaction_90_day | Placement tracking |

---

## Governance Setup

| Variable | Purpose | Content |
|---|---|---|
| `eeoc-compliance` | Equal Employment Opportunity | "Never reference age, race, gender, religion, national origin, disability, genetic information, or pregnancy status in candidate communications, job descriptions, or internal evaluations. Focus solely on qualifications, experience, and demonstrated skills." |
| `salary-transparency` | Pay equity and transparency | "In states/jurisdictions with salary transparency laws, always include salary range. Never ask candidates about salary history (banned in many jurisdictions). Frame compensation discussions around the role's value, market data, and the candidate's expected range." |
| `candidate-experience` | Communication standards | "Respond to all applications within 48 hours. Never ghost candidates — always close the loop, even with rejection. Personalize rejections. Keep candidates informed at every stage. Respect their time: confirm interviews, provide clear prep instructions, follow up on schedule." |
| `diversity-sourcing` | Inclusive hiring practices | "Use inclusive language in job descriptions. Avoid gendered terms, unnecessary degree requirements, and 'culture fit' language that may exclude. Focus on 'culture add.' Ensure diverse candidate pools before advancing to interviews." |
| `data-retention` | Candidate data handling | "Respect candidate data preferences. Delete data upon request. Don't share candidate information between clients without consent. Comply with GDPR for EU candidates. Only retain data for candidates who opt in to talent pool." |

```typescript
await client.guidelines.create({
    name: 'Candidate Communication Standards',
    content: `Every candidate interaction reflects your brand:
    1. RESPOND within 48 hours — silence is the worst response
    2. PERSONALIZE every message — reference their specific background, not generic "your impressive resume"
    3. CLOSE THE LOOP — always tell candidates where they stand, even if it's a no
    4. RESPECT TIME — confirm meetings, provide clear agendas, stick to schedules
    5. REJECT WITH VALUE — tell them what was strong, what to develop, keep the door open for future roles
    6. NO BAIT-AND-SWITCH — don't lure candidates with one role and pitch another without transparency
    7. FOLLOW UP ON PROMISES — if you said "I'll get back to you by Friday," do it by Friday`,
    triggerKeywords: ['candidate', 'outreach', 'rejection', 'follow-up', 'communication', 'interview'],
    tags: ['candidate-experience', 'communication', 'recruiting'],
});
```

---

## Unified Memory: What to Memorize

| Source | Method | What Gets Extracted |
|---|---|---|
| ATS (Greenhouse, Lever, Workable) | `memorizeBatch()` daily | Candidate profiles, application status, interview feedback, hiring manager notes |
| LinkedIn/sourcing data | `memorize()` per candidate | Skills, experience, career trajectory, publications, projects |
| Interview feedback | `memorize()` per interview | Strengths observed, concerns, culture fit assessment, technical scores |
| Candidate conversations | `memorize()` per conversation | Career goals, compensation expectations, timeline, concerns, motivations |
| Client company updates | `memorize()` per update | Hiring needs changes, team structure, culture shifts, new benefits |
| Placement outcomes | `memorize()` per milestone | 30/60/90-day check-in results, retention data, satisfaction |
| Job market data | `memorize()` monthly | Salary benchmarks, skill demand trends, competitive landscape |

### Building Candidate Intelligence Over Time

```typescript
// After every candidate interaction, build the relationship memory
await client.memory.memorize({
    content: `Phone screen with candidate — ${new Date().toLocaleDateString()}:
    Current situation: ${candidate.currentSituation}
    Why looking: ${candidate.motivations}
    Must-haves: ${candidate.mustHaves.join(', ')}
    Deal-breakers: ${candidate.dealBreakers.join(', ')}
    Salary expectation: ${candidate.salaryRange}
    Timeline: ${candidate.timeline}
    Culture preferences: ${candidate.culturePreferences}
    Career goal (3-year): ${candidate.careerGoal}
    Interviewing elsewhere: ${candidate.otherProcesses || 'Not disclosed'}`,
    email: candidate.email,
    enhanced: true,
    tags: ['phone-screen', 'candidate-intake', candidate.primarySkill],
});
```

---

## Use Cases by Function

### Sourcing & Outreach (12 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Personalized Candidate Outreach** | New req opened | Memory (candidate skills + career goals + past interactions) → Governance (EEOC) → Generate (outreach explaining specific fit) |
| 2 | **Job Description Optimization** | Req created | Memory (successful placements for similar roles) → Governance (inclusive language) → Generate (JD emphasizing what actually attracts talent) |
| 3 | **Passive Candidate Nurture** | Monthly drip | Memory (candidate interests + career stage) → Generate (value-add content: market insights, career advice, not job pitches) |
| 4 | **Candidate Re-engagement** | 6+ months since contact | Memory (past interactions + career trajectory) → Generate (genuine check-in referencing their goals, not a job pitch) |
| 5 | **Referral Request** | Open req matching network | Memory (placed candidates at similar companies/roles) → Generate (personalized referral request to satisfied placements) |
| 6 | **Talent Pool Activation** | Urgent req opened | Memory (all candidates with matching skills + availability) → Generate (targeted outreach per candidate) |
| 7 | **Employer Brand Content** | Company milestone | Memory (company culture + team feedback + wins) → Generate (authentic employer brand content for social/careers page) |
| 8 | **Diversity Pipeline Report** | Weekly | Memory (candidate pool demographics + pipeline stages) → Generate (pipeline diversity analysis with sourcing recommendations) |
| 9 | **Competitor Hire Alert** | Competitor hiring signal | Memory (candidates at competitor companies) → Signal (alert recruiter) → Generate (timing-aware outreach) |
| 10 | **University Recruiting** | Campus season | Memory (program strengths + past campus hires) → Generate (campus-specific recruiting messaging + event plan) |
| 11 | **Boomerang Employee Outreach** | Former employee anniversary | Memory (departure reason + tenure + performance) → Generate (tasteful reconnection email if departure was positive) |
| 12 | **Skills-Adjacent Matching** | No exact matches for req | Memory (candidates with adjacent skills) → Generate (outreach framing the role as a growth opportunity) |

### Interview & Assessment (8 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Interview Prep Brief** | Interview scheduled | Memory (candidate resume + past interviews + feedback) → Generate (interviewer brief with suggested questions) |
| 2 | **Candidate Interview Prep** | Interview confirmed | Memory (company culture + role details + interview format) → Generate (candidate prep guide: what to expect, who they'll meet) |
| 3 | **Post-Interview Follow-Up** | Interview completed | Memory (interview feedback) → Generate (personalized follow-up: next steps, timeline, what impressed) |
| 4 | **Rejection with Value** | Decision to reject | Memory (candidate's strengths + what was missing) → Governance (candidate experience) → Generate (constructive rejection with future potential) |
| 5 | **Offer Negotiation Intelligence** | Offer stage | Memory (candidate's stated expectations + market data + competing offers) → Generate (negotiation strategy brief for hiring manager) |
| 6 | **Reference Check Guide** | References requested | Memory (candidate's claimed achievements + role requirements) → Generate (custom reference questions targeting key verification areas) |
| 7 | **Interview Scorecard Summary** | All interviews complete | Memory (all interviewer feedback) → Generate (synthesized assessment with recommendation + concerns to address) |
| 8 | **Hiring Committee Brief** | Committee review | Memory (candidate profile + all feedback + similar past hires) → Generate (balanced committee brief with data points) |

### Client Management (8 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Client Status Update** | Weekly | Memory (search progress + pipeline + market conditions) → Generate (client-specific update with actionable insights) |
| 2 | **Salary Benchmarking** | Client request or new req | Memory (market data + similar placements) → Generate (data-backed salary recommendation) |
| 3 | **Candidate Presentation** | Candidate shortlisted | Memory (candidate profile + client needs) → Generate (candidate presentation highlighting specific fit) |
| 4 | **Intake Meeting Prep** | New req received | Memory (company history + past placements + hiring patterns) → Generate (intake meeting agenda with pre-researched insights) |
| 5 | **Hiring Process Optimization** | Quarterly review | Memory (time-to-fill + drop-off stages + candidate feedback) → Generate (process improvement recommendations with data) |
| 6 | **Market Intelligence Brief** | Monthly | Memory (talent availability + salary trends + competitive landscape) → Generate (client-specific market report for their roles) |
| 7 | **Placement Anniversary Check-In** | 30/60/90/365 days | Memory (placement details + early performance) → Generate (check-in with both candidate and client) |
| 8 | **Win-Back Lapsed Client** | 6+ months inactive | Memory (past relationship + placements + why they went quiet) → Generate (re-engagement referencing past success + market changes) |

### Onboarding & Retention (6 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **New Hire Welcome Sequence** | Start date | Memory (interests + team composition + role) → Generate (personalized welcome: team intros, first-week guide, relevant resources) |
| 2 | **30-Day Check-In** | Day 30 | Memory (placement context + early signals) → Generate (structured check-in covering expectations, culture fit, support needs) |
| 3 | **Manager Onboarding Brief** | Placement confirmed | Memory (candidate's strengths + development areas + communication preferences) → Generate (manager brief for effective onboarding) |
| 4 | **Internal Mobility Matching** | Employee career goals updated | Memory (skills + interests + internal opportunities) → Generate (internal opportunity recommendations) |
| 5 | **Exit Interview Intelligence** | Resignation | Memory (employment history + team context) → Generate (exit interview guide with custom questions) |
| 6 | **Alumni Network Engagement** | Departure | Memory (tenure + contributions + departure terms) → Generate (alumni network invitation with personalized value prop) |

---

## Agent Coordination: Recruitment Pipeline Workspace

```typescript
// Sourcing agent finds and qualifies candidates
await client.memory.memorize({
    content: `[SOURCING-AGENT] Identified 5 candidates for Senior Backend Engineer req. Top candidate: candidate@email.com — 8 years Go/Python, led distributed systems team at growth-stage startup, interested in technical leadership path. Already had brief LinkedIn exchange, responded positively. Other 4 candidates profiled and added to pipeline.`,
    website_url: clientCompany.domain, enhanced: true,
    tags: ['workspace', 'sourcing', 'sr-backend-eng', 'pipeline-update'],
});

// Screening agent records assessment
await client.memory.memorize({
    content: `[SCREENING-AGENT] Phone screened top candidate. Confirmed: strong distributed systems experience, led team of 6, shipped 3 major services. Motivation: wants more architectural ownership, current company too process-heavy. Compensation: targeting $180-200K base + equity. Available: 2 weeks notice. Red flags: none. Recommend advance to technical interview.`,
    email: 'candidate@email.com', enhanced: true,
    tags: ['workspace', 'screening', 'sr-backend-eng', 'assessment'],
});

// Client relationship agent prepares update
const pipelineContext = await client.memory.smartRecall({
    query: 'all sourcing, screening, and interview updates for this requisition',
    website_url: clientCompany.domain, limit: 20, min_score: 0.3,
    filters: { conditions: [{ property: 'tags', operator: 'CONTAINS', value: 'sr-backend-eng' }] },
});

const clientUpdate = await client.ai.prompt({
    context: JSON.stringify(pipelineContext.data?.results),
    instructions: [
        { prompt: 'Summarize pipeline status: candidates sourced, screened, advancing, and any market insights discovered during sourcing.', maxSteps: 3 },
        { prompt: 'Generate a professional client update email. Lead with results, include market context (talent availability, competing offers), and specific next steps with dates. SUBJECT: and BODY_HTML: fields.', maxSteps: 5 },
    ],
});
```

---

## Key Workflow: Personalized Candidate Outreach

```typescript
async function generateCandidateOutreach(candidateEmail: string, reqId: string) {
    const governance = await client.ai.smartGuidelines({
        message: 'EEOC compliance, candidate experience standards, inclusive language, outreach tone guidelines',
        mode: 'fast',
    });

    const [candidateContext, roleContext, companyContext] = await Promise.all([
        client.memory.smartDigest({ email: candidateEmail, type: 'Candidate', token_budget: 2000 }),
        client.memory.smartRecall({
            query: `job requisition details, requirements, team culture, growth path for req ${reqId}`,
            type: 'Job-Requisition', limit: 1, min_score: 0.7,
        }),
        client.memory.smartRecall({
            query: 'company culture, benefits, tech stack, employer brand',
            type: 'Client-Company', limit: 1, min_score: 0.7,
        }),
    ]);

    const context = [
        governance.data?.compiledContext || '',
        candidateContext.data?.compiledContext || '',
        `Role: ${JSON.stringify(roleContext.data?.results)}`,
        `Company: ${JSON.stringify(companyContext.data?.results)}`,
    ].join('\n\n---\n\n');

    const outreach = await client.ai.prompt({
        context,
        instructions: [
            { prompt: 'Find 2-3 concrete connections between this candidate\'s experience and the role. What specific projects, skills, or career goals make this a genuine match? Avoid generic observations.', maxSteps: 3 },
            { prompt: 'Write a recruiter outreach email. Lead with what caught your eye about THEIR background (not the role). Then connect their goals to the opportunity. Be specific — no "exciting opportunity" language. No buzzwords. Under 150 words. SUBJECT: and BODY_HTML: fields.', maxSteps: 5 },
        ],
        evaluate: true,
        evaluationCriteria: 'References at least 2 specific details from their background. No generic recruiter language. Under 150 words. EEOC compliant. Genuine connection between their goals and the role.',
    });

    await client.memory.memorize({
        content: `[OUTREACH] Sent personalized outreach for ${reqId}. Subject: ${String(outreach.data).match(/SUBJECT:\s*(.+)/i)?.[1] || 'N/A'}. ${new Date().toISOString()}.`,
        email: candidateEmail, enhanced: true,
        tags: ['generated', 'outreach', reqId],
    });

    return outreach.data;
}
```

---

## Quick Wins (First Week)

1. **Import candidate database** via `memorizeBatch()` from ATS
2. **Set up candidate experience governance** — standards for every interaction
3. **Personalized outreach for top req** — immediate quality improvement
4. **Rejection with value template** — transforms worst touchpoint into brand builder
5. **Client status update automation** — saves hours per week
