# Industry Guides: Additional Verticals

This file bundles six industries that share a common pattern: relationship-heavy, compliance-aware, and data-rich but underconnected. Each section covers the core opportunity, a practical schema, and the top use cases. For detailed code patterns and extended use case libraries, the full solution architect skill provides industry-specific playbooks.

---

## Financial Services / FinTech

Financial products are inherently personal -- everyone's risk tolerance, goals, life stage, and tax situation is different. Yet most financial communication is segment-based ("high net worth" vs "retail") or purely transactional ("your statement is ready"). Personize enables advisors, banks, and fintech apps to communicate as if they deeply understand each client's financial life, while the governance layer enforces the regulatory constraints that make this safe to deploy.

### Key Schema (Client)
| Property | Type | Description |
|---|---|---|
| `risk-tolerance` | select | conservative, moderate, aggressive |
| `investment-goals` | array | Retirement, education, liquidity, growth |
| `life-stage` | select | accumulation, pre-retirement, distribution |
| `regulatory-classification` | select | retail, accredited, qualified |
| `last-review-date` | date | Most recent advisor meeting |
| `communication-frequency` | select | monthly, quarterly, event-driven |

### Top Use Cases
1. **Market volatility communication** -- When markets move, agents generate personalized emails that reference each client's specific risk tolerance and long-term plan; not a generic "stay calm" broadcast
2. **Quarterly review prep** -- Agents pull a full quarter of account activity, goals, and life changes into a personalized review agenda with talking points for the advisor
3. **Life event planning** -- When a client gets married, retires, or has a child, proactive planning suggestions aligned to their financial plan trigger automatically

### Critical Governance
Regulatory compliance is non-negotiable before any generation. Required variables: `regulatory-compliance` (past performance disclaimers, no return guarantees), `suitability-rules` (no recommendations above stated risk tolerance), `fair-lending` (no discriminatory language), `data-privacy` (no account numbers in email, use ranges not exact balances).

---

## Insurance / InsurTech

Insurance companies interact with policyholders almost exclusively at renewal and during claims -- both moments associated with cost or stress. This creates a persistent trust deficit: the only time the company reaches out is when they want money or something went wrong. Personize enables proactive, personalized engagement throughout the policy lifecycle: life event coverage reviews, proactive renewal value reinforcement, and empathetic claims communication that builds trust instead of eroding it.

### Key Schema (Policyholder)
| Property | Type | Description |
|---|---|---|
| `policies-held` | array | Policy types (auto, home, life, umbrella, business) |
| `life-stage` | select | single, married, family, empty-nester, retired |
| `next-renewal-date` | date | Earliest upcoming renewal |
| `risk-category` | select | standard, preferred, high-risk |
| `communication-preference` | select | email, SMS, phone, portal |
| `coverage-gaps-identified` | text | AI-summarized coverage gap analysis |

### Top Use Cases
1. **Life event coverage review** -- New home purchase, baby, marriage, or retirement triggers a personalized coverage review; framed as protection, not upselling; scenario-based rather than fear-based
2. **Renewal retention** -- 60-day communication pipeline that leads with value delivered ("here's what your policy protected this year") before addressing the new premium
3. **Empathetic claims communication** -- Every claim update leads with empathy, provides a clear timeline, and offers a direct contact -- transforming the claims process from adversarial to trust-building

### Critical Governance
`claims-communication` is the most important variable: lead with empathy, provide clear timelines, never deny without review. Also required: `coverage-recommendations` (scenario-based explanations, no fear-mongering), `insurance-regulations` (state-specific disclosures), `privacy-and-data` (PHI treatment for life/health policies).

---

## Education / EdTech

Every learner is different -- different pace, knowledge gaps, motivations, and goals. EdTech companies have rich data (quiz scores, completion rates, engagement patterns) but rarely connect it across touchpoints. A student struggling with one concept needs a different nudge than a student who's excelling but disengaged. Personize enables adaptive learning experiences, intelligent student engagement, and institutional analytics that actually improve outcomes.

### Key Schema (Student)
| Property | Type | Description |
|---|---|---|
| `courses-enrolled` | array | Active course enrollment |
| `completion-rate` | percent | Percentage of assigned content completed |
| `learning-pace` | select | ahead, on-track, behind, at-risk |
| `knowledge-gaps` | array | AI-identified concept gaps from assessments |
| `preferred-format` | select | video, text, interactive, mixed |
| `career-goals` | text | Stated career objective or program goal |
| `engagement-score` | number | 0-100 composite engagement score |

### Top Use Cases
1. **Adaptive study plans** -- Weekly personalized plans that allocate time proportional to knowledge gaps, match resource format to learning style, and use growth-mindset framing throughout
2. **Dropout prevention** -- Engagement decline patterns trigger advisor alerts with full student context; intervention messages are personalized to the student's specific situation, not generic "we miss you" emails
3. **Course recommendations** -- When a student completes a course or starts a new semester, recommendations explain specifically how each option advances their stated career goal

### Critical Governance
`ferpa-compliance` for US institutions: no individual academic data shared without consent, aggregate for reporting. `academic-integrity`: AI may explain and guide, never complete graded work. `encouragement-tone` (growth mindset): frame challenges as "haven't mastered yet," celebrate effort not just results, never compare students to peers.

---

