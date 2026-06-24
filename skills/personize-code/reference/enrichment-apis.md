# Enrichment & Research APIs

Quick reference for Apollo.io, Tavily, and Exa APIs used in GTM pipelines.

---

## When to Use Which

| Need | Best Tool | Why |
|---|---|---|
| Contact data (title, company, seniority) | **Apollo.io** | Structured B2B database |
| Company data (size, industry, tech stack) | **Apollo.io** | Firmographic data |
| Recent company news, press releases | **Tavily** | Real-time web search |
| Funding rounds, hiring announcements | **Tavily** | News-focused search |
| Semantic queries ("companies using Kubernetes") | **Exa** | Neural/semantic search |
| Deep research on a topic or company | **Tavily + Exa** | Combine for breadth + depth |

---

## Apollo.io

### People Match (Enrich by Email)

```typescript
const response = await fetch("https://api.apollo.io/api/v1/people/match", {
  method: "POST",
  headers: {
    "x-api-key": process.env.APOLLO_API_KEY!,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "lead@company.com",
    reveal_personal_emails: false,
    reveal_phone_number: false,    // costs 8 credits if true
  }),
});
```

**Returns**: `person.first_name`, `person.last_name`, `person.title`, `person.seniority`, `person.linkedin_url`, `person.organization.name`, `person.organization.industry`, `person.organization.estimated_num_employees`, `person.organization.technologies[]`

### Rate Limits & Credits

| Plan | Calls/min | Calls/day | Credits/year |
|---|---|---|---|
| Free | 50 | 600 | 100 total |
| Basic ($49/mo) | 200 | 2,000 | 5,000 |
| Professional ($79/mo) | 200 | 2,000 | 10,000 |
| Organization ($119/mo) | 200 | 2,000 | 15,000 |

- Email lookup: 1 credit
- Phone number: 8 credits
- Overage: $0.20/credit

---

## Tavily

### Search API

```typescript
const response = await fetch("https://api.tavily.com/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    api_key: process.env.TAVILY_API_KEY!,
    query: '"Acme Corp" recent news product launches 2026',
    max_results: 5,
    days: 30,                  // only results from last N days
    search_depth: "basic",     // "basic" or "advanced" (2x cost)
    include_answer: false,     // AI-generated summary of results
  }),
});
```

**Returns**: `results[].title`, `results[].url`, `results[].content`, `results[].score`

### Pricing

- Free: 1,000 searches/month
- Paid: $0.01/search (basic), $0.02/search (advanced)

---

## Exa

### Search API (Semantic/Neural)

```typescript
const response = await fetch("https://api.exa.ai/search", {
  method: "POST",
  headers: {
    "x-api-key": process.env.EXA_API_KEY!,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    query: "B2B SaaS companies that recently raised Series B",
    numResults: 10,
    type: "auto",              // "keyword", "neural", or "auto"
    useAutoprompt: true,       // Exa optimizes the query
    startPublishedDate: "2026-01-01",
    contents: {
      text: true,
      highlights: { numSentences: 3 },
    },
  }),
});
```

**Returns**: `results[].title`, `results[].url`, `results[].text`, `results[].highlights[]`, `results[].publishedDate`

### When to Use Exa vs. Tavily

| Scenario | Use |
|---|---|
| "What's the latest news about Acme Corp?" | Tavily |
| "Find companies similar to Acme Corp in healthcare" | Exa |
| "Recent funding rounds in AI infrastructure" | Either (Tavily for news, Exa for broader) |
| "Companies that use HubSpot and have 50-200 employees" | Exa (semantic) |

---

## Waterfall Pattern

For maximum enrichment, run sources in sequence with fallbacks:

```typescript
// 1. Apollo (structured, fast, costs credits)
const apollo = await enrichWithApollo(email);

// 2. Tavily (web research, adds recent context)
const tavily = await searchWithTavily(`"${company}" news`);

// 3. Exa (semantic, fills gaps)
const exa = apollo?.organization
  ? await searchWithExa(`companies similar to ${company} in ${apollo.organization.industry}`)
  : null;

// 4. Memorize everything into Personize
await personize.memory.memorize({
  email,
  content: formatAllEnrichment(apollo, tavily, exa),
  speaker: "enrichment-pipeline",
  enhanced: true,
});
```
