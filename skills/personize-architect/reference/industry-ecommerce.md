# Industry Guide: E-Commerce / DTC / Retail

E-commerce has the most diverse personalization surfaces of any industry: product recommendations, cart abandonment, post-purchase flows, loyalty programs, returns, and seasonal campaigns. Most stores personalize at the segment level ("women 25-34 who bought shoes"). Personize enables segment-of-one: every customer gets communication that reflects their complete purchase history, browsing behavior, stated preferences, and full relationship with the brand -- without ever feeling surveillant.

---

## Recommended Entity Types

- **Customer** -- Individual shopper profile, lifetime value, preferences, loyalty status
- **Product** -- Product intelligence for matching and recommendations
- **Order** -- Transaction history, return patterns, satisfaction signals
- **Browse-Session** -- Intent signals: search queries, cart additions, category interest

---

## Starter Schema

### Customer
| Property | Type | Description |
|---|---|---|
| `lifetime-value` | select | LTV band: low / mid / high / vip |
| `purchase-count` | number | Total completed orders |
| `preferred-categories` | array | Product categories with repeat purchases |
| `loyalty-tier` | select | bronze, silver, gold, platinum |
| `return-rate` | percent | Returns as % of orders -- used for risk scoring |
| `last-purchase-date` | date | Most recent completed order |
| `price-sensitivity` | select | budget, value, premium -- inferred from purchase patterns |
| `style-profile` | text | AI-extracted style preferences from purchase and review history |

### Product
| Property | Type | Description |
|---|---|---|
| `category` | select | Top-level product category |
| `margin` | select | low, medium, high -- guides discount eligibility |
| `inventory-status` | select | in-stock, low-stock, out-of-stock, back-ordered |
| `bestseller-rank` | number | Rank within category |
| `target-persona` | text | Intended buyer profile |

### Order
| Property | Type | Description |
|---|---|---|
| `items` | array | Product IDs or names purchased |
| `discount-used` | text | Promo code or discount type applied |
| `satisfaction-score` | rating | Post-purchase satisfaction (1-5) |
| `return-items` | array | Items returned from this order |
| `return-reason` | text | Stated reason for return |

---

## Common Use Cases

1. **Cart abandonment recovery** -- Personalized email framing abandoned items in the context of the customer's existing style and purchase history, not generic "you forgot something"
2. **Cross-sell after purchase** -- "Pairs well with" or "complete the look" triggered immediately after order confirmation; matched to their style profile, not global bestsellers
3. **Replenishment reminders** -- Predict depletion dates for consumables based on purchase frequency; timely reminders before they run out
4. **VIP early access** -- Top customers by LTV get exclusive previews of new collections with curated picks matched to their taste
5. **Post-return win-back** -- Empathetic outreach after a return; never questions the reason, always offers a personalized alternative matched to their stated concern

---

## Integration Patterns

**Order history (Shopify, WooCommerce):** Daily `memorizeBatch()`. Extracts categories, spend patterns, return rates, gift behavior. This is the foundation -- do this first.

**Browse/search behavior:** Memorize session summaries, not individual page views. Captures category interests, search intent, and price range browsing without feeling surveillant.

**Support interactions:** Memorize per ticket with extraction. Surfaces sizing issues, product feedback, and return reasons that refine the customer profile.

**Loyalty program:** Memorize per event. Tracks points balance, redemption preferences, and tier changes -- used for loyalty-tier nudges and VIP routing.

**Email engagement:** Memorize per campaign. Captures click patterns and content preferences -- informs future category recommendations.

**Wishlist / saved items:** Batch-memorize on change. Strong desire signals and price sensitivity indicators (saving expensive items = aspirational buyer).

---

## Key Governance Variables

| Variable | Purpose |
|---|---|
| `brand-voice` | DTC personality -- friendly, confident, never desperate; emoji rules; first-name usage |
| `discount-policy` | Max discount levels, stacking rules, new arrival blackout periods, loyalty vs general rules |
| `return-communication` | Always empathetic; never question the reason; offer exchange before refund; include alternative |
| `urgency-ethics` | Only use "low stock" if genuinely under 10 units; no artificial scarcity; real deadlines only |
| `personalization-boundaries` | What to reference (purchase history, stated preferences, wishlist) vs what feels creepy (exact browse pages, location) |
| `sustainability-messaging` | Verified certifications only; specific claims, not vague "eco-friendly" language |

