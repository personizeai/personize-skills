# Reference: GENERATE Action

Complete guardrails framework for producing production-quality content with Personize. Covers format rules, hallucination prevention, channel-specific templates, structured output parsing, self-evaluation, and testing patterns.

---

## Why Guardrails Matter

Every AI-generated message is a promise from your brand. Bad output = broken trust. The GENERATE action ensures every piece of content is:

1. **Correctly formatted** for the delivery channel
2. **Honest** — no fabricated facts, stats, or promises
3. **Structured** — subject and body as separate parseable fields
4. **Appropriately scoped** — personalized where it helps, not where it's creepy
5. **Flagged** when it touches sensitive territory

---

## The Generation Pipeline

```
GOVERNANCE → CONTEXT → GUARDRAILS CHECK → GENERATE → VALIDATE → FORMAT → DELIVER
```

### Step 1: Load Governance First

**Always** call `smartGuidelines()` before generating. This fetches organizational rules, tone guides, policies, and constraints.

```typescript
const governance = await client.ai.smartGuidelines({
    message: 'email writing guidelines, brand voice, compliance rules, prohibited topics',
    tags: ['content', 'generation'],
});
```

If governance returns empty:
- Warn the developer: "No governance variables found. Generation without guidelines risks off-brand or non-compliant output."
- Suggest they set up variables via the Personize web app or the Governance Manager skill.

### Step 2: Assemble Context

```typescript
async function assembleGenerationContext(
    email: string,
    purpose: string,
): Promise<string> {
    const sections: string[] = [];

    // Governance — rules and guidelines
    const governance = await client.ai.smartGuidelines({
        message: `${purpose} — tone, format, compliance rules`,
        tags: ['content', 'generation'],
    });
    if (governance.data?.compiledContext) {
        sections.push('## Organizational Guidelines\n' + governance.data.compiledContext);
    }

    // Entity context — who is this for?
    const digest = await client.memory.smartDigest({
        email,
        type: 'Contact',
        token_budget: 2000,
        include_properties: true,
        include_memories: true,
    });
    if (digest.data?.compiledContext) {
        sections.push('## Recipient Context\n' + digest.data.compiledContext);
    }

    // Previous outputs — what have we already sent?
    const history = await client.memory.smartRecall({
        query: `previous ${purpose} messages sent`,
        email,
        limit: 5,
        min_score: 0.4,
        fast_mode: true,
    });
    if (history.data?.results && Array.isArray(history.data.results) && history.data.results.length > 0) {
        sections.push('## Previously Sent Content\n' + history.data.results.map((m: any) =>
            `- ${m.text || m.content || JSON.stringify(m)}`
        ).join('\n'));
    }

    return sections.join('\n\n---\n\n');
}
```

### Step 3: Generate with Guardrails

```typescript
interface GenerationRequest {
    email: string;
    channel: 'email' | 'sms' | 'slack' | 'push' | 'in-app';
    purpose: string;           // "cold outreach", "welcome", "renewal reminder"
    additionalContext?: string; // any extra context the developer provides
}

interface GeneratedContent {
    channel: string;
    subject?: string;          // email only
    bodyHtml?: string;         // email only
    bodyText: string;          // all channels
    buttonLabel?: string;      // notifications with buttons
    buttonUrl?: string;        // notifications with buttons
    reviewFlag?: string;       // set when human review is recommended
}

async function generateWithGuardrails(req: GenerationRequest): Promise<GeneratedContent> {
    const context = await assembleGenerationContext(req.email, req.purpose);
    const fullContext = req.additionalContext
        ? context + '\n\n---\n\n## Additional Context\n' + req.additionalContext
        : context;

    const formatInstructions = getFormatInstructions(req.channel);

    const result = await client.ai.prompt({
        context: fullContext,
        instructions: [
            // Step 1: Analyze recipient and goal
            {
                prompt: `Analyze the recipient and the goal.
Goal: ${req.purpose}
Channel: ${req.channel}

