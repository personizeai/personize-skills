# RAG FAQ

**Q: What is the difference between external and embedded RAG?**
External RAG connects your existing vector database to Personize — your data stays in your infrastructure. Embedded RAG lets Personize host the vector store; you ingest documents and search through the Personize API without managing infrastructure.

**Q: How do I ingest documents into embedded RAG?**
Call `client.rag.ingest` with a `projectId` and a `documents` array. Each document needs a `content` field and optional `metadata`. Ingestion is async — check status before searching if you need immediate availability.

**Q: How do I search a RAG project?**
Call `client.rag.searchProject` with your `query` string and `projectId`. Returns ranked document chunks with similarity scores. Combine with memory recall for hybrid retrieval across both structured memories and document content.

**Q: Does RAG support multimodal content?**
Yes — you can memorize and search images and rich media documents. Check multimodal status via the API before ingesting non-text content, as availability depends on your plan and the configured embedding model.
