/**
 * script-csv-import.ts
 *
 * Import a CSV file into Personize memory with field mapping and chunked batching.
 * Each row is mapped to a Personize entity and written via memory.upsert() --
 * CSV rows are known structured field values, so no AI extraction is needed.
 *
 * Usage:
 *   npx ts-node script-csv-import.ts \
 *     --file contacts.csv \
 *     --collection my-collection-id \
 *     --mapping '{"name":"Name","email":"Email","company":"Company"}' \
 *     --tier pro \
 *     --batch-size 50 \
 *     --dry-run=false
 *
 * Flags:
 *   --file <path>         Path to CSV file (required)
 *   --collection <id>     Target collection ID (optional)
 *   --mapping <json>      JSON object mapping CSV column headers to field names
 *                         Recognized fields: email, websiteUrl, name, company, content
 *                         All other fields become freeform content.
 *   --tier <tier>         Memorize tier: basic|pro|pro_fast|ultra (default: pro)
 *   --batch-size <n>      Rows per batch (default: 50, max: 100)
 *   --dry-run=false       Pass this flag to actually write (default: dry run)
 */

import * as fs from 'fs';
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

const csvPath    = get('--file');
const collection = get('--collection');
const mappingArg = get('--mapping');
const tier       = (get('--tier') as 'basic' | 'pro' | 'pro_fast' | 'ultra') ?? 'pro';
const batchSize  = Math.min(parseInt(get('--batch-size') ?? '50', 10), 100);

if (!csvPath) {
  console.error(JSON.stringify({ error: '--file <path> is required' }));
  process.exit(1);
}

// ── CSV Parser ───────────────────────────────────────────────────────────────

/** Minimal CSV parser: handles quoted fields, trims whitespace. */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        fields.push(field.trim());
        field = '';
      } else {
        field += ch;
      }
    }
    fields.push(field.trim());
    return fields;
  };

  const headers = parseRow(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseRow(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });
    rows.push(row);
  }
  return rows;
}

// ── Field Mapping ────────────────────────────────────────────────────────────

interface FieldMapping { [csvColumn: string]: string }

function buildRecord(
  row: Record<string, string>,
  mapping: FieldMapping,
  collectionId?: string
) {
  const mapped: Record<string, string> = {};
  for (const [csvCol, targetField] of Object.entries(mapping)) {
    if (row[csvCol] !== undefined) mapped[targetField] = row[csvCol];
  }

  // Known structured field values -> properties. upsert sets these directly with no
  // AI extraction. email/website_url are identity keys (not properties); everything
  // else mapped becomes a property, and any unmapped columns are captured as properties
  // keyed by their column name so nothing is silently dropped.
  const properties: Record<string, string> = {};
  for (const [field, value] of Object.entries(mapped)) {
    if (field === 'email' || field === 'websiteUrl' || field === 'content') continue;
    if (value) properties[field] = value;
  }
  const mappedCols = new Set(Object.keys(mapping));
  for (const [col, value] of Object.entries(row)) {
    if (!mappedCols.has(col) && value && !(col in properties)) properties[col] = value;
  }

  return {
    email:      mapped['email']      || undefined,
    websiteUrl: mapped['websiteUrl'] || undefined,
    properties,
    ...(mapped['content'] ? { content: mapped['content'] } : {}),
    tags:       ['csv-import'],
    ...(collectionId ? { collectionId } : {}),
  };
}

// ── Retry helper ─────────────────────────────────────────────────────────────

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
      process.stderr.write(`Rate limit hit, retrying in ${delay}ms...\n`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Max retry attempts reached');
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const summary = { total: 0, succeeded: 0, failed: 0, skipped: 0 };

  // Load + parse CSV
  let raw: string;
  try {
    raw = fs.readFileSync(csvPath!, 'utf-8');
  } catch (err) {
    console.error(JSON.stringify({ error: `Cannot read file: ${(err as Error).message}` }));
    process.exit(1);
  }

  const rows = parseCsv(raw);
  const mapping: FieldMapping = mappingArg ? JSON.parse(mappingArg) : {};

  summary.total = rows.length;
  process.stderr.write(`CSV loaded: ${rows.length} rows, batch size: ${batchSize}, dryRun: ${dryRun}\n`);

  if (dryRun) {
    // Preview first 3 records
    const preview = rows.slice(0, 3).map(r => buildRecord(r, mapping, collection));
    console.log(JSON.stringify({
      mode: 'dry-run',
      total: rows.length,
      preview,
      message: 'Pass --dry-run=false to write',
    }, null, 2));
    return;
  }

  // Chunk into batches
  const batches: Record<string, string>[][] = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    batches.push(rows.slice(i, i + batchSize));
  }

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const records = batch.map(r => buildRecord(r, mapping, collection));

    process.stderr.write(`Batch ${b + 1}/${batches.length} (${records.length} records)...\n`);

    try {
      await withRetry(() =>
        client.memory.upsert({
          records,
          tier,
          source: 'csv-import',
        })
      );
      summary.succeeded += records.length;
    } catch (err) {
      process.stderr.write(`Batch ${b + 1} failed: ${(err as Error).message}\n`);
      summary.failed += records.length;
    }
  }

  console.log(JSON.stringify({ ...summary, mode: 'live' }));
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
