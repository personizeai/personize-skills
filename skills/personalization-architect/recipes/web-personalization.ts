/**
 * Recipe: Web Page Personalization — AI-Generated UI Variables
 *
 * Best practice for AI-powered web personalization in 2026:
 * Don't generate raw HTML. Instead, define UI VARIABLES (slots) in your
 * web app or CMS, and let the AI generate the values. The web app handles
 * layout, styling, and rendering — the AI handles content.
 *
 * Pattern:
 *   1. Define variable slots in your HTML/React/Vue templates
 *   2. When a user visits, call this pipeline to generate their values
 *   3. Your web app injects the values into the template
 *   4. Cache the values (they don't change every page load)
 *
 * Example template variables:
 *   {{hero_headline}}        — personalized hero section heading
 *   {{hero_subheading}}      — personalized subheading
 *   {{cta_text}}             — personalized call-to-action button text
 *   {{cta_url}}              — personalized CTA destination
 *   {{feature_highlights}}   — which features to spotlight (JSON array)
 *   {{social_proof}}         — which testimonial/case study is most relevant
 *   {{pricing_nudge}}        — personalized pricing section copy
 *   {{onboarding_tip}}       — contextual help based on their progress
 *   {{dashboard_greeting}}   — "Good morning, Jane — your pipeline grew 12% this week"
 *   {{recommended_actions}}  — AI-suggested next actions (JSON array)
 *
 * Usage:
 *   PERSONIZE_SECRET_KEY=sk_live_... npx ts-node recipes/web-personalization.ts jane@acme.com
 *
 * As an API (Express/Next.js):
 *   See the "Integration with Web Frameworks" section at the bottom.
 */

import { Personize } from '@personize/sdk';
import 'dotenv/config';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VARIABLE DEFINITIONS — Define what you want the AI to generate
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface PersonalizationVariable {
    key: string;                // template variable name: {{key}}
    description: string;        // what this variable is for
    type: 'text' | 'json';     // plain text or structured JSON
    maxLength?: number;         // character limit
    fallback: string;           // default value if AI can't generate
}

