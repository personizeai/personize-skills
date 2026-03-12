# Industry Blueprint: Professional Services (Legal, Consulting, Accounting)

Professional services firms run on relationships, expertise, and institutional knowledge. When a partner retires or a senior associate leaves, decades of client relationship context walks out the door. Client needs are complex and evolving — and the best firms anticipate needs before clients ask. Personize captures institutional knowledge as a shared memory, enables proactive client development, and ensures every professional in the firm has the context to serve clients at the highest level.

---

## Recommended Schema

| Collection | Key Properties | Why |
|---|---|---|
| `Client` | industry, company_size, engagement_types_active, total_billing, billing_rate_sensitivity, key_contacts, preferred_communication, referral_source, risk_rating, nps_score, relationship_partner, years_as_client | Client intelligence |
| `Matter` (Legal) / `Engagement` (Consulting/Accounting) | type, status, team_assigned, budget, hours_billed, timeline, deliverables, risk_factors, billing_status, client_satisfaction | Work tracking |
| `Contact` | role, decision_authority, communication_preference, topics_of_interest, relationship_depth, last_contact_date, birthday, alma_mater, hobbies, professional_associations | Relationship nurturing |
| `Professional` | practice_area, specialties, bar_admissions, certifications, client_relationships, utilization_rate, thought_leadership_topics, industry_expertise, speaking_history | Expertise matching |
| `Regulatory-Update` | jurisdiction, practice_area, effective_date, affected_industries, severity, summary | Proactive advisory |

---

## Governance Setup

| Variable | Purpose | Content |
|---|---|---|
| `privilege-confidentiality` | Client privilege protection | "Never include privileged communication details in marketing or cross-selling materials. Attorney-client privilege and work product doctrine apply to all legal matters. Consulting: respect NDAs and confidentiality agreements per engagement. Never reference one client's matter when communicating with another." |
| `conflict-check` | Conflict of interest | "Before proposing any new engagement, verify no conflicts of interest exist. Never mention Client A's matter when discussing opportunities with Client B, even in the same industry. Cross-practice referrals must clear conflicts check before introduction." |
| `billing-communication` | Fee sensitivity | "Always lead with value delivered before discussing fees. Pre-bill reviews should identify any entries that may surprise the client. Explain unusual charges proactively. If billing is above estimate, communicate BEFORE the invoice, not after." |
| `professional-standards` | Practice-specific standards | "Legal: comply with applicable Rules of Professional Conduct. Accounting: adhere to AICPA standards and independence requirements. Consulting: follow firm methodology and quality standards. All: maintain professional skepticism and objectivity." |
| `thought-leadership` | Content and marketing rules | "Thought leadership must not constitute legal/financial/tax advice. Include appropriate disclaimers. Content should demonstrate expertise without guaranteeing outcomes. Case studies require client consent and anonymization unless explicitly approved." |
| `relationship-intelligence` | What to track and reference | "Track: professional interests, industry challenges, career milestones, personal interests (when voluntarily shared). Reference: professional context and shared experiences. Never: reference overheard confidential information, make assumptions about personal life, or use information from one professional relationship in another." |

```typescript
await client.guidelines.create({
    name: 'Professional Services Client Communication',
    content: `Standards for all client-facing communication:
    1. LEAD WITH VALUE — every outreach should offer something useful (insight, update, article, introduction)
    2. NEVER SELL DIRECTLY — position services as solutions to stated needs, not products to pitch
    3. RESPECT BOUNDARIES — a tax client hasn't asked for estate planning advice; offer it contextually, not pushy
    4. MAINTAIN INDEPENDENCE — accounting firms: never compromise audit independence in cross-selling
    5. BILL TRANSPARENCY — if something might be a surprise on the invoice, mention it in the next email
    6. PRIVILEGE AWARENESS — mark communications appropriately, never forward privileged content casually
    7. DEMONSTRATE EXPERTISE — share relevant insights proactively; the best business development is being undeniably useful`,
    triggerKeywords: ['client', 'business development', 'engagement', 'billing', 'advisory', 'proposal'],
    tags: ['professional-services', 'client-communication', 'business-development'],
});
```

---

## Unified Memory: What to Memorize

| Source | Method | What Gets Extracted |
|---|---|---|
| CRM / practice management | `memorizeBatch()` daily | Client profiles, engagement history, billing data, team assignments |
| Matter/engagement notes | `memorize()` per update | Status updates, key decisions, risk factors, client feedback |
| Meeting notes | `memorize()` per meeting | Topics discussed, concerns raised, follow-up commitments, personal updates |
| Regulatory/market updates | `memorize()` per update | Regulatory changes, industry trends, affected clients |
| Thought leadership content | `memorize()` per publication | Topics covered, authors, client relevance |
| Time entries (summaries) | `memorize()` weekly | Hours by matter/client, utilization, over-budget alerts |
| Client feedback/surveys | `memorize()` per response | Satisfaction, complaints, suggestions, relationship signals |

