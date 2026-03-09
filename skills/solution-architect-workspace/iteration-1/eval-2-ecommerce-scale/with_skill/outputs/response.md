# Personize for E-Commerce: Beyond "Recommended For You"

Great context -- 100K purchases/month on Shopify, Klaviyo, browsing analytics, and a loyalty program. You already have the data foundation. The problem is that all of that customer intelligence is scattered across four systems, and none of them talk to each other when it's time to actually communicate with a customer.

Here is what Personize unlocks when you connect those sources into unified memory, add governance rules, and let AI generate content from the full picture.

---

## 1. AI-Written Cart Abandonment Recovery (Not Template Swaps)

**What your customers see:** An email that doesn't say "you left something in your cart." Instead, it references why those specific items fit them -- their past purchases, their style patterns, their loyalty tier -- written in your brand voice, respecting your discount policy.

**Why this needs all three layers:**

| Layer | What It Contributes | Without It |
|---|---|---|
| **Governance** (`smartGuidelines`) | Your discount-policy rules (max 15% for first-timers, no stacking), your personalization-boundaries (never say "we saw you browsing"), urgency-ethics (no fake scarcity) | AI invents discounts or creates creepy "we noticed you looking at..." messaging |
| **Unified Memory** (`smartDigest` + `recall`) | Purchase history from Shopify + browsing patterns from analytics + loyalty tier + past recovery emails sent + support interactions -- all in one context window | AI only knows cart contents, misses that this customer returned a similar item last month or is 50 points from Gold tier |
| **Content Generation** (`prompt` with `instructions[]`) | AI WRITES a recovery message that connects their abandoned items to their existing wardrobe/collection, mentions loyalty points they'd earn, and frames it as helpful -- not desperate | You send the same template to a first-time visitor and a 3-year loyalty member |

**Before (what you have now):**
> "Hi {first_name}, you left something behind! Complete your order before it's gone."

**After (three-layer generation):**
> "Hey Sarah -- those Everlane linen pants you were looking at would pair well with the cotton blazer you picked up in June. Since you're a Gold member, you'd earn 340 points on this order, which puts you just 60 points from a $25 reward. No rush -- they're well-stocked."

**Technical skeleton:**

```typescript
// Layer 1: Governance -- fetch discount rules + personalization boundaries
const governance = await client.ai.smartGuidelines({
    message: 'cart recovery guidelines, discount policy, personalization boundaries, urgency ethics',
    mode: 'fast',
});

// Layer 2: Unified Memory -- assemble cross-source context
const [customerContext, purchaseHistory] = await Promise.all([
    client.memory.smartDigest({ email: customer.email, type: 'Customer', token_budget: 2000 }),
    client.memory.recall({ query: 'purchase history, brand affinities, loyalty status, past cart recoveries', email: customer.email }),
]);

const context = [
    governance.data?.compiledContext,
    customerContext.data?.compiledContext,
    `Abandoned items: ${JSON.stringify(cartItems)}`,
].filter(Boolean).join('\n\n---\n\n');

// Layer 3: Multi-step generation
const recovery = await client.ai.prompt({
    context,
    instructions: [
        { prompt: 'Analyze: What do we know about this customer from ALL sources? Why might these specific abandoned items fit their purchase history and style?', maxSteps: 3 },
        { prompt: 'Check governance: What discount rules apply? What personalization boundaries must we respect? Any urgency constraints?', maxSteps: 2 },
        { prompt: 'Write the recovery email. Frame abandoned items in context of their style/history. Mention loyalty points if applicable. No fake urgency. SUBJECT: and BODY_HTML: as separate fields.', maxSteps: 5 },
    ],
    evaluate: true,
    evaluationCriteria: 'References at least one past purchase. No false scarcity. Respects personalization boundaries. Follows brand voice.',
});
```

