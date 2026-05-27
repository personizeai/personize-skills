# Smart Update FAQ

**Q: What is smart update?**
AI-powered evolution for guidelines and collections. Feed it an instruction + evidence, it analyzes existing content and proposes or applies changes. `guidelines.smartUpdate({ type, instruction, material, strategy })`.

**Q: suggest vs apply?**
`suggest` returns proposed changes for review (recommended for production). `apply` makes changes directly. SHOULD use suggest for anything affecting live operations.

**Q: Can I use it for schema evolution?**
Yes. `type: 'collections'` analyzes existing schemas and proposes property additions, description improvements, or structural changes based on your instruction and material.

**Q: How do I rollback a bad change?**
Guidelines: `guidelines.history(id)` returns snapshots. Find the previous version and apply it via `guidelines.update(id, { value: previousValue })`.
Collections: `collections.history(id, { mode: 'diff' })` shows what changed. Revert by updating with previous property definitions.

**Q: Should I include historyNote?**
Always. `guidelines.update(id, { value, historyNote: "why this changed" })` creates an audit trail. Without it, future agents can't understand why changes were made.
