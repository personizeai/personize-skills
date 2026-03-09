# Personalization Proposal: SaaS Marketing Website

You have 53 solution pages, a blog, landing pages, signup capture, page-view tracking, and CRM data from HubSpot -- all serving identical static copy to every visitor. That is a large surface area with zero personalization, which means there is substantial upside available. Below is a complete implementation plan using Personize.

---

## Architecture Overview

The system has three phases that build on each other:

1. **Ingest** -- Get all your data into Personize memory (HubSpot sync, page-view tracking, signup events).
2. **Recall + Generate** -- At render time (or near-render time), pull visitor context from memory and generate personalized content.
3. **Memorize outcomes** -- Store what you showed each visitor so future personalization gets smarter.

This creates a feedback loop: every interaction makes the next one more relevant.

---

## Phase 1: Data Ingestion -- Build the Memory Layer

Before you can personalize anything, Personize needs to know your visitors. Set up three data feeds.

### 1A. HubSpot CRM Sync

Use `memorizeBatch()` to pull your HubSpot contacts and companies into Personize on a recurring schedule. Structured fields (email, company, lifecycle stage, deal stage) go in as properties. Free-text fields (notes, deal descriptions) get AI extraction.

```typescript
import { Personize } from "@personize/sdk";

const personize = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

// Sync HubSpot contacts nightly
await personize.memory.memorizeBatch({
  source: "HubSpot",
  mapping: {
    entityType: "contact",
    email: "email",
    runName: `hubspot-sync-${Date.now()}`,
    properties: {
      email:           { sourceField: "email",           collectionId: "col_contacts", collectionName: "Contacts" },
      first_name:      { sourceField: "firstname",       collectionId: "col_contacts", collectionName: "Contacts" },
      last_name:       { sourceField: "lastname",        collectionId: "col_contacts", collectionName: "Contacts" },
      company:         { sourceField: "company",         collectionId: "col_contacts", collectionName: "Contacts" },
      job_title:       { sourceField: "jobtitle",        collectionId: "col_contacts", collectionName: "Contacts" },
      lifecycle_stage: { sourceField: "lifecyclestage",  collectionId: "col_contacts", collectionName: "Contacts" },
      industry:        { sourceField: "industry",        collectionId: "col_contacts", collectionName: "Contacts" },
      // Free-text fields -- enable AI extraction
      notes:           { sourceField: "notes_last_body", collectionId: "col_notes",    collectionName: "Notes",
                         extractMemories: true },
      deal_description:{ sourceField: "deal_description",collectionId: "col_notes",    collectionName: "Notes",
                         extractMemories: true },
    },
  },
  rows: hubspotContacts, // array fetched from HubSpot API
});
```

Also sync Company records using `website_url` as the identifier so you can cross-reference contacts with their companies later.

### 1B. Page-View and Behavior Tracking

Every time an identified visitor views a page, memorize the event. This builds a behavioral profile that tells you what each visitor cares about.

```typescript
// Called from your analytics middleware or tag manager webhook
await personize.memory.memorize({
  email: visitorEmail,
  content: [
    `[PAGE VIEW] ${new Date().toISOString()}`,
    `URL: ${pageUrl}`,
    `Page title: ${pageTitle}`,
    `Solution category: ${solutionCategory}`,   // e.g., "data-security", "compliance", "analytics"
    `Time on page: ${timeOnPageSeconds}s`,
    `Referrer: ${referrer}`,
    visitorEmail ? `Visitor: ${visitorEmail}` : "Anonymous session",
  ].join("\n"),
  speaker: "website-tracker",
  enhanced: true,
  tags: ["pageview", "website", `category:${solutionCategory}`],
});
```

For high-volume sites, batch page views and send them at session end rather than on every hit to manage API usage.

### 1C. Signup and Form Events

When someone signs up, submits a demo request, or fills out any form, memorize it with context.

```typescript
await personize.memory.memorize({
  email: formData.email,
  content: [
    `[SIGNUP] ${new Date().toISOString()}`,
    `Form: ${formName}`,
    `Landing page: ${landingPageUrl}`,
    `UTM source: ${utmSource} / ${utmMedium} / ${utmCampaign}`,
    `Company size (self-reported): ${formData.companySize}`,
    `Use case interest: ${formData.useCase}`,
    `Referral source: ${formData.howDidYouHear}`,
  ].join("\n"),
  speaker: "signup-form",
  enhanced: true,
  tags: ["signup", "website", `form:${formName}`],
});
```

