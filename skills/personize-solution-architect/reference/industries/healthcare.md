# Industry Blueprint: Healthcare / HealthTech

Healthcare personalization must balance empathy with compliance. Patients want to feel known and cared for — but regulations (HIPAA, state privacy laws) and ethical standards create hard constraints. Personize's governance layer is the critical differentiator here: compliance rules are checked before every message, sensitive content is flagged, and audit trails are maintained automatically. This blueprint covers patient engagement platforms, telehealth, health apps, provider communications, and health system operations.

---

## Recommended Schema

| Collection | Key Properties | Why |
|---|---|---|
| `Patient` | age_group, conditions_list, care_plan_status, preferred_communication, provider_name, last_visit_date, medication_adherence_flag, language, health_literacy_level, caregiver_contact, insurance_type, engagement_score | Patient intelligence (never store raw PHI — only AI-extracted categories) |
| `Provider` | specialty, patient_panel_size, communication_style, referral_preferences, availability, quality_metrics | Provider matching and coordination |
| `Care-Plan` | goals, milestones_completed, next_appointment, medication_count, barriers_to_adherence, care_team_members, last_updated | Care continuity tracking |
| `Encounter` | visit_type, diagnosis_categories, procedures, follow_up_required, patient_satisfaction, notes_summary | Visit history for context |

**Critical note:** Never memorize raw PHI (Social Security numbers, full medical records, exact diagnoses verbatim). Instead, memorize AI-extracted summaries and categories. Configure `extractMemories: true` to let the AI summarize clinical information into useful-but-deidentified categories.

---

## Governance Setup (Non-Negotiable)

Healthcare governance is not optional. Set these up BEFORE any content generation:

| Variable | Purpose | Content |
|---|---|---|
| `hipaa-compliance` | Hard compliance rules | "Never include PHI in email subject lines. Never include full name + condition in the same unencrypted message. All patient data at rest must be in Personize's encrypted store. Outbound messages go through secure patient portal, not plain email, for clinical content." |
| `medical-disclaimer` | Required on all health content | "All AI-generated health information must include: 'This information is for educational purposes. Please consult your healthcare provider for medical advice specific to your situation.'" |
| `sensitive-topics` | Flag for manual review | "Always flag for human review before sending: mental health content, substance abuse references, reproductive health, terminal diagnosis communication, pediatric concerns, medication changes. These require clinical judgment." |
| `health-literacy` | Communication accessibility | "Default to 6th-grade reading level. Use plain language: 'blood pressure medicine' not 'antihypertensive'. Explain medical terms on first use. Use analogies for complex concepts. Offer to provide information in patient's preferred language." |
| `communication-consent` | Respect patient preferences | "Only contact patients through their stated preferred channel. Respect opt-outs immediately. No marketing to patients who only consented to clinical communications. Check consent status before every outbound message." |
| `clinical-boundaries` | AI scope limits | "AI may: summarize care plans, remind about appointments, provide general wellness education, suggest questions for provider visits. AI must NOT: diagnose, recommend treatment changes, interpret lab results, or contradict provider instructions." |

```typescript
await client.guidelines.create({
    name: 'HIPAA Communication Rules',
    content: `HARD RULES — no exceptions:
    1. Never include PHI in email subject lines (use "Your upcoming appointment" not "Your diabetes check-up")
    2. Never combine full name + specific condition in unencrypted channels
    3. Appointment reminders: OK via SMS/email. Clinical content: secure portal only
    4. Minimum necessary: only include information needed for the communication's purpose
    5. Include opt-out mechanism in every non-essential communication
    6. Log every outbound communication for audit trail`,
    triggerKeywords: ['patient', 'HIPAA', 'health', 'medical', 'PHI', 'clinical', 'communication'],
    tags: ['compliance', 'hipaa', 'healthcare'],
});

await client.guidelines.create({
    name: 'Sensitive Health Topics',
    content: `These topics MUST be flagged for clinician review before sending:
    - Mental health (depression, anxiety, PTSD, suicidal ideation)
    - Substance abuse and addiction
    - Reproductive health (pregnancy, fertility, contraception)
    - Terminal or life-limiting diagnoses
    - Pediatric concerns (always route through parent/guardian)
    - Medication changes or side effects
    - Lab results (even "normal" results may need clinical context)
    - Genetic testing results
    Flag by adding "⚠️ CLINICAL REVIEW REQUIRED: [topic]" to output.`,
    triggerKeywords: ['mental health', 'substance', 'reproductive', 'diagnosis', 'medication', 'lab results', 'pediatric'],
    tags: ['sensitive', 'clinical-review', 'healthcare'],
});
```

---

## Unified Memory: What to Memorize

