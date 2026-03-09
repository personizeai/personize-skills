# Personize for E-Commerce: Beyond "Recommended For You"

## A Complete Personalization Architecture for 100K Purchases/Month on Shopify

---

## Executive Summary

Your current stack (Shopify purchase data, browsing analytics, Klaviyo, loyalty program) gives you the raw ingredients. What you lack is a **unified customer memory** that connects all of those signals into a single, evolving profile that AI can reason about in real time.

Personize provides that layer. It ingests data from every source, extracts behavioral and preference insights using AI, and makes them available for personalized generation across every touchpoint. Below is a phased implementation plan covering data ingestion, seven high-impact personalization use cases, and the code patterns to build each one.

---

## Phase 1: Build the Unified Customer Memory

Before you personalize anything, you need a single source of truth for every customer. This is the foundation everything else depends on.

### 1A. Batch-Sync Shopify Purchase History

Sync your existing customer and order data into Personize memory. Structured fields (email, name, order counts) go in as properties. Rich fields (order line items, product categories, purchase patterns) get AI extraction enabled so they become semantically searchable.

```typescript
import { Personize } from "@personize/sdk";

const personize = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

// Sync customer profiles + order history from Shopify
await personize.memory.memorizeBatch({
  source: "Shopify",
  mapping: {
    entityType: "contact",
    email: "email",
    runName: `shopify-customer-sync-${Date.now()}`,
    properties: {
      // Structured fields -- no AI extraction needed
      email:            { sourceField: "email",            collectionId: "col_customers", collectionName: "Customers", extractMemories: false },
      first_name:       { sourceField: "first_name",       collectionId: "col_customers", collectionName: "Customers", extractMemories: false },
      total_orders:     { sourceField: "orders_count",     collectionId: "col_customers", collectionName: "Customers", extractMemories: false },
      total_spent:      { sourceField: "total_spent",      collectionId: "col_customers", collectionName: "Customers", extractMemories: false },
      loyalty_tier:     { sourceField: "loyalty_tier",     collectionId: "col_customers", collectionName: "Customers", extractMemories: false },
      last_order_date:  { sourceField: "last_order_date",  collectionId: "col_customers", collectionName: "Customers", extractMemories: false },

      // Rich fields -- AI extraction creates semantic memories
      order_history:    { sourceField: "order_summary",    collectionId: "col_behavior", collectionName: "Behavior",  extractMemories: true },
      product_categories: { sourceField: "categories_purchased", collectionId: "col_behavior", collectionName: "Behavior", extractMemories: true },
    },
  },
  rows: shopifyCustomers, // Array of customer objects from Shopify API
});
```

### 1B. Ingest Browsing Behavior from Analytics

Pipe browsing sessions, product views, category affinity, and cart abandonment events into memory. These create the real-time behavioral layer.

```typescript
// Webhook handler for browsing events (from your analytics platform)
async function handleBrowsingEvent(event: BrowsingEvent) {
  await personize.memory.memorize({
    email: event.customerEmail,
    content: `[BROWSING SESSION - ${event.timestamp}] Viewed products: ${event.productsViewed.join(", ")}. ` +
      `Categories browsed: ${event.categories.join(", ")}. ` +
      `Time on site: ${event.sessionDuration}s. ` +
      (event.cartAbandoned ? `Abandoned cart containing: ${event.cartItems.join(", ")} (total: $${event.cartValue}).` : ""),
    speaker: "analytics",
    enhanced: true,
    tags: ["browsing", "behavior", "source:analytics"],
  });
}
```

### 1C. Sync Klaviyo Engagement Data

Import email engagement history so Personize knows which campaigns each customer opened, clicked, or ignored.