Questions to answer:
1. What specific facts do we know about this person?
2. What is the ONE outcome we want from this message?
3. Which facts are relevant to the goal (not just interesting)?
4. What have we already sent them? (Avoid repetition.)`,
                maxSteps: 3,
            },
            // Step 2: Review governance constraints
            {
                prompt: `Review the organizational guidelines above. List every constraint that applies:
- Forbidden topics or claims
- Required disclaimers or legal text
- Tone and voice requirements
- Format requirements
- Any promises or stats that ARE explicitly approved to use

CRITICAL: If the guidelines don't explicitly provide a stat, case study, testimonial, or claim — you MUST NOT invent one. Only use facts that appear in the context.`,
                maxSteps: 2,
            },
            // Step 3: Generate the content
            {
                prompt: `Generate the message for the ${req.channel} channel.

${formatInstructions}

OUTPUT FORMAT — use these exact field labels:
${req.channel === 'email' ? 'SUBJECT: (plain text, no HTML, ≤ 80 chars)\nBODY_HTML: (full HTML with <p>, <b>, <i>, <a>, <br> tags)\nBODY_TEXT: (plain text fallback)' : 'BODY_TEXT: (the message content)'}
${['push', 'in-app'].includes(req.channel) ? 'BUTTON_LABEL: (2-3 words, e.g. "View Report")\nBUTTON_URL: (absolute https:// URL or deep link)' : ''}
SENSITIVE: YES or NO (if YES, explain why human review is recommended)

RULES:
- Every fact you reference must come from the context above
- Do NOT invent statistics, case studies, customer names, or quotes
- Do NOT combine subject and body into one block
- Personalize with relevant facts only — skip tangential personal details
- If you lack sufficient context to write a good message, say so instead of padding with generic filler`,
                maxSteps: 5,
            },
        ],
        evaluate: true,
        evaluationCriteria: [
            '(1) No fabricated facts, stats, or promises',
            '(2) Subject and body are separate fields (if email)',
            `(3) Format matches ${req.channel} requirements`,
            '(4) Within length limits for the channel',
            '(5) All governance constraints followed',
            '(6) Personalization is relevant, not tangential',
        ].join(', '),
    });

    return parseGeneratedOutput(String(result.data || ''), req.channel);
}
```

---

## Channel Format Rules — Complete Reference

### Email

```
Subject:
  - Plain text, no HTML
  - ≤ 80 characters
  - No emoji unless governance explicitly allows it
  - Must be a separate field from body

Body:
  - HTML required: <p>, <b>, <i>, <a href="...">, <br>, <ul>, <li>
  - Always provide a plain-text fallback (strip tags)
  - Max ~300 words for cold outreach, ~500 for newsletters
  - No "I hope this email finds you well" or similar filler
  - CTA as an <a> tag or clear instruction, not buried in text

Structure:
  SUBJECT: ...
  BODY_HTML: <p>...</p>
  BODY_TEXT: ...
```

### SMS / Text

```
  - Plain text ONLY — no HTML, no markdown
  - ≤ 160 characters (1 SMS segment)
  - If URL needed: use a shortener, count the chars
  - First sentence = the point
  - No salutation ("Hi John,") — wastes chars
  - No signature — wastes chars
```

### Slack

```
  - Slack markdown: *bold*, _italic_, `code`, >quote
  - DM: ≤ 150 words
  - Channel post: ≤ 300 words
  - Use bullet lists for multiple points
  - Use >quote blocks for emphasis
  - Links: <https://url.com|Display Text>
```

### Push Notification

```
  - Title: ≤ 50 characters
  - Body: ≤ 100 characters
  - Action button label: 2-3 words ("View Report", "Reply Now")
  - Button URL: absolute https:// or deep link (yourapp://path)
  - NO placeholder URLs — must be real, working links