| Source | Method | What Gets Extracted | Safety Note |
|---|---|---|---|
| EHR/EMR summaries | `memorize()` with extraction | Condition categories, care plan status, medication count | Never raw clinical notes — AI-summarized categories only |
| Appointment history | `memorizeBatch()` | Visit frequency, no-show patterns, provider assignments | OK to store dates and types |
| Patient portal activity | `memorize()` session summary | Engagement level, content viewed, messages sent | Aggregate patterns, not individual page views |
| Satisfaction surveys | `memorize()` per response | Sentiment, specific praise/complaints, improvement requests | Anonymize free-text if used in training |
| Care plan milestones | `memorize()` per milestone | Goals completed, barriers encountered, adherence trends | Clinical validation required before acting |
| Insurance/billing events | `memorize()` per event | Coverage type, billing questions, financial barriers | Never store full policy numbers |
| Caregiver interactions | `memorize()` per interaction | Caregiver concerns, communication preferences, availability | Verify caregiver authorization |

```typescript
// Memorize a patient encounter summary (not raw notes)
await client.memory.memorize({
    content: `Patient visit summary — ${visitDate}:
    Visit type: ${encounter.type}
    Primary concern categories: ${encounter.diagnosisCategories.join(', ')}
    Care plan updates: ${encounter.carePlanChanges}
    Follow-up needed: ${encounter.followUpRequired ? 'Yes, within ' + encounter.followUpDays + ' days' : 'No'}
    Patient questions asked: ${encounter.patientQuestions}
    Satisfaction: ${encounter.satisfactionScore}/5`,
    email: patient.email,
    enhanced: true,
    tags: ['encounter', encounter.type, 'clinical'],
});
```

---

## Use Cases by Function

### Patient Engagement (14 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Appointment Prep** | 48h before appointment | Memory (conditions + visit type) → Governance (HIPAA + health literacy) → Generate (prep instructions at right reading level) |
| 2 | **Post-Visit Summary** | Visit completed | Memory (visit notes summary) → Governance (clinical boundaries) → Generate (patient-friendly "what we discussed" summary) |
| 3 | **Medication Adherence** | Adherence check schedule | Memory (medication schedule + adherence history + barriers) → Generate (reminder addressing their specific barrier) |
| 4 | **Chronic Condition Education** | Condition identified + weekly drip | Memory (condition + stage + literacy level) → Generate (progressive education series: week 1 diet, week 2 monitoring, week 3 activity) |
| 5 | **Preventive Care Reminder** | Annual screening schedule | Memory (age + demographics + last screening dates) → Generate (personalized preventive care suggestion) |
| 6 | **Care Transition Handoff** | Provider change | Memory (full history) → Generate (provider handoff brief + patient transition guide) |
| 7 | **Telehealth Pre-Visit Brief** | 1h before telehealth | Memory (recent symptoms + medication changes + labs) → Generate (provider brief for call) |
| 8 | **Patient Portal Personalization** | Portal login | Memory (health goals + conditions) → Generate (personalized dashboard: relevant resources, tasks, progress) |
| 9 | **Caregiver Updates** | Weekly or milestone | Memory (patient care plan + caregiver preferences) → Generate (caregiver-appropriate update with action items) |
| 10 | **Wellness Program Matching** | New patient or annual review | Memory (conditions + lifestyle + preferences) → Generate (personalized program recommendations with expected outcomes) |
| 11 | **Symptom Check-In** | Post-procedure or ongoing condition | Memory (procedure/condition + expected recovery) → Generate (check-in asking about specific expected symptoms) |
| 12 | **Health Goal Progress** | Monthly | Memory (goals + milestones + measurements) → Generate (progress celebration or gentle encouragement with tips) |
| 13 | **Insurance Navigation Help** | Coverage question detected | Memory (insurance type + treatment plan) → Generate (plain-language coverage explanation + next steps) |
| 14 | **Seasonal Health Alerts** | Seasonal trigger (flu season, allergy season) | Memory (conditions + risk factors) → Generate (personalized seasonal health guidance) |

