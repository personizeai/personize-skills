# Workspace FAQ

**Q: What is a workspace?**
A workspace is a collaboration surface attached to any record — a contact, deal, company, or custom entity. It holds tasks, issues, notes, and status fields that agents and humans share to coordinate work on that record.

**Q: How do I create a workspace?**
Define workspace properties in your collection schema (e.g. `tasks`, `status`, `assignee`, `priority`). The workspace comes into existence when any agent or user writes the first property to a record via `memory_update_property`.

**Q: How do agents contribute to a workspace?**
Use `memory_update_property` with a `push` operation to append to arrays (tasks, issues) or `set` to update scalar fields (status, assignee). Always read the current workspace state first to avoid conflicts.

**Q: What are the standard lifecycle properties?**
Standard workspace properties are `status`, `assignee`, `priority`, `due_date`, and `last_activity_at`. These are recognized across skills and tools, enabling consistent filtering and reporting across workspaces.

**Q: How do multiple agents coordinate without conflicts?**
Agents should read the workspace before acting, check if a task is already claimed (assignee set), and only write if unclaimed. Use a claim-then-execute pattern: set `assignee` to your agent ID before starting work.
