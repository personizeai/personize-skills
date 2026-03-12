# Industry Blueprint: Education / EdTech

Every learner is different — different pace, different knowledge gaps, different motivations, different goals. EdTech companies have rich data (quiz scores, completion rates, engagement patterns) but rarely connect it across touchpoints. A student who struggles with algebra doesn't need the same nudge as one who breezes through. Personize enables adaptive learning experiences, intelligent student engagement, and institutional analytics that actually improve outcomes.

---

## Recommended Schema

| Collection | Key Properties | Why |
|---|---|---|
| `Student` | courses_enrolled, completion_rate, learning_pace, strengths, knowledge_gaps, preferred_format (video/text/interactive), study_time_preference, career_goals, engagement_level, streak_days, quiz_avg_score, help_requests_count, learning_style | Learner intelligence |
| `Course` | subject, difficulty_level, prerequisites, modules, avg_completion_rate, avg_rating, instructor, estimated_hours, skill_outcomes | Course matching |
| `Instructor` | subjects, teaching_style, student_ratings, availability, specializations, feedback_patterns | Instructor matching and support |
| `Institution` | type (K12/university/corporate/bootcamp), student_count, programs, technology_platform, accreditation, retention_rate | Institutional context |
| `Assignment` | course_id, type, difficulty, avg_score, common_mistakes, time_to_complete, learning_objectives | Assessment intelligence |

---

## Governance Setup

| Variable | Purpose | Content |
|---|---|---|
| `ferpa-compliance` | Student privacy (US) | "Never share student academic records, grades, or performance data with unauthorized parties. Parent access: only for students under 18 or where FERPA rights haven't transferred. Marketing: never use individual student data without consent. Aggregate and anonymize for institutional reporting." |
| `academic-integrity` | AI in education boundaries | "AI may: explain concepts, provide study guidance, recommend resources, give feedback on practice problems. AI must NOT: complete graded assignments, write essays for students, provide exam answers, or assist in plagiarism. Always encourage original thinking." |
| `age-appropriate` | Content safety for minors | "K-12 communications: age-appropriate language, no external links without review, parent-facing communications for students under 13 (COPPA). College+: professional but approachable tone. Corporate: business-appropriate with industry relevance." |
| `encouragement-tone` | Motivational communication | "Growth mindset framing: 'you haven't mastered this yet' not 'you failed'. Celebrate effort and progress, not just results. Never compare students to peers. Normalize struggle as part of learning. Be specific about what they did well." |
| `accessibility` | Inclusive content | "All generated content must be screen-reader friendly. Provide text alternatives for visual content. Use clear heading hierarchy. Support multiple learning modalities. Avoid color-only indicators. Plain language by default with technical terms defined." |

```typescript
await client.guidelines.create({
    name: 'Growth Mindset Communication',
    content: `All student-facing communication should embody growth mindset principles:
    - Frame challenges as opportunities: "This topic is challenging AND you're building the skills to master it"
    - Celebrate process: "You spent 45 minutes working through that problem set — that persistence is exactly what builds mastery"
    - Normalize struggle: "Most students find this concept tricky at first. Here's what helped others..."
    - Use "yet": "You haven't mastered quadratic equations yet" not "You failed the quiz"
    - Avoid fixed-mindset triggers: never use "smart," "talented," or "gifted" — use "dedicated," "improving," "persistent"
    - Be specific: "Your analysis of the primary sources showed strong critical thinking" not "good job"`,
    triggerKeywords: ['student', 'feedback', 'grade', 'score', 'progress', 'encouragement', 'struggling'],
    tags: ['tone', 'education', 'growth-mindset'],
});
```

---

## Unified Memory: What to Memorize

| Source | Method | What Gets Extracted |
|---|---|---|
| LMS (Canvas, Moodle, Blackboard) | `memorizeBatch()` daily | Course progress, assignment scores, participation, submission patterns |
| Quiz/assessment results | `memorize()` per assessment | Score, time taken, specific questions missed, concept gaps revealed |
| Study session data | `memorize()` session summary | Duration, topics covered, engagement level, help requests |
| Discussion forum activity | `memorize()` per thread | Topics engaged with, quality of contributions, peer interactions |
| Student support interactions | `memorize()` per ticket | Questions asked, concepts struggling with, emotional state |
| Career/advising conversations | `memorize()` per conversation | Goals, major/program interest, timeline, concerns |
| Attendance/engagement metrics | `memorize()` weekly summary | Attendance rate, login frequency, content engagement patterns |

### Building Learner Profiles Over Time

```typescript
// After each assessment, update the learner profile
await client.memory.memorize({
    content: `Quiz completed — ${course.name}, Module ${module.number} (${new Date().toLocaleDateString()}):
    Score: ${quiz.score}/${quiz.total} (${Math.round(quiz.score/quiz.total*100)}%)
    Time spent: ${quiz.duration} minutes (avg for class: ${quiz.classDurationAvg} min)
    Concepts mastered: ${quiz.masteredConcepts.join(', ')}
    Concepts to review: ${quiz.gapConcepts.join(', ')}
    Common mistakes: ${quiz.mistakePatterns.join('; ')}
    Improvement from last quiz: ${quiz.improvement > 0 ? '+' : ''}${quiz.improvement}%`,
    email: student.email,
    enhanced: true,
    tags: ['assessment', course.slug, `module-${module.number}`],
});
```

