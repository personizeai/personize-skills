/**
 * Shared helpers for workspace recipes.
 *
 * - safeParseJSON: robust JSON parsing for LLM output
 * - contributeEntry: DRY wrapper for memorize-with-tags
 */

import { Personize } from '@personize/sdk';

// ---------------------------------------------------------------------------
// safeParseJSON — Parse JSON from LLM output, handling common failure modes
// ---------------------------------------------------------------------------

/**
 * Safely parse JSON from LLM-generated text.
 *
 * LLMs frequently wrap JSON in markdown code fences or add commentary.
 * This function handles:
 *   - ```json ... ``` fences
 *   - ``` ... ``` fences (no language tag)
 *   - Leading/trailing whitespace and text around JSON
 *   - Falls back to the provided default on any parse error
 */
export function safeParseJSON<T = Record<string, unknown>>(
    raw: string | null | undefined,
    fallback: T = {} as T
): T {
    if (!raw) return fallback;

    let cleaned = String(raw).trim();

    // Strip markdown code fences: ```json ... ``` or ``` ... ```
    const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (fenceMatch) {
        cleaned = fenceMatch[1].trim();
    }

    // If it doesn't start with { or [, try to find the first JSON object/array
    if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
        const jsonStart = cleaned.search(/[{\[]/);
        if (jsonStart >= 0) {
            cleaned = cleaned.slice(jsonStart);
        }
    }

    try {
        return JSON.parse(cleaned) as T;
    } catch {
        return fallback;
    }
}

// ---------------------------------------------------------------------------
// contributeEntry — Write a workspace entry with proper tagging
// ---------------------------------------------------------------------------

export type WorkspaceEntryType = 'updates' | 'tasks' | 'notes' | 'issues' | 'context';

/**
 * Write a workspace entry with standardized tagging.
 *
 * Wraps `client.memory.memorize()` with the workspace tagging conventions:
 *   - `workspace:<type>` for entry type
 *   - `source:<agentName>` for contributor attribution
 *   - Additional tags (priority, severity, status) passed through
 */
export async function contributeEntry(
    client: Personize,
    email: string,
    entry: Record<string, unknown>,
    type: WorkspaceEntryType,
    agentName: string,
    extraTags: string[] = []
): Promise<void> {
    await client.memory.memorize({
        content: JSON.stringify(entry),
        email,
        enhanced: true,
        tags: [`workspace:${type}`, `source:${agentName}`, ...extraTags],
    });
}
