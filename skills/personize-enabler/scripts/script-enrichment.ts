/**
 * script-enrichment.ts
 *
 * Research and enrich entity data from external sources (Tavily, Apollo),
 * then memorize the enriched profile into Personize.
 *
 * Usage:
 *   PERSONIZE_SECRET_KEY=... npx ts-node script-enrichment.ts \
 *     --email alice@example.com \
 *     --sources tavily,apollo \
 *     --dry-run=false
 *
 * Flags:
 *   --email <email>           Contact email to enrich (required)
 *   --company <name>          Company name (optional, improves Tavily research)
 *   --sources <list>          Comma-separated sources: tavily,apollo (default: tavily,apollo)
 *   --dry-run=false           Pass this flag to actually write (default: dry run)
 *
 * Environment variables:
 *   PERSONIZE_SECRET_KEY      Required
 *   APOLLO_API_KEY            Required for Apollo source
 *   TAVILY_API_KEY            Required for Tavily source
 */

import { Personize } from '@personize/sdk';

// ── CLI helpers ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const get = (flag: string): string | undefined => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (flag: string): boolean => args.includes(flag);
const dryRun = !has('--dry-run=false');

if (!process.env.PERSONIZE_SECRET_KEY) {
  console.error(JSON.stringify({ error: 'PERSONIZE_SECRET_KEY not set' }));
  process.exit(1);
}

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

// ── Config ───────────────────────────────────────────────────────────────────

const email   = get('--email');
const company = get('--company');
const sources = (get('--sources') ?? 'tavily,apollo').split(',').map(s => s.trim().toLowerCase());

if (!email) {
  console.error(JSON.stringify({ error: '--email <email> is required' }));
  process.exit(1);
}

// ── Apollo enrichment ─────────────────────────────────────────────────────────

interface ApolloPersonResult {
  first_name: string;
  last_name: string;
  title: string;
  email: string;
  linkedin_url?: string;
  seniority?: string;
  departments?: string[];
  organization?: {
    name: string;
    website_url?: string;
    industry?: string;
    estimated_num_employees?: number;
    annual_revenue?: number;
    technologies?: string[];
  } | null;
}

async function enrichWithApollo(emailAddr: string): Promise<ApolloPersonResult | null> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    process.stderr.write('APOLLO_API_KEY not set, skipping Apollo enrichment.\n');
    return null;
  }

  try {
    const resp = await fetch('https://api.apollo.io/api/v1/people/match', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({ email: emailAddr, reveal_personal_emails: false, reveal_phone_number: false }),
    });

    if (resp.status === 429) throw new Error('429: Apollo rate limit');
    if (!resp.ok) return null;

    const data = await resp.json();
    return data.person ?? null;
  } catch (err: unknown) {
    const msg = (err as Error).message ?? '';
    if (msg.includes('429')) throw err;
    process.stderr.write(`Apollo error: ${msg}\n`);
    return null;
  }
}

// ── Tavily web research ───────────────────────────────────────────────────────

interface TavilyResult { title: string; url: string; content: string; }
interface TavilyResponse { results: TavilyResult[]; answer?: string; }

async function searchWithTavily(query: string, opts?: { maxResults?: number; days?: number }): Promise<TavilyResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    process.stderr.write('TAVILY_API_KEY not set, skipping Tavily research.\n');
    return { results: [] };
  }

  try {
    const resp = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: opts?.maxResults ?? 5,
        days: opts?.days ?? 30,
        include_answer: false,
        search_depth: 'basic',
      }),
    });
    if (!resp.ok) return { results: [] };
    return await resp.json();
  } catch {
    return { results: [] };
  }
}