---

## Phase 2: Personalization Opportunities

With memory populated, here are the specific personalization opportunities across your site, ordered by impact and implementation complexity.

### Opportunity 1: Dynamic Solution Page Headlines and CTAs

**Where:** All 53 solution pages
**What changes:** The hero headline, subheadline, and primary CTA adapt based on what you know about the visitor.

For a returning visitor whose HubSpot record shows they are a VP of Engineering at a mid-market company evaluating compliance tools, the hero on your "Data Security" solution page should speak to engineering leadership concerns, not generic marketing copy.

```typescript
// Server-side or edge function at page render
const digest = await personize.memory.smartDigest({
  email: visitorEmail,
  type: "Contact",
  token_budget: 1500,
  include_properties: true,
  include_memories: true,
});

const guidelines = await personize.ai.smartGuidelines({
  message: "website copy personalization guidelines, tone, brand voice",
  tags: ["website", "brand"],
  mode: "fast",
});

const result = await personize.ai.prompt({
  prompt: [
    `You are personalizing a solution page for a SaaS product.`,
    ``,
    `Solution page: ${solutionPageName}`,
    `Default headline: "${defaultHeadline}"`,
    `Default subheadline: "${defaultSubheadline}"`,
    `Default CTA: "${defaultCTA}"`,
    ``,
    `Visitor context:`,
    `${digest.data?.compiledContext || "Unknown visitor"}`,
    ``,
    `Guidelines:`,
    `${guidelines.data?.compiledContext || "Use professional tone"}`,
    ``,
    `Rewrite the headline, subheadline, and CTA text to resonate with this specific visitor.`,
    `Keep the core value proposition but adapt the language to their industry, role, and interests.`,
    `If you don't know enough about the visitor, return the defaults unchanged.`,
    `Keep headline under 12 words. Keep CTA under 6 words.`,
  ].join("\n"),
  outputs: [
    { name: "headline" },
    { name: "subheadline" },
    { name: "cta_text" },
    { name: "personalization_confidence" },
  ],
  model: "claude-sonnet-4-5-20250929",
});

// Use the personalized copy if confidence is high enough
const headline = result.data?.outputs?.headline || defaultHeadline;
const subheadline = result.data?.outputs?.subheadline || defaultSubheadline;
const ctaText = result.data?.outputs?.cta_text || defaultCTA;
```

**Fallback strategy:** If the visitor is anonymous or you have insufficient data, serve the static default. The `personalization_confidence` output lets you set a threshold.

### Opportunity 2: Industry-Specific Social Proof

**Where:** Solution pages, landing pages, pricing page
**What changes:** Testimonials, case study callouts, and customer logos rotate to show companies in the visitor's industry.

```typescript
// Recall what industry the visitor is in
const recall = await personize.memory.recall({
  query: "industry and company information",
  email: visitorEmail,
  type: "Contact",
});

const visitorIndustry = recall.data?.memories?.find(
  m => m.propertyName === "industry"
)?.value || "general";

// Use industry to filter which testimonials and logos to show
// This can be a simple lookup rather than AI generation
const socialProof = testimonialsByIndustry[visitorIndustry] || testimonialsByIndustry["general"];
```

No AI generation needed here -- just use recalled properties to select from pre-built content variants. Fast and cheap.

### Opportunity 3: Personalized Blog Recommendations

**Where:** Blog sidebar, post footer, homepage blog section
**What changes:** Instead of showing "latest posts" or "most popular," show posts relevant to the visitor's interests based on their browsing history and CRM data.

```typescript
// What topics does this visitor care about?
const interests = await personize.memory.smartRecall({
  email: visitorEmail,
  query: "what topics, features, and use cases has this visitor shown interest in?",
  fast_mode: true,
  limit: 10,
  include_property_values: true,
});

