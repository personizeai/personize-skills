# Memory as a Model of Your Business

The mental model under every Personize integration. Read this before designing a schema, and lead with it when you explain Personize to a technical stakeholder. It is the architect's version of the framing in [Agent Memory: From Relational Schemas to AI Working Models](https://hamedtaheri.com/articles/relational-schemas-to-agent-memory/).

## The consumer changed

For forty years we modeled business domains for a deterministic reader: software asking exact questions of typed columns under a closed-world assumption. The relational model gave us the discipline of turning a messy domain into entities, relationships, and constraints a machine could use.

The reader is different now. An agent is a stochastic reasoner with a small, expensive working memory (the context window) and a native fluency in unstructured, multimodal data. It does not issue exact queries; it reasons over whatever signal you fit into a bounded prompt. So the modeling objective flips: from "normalize for storage integrity" to "deliver the most task-relevant signal per token."

**Agent memory is to AI agents what the relational model was to software: the discipline of modeling a world so the machine can use it.** Personize is that modeling layer. A solution architect's first job is to help an org model its world, not to wire up a feature.

## What carries over, and what inverts

| Relational model | Agent memory model (Personize) |
|---|---|
| Deterministic query planner | Stochastic, multimodal reasoner under a bounded context window |
| Typed columns | Entity types + properties + relations |
| Integrity constraints, stored procedures | Governance layer (guidelines) |
| Indexes + query planner | Vector + property-filter + graph retrieval fusion |
| CQRS read/write split | Write-time extraction |
| Normalization for storage | Choosing the boundary per knowledge unit |

The discipline transfers. The mechanics invert.

## Three retrieval layers, one substrate

Personize answers three different questions with three layers. A sound design uses all three. "Embed everything and do semantic search" is the seductive wrong answer: it fails on exact constraints, on negation, and on aggregation.

- **Sub-symbolic (vector):** embedded content retrieved by semantic distance. Answers *"what is relevant?"* Cannot enforce exact match, negation, or counting.
- **Symbolic (properties):** typed, filterable fields. Answers *"which of those actually qualify?"* Enables exact match, ordering, aggregation, and governance enforcement.
- **Graph (relations):** typed edges between records. Answers *"what is connected to this?"* Enables traversal across the domain.

Recall in practice fuses them: semantic to find, property filter to qualify, graph to connect. See [`graph-relations.md`](./graph-relations.md) for the edge layer and [`schema-design-guide.md`](./schema-design-guide.md) for the property layer.

## One write, multiple representations

The most important mechanism in the whole framework: a single memorize call embeds the raw input for semantic recall *and*, in the same pass, projects it into the structured schema, where each property's `description` doubles as the extraction prompt that tells the model what to capture.

**One write, multiple representations, all retrievable.** This is why property descriptions are the highest-leverage thing you author. The org whose properties carry the best descriptions is the org whose AI notices the most. Design the descriptions, and you design what the business remembers.

## The new normalization: choosing the boundary

The core design decision is no longer "which table." It is: **what do you crystallize into a typed, filterable property, and what do you leave as embedded prose or a document?**

- **Crystallize into a property:** high-frequency, filter-on, governance-critical, aggregatable facts. Cheap, exact, machine-readable.
- **Leave as prose (memory or document):** long-tail nuance, narrative, the "why." Rich, semantically retrievable.

Empirically, output quality saturates around **~7 well-selected memories per entity**. The constraint is curation, not capacity. Drawing this boundary well is the craft of the work.

## The opportunity lens: compaction vs raw queries vs RAG

This model is also where the architect finds the win. When a system is (a) passing raw records or N API calls into every prompt, or (b) RAG-chunking an entire corpus into context, it pays *linearly in tokens* and still hands the agent unfiltered signal. Personize compacts the corpus once at write time into ranked, typed, connected memory, then serves a small task-relevant payload per call (see [`cost-simulator.md`](./cost-simulator.md): roughly 2K tokens served vs ~50K dumped, often 80-90% LLM savings at scale).

Signals that say "model this in Personize instead":

- Raw data is being pumped into the prompt on every call.
- The same facts are re-derived across runs, sessions, or agents.
- A RAG layer cannot do exact filters, negation, or aggregation (it always can't, by construction).
- Cost scales with corpus size rather than with task complexity.

Compaction is not just a cost story; it is a *quality* story. A smaller, ranked, typed payload is a better prompt than a large unfiltered one.

## Why this scales to a fleet

Because memory is the shared substrate, the same model lets you dispatch many subagents (one per record) without each one re-deriving what the last already knew. Governed per-record memory in, predictable typed output out. That is what turns "an agent that drafts" into "a fleet that operates." (See [Agent Spawn: subagents in the database](https://hamedtaheri.com/articles/agent-spawn-subagents-in-the-database/) and the human-agent / agent-agent progression in [Who's running your CRM](https://hamedtaheri.com/articles/whos-running-your-crm-human-human-agent-or-agent-agent/).)

## Worked example: the engineering-memory kit

The shipped `engineering-memory` kit *is* this model applied to a software team. Entities: `module`, `initiative`, `contributor`, `decision`, `incident`, `release`, `monitor`, `dependency`. Edges: `initiative touches module`, `incident occurred_in module`, `incident fixed_in initiative`, `decision supersedes decision`. The payoff is the model working: *"what did the other agent learn here on Tuesday?"* becomes a single read of the initiative's cross-session timeline, not a re-derivation from git history.

Every kit is the same move for a different domain. "CRM Kit for Gyms" is the gym domain modeled as entities, properties, guidelines, and relations. When you design a kit, you are drawing one org's business model once, so every install starts with a memory of its world instead of an empty database.
