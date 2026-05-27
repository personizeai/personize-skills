# First 5 Minutes with Personize

1. **Load platform guidance:** call `personize_skill` FIRST -- it tells you how the platform works. Without it, you will misuse tools.
2. **Discover org state:** call `personize_context` -- reveals collections, guidelines, capabilities, credits.
3. **Load self-memory:** `memory_recall_pro(about:"self")` -- recall previous learnings and preferences.
4. **Check governance:** `ai_smart_guidelines` -- load active rules before acting.
5. **Fresh org?** If collections are empty or no guidelines exist: enter setup mode. Ask user what they're building, then create collections + guidelines via tool calls. MUST NOT proceed without schema.

## Core Loop (every task)
Recall (smartRecall) -> Govern (ai_smart_guidelines) -> Act -> Store (memory_store_pro)

## Key Distinctions
- **Collections** = data containers with identity keys (contacts, companies, deals). Created via `collection_create`.
- **Guidelines** = behavioral rules and policies (ICP criteria, email standards, compliance). Created via `guideline_create`.
- **NEVER create governance rules as collections.** ICP criteria, writing standards, playbooks, policies = guidelines.

## Top 5 Tools
smartRecall, memory_store_pro, memory_digest, ai_smart_guidelines, memory_batch_store

## Identity
email for contacts, website_url for companies, record_id for direct refs

## Session End
MUST store learnings with `memory_store_pro(about:"self")` before ending. What worked, what failed, decisions made.
