# Industry Blueprint: Travel & Hospitality

Travelers share enormous amounts of preference data through bookings, reviews, interactions, and loyalty programs — but most brands treat them as new customers every time. The front desk doesn't know they stayed last month. The marketing email doesn't know they prefer suites over standard rooms. Personize enables true guest recognition across every touchpoint — from booking to post-stay — creating the kind of personalized service that luxury brands promise but few deliver at scale.

---

## Recommended Schema

| Collection | Key Properties | Why |
|---|---|---|
| `Guest` | travel_preferences, loyalty_tier, past_destinations, dietary_restrictions, room_preferences, budget_level, travel_purpose (business/leisure/bleisure), companion_info, celebration_dates (anniversary/birthday), language, accessibility_needs, communication_preference, lifetime_stays | Guest recognition |
| `Booking` | property, dates, room_type, special_requests, spend_total, feedback_score, channel (direct/OTA/corporate), purpose, group_size | Transaction intelligence |
| `Property` | location, amenities, room_types, dining_options, local_attractions, seasonal_events, renovation_status, unique_features | Property matching |
| `Experience` | type (dining/spa/tour/event), rating, date, notes, guest_feedback | Experience personalization |
| `Corporate-Account` | company, travel_policy, negotiated_rate, primary_contacts, volume_tier, preferred_properties | Corporate program management |

---

## Governance Setup

| Variable | Purpose | Content |
|---|---|---|
| `guest-privacy` | Guest data protection | "Never share guest stay dates, companion information, or personal preferences with third parties. Business travelers: respect corporate confidentiality — don't mention their stay to others. Celebrities/VIPs: enhanced privacy protocols. GDPR compliance for EU guests. PCI compliance for payment references — never include card details." |
| `cultural-sensitivity` | Global guest base | "Adapt communication style to guest's culture and language preference. Be aware of dietary restrictions tied to religious practices (halal, kosher, vegetarian). Respect cultural norms around formality, greetings, and personal space. Never assume dietary/cultural preferences based on name or nationality — only use stated preferences." |
| `hospitality-voice` | Brand communication tone | "Warm, anticipatory, never transactional. Say 'we've prepared' not 'please note'. Say 'we remembered' not 'our system shows'. Make technology feel like human attentiveness. The goal: every communication should feel like it came from a host who genuinely knows and cares about the guest." |
| `pricing-and-offers` | Rate integrity | "Never reference rates from other channels (OTA parity agreements). Loyalty benefits should feel exclusive, not discounted. Upgrade offers should feel like recognition, not upselling. Last-room-availability situations: transparency about limited availability without artificial pressure." |
| `safety-and-accessibility` | Inclusive experience | "Proactively communicate accessibility features. Never make assumptions about guest needs based on visible characteristics. Allergy and dietary information: treat as safety-critical. Emergency procedures: include in pre-arrival for international guests unfamiliar with local protocols." |

