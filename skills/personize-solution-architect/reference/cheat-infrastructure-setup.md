# Infrastructure Setup Quick Reference

| Step | Tool | Key Params |
|------|------|-----------|
| 1. Create entity types | entityTypes (auto from collection) | name, entityType on collection |
| 2. Create collections | collection_create | name, entityType, properties[] |
| 3. Seed governance | context_save | name, value, type:'guideline', tags[] |
| 4. Upload scripts | context_attachment_upload | guidelineId, file, type:"script" |
| 5. Connect MCPs | mcps.create | name, url, apiKey |
| 6. Test MCPs | mcps.test | url, apiKey |
| 7. Add webhooks | destinations.create | url, events[], secret |
| 8. Test webhooks | destinations.test | destinationId |
| 9. Set up workspace | Add workspace props to collection | tasks, issues, notes schema |

Always test each step before proceeding to the next.
Verify: mcps.refreshTools() after connecting, destinations.getLogs() after testing.
