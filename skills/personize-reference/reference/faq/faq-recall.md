# Recall FAQ

**Q: What is the difference between the scout and brief modes of memory_retrieve?**
`memory_retrieve(mode='scout'|'brief')` (SDK `client.memory.retrieve`) is the only read path. `memory_retrieve(mode='scout')` returns a cheap multi-source aggregation across a record's memories. `memory_retrieve(mode='brief')` targets a specific question with LLM synthesis for a precise, narrative answer. The old names `retrieve_unified` and `smartRecall` are legacy names that translate to `memory_retrieve`.

**Q: What is the difference between fast and deep mode?**
Fast mode takes ~500ms and costs 1 credit, best for real-time use. Deep mode takes 10-20s and costs 2 credits; it synthesizes across more memories and produces higher-quality answers for complex queries.

**Q: What does session_id do?**
It links related queries so pronoun references resolve correctly (e.g. "what did she say?" after asking about a specific contact). Sessions have a 5-minute TTL; reuse the same ID within a conversation.

**Q: When should I use groupByRecord:true?**
Use it when searching across multiple entities and you want results organized by record rather than a flat list. Useful for cross-entity searches like "which contacts mentioned pricing this month."

**Q: What should I do if I get no results?**
Try a different identity key (email vs record_id), broaden the query text, or remove entity scope filters. Also verify the record has been saved, run `memory_save` first if unsure.