```

### In-App Notification

```
  - Body: ≤ 100 words
  - If buttons supported:
    - Primary button: specific action verb
    - URL: absolute path within the app (https://app.company.com/...)
    - Or deep link format matching the app's routing scheme
  - Can include light formatting if the UI supports it
```

---

## Output Parsing

Parse the structured output from the AI:

```typescript
function parseGeneratedOutput(raw: string, channel: string): GeneratedContent {
    const result: GeneratedContent = { channel, bodyText: '' };

    // Parse subject (email only)
    const subjectMatch = raw.match(/SUBJECT:\s*(.+)/i);
    if (subjectMatch) result.subject = subjectMatch[1].trim();

    // Parse HTML body
    const htmlMatch = raw.match(/BODY_HTML:\s*([\s\S]+?)(?=\n(?:BODY_TEXT|BUTTON_LABEL|SENSITIVE|$))/i);
    if (htmlMatch) result.bodyHtml = htmlMatch[1].trim();

    // Parse text body
    const textMatch = raw.match(/BODY_TEXT:\s*([\s\S]+?)(?=\n(?:BUTTON_LABEL|SENSITIVE|$))/i);
    if (textMatch) result.bodyText = textMatch[1].trim();

    // Parse button (push/in-app)
    const buttonLabelMatch = raw.match(/BUTTON_LABEL:\s*(.+)/i);
    const buttonUrlMatch = raw.match(/BUTTON_URL:\s*(.+)/i);
    if (buttonLabelMatch) result.buttonLabel = buttonLabelMatch[1].trim();
    if (buttonUrlMatch) result.buttonUrl = buttonUrlMatch[1].trim();

    // Parse sensitive flag
    const sensitiveMatch = raw.match(/SENSITIVE:\s*(YES|NO)/i);
    if (sensitiveMatch?.[1]?.toUpperCase() === 'YES') {
        const reason = raw.match(/SENSITIVE:\s*YES[,\s]*(.+)/i)?.[1]?.trim();
        result.reviewFlag = reason || 'Content flagged for human review';
    }

    // Fallback: if no structured fields found, use the whole output as bodyText
    if (!result.bodyText && !result.bodyHtml) {
        result.bodyText = raw.trim();
    }

    return result;
}
```

---

## Hallucination Prevention

### The Rule

> If it's not in the context, it doesn't exist. The AI must NEVER:
> - Invent a statistic ("companies see 40% improvement...")
> - Fabricate a case study ("one of our clients, Acme Corp...")
> - Promise a capability the product doesn't have
> - Quote a person who didn't say it
> - Reference a study that isn't cited in governance

### How to Enforce

1. **Governance variables** are the source of truth for claims. If you want the AI to cite stats, add them to governance.
2. **Evaluation criteria** explicitly checks for fabrication.
3. **When in doubt, omit.** A shorter honest message beats a longer fabricated one.
4. **Post-generation check:** If the output contains numbers, percentages, or named entities not present in context — flag it.

```typescript
function checkForHallucination(output: string, context: string): string[] {
    const warnings: string[] = [];

    // Check for percentage claims
    const percentages = output.match(/\d+%/g) || [];
    for (const pct of percentages) {
        if (!context.includes(pct)) {
            warnings.push(`Possible fabricated stat: "${pct}" not found in context`);
        }
    }

    // Check for "our clients" / "customers" claims
    if (/our (clients|customers|users).*(?:saw|achieved|reported|experienced)/i.test(output)) {
        warnings.push('Contains client success claim — verify against governance');
    }

    return warnings;
}
```

---

## Personalization Calibration

### The Spectrum

```
TOO LITTLE                          JUST RIGHT                          TOO MUCH
"Dear Customer"          "Sarah, your Q4 pipeline             "Sarah, I noticed you
                          grew 12% — here's how                searched for 'vacation
                          to close those 3 open                 rentals in Cabo' and
                          enterprise deals."                    your Spotify is mostly
                                                                jazz — anyway, here's
                                                                your sales report."
```

### Rules

1. **Relevance first.** Only personalize with facts that serve the message's goal.
2. **1-2 personal references per message** is the sweet spot. More feels surveillance-like.
3. **Role and work context > personal details.** "VP of Sales at Initech" is useful. Their Spotify habits are not.
4. **Recency matters.** Reference recent activity, not data from 6 months ago.
5. **Never personalize with sensitive data** (health, financial difficulties, personal relationships) unless the product specifically handles that domain.

---

## Testing Patterns

### Dry Run with Review Flag

```typescript
const DRY_RUN = process.env.DRY_RUN !== 'false';

const content = await generateWithGuardrails({
    email: 'test@example.com',
    channel: 'email',
    purpose: 'cold outreach',
});

if (DRY_RUN) {
    console.log('=== DRY RUN OUTPUT ===');
    console.log('Subject:', content.subject);
    console.log('Body HTML:', content.bodyHtml);
    console.log('Body Text:', content.bodyText);
    if (content.reviewFlag) {
        console.log('⚠️ REVIEW FLAG:', content.reviewFlag);
    }
    // Don't deliver — just inspect
} else {
    await deliver(content);
}
```

### Batch Testing

Generate for 5-10 contacts and review before scaling:

```typescript
const testEmails = ['contact1@test.com', 'contact2@test.com', /* ... */];
const results = [];

for (const email of testEmails) {
    const content = await generateWithGuardrails({ email, channel: 'email', purpose: 'renewal reminder' });
    results.push({ email, ...content });
}

// Write results to a review file
fs.writeFileSync('generation-review.json', JSON.stringify(results, null, 2));
console.log(`Generated ${results.length} messages. Review generation-review.json before enabling delivery.`);
```

### A/B Comparison

Generate two versions with different governance variables to compare tone:

```typescript
// Version A: formal tone (set in governance)
const versionA = await generateWithGuardrails({ email, channel: 'email', purpose: 'cold outreach' });

// Version B: conversational tone (update governance variable, then generate)
// ... update governance variable via web app or API ...
const versionB = await generateWithGuardrails({ email, channel: 'email', purpose: 'cold outreach' });
```

---

## HTML Email Format Converter

When the AI generates plain text or markdown-style content for email, convert to proper HTML:

```typescript
function toEmailHtml(text: string): string {
    return text
        // Paragraphs: double newline → </p><p>
        .replace(/\n\n+/g, '</p><p>')
        // Line breaks: single newline → <br>
        .replace(/\n/g, '<br>')
        // Bold: **text** → <b>text</b>
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        // Italic: *text* → <i>text</i>
        .replace(/\*(.*?)\*/g, '<i>$1</i>')
        // Links: [text](url) → <a href="url">text</a>
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        // Wrap in <p> tags
        .replace(/^(.+)$/, '<p>$1</p>');
}
```

---

## Format Instruction Helper

Used internally by `generateWithGuardrails()`:

```typescript
function getFormatInstructions(channel: string): string {
    const rules: Record<string, string> = {
        email: `EMAIL FORMAT RULES:
- Subject line: plain text, no HTML, ≤ 80 chars. This is a SEPARATE field.
- Body: use HTML tags — <p> for paragraphs, <b> for bold, <i> for italic, <a href="..."> for links, <br> for line breaks.
- Also provide a plain-text version (no HTML tags).
- Max ~300 words.
- No generic openings ("I hope this finds you well").`,

        sms: `SMS FORMAT RULES:
- Plain text ONLY. No HTML, no markdown.
- MUST be ≤ 160 characters total.
- First sentence IS the message. No filler.
- No salutation or signature.`,

        slack: `SLACK FORMAT RULES:
- Use Slack markdown: *bold*, _italic_, \`code\`, >quote, bullet lists.
- ≤ 150 words for DMs.
- Links: <https://url|Display Text>.
- Be concise and scannable.`,

        push: `PUSH NOTIFICATION FORMAT RULES:
- Title: ≤ 50 characters.
- Body: ≤ 100 characters.
- Button label: 2-3 words max.
- Button URL: must be absolute https:// or a valid deep link (yourapp://path).
- NO placeholder URLs.`,

        'in-app': `IN-APP NOTIFICATION FORMAT RULES:
- Body: ≤ 100 words.
- If action button supported: specific verb label, absolute URL.
- Light formatting only.`,
    };

    return rules[channel] || rules['email'];
}
```