```typescript
await personize.memory.memorizeBatch({
  source: "Klaviyo",
  mapping: {
    entityType: "contact",
    email: "email",
    runName: `klaviyo-engagement-sync-${Date.now()}`,
    properties: {
      email_engagement: {
        sourceField: "engagement_summary",
        collectionId: "col_engagement",
        collectionName: "Engagement",
        extractMemories: true, // AI extracts patterns like "responds to discount emails" or "ignores newsletters"
      },
      last_email_opened:  { sourceField: "last_open_date",  collectionId: "col_engagement", collectionName: "Engagement", extractMemories: false },
      email_click_rate:   { sourceField: "click_rate",      collectionId: "col_engagement", collectionName: "Engagement", extractMemories: false },
    },
  },
  rows: klaviyoProfiles,
});
```

### 1D. Sync Loyalty Program Data

```typescript
await personize.memory.memorizeBatch({
  source: "LoyaltyProgram",
  mapping: {
    entityType: "contact",
    email: "email",
    runName: `loyalty-sync-${Date.now()}`,
    properties: {
      loyalty_tier:    { sourceField: "tier",           collectionId: "col_loyalty", collectionName: "Loyalty", extractMemories: false },
      points_balance:  { sourceField: "points",         collectionId: "col_loyalty", collectionName: "Loyalty", extractMemories: false },
      points_to_next:  { sourceField: "points_to_next", collectionId: "col_loyalty", collectionName: "Loyalty", extractMemories: false },
      reward_history:  { sourceField: "reward_summary", collectionId: "col_loyalty", collectionName: "Loyalty", extractMemories: true },
    },
  },
  rows: loyaltyMembers,
});
```

---

## Phase 2: Seven Personalization Use Cases

With unified memory in place, here are the high-impact personalization opportunities, ordered by implementation complexity.

---

### Use Case 1: AI-Powered Post-Purchase Follow-Up Emails

**What it replaces:** Generic "Thanks for your purchase" Klaviyo flows.

**What it does:** After every purchase, generate a follow-up email that references the customer's full history -- not just the item they bought. Cross-sell based on what similar buyers purchased, acknowledge loyalty status, and adjust tone based on engagement patterns.

```typescript
import { Personize } from "@personize/sdk";

const personize = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

async function generatePostPurchaseEmail(customerEmail: string, orderDetails: string) {
  // 1. Get everything we know about this customer
  const digest = await personize.memory.smartDigest({
    email: customerEmail,
    include_properties: true,
    include_memories: true,
    token_budget: 3000,
  });

  // 2. Get org guidelines for post-purchase communication
  const guidelines = await personize.ai.smartGuidelines({
    message: "post-purchase follow-up email tone and cross-sell guidelines",
    tags: ["email", "post-purchase"],
    mode: "fast",
  });

  // 3. Generate the personalized email
  const result = await personize.ai.prompt({
    instructions: [
      {
        prompt: `You are writing a post-purchase follow-up email.

## Order Just Placed
${orderDetails}

## Customer Context
${digest.data.compiledContext}

## Guidelines
${guidelines.data.compiledContext}

Write a personalized follow-up email that:
- Thanks them by name and acknowledges their loyalty tier if applicable
- References their purchase history and buying patterns (not just this order)
- Suggests 2-3 complementary products based on their full purchase and browsing history
- If they are close to a loyalty tier upgrade, mention it with the exact points needed
- Matches the tone to their engagement style (e.g., casual for frequent buyers, warmer for new customers)
- Keeps it under 150 words`,
        maxSteps: 3,
      },
    ],
    outputs: [
      { name: "email_subject" },
      { name: "email_body" },
      { name: "cross_sell_products" },
    ],
    memorize: {
      email: customerEmail,
      captureToolResults: true,
    },
  });

  return {
    subject: result.data.outputs.email_subject,
    body: result.data.outputs.email_body,
    crossSellProducts: result.data.outputs.cross_sell_products,
  };
}
```

**Volume at your scale:** 100K purchases/month = ~3,300/day. Use Trigger.dev or a queue to process these asynchronously. At ~$0.01-0.02 per generation, this costs roughly $1,000-2,000/month.

---

### Use Case 2: Intelligent Cart Abandonment Recovery

**What it replaces:** Time-delayed "You left something in your cart" emails that all look the same.

