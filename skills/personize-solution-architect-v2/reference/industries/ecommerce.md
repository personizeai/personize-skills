# Industry Blueprint: E-Commerce / DTC / Retail

E-commerce has the most diverse personalization surfaces of any industry — product recommendations, cart abandonment, post-purchase flows, loyalty programs, returns, seasonal campaigns, and customer support. Most stores personalize at the segment level ("women 25-34 who bought shoes"). Personize enables segment-of-one: every customer gets communication that reflects their complete purchase history, browsing behavior, preferences, and relationship with the brand.

---

## Recommended Schema

| Collection | Key Properties | Why |
|---|---|---|
| `Customer` | lifetime_value, purchase_count, avg_order_value, preferred_categories, brand_affinities, size_preferences, return_rate, loyalty_tier, last_purchase_date, acquisition_channel, style_profile, price_sensitivity | Individual shopper intelligence |
| `Product` | category, subcategory, price, margin, inventory_status, seasonal_flag, bestseller_rank, avg_rating, related_products, target_persona | Product intelligence for matching |
| `Order` | items, total, discount_used, delivery_status, satisfaction_score, return_items, return_reason, gift_flag, repeat_purchase_flag | Transaction history |
| `Browse-Session` | pages_viewed, categories_browsed, search_queries, cart_additions, cart_abandonment_items, time_on_site, device_type | Intent signals |

---

## Governance Setup

| Variable | Purpose | Example Content |
|---|---|---|
| `brand-voice` | DTC brand personality | "Friendly, confident, never desperate. Use first names. Emoji OK in subject lines, not in body. Talk like a knowledgeable friend, not a salesperson." |
| `discount-policy` | Promotional rules | "Max 15% off for first-time buyers. No stacking. Loyalty members get early access, not deeper discounts. Never discount new arrivals in first 30 days." |
| `return-communication` | How to handle returns/complaints | "Always empathetic. Never question the return reason. Offer exchange before refund. Include a personalized alternative suggestion." |
| `sustainability-messaging` | ESG and sustainability claims | "Only reference verified sustainability certifications. No greenwashing. Specific claims only: 'made from 80% recycled materials' not 'eco-friendly'." |
| `urgency-ethics` | Scarcity and urgency rules | "Only use 'low stock' if inventory is genuinely under 10 units. Never create false urgency. 'Limited time' only for real deadlines." |
| `personalization-boundaries` | What feels helpful vs creepy | "Reference past purchases and stated preferences. Never reference: exact browse history ('we saw you looking at...'), location tracking, or inferred income." |

```typescript
await client.guidelines.create({
    name: 'E-Commerce Personalization Boundaries',
    content: `What to reference in personalized messaging:
    DO: purchase history, stated preferences, wishlist items, loyalty status, size/fit data, style patterns
    DON'T: exact pages browsed (feels surveillant), inferred income, cart items they removed (respecting their decision), competitor browsing
    TONE: helpful friend who remembers your style, not a stalker who watched your every click`,
    triggerKeywords: ['personalization', 'recommendation', 'email', 'notification', 'creepy', 'privacy'],
    tags: ['personalization', 'boundaries', 'privacy'],
});
```

---

## Unified Memory: What to Memorize

| Source | Method | What Gets Extracted |
|---|---|---|
| Order history (Shopify, WooCommerce) | `memorizeBatch()` daily | Items, categories, spend patterns, return rates, gift behavior |
| Browse/search behavior | `memorize()` session summary | Category interests, search intent, price range browsing, comparison behavior |
| Support interactions | `memorize()` per ticket | Complaints, sizing issues, product feedback, return reasons |
| Reviews written | `memorize()` per review | Product opinions, style preferences, quality expectations |
| Loyalty program activity | `memorize()` per event | Points balance, redemption preferences, tier changes |
| Email engagement | `memorize()` per campaign | Content preferences, click patterns, unsubscribe reasons |
| Wishlist / saved items | `memorizeBatch()` on change | Desire signals, price sensitivity (wishlisting expensive items) |

### Memory-Driven Product Matching

```typescript
// Build rich customer profile from all sources
const customerProfile = await client.memory.smartDigest({
    email: customer.email, type: 'Customer', token_budget: 3000,
    include_properties: true, include_memories: true,
});

// Recall specific purchase and preference patterns
const preferences = await client.memory.smartRecall({
    query: 'purchase patterns, brand preferences, size information, style notes, and product feedback',
    email: customer.email, limit: 20, min_score: 0.4,
});
```

---

## Use Cases by Department