---

## Use Cases by Function

### Student Engagement (14 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Adaptive Study Plan** | Weekly | Memory (quiz results + knowledge gaps + pace) → Generate ("focus on these topics this week" with specific resources matched to learning style) |
| 2 | **Motivational Nudges** | Engagement dip or streak milestone | Memory (streak data + goals + study patterns) → Governance (growth mindset tone) → Generate (personalized encouragement) |
| 3 | **Course Recommendation** | Course completion or new semester | Memory (completed courses + career goals + skill gaps) → Generate (recommendations explaining how each advances their career) |
| 4 | **Assignment Feedback Enhancement** | Assignment graded | Memory (learning history + common mistakes + progress trajectory) → Governance (academic integrity) → Generate (feedback building on their specific journey) |
| 5 | **Study Group Matching** | Student requests or instructor initiates | Memory (skills + schedule + learning style) → Generate (complementary group with introduction email) |
| 6 | **Dropout Prevention** | Engagement decline pattern | Memory (engagement signals + recent performance + past patterns) → Signal (alert advisor) → Generate (intervention personalized to their situation) |
| 7 | **Career Path Visualization** | Monthly or milestone | Memory (skills acquired + remaining gaps + career goal) → Generate (visual progress update: "here's where you are on your path to [goal]") |
| 8 | **Concept Reinforcement** | Knowledge gap persists | Memory (specific gap + learning style) → Generate (alternative explanation using different modality: visual if they're visual, analogy if they prefer examples) |
| 9 | **Pre-Class Preparation** | 24h before class | Memory (prerequisites + last session performance + upcoming topic) → Generate (personalized prep material targeting their weak spots) |
| 10 | **Peer Learning Prompt** | Strong in topic where others struggle | Memory (mastery areas) → Generate (invitation to explain concept to peers — teaching reinforces learning) |
| 11 | **Office Hours Nudge** | Struggling on topic for 3+ days | Memory (specific struggle + attempts made) → Generate (personalized office hours suggestion: "bring your question about [specific topic]") |
| 12 | **Portfolio Building Suggestions** | Project completion | Memory (best work + career goals) → Generate (suggestion to add to portfolio with framing advice for their target industry) |
| 13 | **Exam Preparation Plan** | 2 weeks before exam | Memory (all quiz scores + knowledge gaps + study patterns) → Generate (personalized study plan allocating time proportional to weakness) |
| 14 | **Learning Milestone Celebration** | Certification/course/module complete | Memory (journey details + effort invested) → Governance (growth mindset) → Generate (specific celebration referencing their growth) |

### Instructor Support (8 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Class Performance Dashboard** | Weekly | Memory (all student scores + engagement + patterns) → Generate (class health report: who's thriving, who needs attention, concept confusion clusters) |
| 2 | **At-Risk Student Alerts** | Performance threshold | Memory (student trajectory + engagement) → Signal (alert instructor with context and suggested intervention) |
| 3 | **Personalized Feedback Templates** | Assignment batch graded | Memory (each student's history) → Generate (feedback templates customized per student's growth trajectory) |
| 4 | **Curriculum Effectiveness Report** | Module/semester end | Memory (class performance per topic + student feedback) → Generate (effectiveness report: what worked, what didn't, suggestions) |
| 5 | **Office Hours Prep** | Student appointment | Memory (student's struggles + attempts + learning style) → Generate (prep brief: what they're stuck on, what to try) |
| 6 | **Discussion Facilitation Prompts** | Before discussion section | Memory (participation patterns + topic engagement) → Generate (prompts that engage quiet students on topics they care about) |
| 7 | **Parent Communication** (K-12) | Progress report period | Memory (student's week: assignments, participation, behavior) → Governance (FERPA + age-appropriate) → Generate (parent-friendly progress summary) |
| 8 | **TA/Grader Calibration** | New assignment cycle | Memory (grading patterns + student expectations) → Generate (calibration guide with rubric emphasis areas) |

### Institutional Operations (8 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Enrollment Yield Optimization** | Admission offer sent | Memory (admitted student interests + campus visit data + demographics) → Generate (personalized "why [school]" email) |
| 2 | **Retention Risk Intelligence** | Weekly scan | Memory (academic performance + engagement + financial aid + social signals) → Generate (early warning report with interventions) |
| 3 | **Advisor Meeting Prep** | Appointment scheduled | Memory (academic progress + career goals + course plan) → Generate (advisor prep brief with recommendations) |
| 4 | **Alumni Engagement** | Graduation anniversary or event | Memory (graduation + career trajectory + giving history) → Generate (personalized alumni outreach with relevant opportunities) |
| 5 | **Corporate Training ROI** | Program completion | Memory (completion rates + scores + manager feedback) → Generate (ROI report: skill development impact per department) |
| 6 | **Accreditation Data Assembly** | Accreditation cycle | Memory (program outcomes + student success data) → Generate (accreditation-ready data summaries per program) |
| 7 | **Scholarship Matching** | Student profile updated | Memory (academics + demographics + interests + achievements) → Generate (matched scholarship recommendations with application guidance) |
| 8 | **New Student Orientation** | Enrollment confirmed | Memory (program + interests + housing + hometown) → Generate (personalized orientation guide with relevant sessions and connections) |

---

## Agent Coordination: Student Success Workspace

```typescript
// Academic advisor records meeting notes
await client.memory.memorize({
    content: `[ADVISOR-AGENT] Met with student. Considering changing major from CS to Data Science. Concerned about math requirements — struggled in Calc II but thriving in statistics. Recommended: take Linear Algebra next semester as a "test" before committing. Also discussed internship timeline — wants to apply by March for summer opportunities.`,
    email: student.email, enhanced: true,
    tags: ['workspace', 'advising', 'major-exploration', 'internship-planning'],
});

// Career services agent reads context and contributes
const advisingContext = await client.memory.smartRecall({
    query: 'advising notes, career goals, academic progress, major exploration',
    email: student.email, limit: 10, min_score: 0.4,
    filters: { conditions: [{ property: 'tags', operator: 'CONTAINS', value: 'workspace' }] },
});

await client.memory.memorize({
    content: `[CAREER-AGENT] Based on interest in Data Science: found 3 relevant summer internship programs with March deadlines. Student's statistics strength + programming background is a strong combination. Recommended: attend Data Science career panel on Feb 15, connect with Prof. Martinez's research lab (hiring undergrads), and review DS portfolio requirements.`,
    email: student.email, enhanced: true,
    tags: ['workspace', 'career-services', 'internship-planning', 'data-science'],
});

// Learning analytics agent contributes performance context
await client.memory.memorize({
    content: `[ANALYTICS-AGENT] Performance analysis: Student excels in applied/project courses (avg A-), struggles more in theoretical courses (avg B-). Strong in Python, R, and data visualization. Weaker in proofs and abstract math. Learning pattern: performs best with hands-on labs, less engaged with lecture-only format. Study sessions peak Sunday evenings and Wednesday afternoons.`,
    email: student.email, enhanced: true,
    tags: ['workspace', 'learning-analytics', 'performance-profile'],
});
```

---

## Key Workflow: Adaptive Study Plan

```typescript
async function generateStudyPlan(studentEmail: string, courseId: string) {
    const governance = await client.ai.smartGuidelines({
        message: 'growth mindset tone, academic integrity rules, encouragement guidelines, accessibility',
        mode: 'fast',
    });

    const [studentContext, assessmentHistory, courseContext] = await Promise.all([
        client.memory.smartDigest({
            email: studentEmail, type: 'Student', token_budget: 2000,
        }),
        client.memory.smartRecall({
            query: `quiz scores, assignment results, knowledge gaps, mistake patterns for course ${courseId}`,
            email: studentEmail, limit: 20, min_score: 0.4,
        }),
        client.memory.smartRecall({
            query: `course modules, upcoming topics, learning objectives for ${courseId}`,
            type: 'Course', limit: 5, min_score: 0.6,
        }),
    ]);

    const context = [
        governance.data?.compiledContext || '',
        studentContext.data?.compiledContext || '',
        `Assessment history: ${JSON.stringify(assessmentHistory.data?.results)}`,
        `Course structure: ${JSON.stringify(courseContext.data?.results)}`,
    ].join('\n\n---\n\n');

    const studyPlan = await client.ai.prompt({
        context,
        instructions: [
            { prompt: 'Analyze this student\'s performance pattern. What concepts are mastered? What are the specific gaps? What learning style works best for them (from engagement data)?', maxSteps: 5 },
            { prompt: 'Generate a personalized weekly study plan. Allocate more time to weak areas, but start each day with a strength to build confidence. Match resource format to their learning style. Include specific practice problems/resources for each gap area. Use growth mindset language. Format as a structured daily plan for the coming week.', maxSteps: 8 },
        ],
        evaluate: true,
        evaluationCriteria: 'Growth mindset tone. Specific resources, not generic "study more." Time allocation proportional to gaps. Acknowledges strengths first.',
    });

    await client.memory.memorize({
        content: `[STUDY-PLAN] Generated for ${courseId}. Focus areas: ${JSON.stringify(assessmentHistory.data?.results?.slice(0, 3)?.map((r: any) => r.text))}. ${new Date().toISOString()}.`,
        email: studentEmail, enhanced: true,
        tags: ['generated', 'study-plan', courseId],
    });

    return studyPlan.data;
}
```

---

## Quick Wins (First Week)

1. **Import student profiles** via `memorizeBatch()` from LMS
2. **Set up growth mindset governance** — transforms all communication tone
3. **Weekly study plan emails** — immediate student engagement improvement
4. **At-risk student alerts** — instructors catch drops early
5. **Course recommendation engine** — improves enrollment and completion rates