**What it does:** When a cart is abandoned, Personize recalls the customer's full context -- previous purchases, browsing patterns, email engagement, loyalty status -- and generates a recovery message tailored to why *this specific customer* might have abandoned. A first-time visitor gets a different message than a loyal customer who always buys on payday.

```typescript
async function handleCartAbandonment(customerEmail: string, cartItems: string[], cartValue: number) {
  // Recall behavioral context
  const behaviorRecall = await personize.memory.smartRecall({
    email: customerEmail,
    query: "purchase patterns, price sensitivity, previous cart abandonment, discount responsiveness",
    fast_mode: true,
    include_property_values: true,
    limit: 10,
  });

  const result = await personize.ai.prompt({
    prompt: `A customer abandoned their cart. Generate a recovery strategy.

## Cart Contents
Items: ${cartItems.join(", ")}
Value: $${cartValue}

## Customer Behavioral Context
${behaviorRecall.data?.results?.map((r: any) => r.text || r.content).join("\n") || "New customer -- no prior history."}

Based on this customer's history, determine:
1. The most likely reason for abandonment (price sensitivity, comparison shopping, distraction, etc.)
2. Whether to offer a discount and if so how much (only for price-sensitive customers)
3. The right timing for the recovery email (immediate for impulse buyers, next day for comparison shoppers)
4. The tone and angle of the message

Generate the recovery email accordingly.`,
    outputs: [
      { name: "abandonment_reason" },
      { name: "discount_offer" },
      { name: "send_delay_hours" },
      { name: "email_subject" },
      { name: "email_body" },
    ],
    memorize: {
      email: customerEmail,
      captureToolResults: true,
    },
  });

  return result.data.outputs;
}
```

**Why this matters at 100K/month:** Industry average cart abandonment is ~70%. If even 5% of abandoned carts convert through better personalization, that is meaningful revenue. Generic recovery emails convert at 3-5%; personalized ones can reach 10-15%.

---

### Use Case 3: Dynamic Product Recommendations via Semantic Search

**What it replaces:** Collaborative filtering ("customers who bought X also bought Y") which only works on purchase co-occurrence.

**What it does:** Uses semantic search across the customer's entire history -- purchases, browsing, support interactions, email engagement -- to find products that match their actual interests, not just statistical purchase correlations.

```typescript
async function getSemanticRecommendations(customerEmail: string, context: string) {
  // 1. Get the customer's full profile
  const digest = await personize.memory.smartDigest({
    email: customerEmail,
    include_properties: true,
    include_memories: true,
    token_budget: 2500,
  });

  // 2. Semantic search for purchase and interest patterns
  const interests = await personize.memory.smartRecall({
    email: customerEmail,
    query: "product preferences, style preferences, brands liked, categories interested in, wish list items, browsing patterns",
    generate_answer: true,
    limit: 15,
    min_score: 0.3,
  });

  // 3. Generate recommendations with reasoning
  const result = await personize.ai.prompt({
    prompt: `You are a personal shopping assistant with deep knowledge of this customer.

## Customer Profile
${digest.data.compiledContext}

## Interest Analysis
${interests.data?.answer?.text || "No deep interest data available."}

## Current Context
${context} (e.g., "browsing summer dresses", "homepage visit", "post-purchase page")

Generate 5 product recommendations. For each, explain WHY this product matches this specific customer's profile. Consider:
- Their purchase history and brand preferences
- Browsing patterns and categories they keep returning to
- Price range they typically shop in
- Seasonal and lifecycle factors (e.g., they bought running shoes 6 months ago -- time for new ones?)
- Items they viewed but never purchased
- Complementary products to recent purchases`,
    outputs: [
      { name: "recommendations" },
      { name: "recommendation_reasoning" },
    ],
  });

  return result.data.outputs;
}
```

**Integration point:** Call this from your Shopify storefront (via API route or edge function) to power product carousels, "picked for you" sections, and search result reranking.

---

### Use Case 4: Loyalty-Aware Lifecycle Campaigns

**What it replaces:** Static Klaviyo segments that trigger the same flow for everyone at a given loyalty tier.

