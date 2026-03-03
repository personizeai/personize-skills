/**
 * Enrichment helpers for Apollo.io and Tavily.
 * Both use simple fetch — no SDK wrappers needed.
 *
 * Rate limits:
 *   Apollo: 50-200 calls/min depending on plan, 600-2000/day
 *   Tavily: ~1000 searches/month on free tier, unlimited on paid
 */

// ─── Apollo.io ──────────────────────────────────────────

export interface ApolloPersonResult {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  title: string;
  email: string;
  linkedin_url: string;
  seniority: string;
  departments: string[];
  organization: {
    name: string;
    website_url: string;
    industry: string;
    estimated_num_employees: number;
    annual_revenue: number;
    technologies: string[];
    keywords: string[];
  } | null;
}

/** Enrich a person by email via Apollo.io People Match API. */
export async function enrichWithApollo(
  email: string
): Promise<ApolloPersonResult | null> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.apollo.io/api/v1/people/match", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({
        email,
        reveal_personal_emails: false,
        reveal_phone_number: false, // costs 8 credits — opt in if needed
      }),
    });

    if (response.status === 429) {
      throw new Error("Apollo rate limit exceeded — will retry");
    }
    if (!response.ok) return null;

    const data = await response.json();
    return data.person || null;
  } catch (error) {
    if ((error as Error).message.includes("rate limit")) throw error;
    return null;
  }
}

/** Enrich a company by domain via Apollo.io Organizations API. */
export async function enrichCompanyWithApollo(
  domain: string
): Promise<ApolloPersonResult["organization"] | null> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      "https://api.apollo.io/api/v1/organizations/enrich",
      {
        method: "GET",
        headers: { "x-api-key": apiKey, "Cache-Control": "no-cache" },
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    return data.organization || null;
  } catch {
    return null;
  }
}

// ─── Tavily ─────────────────────────────────────────────

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilySearchResponse {
  results: TavilyResult[];
  answer?: string;
}

/** Search the web for company/person research via Tavily. */
export async function searchWithTavily(
  query: string,
  opts?: {
    maxResults?: number;
    days?: number;
    includeAnswer?: boolean;
  }
): Promise<TavilySearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { results: [] };

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: opts?.maxResults ?? 5,
        days: opts?.days ?? 30,
        include_answer: opts?.includeAnswer ?? false,
        search_depth: "basic",
      }),
    });

    if (!response.ok) return { results: [] };
    return await response.json();
  } catch {
    return { results: [] };
  }
}

// ─── Exa (Semantic Search) ──────────────────────────────

export interface ExaResult {
  title: string;
  url: string;
  text: string;
  highlights: string[];
  score: number;
  publishedDate?: string;
}

/**
 * Semantic search via Exa.ai — best for finding specific types of content
 * (e.g., "companies that use Kubernetes", "recent Series B announcements").
 * Use Tavily for general news research, Exa for semantic/conceptual queries.
 */
export async function searchWithExa(
  query: string,
  opts?: {
    numResults?: number;
    type?: "keyword" | "neural" | "auto";
    startPublishedDate?: string;
    useAutoprompt?: boolean;
    text?: boolean;
    highlights?: boolean;
  }
): Promise<{ results: ExaResult[] }> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return { results: [] };

  try {
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        numResults: opts?.numResults ?? 5,
        type: opts?.type ?? "auto",
        useAutoprompt: opts?.useAutoprompt ?? true,
        startPublishedDate: opts?.startPublishedDate,
        contents: {
          text: opts?.text !== false,
          highlights: { numSentences: 3 },
        },
      }),
    });

    if (!response.ok) return { results: [] };
    return await response.json();
  } catch {
    return { results: [] };
  }
}

// ─── Waterfall Enrichment ───────────────────────────────

/**
 * Waterfall enrichment: Apollo first (structured data), then Tavily (web research).
 * Returns a combined, formatted string ready for Personize memorization.
 */
export async function waterfallEnrich(opts: {
  email: string;
  company?: string;
}): Promise<{ apollo: ApolloPersonResult | null; research: TavilySearchResponse; formatted: string }> {
  // Step 1: Apollo for structured data
  const apollo = await enrichWithApollo(opts.email);

  // Step 2: Tavily for web research (use company name from Apollo if available)
  const companyName = opts.company || apollo?.organization?.name;
  const research = companyName
    ? await searchWithTavily(`"${companyName}" recent news product launches`, { maxResults: 5, days: 90 })
    : { results: [] };

  // Format for memorization
  const lines: string[] = [];

  if (apollo) {
    lines.push("## Enrichment (Apollo.io)");
    lines.push(`- Name: ${apollo.first_name} ${apollo.last_name}`);
    lines.push(`- Title: ${apollo.title}`);
    lines.push(`- Seniority: ${apollo.seniority}`);
    if (apollo.linkedin_url) lines.push(`- LinkedIn: ${apollo.linkedin_url}`);
    if (apollo.organization) {
      lines.push(`- Company: ${apollo.organization.name}`);
      lines.push(`- Industry: ${apollo.organization.industry}`);
      lines.push(`- Size: ${apollo.organization.estimated_num_employees} employees`);
      if (apollo.organization.technologies?.length) {
        lines.push(`- Tech stack: ${apollo.organization.technologies.slice(0, 10).join(", ")}`);
      }
    }
  }

  if (research.results.length > 0) {
    lines.push("\n## Web Research (Tavily)");
    for (const r of research.results) {
      lines.push(`- ${r.title}: ${r.content.substring(0, 200)}`);
    }
  }

  return { apollo, research, formatted: lines.join("\n") };
}