```typescript
await client.guidelines.create({
    name: 'Hospitality Communication Voice',
    content: `Every guest communication should feel like it comes from a thoughtful host, not a system:
    PRE-ARRIVAL: Anticipatory and exciting. "We're looking forward to welcoming you" + specific preparation details
    DURING-STAY: Attentive but not intrusive. Make suggestions based on known preferences without explaining HOW you know
    POST-STAY: Warm and grateful. Reference a specific moment from their stay. Make them feel remembered, not marketed to
    TONE RULES:
    - "We've prepared" > "please note that"
    - "We remembered you enjoy..." > "Based on your profile..."
    - "Your favorite room" > "Room type matching your previous selection"
    - Never say "our system" or "our database" — the technology should be invisible
    - Use the guest's name naturally (once per email, not in every sentence)`,
    triggerKeywords: ['guest', 'hotel', 'booking', 'stay', 'reservation', 'hospitality', 'travel'],
    tags: ['hospitality', 'voice', 'guest-experience'],
});
```

---

## Unified Memory: What to Memorize

| Source | Method | What Gets Extracted |
|---|---|---|
| PMS (Opera, Mews, Cloudbeds) | `memorizeBatch()` daily | Stay history, room preferences, spend patterns, special requests |
| Guest feedback/reviews | `memorize()` per review | What they loved, complaints, specific mentions (staff, room, dining) |
| Loyalty program | `memorize()` per event | Points balance, tier changes, redemption preferences, earning velocity |
| F&B / spa bookings | `memorize()` per experience | Dining preferences, dietary restrictions, spa preferences, wine preferences |
| Concierge interactions | `memorize()` per request | Activity interests, local exploration style, transportation preferences |
| Corporate travel manager notes | `memorize()` per update | Travel policy changes, preferred properties, VIP travelers, event bookings |
| OTA reviews (Booking, TripAdvisor) | `memorize()` per review | Public sentiment, comparison points, unfiltered feedback |

### Building Guest Profiles Across Stays

```typescript
// After each stay, enrich the guest profile
await client.memory.memorize({
    content: `Stay summary — ${property.name}, ${checkIn} to ${checkOut}:
    Room: ${room.type} (#${room.number}), ${room.floor} floor
    Purpose: ${booking.purpose}
    Companion: ${booking.companion || 'Solo'}
    Special requests fulfilled: ${booking.specialRequests.join(', ')}
    F&B: ${dining.summary} (dietary: ${guest.dietaryRestrictions || 'none noted'})
    Spa: ${spa.summary || 'Not used'}
    Feedback: ${feedback.score}/10. Highlights: ${feedback.highlights}. Issues: ${feedback.issues || 'None'}
    Spend total: ${booking.spendCategory}
    Memorable moments: ${staff.notes || 'Standard stay'}`,
    email: guest.email,
    enhanced: true,
    tags: ['stay', property.slug, booking.purpose],
});
```

---

## Use Cases by Function

### Guest Experience (14 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Pre-Arrival Personalization** | 48h before check-in | Memory (preferences + booking + past stays) → Governance (hospitality voice) → Generate (personalized prep email: room setup, dining recommendations, local suggestions) |
| 2 | **In-Stay Concierge Intelligence** | Daily during stay | Memory (interests + travel purpose + past experiences) → Generate (daily personalized activity suggestions via app) |
| 3 | **Post-Stay Follow-Up** | Check-out | Memory (stay details + experiences + feedback) → Generate (warm thank-you referencing specific moments) |
| 4 | **Loyalty Progress Nudge** | Points milestone approaching | Memory (earning pace + redemption preferences + upcoming travel) → Generate ("you're [X] points from [specific reward they'd value]") |
| 5 | **Return Visit Campaign** | 90 days post-stay | Memory (what they loved + seasonal events at property) → Generate ("come back for [specific event/season]" with personalized offer) |
| 6 | **Celebration Recognition** | Birthday/anniversary from profile | Memory (date + past celebration stays) → Generate (surprise-and-delight: complimentary amenity, personal note from GM, room upgrade) |
| 7 | **Dining Recommendation** | Booking confirmed or in-stay | Memory (dietary restrictions + cuisine preferences + past dining) → Generate (personalized restaurant guide per guest) |
| 8 | **Business Traveler Efficiency** | Check-in for corporate guest | Memory (patterns: preferred room, check-in time, workspace needs) → Generate (express setup confirmation: "everything's ready") |
| 9 | **Family Travel Support** | Family booking detected | Memory (children's ages + past family stays + interests) → Generate (family activity guide + kids' club intro + childproofing confirmation) |
| 10 | **Destination Discovery** | Guest inquiry or pre-trip | Memory (past travel + stated interests + adventure level) → Generate (curated local experience guide) |
| 11 | **Weather-Adaptive Suggestions** | Bad weather forecast during stay | Memory (interests + indoor preferences) → Generate (indoor alternative suggestions: spa, cooking class, museum, movie screening) |
| 12 | **Upgrade Opportunity** | Room availability + guest value | Memory (loyalty tier + lifetime value + preferences) → Generate (personalized upgrade offer that feels like recognition, not upselling) |
| 13 | **Group/Event Coordination** | Group booking | Memory (group leader preferences + event type + past events) → Workspace (event coordination) → Generate (customized event package) |
| 14 | **Wellness Personalization** | Spa booking or wellness interest | Memory (wellness preferences + past treatments + health notes) → Generate (personalized wellness itinerary) |

### Revenue Management (8 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Direct Booking Incentive** | OTA booking detected | Memory (guest history + loyalty status) → Generate (post-stay "book direct next time" with specific loyalty benefit) |
| 2 | **Shoulder Season Campaign** | Low occupancy forecast | Memory (guests who've stayed during this season + price sensitivity) → Generate (personalized off-peak offer with experiences they'd value) |
| 3 | **Package Personalization** | Promotional period | Memory (guest preferences + past spend patterns) → Generate (curated package: room + dining + experience matching their interests) |
| 4 | **Corporate Account Growth** | QBR or account review | Memory (travel volume + property usage + traveler feedback) → Generate (account review with growth opportunities and satisfaction data) |
| 5 | **Wedding/Event Venue Proposal** | Inquiry received | Memory (if returning guest: their preferences + past stays) → Generate (personalized venue proposal referencing their connection to property) |
| 6 | **Ancillary Revenue Suggestions** | Pre-arrival window | Memory (past ancillary spend + interests) → Generate (pre-arrival experience booking suggestions: spa, dining, tours) |
| 7 | **Gift Card/Voucher Personalization** | Purchase or gifting occasion | Memory (buyer's preferences + recipient relationship) → Generate (personalized gift card presentation with experience suggestions) |
| 8 | **Meeting Planner Cultivation** | Past event + new RFP season | Memory (past events + feedback + property capabilities) → Generate (proactive event proposal for upcoming planning cycle) |

### Operations (6 use cases)

| # | Use Case | Trigger | Capabilities |
|---|---|---|---|
| 1 | **Guest Recovery After Incident** | Complaint or negative feedback | Memory (issue + guest value + preferences) → Governance (empathy + brand voice) → Generate (recovery gesture: specific amenity/upgrade/credit matching their preferences) |
| 2 | **Staff Briefing** | VIP or returning guest check-in | Memory (full guest history + preferences + past issues) → Generate (staff briefing card: name, preferences, history, special notes) |
| 3 | **Housekeeping Personalization** | Check-in | Memory (room preferences) → Generate (housekeeping instruction card: extra pillows, minibar preferences, pillow type, turndown time) |
| 4 | **Maintenance Prevention** | Guest patterns + room data | Memory (guest room preferences + maintenance history) → Signal (flag rooms with recurring issues before high-value guest assignment) |
| 5 | **Review Response Generation** | Online review posted | Memory (guest's actual stay details) → Governance (brand voice) → Generate (personalized review response referencing specific moments) |
| 6 | **Local Partnership Intelligence** | Quarterly | Memory (guest activity preferences + local partner performance) → Generate (partnership optimization report: which experiences guests love most) |

---

## Agent Coordination: Event Planning Workspace

```typescript
// Sales agent records initial inquiry
await client.memory.memorize({
    content: `[SALES-AGENT] Wedding inquiry: couple getting married Sept 15. 150 guests. Outdoor ceremony preferred, indoor reception. Bride is a returning guest — stayed for anniversary last year, loved the garden terrace. Budget range: premium. Specific requests: local wine for reception, vegetarian options for 30% of guests, live music during ceremony. Site visit scheduled for next Saturday.`,
    email: eventContact.email, enhanced: true,
    tags: ['workspace', 'event', 'wedding', 'inquiry'],
});