## Real Estate / PropTech

Real estate is deeply personal and relationship-driven. Agents manage dozens of clients simultaneously, each with different criteria, timelines, and emotional states. Buyer preferences evolve with every showing -- what they say they want and what they react to are often different things. Personize lets agents capture this evolution in real time, matching new listings against not just stated criteria but revealed preferences from showing history.

### Key Schema (Buyer)
| Property | Type | Description |
|---|---|---|
| `budget-range` | text | Purchase budget range |
| `preferred-neighborhoods` | array | Target areas |
| `must-haves` | array | Non-negotiable requirements |
| `deal-breakers` | array | Automatically disqualifying features |
| `pre-approval-status` | select | not-started, in-progress, approved, expired |
| `showing-feedback-summary` | text | AI-extracted preference evolution from all showings |
| `properties-viewed-count` | number | Total showings to date |

### Top Use Cases
1. **Smart property matching** -- New listings are matched against both stated criteria and revealed preferences from showing history; recommendation emails reference specific past showings ("you loved the natural light at X -- this one has even more")
2. **Seller weekly updates** -- Automated summaries of showing feedback, inquiry volume, and market positioning insights; saves agents hours of manual reporting each week
3. **Home anniversary nurture** -- Annual touchpoint for past buyers with estimated home value, neighborhood updates, and a gentle referral ask -- reactivates dormant referral relationships at scale

### Critical Governance
`fair-housing` is non-negotiable and must be set up before any listing or neighborhood content generation. Never reference demographic composition; describe properties by features. `agency-disclosure`: always clarify representation; never share a client's bottom line or motivation with the other party.

---

## Professional Services (Legal, Consulting, Accounting)

Professional services firms run on institutional knowledge that walks out the door when partners retire. Client needs are complex and evolving, and the best firms anticipate needs before clients ask. Personize captures relationship context as shared memory, enables proactive client development through regulatory change alerts and thought leadership distribution, and ensures every professional in the firm has the context to serve clients at the highest level.

### Key Schema (Client)
| Property | Type | Description |
|---|---|---|
| `industry` | text | Client's primary industry |
| `engagement-types-active` | array | Current service areas (litigation, tax, strategy, etc.) |
| `billing-rate-sensitivity` | select | low, medium, high -- guides proactive billing communication |
| `relationship-partner` | text | Primary relationship owner at the firm |
| `years-as-client` | number | Tenure of the relationship |
| `nps-score` | rating | Satisfaction score (1-5) |

### Top Use Cases
1. **Regulatory change alerts** -- When a new regulation affects a client's industry, agents generate personalized impact emails in minutes: specific to that client's active engagements, not a generic regulatory summary blast
2. **Client meeting prep briefs** -- Partners get full relationship context before every meeting: recent engagement status, billing history, personal notes, and open opportunities -- sourced from everything the firm knows about the client
3. **Thought leadership distribution** -- New articles and alerts are matched to clients whose industry, regulatory exposure, and stated interests align; agents write the personalized cover note explaining relevance to their specific situation

### Critical Governance
`privilege-confidentiality`: never cross-reference client matters; attorney-client privilege applies to all legal matters. `conflict-check`: verify before any new engagement introduction. `billing-communication`: lead with value before fees; communicate billing surprises proactively before the invoice. `professional-standards`: legal (Rules of Professional Conduct), accounting (AICPA independence requirements), consulting (methodology standards).

---

## Travel & Hospitality

Travelers share enormous preference data through bookings, reviews, and loyalty programs -- but most brands treat them as new customers every visit. The front desk doesn't know they stayed last month. The marketing email doesn't know they prefer corner suites. Personize enables true guest recognition across every touchpoint: from pre-arrival to post-stay, creating the kind of personalized service that luxury brands promise but few deliver consistently at scale.

### Key Schema (Guest)
| Property | Type | Description |
|---|---|---|
| `loyalty-tier` | select | member, silver, gold, platinum |
| `travel-purpose` | select | business, leisure, bleisure, group, event |
| `room-preferences` | text | Documented room type, floor, pillow, and setup preferences |
| `dietary-restrictions` | array | Food and beverage requirements (treat as safety-critical) |
| `celebration-dates` | text | Anniversary, birthday, and special occasion dates |
| `lifetime-stays` | number | Total stays across the property or brand |
| `communication-preference` | select | email, SMS, app, none |

### Top Use Cases
1. **Pre-arrival personalization** -- 48 hours before check-in, guests receive an email referencing their past stays, confirming their documented preferences, and suggesting 3 personalized activities; technology feels like human attentiveness, not a data system
2. **Post-stay follow-up** -- Thank-you email that references a specific moment from the stay (not generic "hope you enjoyed your visit"); builds loyalty through genuine remembrance rather than transactional marketing
3. **Return visit campaigns** -- 90 days post-stay, agents generate personalized "come back for [specific seasonal event or experience]" messages based on what the guest loved during their visit

### Critical Governance
`hospitality-voice`: "we remembered" not "our system shows"; "we prepared" not "please note." Technology must be invisible -- every communication should feel like it came from a host who genuinely knows the guest. `guest-privacy`: never share stay dates or companion information; enhanced protocols for VIPs and business travelers who may need stay confidentiality. Dietary restrictions are safety-critical -- always verify and confirm.