**What it does:** Combines loyalty data, purchase recency, engagement patterns, and browsing behavior to generate lifecycle campaigns that feel individually crafted. A Gold member who has not purchased in 60 days gets a different win-back message than a Gold member who is 50 points from Platinum.

```typescript
// Scheduled pipeline: runs daily, processes customers approaching lifecycle milestones
async function runLifecycleCampaign() {
  // Find customers at key lifecycle moments
  const atRiskCustomers = await personize.memory.search({
    type: "Contact",
    returnRecords: true,
    includeMemories: true,
    pageSize: 50,
    groups: [{
      conditions: [
        { field: "last_order_date", operator: "LESS_THAN", value: thirtyDaysAgo() },
        { field: "total_orders", operator: "GREATER_THAN", value: "2" },
      ],
    }],
  });

  for (const customer of atRiskCustomers.data.records) {
    const digest = await personize.memory.smartDigest({
      email: customer.email,
      include_properties: true,
      include_memories: true,
      token_budget: 2000,
    });

    const result = await personize.ai.prompt({
      prompt: `Generate a personalized win-back or re-engagement message for this customer.

## Customer Context
${digest.data.compiledContext}

Determine the right approach:
- If they are close to a loyalty tier upgrade, lead with that
- If they have a pattern of seasonal purchasing, acknowledge it
- If they recently browsed but did not buy, reference those products
- If they have been a long-time customer going quiet, use a relationship-first tone
- Include a personalized incentive only if their history suggests they respond to discounts

Do NOT send a generic "we miss you" message. Make it specific.`,
      outputs: [
        { name: "campaign_type" },
        { name: "email_subject" },
        { name: "email_body" },
        { name: "incentive" },
      ],
      memorize: {
        email: customer.email,
        captureToolResults: true,
      },
    });

    // Send via Klaviyo API or your email provider
    await sendEmail(customer.email, result.data.outputs);
  }
}
```

---

### Use Case 5: Personalized On-Site Search and Navigation

**What it does:** When a logged-in customer searches your site, use their memory profile to rerank and contextualize results. A customer who always buys organic products sees organic options first. A customer who browses plus-size sees relevant sizing. A customer who only buys during sales sees current deals prominently.

```typescript
// API endpoint called from your Shopify storefront search
async function personalizedSearch(customerEmail: string, searchQuery: string) {
  // Fast recall -- under 700ms for real-time use
  const customerContext = await personize.memory.smartRecall({
    email: customerEmail,
    query: `preferences, style, size, brand affinity, price range for: ${searchQuery}`,
    fast_mode: true,
    include_property_values: true,
    limit: 5,
  });

  const result = await personize.ai.prompt({
    prompt: `A customer searched for "${searchQuery}" on our e-commerce store.

## Customer Context
${customerContext.data?.results?.map((r: any) => r.text || r.content).join("\n") || "No prior context."}
${customerContext.data?.property_values ? JSON.stringify(customerContext.data.property_values) : ""}

Generate search personalization instructions:
1. How to rerank results for this customer (which attributes to boost)
2. Suggested filters to pre-apply or highlight
3. A brief personalized message to show above results (e.g., "Based on your love of Nike running gear, here are our top picks")`,
    outputs: [
      { name: "rerank_instructions" },
      { name: "suggested_filters" },
      { name: "personalized_message" },
    ],
  });

  return result.data.outputs;
}
```

**Performance note:** Use `fast_mode: true` on `smartRecall` for all real-time, customer-facing use cases. It skips reflection and returns in roughly 500-700ms, which is acceptable for search augmentation.

---

### Use Case 6: Customer Support Context Injection

**What it replaces:** Support agents starting every interaction from scratch, or basic CRM lookups that show only order history.

**What it does:** When a customer contacts support, instantly surface their complete context: purchase history, browsing behavior, loyalty status, previous support interactions, product preferences, and engagement patterns. This can be injected into a live chat AI agent or displayed as a sidebar for human agents.