### Revenue / Sales (12 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Cart Abandonment Recovery** | Cart abandoned 2h | Memory (abandoned items + history) → Governance (discount policy) → Generate (personalized recovery email) |
| 2 | **Cross-Sell After Purchase** | Order confirmed | Memory (purchase + past orders) → Generate ("pairs well with" or "complete the look" email) |
| 3 | **Loyalty Tier Upgrade Nudge** | Monthly check | Memory (purchase pace + points) → Generate ("$X away from Gold" with suggested purchases) |
| 4 | **VIP Early Access** | Collection launch | Memory (top customers by LTV) → Generate (exclusive preview with curated picks) |
| 5 | **Back-in-Stock Alert** | Inventory webhook | Memory (who wishlisted/browsed OOS items) → Signal (notify with urgency calibrated to interest level) |
| 6 | **Post-Return Win-Back** | Return processed | Memory (return reason + history) → Generate (empathetic outreach with alternatives) |
| 7 | **Subscription Box Curation** | Monthly cycle | Memory (preferences + past feedback + returns) → Generate (curated box with personal note per item) |
| 8 | **Gift Guide Generation** | Seasonal trigger | Memory (demographics + past gifts + recipient history) → Generate (personalized gift guide) |
| 9 | **Price Drop Alert** | Price change event | Memory (who browsed at higher price) → Signal (notify with personalized framing) |
| 10 | **Replenishment Reminder** | Predicted depletion date | Memory (purchase frequency for consumables) → Generate (timely reorder reminder) |
| 11 | **Bundle Recommendation** | Browse pattern detected | Memory (frequently co-viewed items) → Generate (personalized bundle with savings) |
| 12 | **Seasonal Wardrobe Update** | Season change | Memory (past seasonal purchases + size + style) → Generate (curated seasonal picks) |

### Marketing (10 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Product Launch Personalization** | New product available | Memory (who matches product's target persona) → Generate (unique announcement per customer) |
| 2 | **Win-Back by Purchase Season** | Seasonal lapse detected | Memory (purchase seasonality patterns) → Generate (re-engagement timed to buying season) |
| 3 | **UGC/Review Request** | 14 days post-delivery | Memory (satisfaction signals + purchase) → Generate (personalized review request referencing their item) |
| 4 | **Anniversary Campaign** | First purchase anniversary | Memory (first purchase + favorite products) → Generate (nostalgia + personalized offer) |
| 5 | **Category Expansion** | Opportunity detected | Memory (categories shopped + unshopped) → Generate ("customers who love X discovered Y" campaign) |
| 6 | **Referral Personalization** | High satisfaction detected | Memory (LTV + satisfaction) → Generate (custom referral with incentive calibrated to value) |
| 7 | **Personalized Unsubscribe Alternative** | Unsubscribe initiated | Memory (preferences) → Generate (preference center with "just these categories" or "monthly digest only") |
| 8 | **Social Proof Email** | Purchase milestone | Memory (purchase count) → Generate ("you're in the top 5% of [brand] fans" with community content) |
| 9 | **Influencer Partnership Outreach** | High engagement + social presence | Memory (brand affinity + engagement) → Generate (partnership outreach referencing authentic relationship) |
| 10 | **Flash Sale Targeting** | Sale planned | Memory (category affinity + price sensitivity) → Generate (personalized flash sale alert for relevant items only) |

### Customer Support (8 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Return Prediction + Prevention** | Order shipped | Memory (return patterns + product type) → Generate (proactive sizing/care guide pre-emptively) |
| 2 | **VIP Ticket Routing** | Ticket created | Memory (LTV + history) → Signal (route high-value to senior support with context brief) |
| 3 | **Post-Purchase Support** | Product type requires setup | Memory (product + common issues) → Generate (proactive setup guide personalized to purchase) |
| 4 | **Complaint Resolution** | Complaint ticket | Memory (resolution preferences + history) → Governance (return policy) → Generate (resolution matching their pattern) |
| 5 | **Delivery Anxiety Management** | Repeated tracking checks | Memory (tracking behavior) → Signal (proactive delivery update with ETA) |
| 6 | **Size Exchange Streamlining** | Exchange requested | Memory (size history across brands) → Generate (recommendation for correct size) |
| 7 | **Product Quality Feedback Loop** | Quality complaint | Memory (memorize complaint) → Signal (alert product team) → Generate (apology + replacement offer) |
| 8 | **Loyalty Recovery After Bad Experience** | Negative CSAT | Memory (issue details + LTV) → Governance (recovery budget rules) → Generate (personalized recovery gesture) |

### Product / Merchandising (6 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Demand Forecasting Input** | Monthly | Memory (purchase trends by category + season) → Generate (demand signals report for buying team) |
| 2 | **New Product Testing** | Product launch | Memory (customers matching target persona) → Generate (targeted preview with feedback request) |
| 3 | **Pricing Intelligence** | Quarterly | Memory (price sensitivity patterns + conversion by price point) → Generate (pricing optimization suggestions) |
| 4 | **Category Performance Brief** | Monthly | Memory (category sales + returns + satisfaction) → Generate (category health report with actionable insights) |
| 5 | **Search Improvement Data** | Weekly | Memory (search queries + click-through) → Generate (search relevance report + suggested synonyms) |
| 6 | **Inventory Alert Personalization** | Low stock | Memory (which customers want this item) → Signal (priority notification to highest-intent customers) |