// F&B agent contributes
await client.memory.memorize({
    content: `[FB-AGENT] Wedding menu planning: Created 3 menu options incorporating local wines per request. Option A: farm-to-table (chef's recommendation for Sept harvest). Option B: Mediterranean influenced (bride loved Mediterranean dishes during anniversary stay). Option C: international fusion. All options include 30% vegetarian coverage. Wine pairing from local vineyard (confirmed availability for 150 guests). Cake tasting scheduled for site visit day.`,
    email: eventContact.email, enhanced: true,
    tags: ['workspace', 'event', 'wedding', 'catering'],
});

// Events coordinator synthesizes for proposal
const eventContext = await client.memory.smartRecall({
    query: 'all wedding planning details, preferences, catering, venue, requirements',
    email: eventContact.email, limit: 20, min_score: 0.3,
    filters: { conditions: [{ property: 'tags', operator: 'CONTAINS', value: 'wedding' }] },
});

const proposal = await client.ai.prompt({
    context: [
        (await client.ai.smartGuidelines({ message: 'hospitality voice, event proposals, pricing communication', mode: 'fast' })).data?.compiledContext || '',
        JSON.stringify(eventContext.data?.results),
    ].join('\n\n---\n\n'),
    instructions: [
        { prompt: 'Create a personalized wedding proposal. Reference the bride\'s past stay and specific memory of the garden terrace. Weave in all team contributions (catering options, venue details, entertainment).', maxSteps: 5 },
        { prompt: 'Generate the formal proposal document. Sections: Our Vision for Your Day (personal), Ceremony & Reception (venue details), Culinary Experience (menu options), Accommodations (room blocks), Timeline, Investment. Tone: making a dream come true, not selling a product.', maxSteps: 8 },
    ],
});
```

---

## Key Workflow: Pre-Arrival Personalization

```typescript
async function generatePreArrival(guestEmail: string, bookingId: string) {
    const governance = await client.ai.smartGuidelines({
        message: 'hospitality voice, guest privacy, cultural sensitivity, dietary safety',
        mode: 'fast',
    });

    const [guestContext, bookingContext, propertyContext] = await Promise.all([
        client.memory.smartDigest({
            email: guestEmail, type: 'Guest', token_budget: 2500,
            include_properties: true, include_memories: true,
        }),
        client.memory.smartRecall({
            query: `booking details, special requests, room type, dates for booking ${bookingId}`,
            email: guestEmail, limit: 5, min_score: 0.5,
        }),
        client.memory.smartRecall({
            query: 'property amenities, current seasonal events, local happenings, restaurant hours',
            type: 'Property', limit: 3, min_score: 0.5,
        }),
    ]);

    const context = [
        governance.data?.compiledContext || '',
        guestContext.data?.compiledContext || '',
        `Booking: ${JSON.stringify(bookingContext.data?.results)}`,
        `Property: ${JSON.stringify(propertyContext.data?.results)}`,
    ].join('\n\n---\n\n');

    const preArrival = await client.ai.prompt({
        context,
        instructions: [
            { prompt: 'What do we know about this guest that we should act on? Past preferences, dietary needs, room preferences, celebration dates during their stay, travel purpose. What should we prepare that they haven\'t asked for but would love?', maxSteps: 5 },
            { prompt: 'Generate a pre-arrival email. Include: (1) warm welcome referencing their connection to the property (returning guest? first visit?), (2) room preparation details (preferences we\'re honoring), (3) 3 personalized activity/dining recommendations matching their interests, (4) any celebrations we can help with, (5) how to reach us. The technology should be invisible — say "we remembered" not "our system shows." SUBJECT: and BODY_HTML: fields.', maxSteps: 5 },
        ],
        evaluate: true,
        evaluationCriteria: 'Hospitality voice (warm, anticipatory). Technology invisible. Recommendations match stated preferences. Dietary/accessibility needs addressed. No pricing in welcome email.',
    });

    // Memorize what we communicated for staff alignment
    await client.memory.memorize({
        content: `[PRE-ARRIVAL] Sent personalized pre-arrival for booking ${bookingId}. Preparations communicated: ${String(preArrival.data).slice(0, 300)}. ${new Date().toISOString()}.`,
        email: guestEmail, enhanced: true,
        tags: ['generated', 'pre-arrival', bookingId],
    });

    return preArrival.data;
}
```

---

## Quick Wins (First Week)

1. **Import guest history** via `memorizeBatch()` from PMS
2. **Set up hospitality voice governance** — transforms every communication
3. **Pre-arrival emails** — immediate wow factor for returning guests
4. **Post-stay follow-ups** — build loyalty through genuine remembrance
5. **VIP staff briefing cards** — front desk knows the guest before they arrive
