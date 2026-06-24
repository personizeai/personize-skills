# Reference: Building Knowledge Bases with Context Docs

How to create structured, maintainable knowledge bases using Personize context docs. This pattern delivers 19x token reduction and 81% relevance compared to raw search, based on measured experiments on a 1.5M-token production codebase.

---

## The Pattern

Instead of dumping all knowledge into one large document or letting agents search raw sources, create **one reference doc per knowledge domain** with curated summaries that point to where details live.

```
Raw knowledge (scattered, expensive to search)
    ↓ Curate into structured docs
Domain reference docs (findable, token-efficient)
    ↓ Upload with proper types + tags
SmartContext retrieval (agent gets the right doc in one call)
```

### Why This Works

| Approach | Tokens/query | Relevance | Agent can act immediately? |
|---|---|---|---|
| Agent searches raw sources | ~30,000 | 100% (reads everything) | No -- still needs to understand structure |
| Auto-generated index (graph) | ~600 | 42% | No -- knows WHERE but not WHAT |
| **Curated reference docs** | **~1,500** | **81%** | **Yes -- gets architecture + constraints + file paths** |

The curated doc tells the agent what exists, how it connects, and what constraints apply -- enough to act on the first try instead of searching blindly.

---

## Step 1: Map Your Knowledge Domains

Identify the distinct areas of knowledge in your organization or project. Each domain becomes one context doc.

### For Code Projects

| Domain | What to document |
|---|---|
| Each module/service | Purpose, key files, dependencies, constraints |
| API surface | Endpoints, auth, rate limits, response format |
| Data model | Tables, schemas, relationships, migration rules |
| Deployment | Environments, CI/CD, rollback procedures |
| Security | Auth flows, PII handling, compliance rules |

### For Business Projects

| Domain | What to document |
|---|---|
| Sales process | Methodology, stages, approval thresholds |
| Product knowledge | Capabilities, limits, pricing, roadmap |
| Customer segments | ICPs, personas, qualifying criteria |
| Compliance | Legal requirements, data handling, privacy |
| Operations | Procedures, escalation paths, SLAs |

### Sizing Rule

Each domain doc should be **500-3,000 tokens** (roughly 1-4 pages of markdown). This is the sweet spot:
- Small enough that SmartContext can deliver 2-3 docs within a typical token budget
- Large enough to contain meaningful architectural context
- If a doc exceeds 4,000 tokens, split it into a main doc + attachments

---

## Step 2: Write Each Domain Doc

Use this template for every domain:

```markdown
# Domain: [Clear Name]

One-paragraph summary: what this covers, who uses it, why it matters.

## Purpose
- Core responsibility of this domain
- Key decisions or processes it governs
- Design philosophy or approach

## Key Resources
- `Resource Name` -- one-line description of what it is
- `Another Resource` -- description
(List every important artifact. Group by category if >10.)

## Dependencies
- What this domain needs from other domains
- What other domains need from this one

## Constraints (Danger Zones)
- **Constraint name**: What breaks and why. Be specific.
- **Another constraint**: Specific rule with consequences.
(Only real constraints -- not hypothetical ones.)
```

### Adapting the Template

**For code modules**, "Key Resources" becomes "Key Files":
```markdown
## Key Files
- `memory.controller.ts` -- HTTP handlers for all 30 endpoints
- `recall.service.ts` -- DynamoDB recall with structured properties
```

**For sales processes**, "Key Resources" becomes "Key Materials":
```markdown
## Key Materials
- `Enterprise Playbook v3` -- full MEDDIC-based process
- `Pricing Calculator` -- approved discount matrix
- `Competitor Battle Cards` -- approved talking points
```

**For compliance**, "Constraints" becomes the primary section:
```markdown
## Hard Constraints
- **Never store PII in logs** -- violates GDPR Article 5(1)(f)
- **Discounts >20% require CFO approval** -- per Q2 board resolution
- **No custom SLAs without engineering sign-off** -- capacity planning dependency
```

---

## Step 2b: Attach vs Reference -- What Goes Where