const result = await personize.ai.prompt({
  prompt: [
    `Given this visitor's interests and behavior:`,
    `${interests.data?.results?.map(r => `- ${r.text}`).join("\n") || "No data"}`,
    ``,
    `And these available blog posts:`,
    `${blogPostCatalog.map(p => `- "${p.title}" (${p.category}, ${p.tags.join(", ")})`).join("\n")}`,
    ``,
    `Select the 3 most relevant blog posts for this visitor and explain why each is relevant.`,
  ].join("\n"),
  outputs: [
    { name: "recommended_post_ids" },
    { name: "relevance_reasons" },
  ],
});
```

### Opportunity 4: Return-Visitor Welcome and Continuity

**Where:** Homepage, solution pages (above the fold)
**What changes:** Returning visitors see a contextual banner that acknowledges their previous engagement and points them to the next logical step.

```typescript
// Assemble full visitor context
const digest = await personize.memory.smartDigest({
  email: visitorEmail,
  type: "Contact",
  token_budget: 2000,
  include_properties: true,
  include_memories: true,
});

const result = await personize.ai.prompt({
  prompt: [
    `A returning visitor just landed on our website.`,
    ``,
    `Visitor context:`,
    `${digest.data?.compiledContext}`,
    ``,
    `Based on their history, write a short welcome-back banner message (1 sentence)`,
    `and suggest the single most relevant next action for them.`,
    ``,
    `Examples:`,
    `- If they viewed pricing last time: "Welcome back! Ready to see how [Product] fits your team's budget?" -> CTA: View Pricing`,
    `- If they read compliance blog posts: "Welcome back! Here's how [Product] handles [compliance area] for teams like yours." -> CTA: Read the Security Whitepaper`,
    `- If they're an existing lead in deal stage: "Welcome back, [FirstName]! Your trial dashboard is ready." -> CTA: Go to Dashboard`,
    ``,
    `If you don't know enough, output nothing.`,
  ].join("\n"),
  outputs: [
    { name: "banner_message" },
    { name: "cta_text" },
    { name: "cta_url" },
    { name: "show_banner" },
  ],
});
```

### Opportunity 5: Personalized Landing Pages for Campaigns

**Where:** Campaign-specific landing pages (paid ads, email campaigns)
**What changes:** When a known contact clicks through from an email campaign or ad, the landing page adapts to their profile rather than showing the same generic campaign page.

```typescript
// UTM parameters identify the campaign; email identifies the visitor
const [digest, companyDigest] = await Promise.all([
  personize.memory.smartDigest({
    email: visitorEmail,
    type: "Contact",
    token_budget: 1500,
  }),
  // Also pull their company context for B2B relevance
  personize.memory.smartDigest({
    websiteUrl: visitorCompanyDomain,
    type: "Company",
    token_budget: 1000,
  }),
]);

const result = await personize.ai.prompt({
  prompt: [
    `Personalize this campaign landing page for a known visitor.`,
    ``,
    `Campaign: ${campaignName}`,
    `Campaign theme: ${campaignTheme}`,
    `Default headline: "${defaultLandingHeadline}"`,
    `Default body copy: "${defaultLandingBody}"`,
    ``,
    `Contact context:`,
    `${digest.data?.compiledContext || "Unknown"}`,
    ``,
    `Company context:`,
    `${companyDigest.data?.compiledContext || "Unknown"}`,
    ``,
    `Adapt the headline and first paragraph to reference their specific situation.`,
    `Keep the core campaign message but make it feel like it was written for them.`,
  ].join("\n"),
  outputs: [
    { name: "headline" },
    { name: "body_paragraph" },
    { name: "cta_text" },
  ],
});
```

### Opportunity 6: Smart Demo Request / Signup Flow

**Where:** Demo request form, free trial signup
**What changes:** Pre-fill known fields, skip redundant questions, and tailor the post-signup experience based on what you already know.

```typescript
// Before showing the form, check what you already know
const recall = await personize.memory.recall({
  query: "contact information, company, role, interests",
  email: visitorEmail,
  type: "Contact",
});

// Pre-fill form fields from memory
const prefill = {
  firstName: recall.data?.memories?.find(m => m.propertyName === "first_name")?.value,
  company: recall.data?.memories?.find(m => m.propertyName === "company")?.value,
  jobTitle: recall.data?.memories?.find(m => m.propertyName === "job_title")?.value,
};