**Differentiation test:** Could you build this with Klaviyo + a single LLM call? No. Klaviyo knows the cart and basic purchase history, but it doesn't synthesize browsing behavior + loyalty points + support interactions + past recovery attempts + your discount policy into one message. The AI here is pulling from four systems and writing under six governance constraints simultaneously.

---

## 2. AI-Generated Post-Purchase Cross-Sell (Not "Frequently Bought Together")

**What your customers see:** 48 hours after delivery, an email that doesn't just recommend "similar products." It writes a narrative about how their new purchase connects to what they already own and suggests specific items that complete the picture -- governed by your brand voice and seasonal merchandising priorities.

**Why this needs all three layers:**

| Layer | What It Contributes | Without It |
|---|---|---|
| **Governance** | Brand voice, seasonal merchandising priorities (what to push this month), cross-sell tone rules (helpful stylist, not pushy upsell) | Generic "you might also like" that ignores your current inventory priorities |
| **Unified Memory** | Full purchase history + categories they have NOT explored + size/fit data from support tickets + what they returned (and why) + loyalty tier | AI recommends items in a category they already own 10 of, or a size they returned last time |
| **Content Generation** | AI WRITES styling advice, "complete the look" narratives, personalized reasons why each suggestion fits them | Algorithmic grid of product thumbnails with no context |

**Before:**
> "Customers who bought this also bought..." [4 product thumbnails]

**After:**
> "Your new linen pants just shipped -- nice pick. Since you tend to go for natural fabrics (we've noticed the cotton and linen pieces in your order history), here are two ways to wear them this spring: dressed up with the Everlane silk blouse (you bought the white version last year, the navy would work here), or casual with the organic cotton tee you already have. One more: these espadrilles are new this season and they're in your size."

```typescript
const crossSell = await client.ai.prompt({
    context,  // governance (brand voice + merchandising priorities) + unified memory (full purchase history + size data + returns)
    instructions: [
        { prompt: 'Analyze: What did they just buy? What do they already own? What categories have they NOT explored? What sizes/fits work for them? What have they returned?', maxSteps: 3 },
        { prompt: 'Apply merchandising rules: What are our current seasonal priorities? What inventory needs movement? What brand voice should we use?', maxSteps: 2 },
        { prompt: 'Write a cross-sell email as a personal stylist. Reference their specific purchase history. Suggest 2-3 items with a reason for each. Never recommend a size they returned. SUBJECT: and BODY_HTML: as separate fields.', maxSteps: 5 },
    ],
    evaluate: true,
});
```

**Differentiation test:** Shopify's "recommended for you" uses collaborative filtering -- "people who bought X bought Y." That is a recommendation engine, not content generation. Here, the AI is writing styling advice that references the customer's actual wardrobe, avoids sizes they've returned, and pushes inventory your merchandising team wants to move this month. No product grid can do that.

---

## 3. AI-Written Loyalty Program Communication (Not Point Balance Notifications)

**What your customers see:** Instead of "You have 1,240 points," they get a message that tells the story of their relationship with your brand -- what they've earned, what they're close to, and personalized suggestions for how to use their points based on their actual preferences.

**Why this needs all three layers:**

| Layer | What It Contributes | Without It |
|---|---|---|
| **Governance** | Loyalty communication tone, tier upgrade messaging rules, reward framing guidelines, discount stacking restrictions | Generic "redeem now!" that treats every member the same |
| **Unified Memory** | Points balance + purchase patterns + preferred categories + how close to next tier + past redemption behavior + browsing signals for what they want next | AI knows point balance but not that they always redeem for accessories, or that they're about to hit Gold |
| **Content Generation** | AI WRITES a narrative about their brand relationship and a personalized redemption suggestion | A transactional points statement |

**Before:**
> "You have 1,240 points. Redeem them on your next purchase!"

**After:**
> "Sarah, you've been with us for 14 months and you've earned 1,240 points -- that's enough for a $30 reward. Based on what you usually go for, the new organic cotton collection just dropped and your points would cover the henley you wishlisted. Also: your next order puts you at Gold tier, which unlocks early access to seasonal drops. Worth knowing before the fall collection drops on September 1st."