Each domain doc is a **routing layer**. It tells the agent what exists and where to find it. But some content should be attached directly (self-contained in Personize), while other content should be referenced by path (agent reads via file tools).

### The principle

> If the agent only has Personize (no file system, no browser, no database), can it still do the job? If yes -- attach. If it needs live access -- reference by path.

### Decision matrix

| Content type | Changes how often? | Approach |
|---|---|---|
| Source code | Daily | **Reference only** -- point to file paths, agent reads via tools |
| Route tables / API specs | Monthly | **Attach** -- stable enough, useful without file access |
| Pricing / business rules | Quarterly | **Attach** -- must be self-contained for any agent |
| Process docs / playbooks | Rarely | **Attach** -- this IS the source of truth |
| Templates / output formats | Rarely | **Attach** -- agent needs the actual content to use it |
| Architecture summaries | Monthly | **Attach** -- curated summary is the value |
| Live configs / env vars | Constantly | **Reference only** -- always read fresh from source |

### How to structure this in a domain doc

List both kinds of resources, clearly labeled:

```markdown
## Key Resources

### Source Files (agent reads via file tools)
- `src/modules/memory/recall.service.ts` -- recall implementation
- `src/modules/memory/memory.routes.ts` -- route definitions
- `src/config/pricing.json` -- live pricing config (read fresh)

### Reference Material (attached to this doc)
- `routes.md` -- complete route table with all endpoints [ATTACHED]
- `pricing-tiers.md` -- current credit costs per operation [ATTACHED]
- `architecture-flow.md` -- dual-write data flow diagram [ATTACHED]
```

### When to use each approach

**Attach when:**
- The content is stable (changes monthly or less)
- MCP-only agents need to act on it (no file system available)
- The content is a curated summary (not raw source)
- It's a template, schema, or reference table the agent needs verbatim

**Reference by path when:**
- The content changes frequently (source code, configs)
- The agent has file tools (IDE agents, Claude Code, Cursor)
- You want the agent to always read the current version
- The content is too large to attach (>50KB)

**Both when:**
- The domain doc points to source files AND has attached reference material
- Example: a module doc references source files in Key Files, but attaches the route table and dependency map as attachments

### Example: Code module with both

```markdown
## Key Files (read via file tools)
- `memory.controller.ts` -- 30 endpoint handlers
- `recall.service.ts` -- DynamoDB recall logic
- `memorize.service.ts` -- dual-write orchestration

## Reference Attachments
- `routes.md` -- full route table (attached)
- `dependencies.md` -- cross-module import map (attached)
- `dual-write-architecture.md` -- data flow explanation (attached)
```

### Example: Business domain (attach everything)

For business projects without file systems, attach all key materials:

```markdown
## Key Materials (all attached to this doc)
- `enterprise-playbook.md` -- full MEDDIC sales process
- `pricing-matrix.md` -- approved discount tiers
- `competitor-cards.md` -- positioning vs top 3 competitors
- `proposal-template.md` -- standard proposal format
```

---

## Step 3: Upload to Personize

### Create the docs

```typescript
import { Personize } from '@personize/sdk';
const client = new Personize({ secretKey: 'sk_live_...' });

const domains = [
  {
    name: 'domain-memory-module',
    type: 'reference',
    value: memoryModuleContent,
    description: 'RAG memory system: vector search, dual-write, identity resolution',
    tags: ['architecture', 'memory', 'module'],
  },
  {
    name: 'domain-sales-process',
    type: 'reference',
    value: salesProcessContent,
    description: 'Enterprise sales: MEDDIC methodology, pricing, approvals',
    tags: ['sales', 'process', 'enterprise'],
  },
];

for (const domain of domains) {
  const result = await client.context.create(domain);
  console.log(`Created: ${domain.name} -> ${result.data.id}`);
}
```

### Attach detailed resources

For each domain doc, attach detailed reference materials as attachments:

```typescript
await client.guidelines.uploadAttachment(docId, {
  file: Buffer.from(routesMarkdown),
  name: 'routes.md',
  type: 'reference',
  description: 'Route table for all memory API endpoints',
  usage: 'Read when looking up endpoint paths, methods, or parameters',
});
```

### Choosing the right context type

| Type | Use for |
|---|---|
| `reference` | Domain knowledge docs (architecture, specs, processes) |
| `guideline` | Rules the agent must follow (constraints, policies) |
| `playbook` | Step-by-step procedures (deployment, onboarding) |
| `template` | Output formats (proposals, emails, reports) |
| `brief` | Project-specific context (campaign briefs, deal context) |

Most knowledge base docs are `reference` type. Use `guideline` only for docs that contain hard constraints the agent must follow.

---

## Step 4: Maintain Over Time

### Staleness Detection

Knowledge bases decay as the underlying reality changes. Build a maintenance cadence:

| Trigger | Action |
|---|---|
| New feature/process added | Add to relevant domain doc |
| Resource renamed or removed | Update Key Resources section |
| New dependency between domains | Update Dependencies in both docs |
| New constraint discovered | Add to Constraints section |
| Major change (reorg, new product) | Full review of affected domain docs |

### Automated Checks

For code projects, compare git history against doc update dates:
```bash
# Which source areas changed since the doc was last updated?
git log --since="2 weeks ago" --name-only -- src/modules/memory/
```

For business projects, set a quarterly review calendar:
- Q1: Review all domain docs for accuracy
- After each major decision: Update affected constraints
- After each process change: Update affected playbooks

### Quality Checklist

For each domain doc, verify:
- [ ] Every key resource is listed and described
- [ ] Dependencies are current (nothing added/removed)
- [ ] Constraints reflect current reality (not fixed issues)
- [ ] Description is specific enough for SmartContext routing
- [ ] Tags enable meaningful filtering

---

## Step 5: Verify Retrieval Quality

After uploading, test that SmartContext routes correctly:

```typescript
// Does the right doc surface for each domain?
const testQueries = [
  'How does the memory module handle dual-write?',
  'What is our enterprise sales qualification process?',
  'What are the security requirements for PII handling?',
];

for (const query of testQueries) {
  const result = await client.context.retrieve({
    message: query,
    types: ['reference'],
    maxContentTokens: 5000,
  });

  const returned = result.data.selection?.map(s => s.name) || [];
  console.log(`Query: "${query}"`);
  console.log(`  Returned: ${returned.join(', ')}`);
}
```

If a doc doesn't surface for its expected queries:
1. **Improve the description** -- make it match the search vocabulary
2. **Enrich the first paragraph** -- SmartContext weighs the opening heavily
3. **Add tags** -- enable type-based filtering to narrow the search space

---

## Real-World Results

This pattern was validated on a production TypeScript codebase (1,322 files, ~1.5M tokens):

- **29 domain docs** covering all modules (~27K tokens total = 1.7% of source)
- **19.3x token reduction** vs raw search across 20 engineering tasks
- **81% keyword coverage** vs 42% for auto-generated knowledge graphs
- **100% routing accuracy** on code modification tasks (the most common use case)
- **~7,550 tokens per complete task** (doc retrieval + 2 targeted source reads) vs ~30,000 for raw search

The authoring effort was ~2 hours for 29 docs. The ongoing maintenance cost is low because the docs describe architecture and constraints (which change slowly), not implementation details (which change constantly).

---

## Anti-Patterns

| Anti-pattern | Why it fails | Do this instead |
|---|---|---|
| One giant doc with everything | Exceeds token budgets, low relevance per query | Split into domain-sized docs (500-3K tokens each) |
| Copy-pasting raw source/docs | No curation = same as raw search | Summarize into purpose + resources + constraints |
| Documenting implementation details | Changes constantly, always stale | Document architecture and constraints (stable) |
| No maintenance process | Docs rot silently | Set staleness checks on a cadence |
| Vague descriptions | SmartContext can't route correctly | Write descriptions that match search vocabulary |
| Too many tags | Noise drowns signal | Use 2-4 tags per doc: domain + type |