---

## Personalization Boundaries

The most important governance rule in e-commerce: the line between "this brand knows me" and "this brand is watching me." Always stay on the right side.

**Reference freely:** Past purchases, stated size/style preferences, wishlist items, loyalty status, product categories they buy regularly.

**Never reference:** Exact pages browsed ("we saw you looking at..."), location data, inferred income, cart items they removed (respecting their decision), competitor browsing.

The mental model: communicate like a knowledgeable store associate who remembers their regulars -- not like a surveillance system that logged every click.

---

## CLV-Based Segmentation

Use lifetime value (LTV) to tier personalization investment:

- **VIP (top 5-10% by LTV):** Dedicated CS routing, early access, personal notes from GM, deeper personalization
- **High LTV:** Standard personalization, loyalty rewards focus, category-specific campaigns
- **Mid LTV:** Automation-driven, category affinity matching, loyalty tier nudges
- **Low LTV / new:** Onboarding sequence, preference discovery, first-repeat-purchase trigger

The Personize memory layer makes this actionable: every agent reads the customer's LTV tier and adjusts tone, offer level, and personalization depth accordingly.

---

## Revenue-Driving Use Cases

### Cart Abandonment
The highest-ROI automation in e-commerce. Personize makes it better than generic recovery: instead of "you left something behind," the email frames the abandoned items in the context of the customer's existing collection and style. A customer who buys linen shirts should hear "this would complete your summer wardrobe" not a countdown timer. No fake scarcity. No manufactured urgency.

### Cross-Sell After Purchase
Send within 24 hours of delivery confirmation, not order confirmation -- when the product is in hand and satisfaction is highest. Match cross-sell suggestions to actual purchase history, not global bestsellers. A customer who buys skincare consistently should see skincare adjacents, not the store's top-selling handbag.

### Replenishment Intelligence
For consumables (skincare, supplements, cleaning products, pet food), build purchase frequency patterns after 2+ orders. Predict depletion dates and send timely reminders before the customer runs out. Never send replenishment emails to customers who have only bought once -- you have no frequency data yet.

### Loyalty Tier Nudges
"You're $47 away from Gold status" is table stakes. Personize makes this better: suggest specific products they'd want anyway that happen to close the gap, at the price point they typically shop. The loyalty nudge feels like a helpful recommendation, not a spend-more prompt.

### Win-Back Campaigns
After 90+ days of inactivity, reference what they used to buy, when they were most engaged, and what's changed. "We added [category they browsed] since you last visited" is more compelling than "we miss you." Match reactivation offers to their historical price sensitivity -- don't offer a 20% discount to a customer who always paid full price.

---

## Support and Returns Patterns

### VIP Routing
When a high-LTV customer opens a support ticket, route to senior support automatically and include a brief: who they are, how long they've been a customer, recent purchase history, previous support interactions. The support agent walks in prepared, not starting from scratch.

### Post-Return Win-Back
Never challenge the return reason. Always empathize first. Then offer alternatives matched to what they returned -- if they returned a dress for fit reasons, suggest styles with different cuts. If they returned because the color wasn't as expected, suggest products with verified-accurate color photography. The goal is to keep the relationship, not just the transaction.

### Sizing Intelligence
After a customer reports a sizing issue (via support, review, or return), memorize their sizing notes for that brand or category. Future recommendations can flag when a product runs small or large based on their history -- "you mentioned Brand X runs small for you; this brand also runs small so we'd suggest sizing up."

---

## Memory Architecture for E-Commerce

The Order history import is the single highest-value first step. Everything else builds on it: preferences are inferred from what they've bought, style profile emerges from category patterns, price sensitivity is calculated from average order values and discount usage.

Browse session data is additive intelligence but must be handled carefully. Aggregate by session (what categories were browsed, what search terms used, what was added to cart) rather than storing individual page views. This gives you intent signals without the surveillance feel.

Support interactions are often the most honest data: customers tell support agents things they don't put in reviews. A customer who tells support they keep returning shoes because of width issues is giving you a fit preference signal. Memorize it. Use it in future recommendations. This is the kind of personalization that creates genuine loyalty.