```typescript
const loyaltyMessage = await client.ai.prompt({
    context,  // governance (loyalty tone + tier rules) + unified memory (points + purchase history + wishlist + tier proximity)
    instructions: [
        { prompt: 'Analyze: What is their loyalty status? How close to the next tier? What do they typically redeem for? What are they interested in right now based on browsing/wishlist?', maxSteps: 3 },
        { prompt: 'Check loyalty guidelines: How do we frame tier upgrades? What tone for milestone messages? Any restrictions on combining rewards?', maxSteps: 2 },
        { prompt: 'Write a loyalty update that tells the story of their relationship with the brand. Include a specific redemption suggestion matching their preferences. Mention tier proximity if relevant. SUBJECT: and BODY_HTML: as separate fields.', maxSteps: 5 },
    ],
    evaluate: true,
});
```

---

## 4. AI-Synthesized Customer Health Alerts for Your Team (Not Dashboards)

**What your support/CX team sees:** Instead of a Shopify dashboard showing metrics, they get a narrative alert when a customer's behavior signals a problem or an opportunity -- synthesizing signals from Shopify orders, Klaviyo engagement, support history, and loyalty data into one actionable story.

**Why this needs all three layers:**

| Layer | What It Contributes | Without It |
|---|---|---|
| **Governance** | Alert policies (what warrants a notification), escalation rules (VIP vs standard), tone for internal alerts, intervention playbooks | Your team gets raw metric alerts with no context or recommended action |
| **Unified Memory** | Declining purchase frequency from Shopify + email unengagement from Klaviyo + recent support ticket + loyalty points expiring -- synthesized across ALL four sources | Each tool fires its own alert, nobody connects the dots |
| **Content Generation** | AI WRITES a narrative connecting the signals and recommending a specific action | A dashboard showing four separate metrics the team has to interpret themselves |

**Before:**
> Shopify: "Customer hasn't ordered in 90 days." Klaviyo: "Email open rate dropped." (Two separate signals, no connection.)

**After:**
> "Heads up: Sarah Chen (Gold tier, $2,400 LTV) is showing churn signals. She hasn't ordered in 90 days (her usual cadence is monthly), stopped opening emails 6 weeks ago, and filed a sizing complaint on her last order that was resolved with a refund but no exchange. Her 800 loyalty points expire in 30 days. Recommended action: personal outreach acknowledging the sizing issue, offer a fit consultation for the brand she had trouble with, and remind her about the expiring points. She prefers phone over email for support."

```typescript
const alert = await client.ai.prompt({
    context,  // governance (alert policies + VIP handling) + unified memory (Shopify + Klaviyo + support + loyalty -- all four sources)
    instructions: [
        { prompt: 'Synthesize: What signals do we have from ALL four sources? What story do they tell together that no single dashboard reveals?', maxSteps: 3 },
        { prompt: 'Check alert rules: Does this warrant a team notification? What priority? What is the right intervention based on their LTV and tier?', maxSteps: 2 },
        { prompt: 'Write an internal alert narrative: situation, cross-source context, specific recommended action, and preferred contact method. Max 150 words.', maxSteps: 5 },
    ],
});
```

**Differentiation test:** Shopify can tell you someone hasn't ordered. Klaviyo can tell you open rates dropped. Neither connects those signals to a support complaint and expiring loyalty points, then recommends a specific outreach strategy. This requires all four data sources in one context window plus governance rules about how to handle VIP churn risk.

---

## 5. AI-Generated Replenishment Reminders (Not Fixed-Interval Emails)

**What your customers see:** For consumable products (skincare, supplements, pantry items, cleaning supplies), a reminder timed to when they're actually running low -- not on a fixed 30-day drip -- with a message that references their specific usage pattern and offers convenience options.

**Why this needs all three layers:**