```typescript
async function getSupportContext(customerEmail: string, currentIssue: string) {
  // Pull the full customer digest
  const digest = await personize.memory.smartDigest({
    email: customerEmail,
    include_properties: true,
    include_memories: true,
    token_budget: 3000,
    max_memories: 30,
  });

  // Search for relevant past interactions
  const relevantHistory = await personize.memory.smartRecall({
    email: customerEmail,
    query: `support interactions, complaints, issues related to: ${currentIssue}`,
    limit: 10,
    min_score: 0.3,
    generate_answer: true,
  });

  // Get support guidelines
  const guidelines = await personize.ai.smartGuidelines({
    message: `customer support for ${currentIssue}, tone guidelines, escalation policy`,
    tags: ["support"],
    mode: "fast",
  });

  // Generate a support brief
  const result = await personize.ai.prompt({
    prompt: `Prepare a support agent brief for this customer interaction.

## Current Issue
${currentIssue}

## Full Customer Context
${digest.data.compiledContext}

## Relevant History
${relevantHistory.data?.answer?.text || "No relevant prior issues found."}

## Support Guidelines
${guidelines.data.compiledContext}

Generate:
1. A 3-line customer summary (who they are, how valuable, sentiment trajectory)
2. Relevant context for this specific issue (related past purchases, prior complaints)
3. Recommended resolution approach
4. Proactive offers to make (loyalty points, discount, free shipping on next order) based on their value tier`,
    outputs: [
      { name: "customer_summary" },
      { name: "issue_context" },
      { name: "recommended_resolution" },
      { name: "proactive_offers" },
    ],
    memorize: {
      email: customerEmail,
      captureToolResults: true,
    },
  });

  return result.data.outputs;
}
```

After the support interaction ends, memorize the outcome:

```typescript
await personize.memory.memorize({
  email: customerEmail,
  content: `[SUPPORT INTERACTION - ${new Date().toISOString()}] Issue: ${currentIssue}. Resolution: ${resolution}. Customer sentiment: ${sentiment}. Offered: ${offersGiven}.`,
  speaker: "support",
  enhanced: true,
  tags: ["support", "interaction", "source:zendesk"],
});
```

---

### Use Case 7: Predictive Replenishment and Reorder Nudges

**What it does:** For consumable or regularly-purchased products, Personize can track purchase intervals per customer and generate perfectly-timed reorder reminders that feel helpful rather than spammy.

```typescript
async function checkReplenishmentOpportunities() {
  // Search for customers with repeat purchase patterns
  const repeatBuyers = await personize.memory.search({
    type: "Contact",
    returnRecords: true,
    pageSize: 50,
    groups: [{
      conditions: [
        { field: "total_orders", operator: "GREATER_THAN", value: "3" },
        { field: "email", operator: "IS_SET" },
      ],
    }],
  });

  for (const customer of repeatBuyers.data.records) {
    // Check for replenishment-eligible purchase patterns
    const patterns = await personize.memory.smartRecall({
      email: customer.email,
      query: "repeat purchases, regular buying intervals, consumable products, subscription-like behavior, reorder patterns",
      generate_answer: true,
      limit: 10,
    });

    if (!patterns.data?.answer?.text) continue;

    const result = await personize.ai.prompt({
      prompt: `Analyze this customer's purchase patterns for replenishment opportunities.

## Purchase Pattern Analysis
${patterns.data.answer.text}

Determine:
1. Are there any products this customer buys on a regular cycle?
2. Based on their last purchase date and typical interval, are they due for a reorder?
3. If yes, generate a brief, helpful nudge message (not salesy -- frame it as a reminder)
4. Should we include a small loyalty incentive to encourage the reorder?

If no replenishment opportunity exists right now, output skip=true.`,
      outputs: [
        { name: "skip" },
        { name: "product_to_reorder" },
        { name: "days_overdue" },
        { name: "nudge_subject" },
        { name: "nudge_body" },
      ],
      memorize: {
        email: customer.email,
        captureToolResults: true,
      },
    });

    if (result.data.outputs.skip !== "true") {
      await sendEmail(customer.email, result.data.outputs);
    }
  }
}
```

