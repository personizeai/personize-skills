# Industry Guide: Healthcare / HealthTech

Healthcare personalization must balance empathy with compliance. Patients want to feel known and cared for, but HIPAA, state privacy laws, and clinical ethics create hard constraints on what can be stored, referenced, and sent through which channels. Personize's governance layer is the critical differentiator here: compliance rules check before every message, sensitive topics are flagged for clinical review, and audit trails are maintained automatically. This guide covers patient engagement platforms, telehealth, health apps, and provider operations.

---

## Recommended Entity Types

- **Patient** -- Individual patient engagement, preferences, and care context
- **Provider** -- Clinician or care team member; matching and coordination
- **Care-Plan** -- Active care goals, milestones, and adherence tracking
- **Encounter** -- Visit history; summarized (never raw clinical notes)

---

## Starter Schema

### Patient
| Property | Type | Description |
|---|---|---|
| `age-group` | select | 18-34, 35-54, 55-64, 65+ |
| `conditions-list` | array | AI-extracted condition categories (never raw diagnoses) |
| `care-plan-status` | select | active, on-track, at-risk, lapsed |
| `preferred-communication` | select | portal, SMS, email, phone |
| `language` | text | Primary language for communications |
| `health-literacy-level` | select | basic, intermediate, advanced |
| `engagement-score` | number | 0-100 portal and appointment engagement |
| `next-appointment` | date | Upcoming scheduled visit |

### Provider
| Property | Type | Description |
|---|---|---|
| `specialty` | text | Medical specialty |
| `patient-panel-size` | number | Active patients assigned |
| `communication-style` | select | detailed, summary, alerts-only |
| `availability` | text | Scheduling notes and availability windows |

### Care-Plan
| Property | Type | Description |
|---|---|---|
| `goals` | array | Active care goals |
| `milestones-completed` | number | Goals achieved |
| `barriers-to-adherence` | text | Documented barriers (transportation, cost, etc.) |
| `care-team-members` | array | Providers involved in care |
| `last-updated` | date | Most recent care plan review date |

---

## Common Use Cases

1. **Appointment reminders and prep** -- Personalized pre-visit instructions at the patient's health literacy level, in their preferred language
2. **Medication adherence nudges** -- Reminders that address documented barriers, not generic alerts
3. **Post-visit follow-up** -- Patient-friendly summary of what was discussed, specific action items, and when to call
4. **Chronic condition education** -- Progressive weekly education series matched to condition stage and literacy level
5. **No-show prediction and prevention** -- Identify high-risk appointments from past patterns; generate targeted outreach addressing their specific barrier

---

## Integration Patterns

**EHR/EMR:** Memorize AI-summarized encounter notes, not raw clinical text. Use `extractMemories: true` to convert clinical language into useful-but-deidentified categories.

**Appointment system:** Batch-memorize appointment history. Extraction off -- dates and types are already structured. Use patterns to predict no-shows and adherence risk.

**Patient portal:** Memorize session summaries (content viewed, messages sent, help requests). Never individual page views.

**Satisfaction surveys:** Memorize per response with extraction. Surface sentiment, specific praise, and complaints by department.

**Care plan milestones:** Memorize per milestone event. Requires clinical validation before acting on outputs.

**Channel routing:** Appointment reminders OK via SMS/email. Clinical content (medication changes, lab references, diagnosis-adjacent content) must route through secure patient portal only.

---

## Key Governance Variables

| Variable | Purpose |
|---|---|
| `hipaa-compliance` | Hard rules: no PHI in subject lines, no name + condition in unencrypted channels, minimum necessary principle |
| `medical-disclaimer` | Required on all health content: "for educational purposes, consult your provider" |
| `sensitive-topics` | Flag for clinical review: mental health, substance abuse, reproductive health, pediatric, terminal diagnosis, medication changes |
| `health-literacy` | Default 6th-grade reading level; plain language over medical jargon |
| `communication-consent` | Only contact through stated preferred channel; check consent before every outbound message |
| `clinical-boundaries` | AI scope limits: may summarize and remind; must not diagnose, recommend treatment changes, or interpret labs |

---

## HIPAA Compliance Notes

**Never memorize raw PHI:** No Social Security numbers, full medical record numbers, exact diagnosis text verbatim from records. Store AI-extracted summaries and categories instead.