// After signup, memorize the conversion
await personize.memory.memorize({
  email: visitorEmail,
  content: [
    `[CONVERSION] ${new Date().toISOString()}`,
    `Form: Demo Request`,
    `Pages visited before conversion: ${pagesVisitedCount}`,
    `Key solution pages viewed: ${solutionPagesViewed.join(", ")}`,
    `Time from first visit to conversion: ${daysSinceFirstVisit} days`,
  ].join("\n"),
  speaker: "website-conversion",
  enhanced: true,
  tags: ["conversion", "demo-request", "website"],
});
```

### Opportunity 7: Solution Page Cross-Linking Based on Browsing Patterns

**Where:** Bottom of each solution page ("You might also be interested in...")
**What changes:** Instead of static cross-links, recommend related solution pages based on what similar visitors have explored and what this specific visitor has not yet seen.

```typescript
const interests = await personize.memory.smartRecall({
  email: visitorEmail,
  query: "which solution pages and product features has this visitor explored?",
  fast_mode: true,
  limit: 20,
});

const result = await personize.ai.prompt({
  prompt: [
    `Current page: ${currentSolutionPage}`,
    `All 53 solution pages: ${solutionPageList.join(", ")}`,
    ``,
    `This visitor has already viewed:`,
    `${interests.data?.results?.map(r => r.text).join("\n") || "No browsing history"}`,
    ``,
    `Recommend 3 solution pages they haven't seen yet that are most relevant to their interests.`,
    `Explain the connection in one sentence each (this will appear as the link description).`,
  ].join("\n"),
  outputs: [
    { name: "recommendations" },
  ],
});
```

### Opportunity 8: Post-Signup Onboarding Email Sequence

**Where:** Email (triggered after signup)
**What changes:** Instead of the same drip sequence for everyone, each email pulls the latest context from memory and generates content relevant to that specific user's interests, role, and stage.

```typescript
// Triggered by your email platform (e.g., via webhook to a Trigger.dev task)
const digest = await personize.memory.smartDigest({
  email: subscriberEmail,
  type: "Contact",
  token_budget: 2000,
  include_properties: true,
  include_memories: true,
});

const guidelines = await personize.ai.smartGuidelines({
  message: "onboarding email sequence guidelines, tone, content rules",
  tags: ["onboarding", "email"],
  mode: "fast",
});

const result = await personize.ai.prompt({
  instructions: [
    {
      prompt: [
        `Recall what we know about ${subscriberEmail} and what content they've already received.`,
      ].join("\n"),
      maxSteps: 3,
    },
    {
      prompt: [
        `Write onboarding email #${sequenceStep} for this subscriber.`,
        ``,
        `Subscriber context:`,
        `${digest.data?.compiledContext}`,
        ``,
        `Guidelines:`,
        `${guidelines.data?.compiledContext}`,
        ``,
        `This is step ${sequenceStep} of the onboarding sequence.`,
        `Tailor the content to their industry (${subscriberIndustry}), role (${subscriberRole}),`,
        `and the solution pages they viewed before signing up.`,
        `Do NOT repeat information from previous emails.`,
      ].join("\n"),
      maxSteps: 3,
    },
  ],
  outputs: [
    { name: "email_subject" },
    { name: "email_body" },
  ],
  memorize: {
    email: subscriberEmail,
    captureToolResults: true,
  },
});
```

The `memorize` option with `captureToolResults: true` means this email is automatically stored in memory. The next email in the sequence will see it via recall and avoid repetition.

---

## Phase 3: Memorize Outcomes -- Close the Loop

Every personalization action should be memorized so future interactions improve.

```typescript
// After rendering a personalized page
await personize.memory.memorize({
  email: visitorEmail,
  content: [
    `[PERSONALIZED PAGE VIEW] ${new Date().toISOString()}`,
    `Page: ${pageName}`,
    `Personalized headline shown: "${personalizedHeadline}"`,
    `Personalized CTA shown: "${personalizedCTA}"`,
    `CTA clicked: ${ctaClicked ? "yes" : "no"}`,
    `Time on page: ${timeOnPageSeconds}s`,
    `Scroll depth: ${scrollDepthPercent}%`,
  ].join("\n"),
  speaker: "website-personalization",
  enhanced: true,
  tags: ["personalization", "website", `page:${pageSlug}`],
});
```

This means the next time this visitor returns, the system knows what messaging they already saw and whether it worked. If a headline did not drive a click, the AI can try a different angle.

---

## Implementation Order

Prioritize by impact-to-effort ratio:

| Priority | Opportunity | Effort | Impact | Why This Order |
|----------|------------|--------|--------|----------------|
| 1 | **HubSpot sync** (1A) | Low | Foundation | Everything else depends on having data in memory |
| 2 | **Page-view tracking** (1B) | Low | Foundation | Behavioral signals feed every personalization |
| 3 | **Return-visitor banner** (Opp 4) | Medium | High | Immediate visible impact, works with partial data |
| 4 | **Industry social proof** (Opp 2) | Low | High | Simple property lookup, no AI generation needed |
| 5 | **Solution page headlines** (Opp 1) | Medium | High | Applies to 53 pages, scales your best messaging |
| 6 | **Blog recommendations** (Opp 3) | Medium | Medium | Increases engagement and time on site |
| 7 | **Smart signup flow** (Opp 6) | Medium | High | Directly improves conversion rate |
| 8 | **Campaign landing pages** (Opp 5) | Medium | High | Improves paid campaign ROI |
| 9 | **Solution cross-links** (Opp 7) | Low | Medium | Increases pages per session |
| 10 | **Onboarding emails** (Opp 8) | High | High | Requires email infrastructure integration |

---

## Handling Anonymous Visitors

Most of your traffic will be anonymous. The strategy:

1. **Before identification:** Track page views by session/device ID using `deviceId` as the identifier. Store browsing patterns without PII.
2. **At identification (signup/form fill):** Merge the anonymous session into the identified contact record by memorizing the session history under the email.
3. **After identification:** All future visits are fully personalized.

```typescript
// Before identification -- track anonymous behavior
await personize.memory.memorize({
  content: `[ANONYMOUS SESSION] Viewed: ${pagesViewed.join(", ")}. Time on site: ${totalSeconds}s.`,
  speaker: "website-tracker",
  tags: ["anonymous", "session"],
  // Use a device/session identifier
});

