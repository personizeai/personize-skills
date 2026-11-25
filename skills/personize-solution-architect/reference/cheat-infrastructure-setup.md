# Infrastructure Setup Quick Reference

> **Personize Private:** use the granular names instead: `collection_list`, `collection_create`, `collection_update`, `collection_delete`, `collection_delete_property`, `context_manage_list` / `context_manage_read` / `context_manage_history`.

| Step | Tool | Key Params |
|------|------|-----------|
| 1. Create entity types | entityTypes (auto from collection) | name, entityType on collection |
| 2. Create collections | collection({op:'create', ...}) | name, entityType, properties[] |
| 3. Seed governance | memory_save shape=document | name, content, type:'guideline', tags[] |
| 4. Upload scripts | memory_save shape=document | name, content, type:'script' (attachments/file not yet supported on the document shape) |
| 5. Connect MCPs | mcps.create | name, url, apiKey |
| 6. Test MCPs | mcps.test | url, apiKey |
| 7. Add webhooks | destinations.create | url, events[], secret |
| 8. Test webhooks | destinations.test | destinationId |
| 9. Set up workspace | Add workspace props to collection | tasks, issues, notes schema |

Always test each step before proceeding to the next.
Verify: mcps.refreshTools() after connecting, destinations.getLogs() after testing.