---

## Agent Coordination: Workspace Patterns

### Customer 360 Workspace

Multiple agents contribute to a unified customer view:

```typescript
// Marketing agent: Records campaign engagement
await client.memory.memorize({
    content: `[MARKETING-AGENT] Customer engaged with summer collection email. Clicked on linen category. Has purchased linen items 3 times before. High affinity for natural fabrics.`,
    email: customer.email, enhanced: true,
    tags: ['workspace', 'marketing-intelligence', 'style-signal'],
});

// Support agent: Records service interaction
await client.memory.memorize({
    content: `[SUPPORT-AGENT] Customer called about sizing for Brand X jeans. Typically wears 32 in other brands but Brand X runs small. Recommended size 33. Customer was satisfied. Note: prefers phone over email for support.`,
    email: customer.email, enhanced: true,
    tags: ['workspace', 'support-interaction', 'sizing-data'],
});

// Personalization agent reads all contributions before generating
const fullContext = await client.memory.smartRecall({
    query: 'all agent contributions about this customer: style, preferences, support history, engagement',
    email: customer.email, limit: 30, min_score: 0.3,
    filters: { conditions: [{ property: 'tags', operator: 'CONTAINS', value: 'workspace' }] },
});
```

---

## Key Workflows with Code

### Workflow: Personalized Cart Abandonment

```typescript
async function recoverAbandonedCart(customerEmail: string, cartItems: string[]) {
    const governance = await client.ai.smartGuidelines({
        message: 'cart recovery guidelines, discount policy, personalization boundaries, urgency ethics',
        mode: 'fast',
    });

    const [customerContext, purchaseHistory] = await Promise.all([
        client.memory.smartDigest({ email: customerEmail, type: 'Customer', token_budget: 2000 }),
        client.memory.smartRecall({
            query: 'purchase history, category preferences, brand affinities, and past cart recoveries',
            email: customerEmail, limit: 15, min_score: 0.4,
        }),
    ]);

    const context = [
        governance.data?.compiledContext || '',
        customerContext.data?.compiledContext || '',
        `Purchase history: ${JSON.stringify(purchaseHistory.data?.results?.slice(0, 5))}`,
        `Abandoned items: ${JSON.stringify(cartItems)}`,
    ].join('\n\n---\n\n');

    const recovery = await client.ai.prompt({
        context,
        instructions: [
            { prompt: 'Why might this customer want these specific items based on their purchase history and style? What makes these items a good fit for them?', maxSteps: 3 },
            { prompt: 'Write a cart recovery email. Frame the abandoned items in terms of their existing style/collection. No fake urgency. If they are a loyalty member, mention points they would earn. SUBJECT: and BODY_HTML: as separate fields.', maxSteps: 5 },
        ],
        evaluate: true,
        evaluationCriteria: 'References at least one past purchase or stated preference. No false scarcity. Respects personalization boundaries (no "we saw you looking at...").',
    });

    await client.memory.memorize({
        content: `[CART-RECOVERY] Sent recovery email for: ${cartItems.join(', ')}. ${new Date().toISOString()}`,
        email: customerEmail, enhanced: true,
        tags: ['generated', 'cart-recovery'],
    });

    return recovery.data;
}
```

### Workflow: Replenishment Intelligence

```typescript
async function checkReplenishment(customerEmail: string) {
    // Recall consumable purchase patterns
    const patterns = await client.memory.smartRecall({
        query: 'consumable product purchases with dates and quantities: skincare, supplements, food, cleaning products',
        email: customerEmail, limit: 20, min_score: 0.5,
    });

    const governance = await client.ai.smartGuidelines({
        message: 'replenishment reminder guidelines, helpful vs pushy balance',
        mode: 'fast',
    });

    const reminder = await client.ai.prompt({
        context: [
            governance.data?.compiledContext || '',
            JSON.stringify(patterns.data?.results),
        ].join('\n\n'),
        instructions: [
            { prompt: 'Analyze purchase frequency for consumable items. Which products are likely running low based on purchase intervals? Only flag items with at least 2 past purchases to establish a pattern.', maxSteps: 3 },
            { prompt: 'If items are due for replenishment: write a helpful reminder email. Mention the specific product and estimated depletion. Offer a "set up auto-delivery" option. If nothing is due: output SKIP. SUBJECT: and BODY_HTML: fields.', maxSteps: 5 },
        ],
    });

    return String(reminder.data).includes('SKIP') ? null : reminder.data;
}
```

---

## Quick Wins (First Week)

1. **Import order history** via `memorizeBatch()` — builds the foundation
2. **Cart abandonment recovery** — direct revenue, measurable ROI
3. **Post-purchase cross-sell** — leverages existing relationship warmth
4. **Set up personalization boundaries governance** — prevents creepy-factor mistakes
5. **VIP identification and routing** — support team feels the value immediately