// ── Retry helper ──────────────────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const msg = (err as Error).message ?? '';
      const isRateLimit = msg.includes('429') || msg.toLowerCase().includes('rate limit');
      if (!isRateLimit || attempt === maxAttempts) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      process.stderr.write(`Rate limit, retrying in ${delay}ms...\n`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// ── Build enrichment content ──────────────────────────────────────────────────

function buildEnrichmentContent(opts: {
  email: string;
  apollo: ApolloPersonResult | null;
  tavily: TavilyResponse;
}): string {
  const lines: string[] = [
    `## Enrichment — ${new Date().toISOString()}`,
    `Email: ${opts.email}`,
    '',
  ];

  if (opts.apollo) {
    const a = opts.apollo;
    lines.push('### Contact (Apollo.io)');
    lines.push(`- Name: ${a.first_name} ${a.last_name}`);
    if (a.title) lines.push(`- Title: ${a.title}`);
    if (a.seniority) lines.push(`- Seniority: ${a.seniority}`);
    if (a.departments?.length) lines.push(`- Departments: ${a.departments.join(', ')}`);
    if (a.linkedin_url) lines.push(`- LinkedIn: ${a.linkedin_url}`);

    if (a.organization) {
      const org = a.organization;
      lines.push('');
      lines.push('### Company (Apollo.io)');
      lines.push(`- Company: ${org.name}`);
      if (org.website_url) lines.push(`- Website: ${org.website_url}`);
      if (org.industry) lines.push(`- Industry: ${org.industry}`);
      if (org.estimated_num_employees) lines.push(`- Size: ${org.estimated_num_employees} employees`);
      if (org.annual_revenue) lines.push(`- Annual Revenue: $${(org.annual_revenue / 1e6).toFixed(1)}M`);
      if (org.technologies?.length) lines.push(`- Tech stack: ${org.technologies.slice(0, 12).join(', ')}`);
    }
  }

  if (opts.tavily.results.length > 0) {
    lines.push('');
    lines.push('### Web Research (Tavily)');
    for (const r of opts.tavily.results) {
      lines.push(`- [${r.title}](${r.url})`);
      if (r.content) lines.push(`  ${r.content.substring(0, 250)}`);
    }
  }

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const summary = { total: 1, succeeded: 0, failed: 0, skipped: 0 };

  process.stderr.write(`Enriching ${email} from sources: ${sources.join(', ')}. dryRun: ${dryRun}\n`);

  // Run enrichment sources in parallel
  const [apolloResult, tavilyResult] = await Promise.all([
    sources.includes('apollo')
      ? withRetry(() => enrichWithApollo(email!)).catch(err => {
          process.stderr.write(`Apollo failed: ${(err as Error).message}\n`);
          return null;
        })
      : Promise.resolve(null),
    sources.includes('tavily')
      ? (async () => {
          const companyName = company
            ?? apolloResult?.organization?.name
            ?? email!.split('@')[1].split('.')[0];
          const [companyResearch, personResearch] = await Promise.all([
            searchWithTavily(`"${companyName}" company news product launch`, { maxResults: 3, days: 90 }),
            searchWithTavily(`${email} OR "${companyName}" site:linkedin.com`, { maxResults: 2, days: 365 }),
          ]);
          return {
            results: [...companyResearch.results, ...personResearch.results].slice(0, 5),
          };
        })()
      : Promise.resolve({ results: [] }),
  ]);

  const content = buildEnrichmentContent({
    email: email!,
    apollo: apolloResult,
    tavily: tavilyResult,
  });

  process.stderr.write(`Built enrichment content (${content.length} chars)\n`);

  if (dryRun) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      email,
      sources,
      apolloFound: !!apolloResult,
      tavilyResults: tavilyResult.results.length,
      contentPreview: content.substring(0, 500),
      message: 'Pass --dry-run=false to memorize',
    }, null, 2));
    return;
  }

  try {
    await withRetry(() =>
      client.memory.memorize({
        email:    email!,
        content,
        speaker:  'enrichment-script',
        tags:     ['enrichment', ...sources.map(s => `source:${s}`)],
      })
    );
    summary.succeeded++;
    process.stderr.write('Enrichment memorized.\n');
  } catch (err) {
    summary.failed++;
    process.stderr.write(`Memorize error: ${(err as Error).message}\n`);
  }

  console.log(JSON.stringify({
    ...summary,
    email,
    sources,
    apolloFound:   !!apolloResult,
    tavilyResults: tavilyResult.results.length,
    mode: 'live',
  }));
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
