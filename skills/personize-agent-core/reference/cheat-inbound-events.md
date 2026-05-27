# Inbound Event Handling — Personize as the Brain

When an event arrives from any external source (reply, webhook, CRM update, form submission), Personize handles the thinking. The external tool handles the doing.

## The Pattern: Read → Reason → Strategize → Write → Update → Coordinate

| Step | What Personize Does | Tool |
|------|---|---|
| **Read** | Recall full context on this entity | `memory_digest` or `smartRecall` |
| **Reason** | Classify the event, check governance | `ai_smart_guidelines`, property inspection |
| **Strategize** | Decide next action based on context + rules | Agent reasoning with recalled context |
| **Write** | Draft response or output governed by guidelines | `ai.prompt` with `evaluate` |
| **Update** | Store the event + classification + response in memory | `memory_store_pro`, `memory_update_property` |
| **Coordinate** | Mark handled in workspace, clear pending follow-ups | `memory_update_property` on workspace |

## Reply Handling (any channel)

The reply arrives from Smartlead, Apollo, HubSpot, Gmail MCP, or pasted by user. Personize doesn't care where — it cares about what to DO:

1. **Read context**: `memory_digest(email=reply_sender)` — get full history, campaign stage, ICP score, prior emails sent
2. **Classify**: Is this positive interest, not interested, OOO, bounce, question, or unsubscribe?
3. **Check governance**: `ai_smart_guidelines` — load opt-out policy, email standards, ICP criteria
4. **Store the reply**: `memory_store_pro(content=reply_text, email=sender, tags=["reply", "campaign:{name}"])`
5. **Update properties**:
   - `reply_classification` = classified value
   - `campaign_stage` = updated stage (Replied, Opted Out, etc.)
   - `last_contact_date` = now
6. **Coordinate — prevent duplicate follow-ups**:
   - Clear any pending follow-up tasks for this contact in workspace
   - If positive: create task "book meeting" or "hand off to human"
   - If opted out: mark `opted_out=true`, remove from all send queues
7. **Draft response** (if appropriate): governed by guidelines, personalized by recalled context

## Why Coordination Matters

Without coordination, multiple agents or sessions may:
- Send a follow-up to someone who already replied
- Re-contact someone who opted out in a different channel
- Draft conflicting responses to the same person

Personize prevents this by making contact properties and workspace state the single source of truth:
- `campaign_stage` = "Replied" → no agent should send follow-up
- `opted_out` = true → no agent contacts this person, ever
- Workspace task marked "handled" → no other agent picks it up

## Other Inbound Events (same pattern)

| Event | Read | Reason | Update |
|---|---|---|---|
| CRM deal stage changed | `memory_digest(email=...)` | Did we already know? Is this a buying signal? | Store change, update properties |
| Form submission | `smartRecall(email=...)` | New or existing contact? | `memory_store_pro`, set `source:form` |
| Webhook from external tool | `smartRecall` by identifier | What does governance say about this event type? | Store, update, trigger next action |
| Meeting booked | `memory_digest(email=...)` | Recall context for meeting prep | Store, update `campaign_stage=Meeting Set` |

## Key Principle

Personize is the brain, not the hands. External MCPs and tools handle the channel-specific actions (send email, update CRM, post to Slack). Personize handles: what do we know, what should we do, what did we decide, and who else needs to know.