// At identification -- merge session history into contact record
await personize.memory.memorize({
  email: newlyIdentifiedEmail,
  content: [
    `[SESSION MERGE] ${new Date().toISOString()}`,
    `Previous anonymous session pages: ${anonymousSessionPages.join(", ")}`,
    `Session duration: ${sessionDuration}s`,
    `Conversion page: ${conversionPage}`,
  ].join("\n"),
  speaker: "identity-resolver",
  enhanced: true,
  tags: ["identity-merge", "website"],
});
```

For anonymous visitors where you cannot personalize with Personize data, fall back to your static defaults. This means the personalization is purely additive -- it never degrades the experience for unknown visitors.

---

## Performance Considerations

- **Use `fast_mode: true`** for any recall happening at page render time. This returns results in approximately 500ms instead of 10-20 seconds.
- **Use `smartGuidelines` with `mode: "fast"`** for real-time rendering (approximately 200ms).
- **Cache `smartDigest` results** for the duration of a session. A visitor's profile does not change mid-session.
- **Pre-compute personalized content** where possible. For the 53 solution pages, you could run a nightly batch job that pre-generates personalized variants for your top contacts, then serve from cache at render time.
- **Set `token_budget` explicitly** on every `smartDigest()` call. For page rendering, 1500 tokens is usually sufficient. Do not use the default (1000) without considering whether it is enough.

---

## Governance Setup

Before launching personalization, create guidelines in Personize that govern the AI's output:

- **Brand voice guidelines** -- Tone, vocabulary, what to say and what to avoid
- **Personalization boundaries** -- What data is acceptable to reference on-page (do not surface sensitive CRM notes in website copy)
- **Compliance rules** -- Industry-specific requirements (GDPR, CCPA implications of showing personalized content)
- **Fallback rules** -- When to show defaults instead of personalized content

These are retrieved automatically via `smartGuidelines()` in every generation call, ensuring consistent brand voice across all 53 solution pages, blog recommendations, and email sequences.

---

## Summary

You have three core data feeds (HubSpot, page views, form events) that populate Personize memory, eight personalization opportunities that span your entire site, and a feedback loop that memorizes every personalization outcome. The static-to-personalized transformation happens at three levels:

- **Property-based** (fast, no AI): Industry-matched social proof, form pre-fill, content filtering
- **Context-injected** (medium, one AI call): Headlines, CTAs, banners adapted to visitor profile
- **Multi-step** (richer, multiple AI calls): Campaign pages, onboarding emails, cross-entity research

Start with the data foundation (HubSpot sync + page tracking), ship the return-visitor banner as your first visible win, then roll out solution page personalization across all 53 pages. Each layer compounds -- the more you memorize, the better every subsequent personalization becomes.
