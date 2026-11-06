# First 5 Minutes with Personize

1. **Bootstrap:** call `personize_md` FIRST -- it reveals collections, guidelines, capabilities, and credits. Without it, you are guessing at org state.
2. **Load self-memory:** `memory_retrieve(about:"self")` -- recall previous learnings and preferences.
3. **Check governance:** `memory_retrieve(mode='scout', message='<task or rule topic>', sources={documents:true, memories:false})` -- load active rules before acting.
4. **Fresh org?** If collections are empty or no guidelines exist: enter setup mode. Ask user what they're building, then create collections + guidelines via tool calls. MUST NOT proceed without schema.

## Core Loop (every task)
Recall (memory_retrieve) -> Govern (memory_retrieve on documents) -> Act -> Store (memory_save)

## Key Distinctions
- **Collections** = data containers with identity keys (contacts, companies, deals). Created via `collection_create`.
- **Guidelines** = behavioral rules and policies (ICP criteria, email standards, compliance). Created via `memory_save(shape:'document', type:'guideline', ...)`.
- **NEVER create governance rules as collections.** ICP criteria, writing standards, playbooks, policies = guidelines.

## Top 5 Tools
memory_retrieve, memory_save, memory_delete, personize_md (structured writes use `memory_save` with `shape:"property"`; content batches use `shape:"shortform"` with `items[]`)

## Identity
email for contacts, website_url for companies, record_id for direct refs

## Session End
MUST store learnings with `memory_save(about:"self")` before ending. What worked, what failed, decisions made.