---

## Phase 3: Governance and Quality Control

### Set Up Organizational Guidelines

Use Personize guidelines to enforce brand voice, discount policies, and personalization rules across all generated content.

```typescript
// Create guidelines that all AI generation will follow
await personize.guidelines.create({
  name: "Brand Voice",
  content: `Our brand voice is warm, confident, and knowledgeable. Never use:
- ALL CAPS for emphasis
- Exclamation marks more than once per email
- Generic phrases like "Dear Valued Customer"
- Pushy sales language ("Buy now!", "Limited time!")
Always use the customer's first name. Keep emails under 150 words.`,
  tags: ["email", "brand", "tone"],
});

await personize.guidelines.create({
  name: "Discount Policy",
  content: `Discount rules:
- New customers (0-1 orders): May offer 10% on first purchase
- Regular customers (2-10 orders): No unsolicited discounts unless win-back (30+ days inactive)
- VIP customers (10+ orders or Gold/Platinum tier): May offer exclusive early access, never generic % off
- Cart abandonment: Offer free shipping first, 5% only if they abandon a second time
- Never stack discounts. Never offer more than 15% on any single order.`,
  tags: ["email", "discount", "policy"],
});

await personize.guidelines.create({
  name: "Personalization Ethics",
  content: `Rules for personalization:
- Never reference browsing behavior explicitly ("we noticed you were looking at...")
- Frame recommendations as curated picks, not surveillance
- Do not reference loyalty points balance in win-back emails (feels transactional)
- If a customer has had a negative support interaction in the last 14 days, do not send promotional emails
- Respect email frequency: maximum 2 personalized emails per week per customer`,
  tags: ["email", "ethics", "personalization"],
});
```

These guidelines are automatically retrieved by `smartGuidelines()` in every generation call, ensuring consistent quality at scale.

---

## Architecture Overview

```
                    DATA SOURCES                          PERSONIZE MEMORY                        OUTPUTS
            ┌──────────────────────┐               ┌──────────────────────┐              ┌────────────────────┐
            │  Shopify Orders      │──────┐         │                      │              │ Klaviyo Emails     │
            │  Shopify Customers   │      │         │  Unified Customer    │              │ On-Site Search     │
            ├──────────────────────┤      ├────────>│  Memory (per email)  │──────────────│ Product Carousels  │
            │  Browsing Analytics  │      │         │                      │   ai.prompt  │ Support Context    │
            │  (GA4 / Segment)     │──────┤  batch  │  Properties:         │   + recall   │ Push Notifications │
            ├──────────────────────┤      │  sync   │  - purchase history  │   + digest   │ SMS / WhatsApp     │
            │  Klaviyo Engagement  │──────┤  +      │  - loyalty tier      │   + guide-   │ Chatbot Context    │
            ├──────────────────────┤      │  event  │  - engagement scores │     lines    └────────────────────┘
            │  Loyalty Program     │──────┤  hooks  │                      │
            ├──────────────────────┤      │         │  Memories (semantic):│
            │  Support Tickets     │──────┘         │  - browsing patterns │
            │  (Zendesk / Gorgias) │                │  - style preferences │
            └──────────────────────┘                │  - support history   │
                                                    │  - email engagement  │
                                                    │  - AI-generated logs │
                                                    └──────────────────────┘