**Subject lines:** Never include name + condition together. Use "Your upcoming appointment" not "Your diabetes check-up."

**Sensitive content always uses secure portal:** Anything touching medication, lab results, diagnosis categories, or mental health must go through authenticated secure portal, not plain email or SMS.

**Audit trail:** Every outbound communication should be logged. Personize's memory layer serves as the audit trail for generated content.

**Flag before send:** Implement a pattern-match check on generated content for sensitive topic keywords. Any match routes to clinical review queue before delivery, not automatic send.

---

## Use Cases by Function

### Patient Engagement
- **Appointment prep instructions:** Generated at the correct health literacy level for each patient's profile; includes what to bring, what to expect, and any preparation steps specific to their visit type
- **Medication adherence nudges:** Reminders that address documented barriers (transportation, cost, side effect concerns) rather than generic "don't forget your medication" alerts
- **Post-visit follow-up:** Patient-friendly summary of the visit in plain language; specific action items; when to call the office; next appointment confirmation
- **Chronic condition education drip:** Progressive weekly series matched to the patient's condition stage and literacy level -- week 1 is diet, week 2 is monitoring, week 3 is activity -- not one-size-fits-all
- **Preventive care reminders:** Personalized to age, demographics, and last screening dates -- not broadcast reminders to the whole panel
- **Wellness goal progress:** Monthly check-in celebrating effort and progress; specific and concrete, not "keep it up!"

### Provider Operations
- **Panel management daily brief:** Which patients need attention today -- overdue screenings, lapsed care plans, no-show risk, recent concerning signals -- one prioritized list per provider
- **No-show prediction and outreach:** Historical no-show patterns plus documented barriers trigger targeted pre-appointment outreach; reduces wasted appointment slots
- **Telehealth pre-visit brief:** 1 hour before a telehealth call, the provider sees a concise brief: recent symptoms, medication changes, patient's open questions, care plan status
- **Care team coordination:** Multi-provider patients get unified status briefs; no provider is repeating questions the last one already asked
- **Referral letter generation:** Pulls relevant patient history automatically; provider reviews and sends rather than drafting from scratch

### Health System Operations
- **Patient satisfaction intelligence:** Aggregate all survey responses into themes and trends by department; actionable insights rather than score reports
- **Community health outreach:** Campaign materials matched to community demographics, health priorities, and language preferences
- **Compliance audit prep:** All patient communications and consent records are memorialized; audit report assembles from existing memory rather than manual retrieval
- **Staff communication:** Policy change announcements personalized to role and department -- clinical staff get clinical implications, administrative staff get process implications

---

## Care Coordination Patterns

Healthcare is inherently multi-agent. Multiple providers, care coordinators, and automated systems all contribute to one patient's care. The workspace pattern is essential: each agent (PCP, nutritionist, pharmacist, care coordinator) writes their contribution tagged for the workspace, and a synthesis agent reads all contributions before generating any patient-facing communication. This prevents contradictory advice, ensures the patient gets one coherent voice, and gives every care team member full context before interacting with the patient.

---

## Patient Journey Memory Architecture

**Encounter summaries:** Never raw clinical notes. After each visit, the encounter summary is AI-extracted into useful categories: visit type, condition categories addressed, care plan changes, follow-up requirements, patient questions asked, satisfaction. This gives every downstream agent and provider the context without the clinical liability of storing raw chart notes.

**Longitudinal profile:** Patient properties (age group, conditions list, care plan status, communication preference) are updated at each encounter. The history accumulates in memory. After 6 months, an agent can surface which patients have shown consistent adherence improvement, which have lapsed multiple times, and which have never engaged -- enabling genuinely differentiated outreach.

**Caregiver integration:** For patients with identified caregivers, the caregiver relationship and communication preferences are memorized separately. Outreach can be routed to the caregiver when appropriate (always with patient consent and authorization verified). The system tracks which communications went to the patient vs the caregiver to maintain a clean audit trail.

**Consent and opt-out tracking:** Before every outbound message, check the patient's communication consent status in memory. HIPAA requires opt-out to be honored immediately. The memory layer is the source of truth for consent -- always memorize consent changes as they happen, and always query consent status before sending.
