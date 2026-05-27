# Governance FAQ

**Q: How do I create a guideline?**
Call `guideline_create` with `name`, `value`, and optional `tags`. The name is a short identifier, value is the full policy text, and tags control when the guideline surfaces in SmartContext queries.

**Q: What is smart-update and when should I use it?**
`smart-update` uses AI to intelligently merge your changes with the existing guideline value rather than overwriting it. Use it when updating a guideline that has evolved organically and you want to preserve context while adding new rules.

**Q: How many tags should I use and what format?**
Use 2-5 tags per guideline. Combine audience tags (`audience:sales`, `audience:support`) with domain tags (`domain:pricing`, `domain:onboarding`). Good tagging significantly boosts relevance scoring in SmartContext.

**Q: What does alwaysOn do?**
Guidelines marked `alwaysOn:true` are loaded into every SmartContext query regardless of relevance, with a +0.15 boost. Limit to 2-3 per org — overuse dilutes context quality and increases token cost.

**Q: What are attachments and how do they work?**
Attachments are files linked to a guideline (e.g. a pricing sheet, an SOP). They auto-surface in SmartContext when the parent guideline is retrieved. Keep inline content under 2KB; link larger files by URL.

### What's the difference between guidelines and context docs?
Context (formerly Context Docs) is the unified concept. Guidelines are one type of context doc (enforceable rules). Other types: playbooks (step-by-step processes), references (background info), templates (output scaffolds), briefs (account context). Use `/api/v1/context` for all types, `/api/v1/guidelines` for guidelines only.

### How do I create a playbook?
`POST /api/v1/context` with `type: "playbook"`. CLI: `personize context-docs create --type playbook --name "Name" --file sop.md`. MCP: `context_manage_create({ ..., contextDocType: "playbook" })`.

### Will smart_guidelines return playbooks?
No. `smart_guidelines` / `ai_smart_guidelines` returns only guidelines. Use `smart_docs` / `ai_smart_docs` for all types or filter with the `types` parameter.

### What's the canonical API structure?
- `/context/manage/*` for CRUD (create, list, update, delete)
- `/context/retrieve` for AI-powered doc routing (was `/ai/smart-docs`)
- `/context/save` for AI-powered doc evolution (was `/smart-update`)
- `/guidelines/*` routes remain as stable aliases. `/agentdocs/*` paths also remain as stable aliases.