```

---

## Data Sync Cadence

| Source | Sync Method | Frequency | Notes |
|--------|-------------|-----------|-------|
| Shopify customers + orders | `memorizeBatch()` | Every 6 hours | Incremental -- sync only records modified since last run |
| Browsing events | `memorize()` via webhook | Real-time | Aggregate sessions, not individual page views |
| Klaviyo engagement | `memorizeBatch()` | Daily | Engagement summaries, not individual opens |
| Loyalty program | `memorizeBatch()` | Every 6 hours | Points balance + tier status |
| Support interactions | `memorize()` via webhook | Real-time | Post-resolution, not during the ticket |
| Generated outputs | Auto via `memorize:` param | Real-time | Personize memorizes what it generates (feedback loop) |

---

## Cost Estimate at Your Scale

| Use Case | Monthly Volume | Personize Cost | Notes |
|----------|---------------|----------------|-------|
| Data sync (batch) | ~500K properties | ~$200 | Structured sync, minimal AI extraction |
| Browsing event ingestion | ~300K events | ~$150 | Aggregated sessions with AI extraction |
| Post-purchase emails | 100K | ~$1,500 | AI generation per order |
| Cart abandonment | ~70K abandoned | ~$700 | Not all get recovery emails |
| Product recommendations | ~200K requests | ~$400 | Fast mode for real-time |
| Lifecycle campaigns | ~10K/month | ~$150 | Daily batch, targeted segments |
| Support context | ~15K tickets | ~$200 | Digest + recall per ticket |
| Replenishment nudges | ~5K/month | ~$75 | Weekly batch scan |
| **Total estimated** | | **~$3,400/month** | |

These are rough estimates. Actual costs depend on your Personize plan tier, token usage per generation, and the models selected. Using `fast_mode` for real-time lookups and batching where possible significantly reduces costs.

---

## Implementation Roadmap

| Week | Milestone |
|------|-----------|
| 1-2 | Phase 1: Set up collections, batch sync Shopify + Loyalty data, create guidelines |
| 3 | Use Case 1: Post-purchase follow-up emails (highest ROI, easiest to measure) |
| 4 | Use Case 2: Cart abandonment recovery (second-highest revenue impact) |
| 5-6 | Use Case 6: Support context injection (immediate agent productivity gain) |
| 7-8 | Use Case 4: Lifecycle campaigns (daily scheduled pipeline) |
| 9-10 | Use Case 3: On-site recommendations + Use Case 5: Personalized search |
| 11-12 | Use Case 7: Replenishment nudges + tuning and A/B testing across all use cases |

---

## Key Technical Decisions

1. **Use `fast_mode: true` for all customer-facing, real-time lookups.** Full reflection mode takes 10-20 seconds; fast mode returns in under 700ms. Use full reflection only for batch generation (lifecycle campaigns, daily digests).

2. **Set `extractMemories: true` only on rich text fields.** Structured data (email, order count, loyalty tier) should be stored as properties without AI extraction. Free-form data (order summaries, browsing sessions, support notes) needs extraction for semantic search.

3. **Memorize every AI-generated output** using the `memorize: { captureToolResults: true }` parameter. This creates the feedback loop: the next time Personize generates content for that customer, it knows what was already sent and avoids repetition.

4. **Use `smartDigest()` for entity-level context and `smartRecall()` for task-specific queries.** Digest gives you the full profile; recall searches for specific facts. Combine both when generating high-value content.

5. **Aggregate browsing events before memorizing.** Do not memorize individual page views. Aggregate into session-level summaries (products viewed, categories browsed, time on site, cart state) to keep memory clean and costs manageable.

6. **Create separate collections** for different data domains (Customers, Behavior, Engagement, Loyalty, Support). This lets you scope queries and control extraction per domain.

---

## Measuring Success

For each use case, track these metrics against your current baselines:

| Use Case | Primary Metric | Secondary Metric |
|----------|---------------|-----------------|
| Post-purchase emails | Click-through rate vs. generic Klaviyo flow | Repeat purchase rate within 30 days |
| Cart abandonment | Recovery conversion rate | Revenue recovered per email |
| Product recommendations | Click-through rate on recommended products | Add-to-cart rate from recommendations |
| Lifecycle campaigns | Reactivation rate (purchase within 14 days) | Unsubscribe rate (should decrease) |
| On-site search | Search-to-purchase conversion | Search refinement rate (should decrease) |
| Support context | Average handle time | Customer satisfaction score |
| Replenishment nudges | Reorder conversion rate | Customer-reported helpfulness |

Run each use case as an A/B test for the first 30 days: half of customers get the Personize-generated experience, half get your current flow. Measure lift before scaling to 100%.