| Layer | What It Contributes | Without It |
|---|---|---|
| **Governance** | Replenishment tone rules (helpful, not pushy), frequency caps, auto-delivery promotion guidelines | Aggressive "time to reorder!" every 30 days regardless of actual usage |
| **Unified Memory** | Actual purchase intervals for each consumable product (this customer buys face serum every 45 days, not every 30), quantity variations, brand switches | Fixed-interval drip that ignores their real consumption pattern |
| **Content Generation** | AI WRITES a timely, specific reminder with auto-delivery option, calibrated to their actual usage | Generic reorder template on a fixed schedule |

**Before:**
> [Day 30, every time] "Time to restock! Reorder your favorites."

**After:**
> "Hey Sarah -- based on your last three orders, you typically go through the Vitamin C serum in about 6 weeks, and it's been 5. Thought you'd want a heads-up before you run out. Same serum, same size? You can set up auto-delivery so you never have to think about it again -- your Gold member discount applies automatically."

---

## What to Memorize: Connecting Your Four Data Sources

Here is how your existing systems feed into unified memory:

| Source | Method | What Gets Extracted |
|---|---|---|
| **Shopify** (order history) | `memorizeBatch()` daily sync | Items purchased, categories, spend patterns, order frequency, return history, gift purchases, discount usage |
| **Browsing analytics** | `memorize()` per session summary | Category interests, search queries, price range browsing, cart additions/removals, time-on-site patterns |
| **Klaviyo** (email engagement) | `memorize()` per campaign | Opens, clicks, content preferences, unsubscribe events, which products they clicked on |
| **Loyalty program** | `memorize()` per event | Points balance, tier status, redemption history, tier proximity, points expiration dates |

The key insight: none of these sources alone gives you the full picture. A customer who stopped opening Klaviyo emails, filed a Shopify support ticket, and has expiring loyalty points is telling you three different things that add up to one story. Unified memory is what makes that story visible to AI when it generates content.

---

## Governance You Should Set Up First

Before generating anything customer-facing, establish these rules:

| Variable | What It Controls | Why It Matters at Your Scale |
|---|---|---|
| **brand-voice** | Tone, personality, language patterns | At 100K purchases/month, AI-generated emails are a brand experience. They need to sound like you, not like a generic chatbot. |
| **discount-policy** | Max discounts, stacking rules, first-timer vs repeat | Prevents AI from inventing 25% discounts in cart recovery emails. |
| **personalization-boundaries** | What to reference vs. what feels creepy | "We noticed you love linen" = good. "We saw you browsed the linen pants page 3 times at 11pm" = surveillance. This governance is critical at scale. |
| **urgency-ethics** | Real scarcity vs. manufactured pressure | "Only 3 left" must be real inventory data, not a persuasion trick. |
| **return-communication** | How to handle return-related outreach | Empathetic, never defensive. Offer exchange before refund. Include a personalized alternative. |

---

## Quick Wins: First Week

1. **Import Shopify order history** via `memorizeBatch()` -- this builds your customer memory foundation. At 100K purchases/month, you have rich data already. Start with the last 12 months.

2. **Set up personalization-boundaries governance** -- this is your guardrail before any AI writes to a customer. Prevents the "creepy factor" that kills trust.

3. **Cart abandonment recovery** -- direct, measurable revenue impact. You can A/B test AI-generated recovery emails against your current Klaviyo templates and measure conversion lift.

4. **Post-purchase cross-sell** -- leverages the relationship warmth right after a purchase. Higher open rates, lower unsubscribe risk.

5. **Connect Klaviyo engagement data** -- memorize email open/click patterns so the AI knows which customers are engaged and which are going dark.

These five steps get you from "recommended for you" product grids to AI that writes like a personal shopper who remembers everything about each customer and follows your brand rules. The difference is not better recommendations -- it is original content that no template could produce because it is unique to each customer, governed by your rules, and informed by all four of your data sources at once.