### Provider Operations (8 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Panel Management Dashboard** | Daily | Memory (all patients per provider) → Generate (daily action list: overdue screenings, non-adherent patients, care gaps) |
| 2 | **Referral Letter Generation** | Referral initiated | Memory (patient history + reason) → Governance (clinical boundaries) → Generate (referral letter with relevant history) |
| 3 | **No-Show Prediction + Outreach** | Appointment scheduled | Memory (no-show history + barriers) → Signal (flag high-risk) → Generate (outreach addressing specific barrier) |
| 4 | **Clinical Trial Matching** | New trial available | Memory (patient conditions + demographics + treatment history) → Generate (patient-friendly trial explanation) |
| 5 | **Care Team Coordination Brief** | Multi-provider patient | Memory (all providers + latest updates) → Workspace (coordination notes) → Generate (unified status brief) |
| 6 | **Quality Metrics Report** | Monthly | Memory (patient outcomes + satisfaction + adherence rates) → Generate (performance report with improvement suggestions) |
| 7 | **Peer Review Prep** | Peer review scheduled | Memory (provider's case mix + outcomes + patient feedback) → Generate (balanced peer review brief) |
| 8 | **Continuing Education Matching** | Quarterly | Memory (provider's specialty + patient panel + knowledge gaps) → Generate (relevant CE course recommendations) |

### Health System Administration (6 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Patient Satisfaction Intelligence** | Monthly | Memory (all survey responses + complaints) → Generate (themes, trends, actionable improvements per department) |
| 2 | **Staff Communication** | Policy change or event | Memory (staff roles + departments + communication preferences) → Generate (role-appropriate announcement) |
| 3 | **Community Health Outreach** | Health campaign launch | Memory (community demographics + health priorities) → Governance (health literacy) → Generate (culturally appropriate health messaging) |
| 4 | **Compliance Audit Preparation** | Annual/quarterly audit | Memory (all patient communications + consent records) → Generate (audit-ready compliance report) |
| 5 | **Resource Allocation Intelligence** | Monthly | Memory (patient volume + acuity + provider utilization) → Generate (staffing and resource optimization recommendations) |
| 6 | **Patient Acquisition Campaign** | Service line launch | Memory (community health needs + referral patterns) → Governance (medical advertising rules) → Generate (service-specific community outreach) |

---

## Agent Coordination: Care Team Workspace

Healthcare is inherently multi-agent — multiple providers, care coordinators, and automated systems all contribute to patient care:

```typescript
// Primary care provider records visit summary
await client.memory.memorize({
    content: `[PCP-AGENT] Annual wellness visit completed. Blood pressure elevated (category: stage 1 hypertension). Recommended dietary changes and exercise. Scheduled follow-up in 3 months. Patient expressed concern about medication side effects — prefers lifestyle intervention first.`,
    email: patient.email, enhanced: true,
    tags: ['workspace', 'clinical', 'pcp-visit', 'hypertension'],
});

// Nutritionist agent reads PCP notes and contributes
const pcpNotes = await client.memory.smartRecall({
    query: 'recent provider visits, dietary recommendations, and health conditions',
    email: patient.email, limit: 10, min_score: 0.5,
    filters: { conditions: [{ property: 'tags', operator: 'CONTAINS', value: 'workspace' }] },
});

await client.memory.memorize({
    content: `[NUTRITION-AGENT] Based on PCP recommendation, created personalized DASH diet plan. Patient prefers Mediterranean-style cooking. Allergies: shellfish. Goal: reduce sodium to 1,500mg/day. Provided 7-day meal plan and shopping list.`,
    email: patient.email, enhanced: true,
    tags: ['workspace', 'nutrition', 'diet-plan', 'hypertension'],
});

// Care coordinator synthesizes for patient communication
const allCareNotes = await client.memory.smartRecall({
    query: 'all care team contributions, plans, and recommendations',
    email: patient.email, limit: 20, min_score: 0.3,
    filters: { conditions: [{ property: 'tags', operator: 'CONTAINS', value: 'workspace' }] },
});

const governance = await client.ai.smartGuidelines({
    message: 'HIPAA communication rules, health literacy guidelines, medical disclaimer requirements',
    mode: 'full',
});

const patientUpdate = await client.ai.prompt({
    context: [
        governance.data?.compiledContext || '',
        JSON.stringify(allCareNotes.data?.results),
    ].join('\n\n---\n\n'),
    instructions: [
        { prompt: 'Synthesize all care team recommendations into one coherent patient message. Use plain language appropriate to this patient\'s health literacy level. No medical jargon.', maxSteps: 5 },
        { prompt: 'Generate a patient portal message with: what we discussed, your personalized plan (diet + exercise + follow-up), upcoming appointments, and how to reach us with questions. Include medical disclaimer. No PHI in any subject/title fields.', maxSteps: 5 },
    ],
    evaluate: true,
    evaluationCriteria: 'Reading level matches patient profile. Medical disclaimer present. No raw PHI. Actionable next steps clear.',
});
```

---

## Signal / Notification Patterns

### Clinical Alert Decision Engine

```typescript
// The signal engine decides IF, WHAT, WHEN, and HOW to notify

async function evaluateClinicalSignal(patientEmail: string, signalType: string, signalData: any) {
    const patientContext = await client.memory.smartDigest({
        email: patientEmail, type: 'Patient', token_budget: 1500,
    });

    const governance = await client.ai.smartGuidelines({
        message: 'sensitive health topics, HIPAA rules, communication consent, clinical boundaries',
        mode: 'full',
    });

    const decision = await client.ai.prompt({
        context: [
            governance.data?.compiledContext || '',
            patientContext.data?.compiledContext || '',
            `Signal: ${signalType}. Data: ${JSON.stringify(signalData)}`,
        ].join('\n\n---\n\n'),
        instructions: [
            { prompt: `Evaluate this signal. Should we notify the patient? Consider: (1) clinical significance, (2) patient's communication preferences, (3) is this a sensitive topic requiring clinical review? (4) timing appropriateness. Output: NOTIFY, FLAG_FOR_REVIEW, or SKIP with reasoning.`, maxSteps: 3 },
            { prompt: 'If NOTIFY: choose channel (portal/SMS/email based on content sensitivity and patient preference) and write the notification. If FLAG_FOR_REVIEW: write the clinician review request. If SKIP: output just SKIP.', maxSteps: 3 },
        ],
    });

    const output = String(decision.data || '');

    if (output.includes('FLAG_FOR_REVIEW')) {
        await notifyClinicalReviewQueue({ patient: patientEmail, signal: signalType, aiDraft: output });
    } else if (output.includes('NOTIFY') && !output.includes('SKIP')) {
        // Route to appropriate channel based on content sensitivity
        const isClinical = /medication|lab|diagnosis|treatment/i.test(output);
        if (isClinical) {
            await sendSecurePortalMessage({ email: patientEmail, content: output });
        } else {
            await sendPatientNotification({ email: patientEmail, content: output });
        }
    }
}
```

---

## Key Workflows with Code

### Workflow: Post-Visit Follow-Up with Safety

```typescript
async function generatePostVisitFollowUp(patientEmail: string, visitId: string) {
    // 1. Governance FIRST — always
    const governance = await client.ai.smartGuidelines({
        message: 'HIPAA communication, medical disclaimer, health literacy, sensitive topic flagging, clinical boundaries',
        mode: 'full',
    });

    // 2. Patient context
    const [patientContext, visitContext] = await Promise.all([
        client.memory.smartDigest({ email: patientEmail, type: 'Patient', token_budget: 2000 }),
        client.memory.smartRecall({
            query: `visit summary, care plan changes, medications discussed, follow-up instructions for visit ${visitId}`,
            email: patientEmail, limit: 5, min_score: 0.5,
        }),
    ]);

    // 3. Generate with guardrails
    const followUp = await client.ai.prompt({
        context: [
            governance.data?.compiledContext || '',
            patientContext.data?.compiledContext || '',
            `Visit details: ${JSON.stringify(visitContext.data?.results)}`,
        ].join('\n\n---\n\n'),
        instructions: [
            { prompt: 'Summarize what was discussed at this visit in plain language. Match the patient\'s health literacy level. Replace medical terms with everyday language.', maxSteps: 5 },
            { prompt: 'Generate the follow-up message. Include: (1) what we discussed (plain summary), (2) your next steps (clear action items), (3) when to call us (warning signs), (4) your next appointment. Add medical disclaimer. TITLE: (no PHI) and BODY: fields.', maxSteps: 5 },
        ],
        evaluate: true,
        evaluationCriteria: 'No PHI in title. Medical disclaimer present. Reading level appropriate. No diagnosis or treatment recommendations beyond what provider discussed. Action items are specific and clear.',
    });

    // 4. Safety check: flag sensitive content
    const output = String(followUp.data || '');
    const sensitivePatterns = /mental health|substance|reproductive|terminal|medication change|lab result|genetic/i;
    const needsReview = sensitivePatterns.test(output);

    if (needsReview) {
        return { status: 'flagged_for_review', draft: output, reason: 'Contains sensitive health topic' };
    }

    // 5. Deliver through secure channel (patient portal, not plain email)
    await sendSecurePortalMessage({ email: patientEmail, content: output });

    // 6. Close the loop
    await client.memory.memorize({
        content: `[FOLLOW-UP-SENT] Post-visit follow-up delivered via secure portal. Visit ${visitId}. ${new Date().toISOString()}.`,
        email: patientEmail, enhanced: true,
        tags: ['generated', 'follow-up', 'clinical'],
    });

    return { status: 'sent', content: output };
}
```

---

## Quick Wins (First Week)

1. **Set up HIPAA + sensitive topics governance** — non-negotiable first step
2. **Appointment reminders** — lowest risk, highest engagement impact
3. **Patient portal personalization** — relevant resources based on conditions
4. **Medication adherence nudges** — measurable health outcome improvement
5. **Care team coordination workspace** — providers immediately see unified context