// Define the variables your web app uses
const PAGE_VARIABLES: Record<string, PersonalizationVariable[]> = {

    // Dashboard page — the logged-in homepage
    dashboard: [
        {
            key: 'dashboard_greeting',
            description: 'A warm, personalized greeting that references something specific about the user (their recent activity, an achievement, or a relevant data point). Not just "Hello, [name]" — make it insightful.',
            type: 'text',
            maxLength: 150,
            fallback: 'Welcome back!',
        },
        {
            key: 'recommended_actions',
            description: 'A JSON array of 3 recommended next actions for this user based on their usage patterns, goals, and what they haven\'t explored yet. Each: { "title": "...", "description": "...", "url": "/path", "priority": "high|medium|low" }',
            type: 'json',
            fallback: '[]',
        },
        {
            key: 'insight_of_the_day',
            description: 'One personalized insight about their data or usage. Reference a specific metric, trend, or pattern. Example: "Your response rate jumped to 34% — 2x your average. That new subject line approach is working."',
            type: 'text',
            maxLength: 200,
            fallback: '',
        },
        {
            key: 'onboarding_tip',
            description: 'If the user hasn\'t completed setup or hasn\'t discovered a key feature, suggest it. If they\'re fully onboarded, leave empty. Reference what they\'ve already done to show progress.',
            type: 'text',
            maxLength: 150,
            fallback: '',
        },
    ],

    // Pricing page — personalized for upsell
    pricing: [
        {
            key: 'pricing_headline',
            description: 'Personalized headline for the pricing page that speaks to the user\'s specific needs. Reference their usage, team size, or the features they care about.',
            type: 'text',
            maxLength: 100,
            fallback: 'Choose the plan that fits your needs',
        },
        {
            key: 'recommended_plan',
            description: 'Which plan to highlight based on their usage. One of: "starter", "pro", "enterprise". Include reasoning.',
            type: 'text',
            maxLength: 50,
            fallback: 'pro',
        },
        {
            key: 'pricing_nudge',
            description: 'A short personalized message explaining why the recommended plan is right for them. Reference specific features they use or would benefit from. Under 100 words.',
            type: 'text',
            maxLength: 400,
            fallback: '',
        },
        {
            key: 'social_proof',
            description: 'Which testimonial or case study to show. Pick the one most relevant to this user\'s industry, company size, or use case. Return as JSON: { "quote": "...", "author": "...", "company": "...", "logo": "..." }',
            type: 'json',
            fallback: '{}',
        },
    ],

    // Landing page — for known visitors (via cookie/email identification)
    landing: [
        {
            key: 'hero_headline',
            description: 'Personalized hero headline that speaks to the visitor\'s specific pain point or goal. Reference their industry, role, or company if known.',
            type: 'text',
            maxLength: 80,
            fallback: 'Personalize every customer interaction with AI',
        },
        {
            key: 'hero_subheading',
            description: 'Supporting text under the headline. Expand on the value proposition relevant to this visitor.',
            type: 'text',
            maxLength: 150,
            fallback: 'Build memory-powered AI that knows your customers as well as your best sales rep.',
        },
        {
            key: 'cta_text',
            description: 'Call-to-action button text. Personalized based on where they are in the journey (new visitor vs returning vs trialing).',
            type: 'text',
            maxLength: 30,
            fallback: 'Start Free Trial',
        },
        {
            key: 'feature_highlights',
            description: 'Which 3 features to spotlight in the features section, based on what this visitor cares about. JSON array of: { "title": "...", "description": "...", "icon": "..." }',
            type: 'json',
            fallback: '[]',
        },
    ],
};


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GENERATION — Assemble Context → Generate All Variables at Once
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function generatePageVariables(
    email: string,
    page: string,
): Promise<Record<string, string>> {
    const variables = PAGE_VARIABLES[page];
    if (!variables) {
        throw new Error(`Unknown page: ${page}. Available: ${Object.keys(PAGE_VARIABLES).join(', ')}`);
    }

    // Assemble deep context using smartDigest (most efficient — single call)
    const [vars, digest] = await Promise.all([
        client.ai.smartContext({
            message: `web page personalization for ${page} page`,
            tags: ['personalization', 'web'],
        }),
        client.memory.smartDigest({
            email,
            type: 'Contact',
            token_budget: 2500,
            include_properties: true,
            include_memories: true,
        }),
    ]);

    const contextParts: string[] = [];
    if (vars.data?.compiledContext) {
        contextParts.push('## Brand & Personalization Guidelines\n' + vars.data.compiledContext);
    }
    if (digest.data?.compiledContext) {
        contextParts.push('## Visitor Profile\n' + digest.data.compiledContext);
    }
    const context = contextParts.join('\n\n---\n\n');

    // Build the generation prompt with all variable definitions
    const variableSpec = variables.map(v =>
        `- **${v.key}** (${v.type}${v.maxLength ? `, max ${v.maxLength} chars` : ''}): ${v.description}`
    ).join('\n');

    const result = await client.ai.prompt({
        context,
        instructions: [
            {
                prompt: `You are generating personalized UI variables for the "${page}" page.

The visitor is identified by email: ${email}. Use their full context above.

Generate values for each variable below. Output ONLY valid JSON with variable keys as keys and generated values as values. For "json" type variables, the value should be a valid JSON string.

Variables to generate:
${variableSpec}

Important:
- Every value must be personalized to this specific visitor — reference their data
- Respect max character lengths strictly
- For JSON-type variables, ensure the value is valid parseable JSON
- If you lack sufficient context for a variable, use the fallback concept but still personalize what you can
- Never use placeholder text like "[Company Name]" — use actual values or omit

Output format: { "key1": "value1", "key2": "value2", ... }`,
                maxSteps: 5,
            },
        ],
    });

    // Parse the AI's JSON output
    const output = String(result.data || '{}');
    let generated: Record<string, string>;

    try {
        // Extract JSON from the response (it might be wrapped in markdown code blocks)
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        generated = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
        console.warn('Failed to parse AI output as JSON, using fallbacks');
        generated = {};
    }

    // Fill in fallbacks for any missing variables
    const final: Record<string, string> = {};
    for (const v of variables) {
        final[v.key] = generated[v.key] || v.fallback;

        // Enforce max length
        if (v.maxLength && final[v.key].length > v.maxLength) {
            final[v.key] = final[v.key].substring(0, v.maxLength - 3) + '...';
        }
    }

    return final;
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CACHING — Don't regenerate on every page load
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const cache = new Map<string, { variables: Record<string, string>; expiresAt: number }>();

const CACHE_TTL: Record<string, number> = {
    dashboard: 4 * 60 * 60 * 1000,   // 4 hours — changes with activity
    pricing:   24 * 60 * 60 * 1000,  // 24 hours — stable context
    landing:   12 * 60 * 60 * 1000,  // 12 hours — balance freshness and cost
};

async function getPersonalizedVariables(
    email: string,
    page: string,
): Promise<Record<string, string>> {
    const cacheKey = `${email}:${page}`;
    const cached = cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
        return cached.variables;
    }

    const variables = await generatePageVariables(email, page);

    cache.set(cacheKey, {
        variables,
        expiresAt: Date.now() + (CACHE_TTL[page] || 4 * 60 * 60 * 1000),
    });

    return variables;
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTEGRATION WITH WEB FRAMEWORKS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/*
// ── Express.js API endpoint ──

import express from 'express';
const app = express();

app.get('/api/personalize/:page', async (req, res) => {
    const email = req.query.email as string || req.user?.email;
    if (!email) return res.json(getDefaultVariables(req.params.page));

    try {
        const variables = await getPersonalizedVariables(email, req.params.page);
        res.json(variables);
    } catch (err) {
        // Fail silently — return defaults, never block page render
        res.json(getDefaultVariables(req.params.page));
    }
});

function getDefaultVariables(page: string): Record<string, string> {
    const vars = PAGE_VARIABLES[page] || [];
    const defaults: Record<string, string> = {};
    for (const v of vars) defaults[v.key] = v.fallback;
    return defaults;
}


// ── Next.js Server Component ──

// app/dashboard/page.tsx
async function DashboardPage({ params }: { params: any }) {
    const email = await getCurrentUserEmail(); // your auth function

    // Fetch personalized variables on the server
    const vars = email
        ? await getPersonalizedVariables(email, 'dashboard')
        : getDefaultVariables('dashboard');

    return (
        <div>
            <h1>{vars.dashboard_greeting}</h1>
            {vars.insight_of_the_day && <p className="insight">{vars.insight_of_the_day}</p>}
            {vars.onboarding_tip && <div className="tip">{vars.onboarding_tip}</div>}
            <RecommendedActions actions={JSON.parse(vars.recommended_actions || '[]')} />
        </div>
    );
}


// ── React Client-Side (fetch on mount) ──

function usePerosnalizedVariables(page: string) {
    const [vars, setVars] = useState<Record<string, string>>({});

    useEffect(() => {
        fetch(`/api/personalize/${page}`)
            .then(r => r.json())
            .then(setVars)
            .catch(() => {}); // fail silently
    }, [page]);

    return vars;
}

function Dashboard() {
    const vars = usePerosnalizedVariables('dashboard');
    return <h1>{vars.dashboard_greeting || 'Welcome back!'}</h1>;
}


// ── CMS (Webflow, WordPress, etc.) ──
// For CMS-managed sites, expose the variables as a JSON API endpoint.
// Use client-side JavaScript to fetch and inject:

// <script>
// fetch('/api/personalize/landing?email=' + getUserEmail())
//     .then(r => r.json())
//     .then(vars => {
//         document.querySelector('[data-pz="hero_headline"]').textContent = vars.hero_headline;
//         document.querySelector('[data-pz="hero_subheading"]').textContent = vars.hero_subheading;
//         document.querySelector('[data-pz="cta_text"]').textContent = vars.cta_text;
//     });
// </script>
*/


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI — Generate and preview variables for a user
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function run() {
    const email = process.argv[2];
    const page = process.argv[3] || 'dashboard';

    if (!email || email.startsWith('--')) {
        console.error('Usage: npx ts-node recipes/web-personalization.ts <email> [page]');
        console.error(`Pages: ${Object.keys(PAGE_VARIABLES).join(', ')}`);
        process.exit(1);
    }

    const { data: me } = await client.me();
    if (!me) throw new Error('Auth failed');

    console.log(`Generating personalized "${page}" variables for ${email}...\n`);

    const variables = await generatePageVariables(email, page);

    console.log('Generated Variables:');
    console.log('─'.repeat(60));
    for (const [key, value] of Object.entries(variables)) {
        const display = value.length > 120 ? value.substring(0, 120) + '...' : value;
        console.log(`  {{${key}}}`);
        console.log(`    → ${display}\n`);
    }

    console.log('─'.repeat(60));
    console.log('\nFull JSON output:');
    console.log(JSON.stringify(variables, null, 2));
}

run().catch(err => { console.error('Fatal:', err.message || err); process.exit(1); });