---

## Use Cases by Function

### Client Development / Business Development (12 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Regulatory Change Alert** | New regulation published | Memory (clients in affected industry) → Governance (privilege + no specific advice) → Generate (personalized impact email per client) |
| 2 | **Cross-Practice Opportunity** | Need identified in engagement | Memory (client's full engagement history) → Governance (conflict check + independence) → Generate (warm internal introduction to relevant practice) |
| 3 | **RFP Response Personalization** | RFP received | Memory (past engagements + client history + industry expertise) → Generate (custom sections referencing shared history and relevant experience) |
| 4 | **Client Entertainment Intelligence** | Pre-event planning | Memory (interests, dietary preferences, past events attended, topics of interest) → Generate (event recommendation with personal note explaining relevance) |
| 5 | **Thought Leadership Distribution** | Article/alert published | Memory (client's industry + regulatory exposure + stated interests) → Generate (personalized cover note explaining relevance to their situation) |
| 6 | **Alumni Client Re-engagement** | Anniversary of last engagement or market trigger | Memory (engagement history + reason for inactivity) → Generate (re-engagement referencing new capabilities or team changes) |
| 7 | **Billing Communication** | Pre-bill review | Memory (engagement budget + scope + client billing sensitivity) → Governance (billing transparency) → Generate (proactive billing communication preempting surprises) |
| 8 | **Year-End Advisory** | Year-end season | Memory (client's situation + regulatory changes + industry trends) → Generate (personalized year-end advisory with specific action items) |
| 9 | **Client Team Introduction** | New professional joins client team | Memory (firm team + client team + engagement context) → Generate (introduction facilitating relationship with right professionals) |
| 10 | **Market Intelligence Brief** | Quarterly | Memory (client's industry + competitive landscape + regulatory environment) → Generate (intelligence brief with implications for their business) |
| 11 | **Referral Source Nurturing** | Monthly | Memory (referral relationship + referrals received + reciprocity balance) → Generate (value-add touchpoint for referral sources) |
| 12 | **Pitch Preparation** | Pitch scheduled | Memory (prospect's industry + challenges + competitors used + team relationships) → Generate (pitch prep brief with angle recommendations) |

### Engagement / Matter Management (8 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Client Status Update** | Weekly or milestone | Memory (engagement progress + budget + issues) → Generate (client-facing status report with clear next steps) |
| 2 | **Risk Assessment Alert** | Risk factor identified | Memory (engagement context + risk factors) → Signal (alert engagement partner) → Generate (risk memo with recommended actions) |
| 3 | **Deadline Management** | Approaching deadline | Memory (all deadlines + dependencies + team assignments) → Signal (alerts to responsible parties with context) |
| 4 | **Budget Variance Alert** | Hours exceed 80% of budget | Memory (scope + actual vs budget + remaining deliverables) → Signal (alert manager) → Generate (scope discussion prep for client) |
| 5 | **Team Staffing Optimization** | New engagement or phase | Memory (professional expertise + availability + client relationship history) → Generate (staffing recommendation matching expertise to needs) |
| 6 | **Knowledge Management** | Engagement closing | Memory (all engagement learnings) → Generate (knowledge article: what was done, what worked, reusable templates, lessons learned) |
| 7 | **Peer Review Preparation** | Review scheduled | Memory (engagement details + work product + quality standards) → Generate (review checklist tailored to engagement type) |
| 8 | **Client Onboarding** | New engagement | Memory (client history + preferences + past teams) → Workspace (create engagement workspace) → Generate (onboarding checklist + client brief for new team members) |

### Talent / Professional Development (6 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Professional Development Plan** | Annual review | Memory (professional's experience + gaps + career goals) → Generate (personalized development plan with specific training, mentoring, and engagement opportunities) |
| 2 | **Speaker/Panel Matching** | Event invitation | Memory (professional's expertise + speaking history + thought leadership) → Generate (matched professional recommendation with talking point suggestions) |
| 3 | **Mentoring Match** | New associate or program cycle | Memory (mentor expertise + mentee goals + compatibility signals) → Generate (mentoring match with structured first meeting agenda) |
| 4 | **Utilization Optimization** | Under-utilized professional | Memory (expertise + available capacity + upcoming engagements needing help) → Signal (alert staffing) → Generate (deployment suggestions) |
| 5 | **CLE/CPE Tracking** | Completion or gap identified | Memory (credits earned + requirements + deadlines) → Generate (personalized credit plan with recommended programs) |
| 6 | **Practice Group Intelligence** | Quarterly | Memory (group's client wins + losses + pipeline + market position) → Generate (practice group performance brief with strategic recommendations) |

---

## Agent Coordination: Client Relationship Workspace

```typescript
// Engagement partner records client meeting
await client.memory.memorize({
    content: `[PARTNER-AGENT] Annual meeting with GC. Key takeaways: (1) Company expanding to EU — will need GDPR compliance review and entity structuring. (2) CEO considering M&A for small competitor — very early stage, confidential. (3) GC expressed frustration with last billing cycle — felt some time entries were excessive for routine tasks. (4) Personally: daughter starting college, interested in our education sector work. (5) Board meeting in March — may need board advisory support.`,
    website_url: clientCompany.domain, enhanced: true,
    tags: ['workspace', 'client-meeting', 'partner-notes', 'strategic'],
});

// BD agent reads meeting notes and identifies opportunities
await client.memory.memorize({
    content: `[BD-AGENT] Opportunities from partner meeting: (1) EU expansion → Corporate team + Data Privacy team intro (check conflicts first). Timing: next 3 months. (2) M&A preliminary → M&A team standby, DO NOT discuss externally or with anyone outside cleared list. (3) Board advisory → Governance practice intro for March board meeting. (4) Billing concern → Review last 3 invoices, identify any entries that could be batched or written down. Priority: address billing before proposing new work.`,
    website_url: clientCompany.domain, enhanced: true,
    tags: ['workspace', 'bd-intelligence', 'opportunities', 'action-items'],
});

// Billing agent addresses the concern
await client.memory.memorize({
    content: `[BILLING-AGENT] Reviewed last 3 invoices per partner notes. Found: 4 time entries for brief email reviews that could have been batched (total 1.2 hours). Recommendation: write down 0.8 hours on next invoice with note to client. Also: set up alternative fee arrangement discussion for routine regulatory filings — could improve client satisfaction and lock in recurring revenue.`,
    website_url: clientCompany.domain, enhanced: true,
    tags: ['workspace', 'billing-review', 'client-satisfaction', 'action-items'],
});
```

---

## Key Workflow: Regulatory Change Client Alert

```typescript
async function alertClientsOfRegulatoryChange(regulatoryUpdate: {
    jurisdiction: string;
    practiceArea: string;
    summary: string;
    affectedIndustries: string[];
    effectiveDate: string;
}) {
    const governance = await client.ai.smartGuidelines({
        message: 'client advisory communication, privilege protection, thought leadership disclaimers, professional standards',
        mode: 'full',
    });

    // Find all clients in affected industries
    for (const industry of regulatoryUpdate.affectedIndustries) {
        const affectedClients = await client.memory.search({
            type: 'Client',
            filters: { conditions: [{ property: 'industry', operator: 'EQ', value: industry }] },
        });

        for (const [id, record] of Object.entries(affectedClients.data?.records || {})) {
            const clientContext = await client.memory.smartDigest({
                record_id: id, type: 'Client', token_budget: 2500,
                include_properties: true, include_memories: true,
            });

            const context = [
                governance.data?.compiledContext || '',
                clientContext.data?.compiledContext || '',
                `Regulatory update: ${regulatoryUpdate.summary}`,
                `Effective: ${regulatoryUpdate.effectiveDate}. Practice area: ${regulatoryUpdate.practiceArea}.`,
            ].join('\n\n---\n\n');

            const alert = await client.ai.prompt({
                context,
                instructions: [
                    { prompt: 'How does this regulatory change specifically affect THIS client based on their industry, active engagements, and business situation? Identify 2-3 specific impacts.', maxSteps: 3 },
                    { prompt: 'Write a client advisory email. Lead with the impact on THEIR business (not a regulatory summary). Include 2-3 specific action items. Add disclaimer: "This alert is for informational purposes and does not constitute legal/professional advice specific to your situation." Sign from the relationship partner. SUBJECT: and BODY_HTML: fields.', maxSteps: 5 },
                ],
                evaluate: true,
                evaluationCriteria: 'Includes appropriate disclaimer. Client-specific impacts identified. Action items are practical. No confidential cross-client information.',
            });

            await client.memory.memorize({
                content: `[REGULATORY-ALERT] Sent re: ${regulatoryUpdate.practiceArea} change. Effective ${regulatoryUpdate.effectiveDate}. ${new Date().toISOString()}.`,
                record_id: id, enhanced: true,
                tags: ['generated', 'regulatory-alert', regulatoryUpdate.practiceArea],
            });
        }
    }
}
```

---

## Quick Wins (First Week)

1. **Import client relationships** via `memorizeBatch()` from CRM/practice management
2. **Set up privilege and confidentiality governance** — non-negotiable first step
3. **Client meeting prep briefs** — highest value for partners and senior professionals
4. **Regulatory change alerts** — demonstrates proactive advisory value
5. **Billing communication templates** — addresses common source of client friction
