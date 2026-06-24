/**
 * =============================================================================
 * MASTERCLASS SCRIPT: Data Ingest
 * =============================================================================
 *
 * PATTERN: Inbound -- external data --> Personize memory
 *
 * This script teaches the pattern of importing external data into Personize.
 * The example uses CSV, but the pattern applies to ANY data source:
 *   - API responses (HubSpot, Salesforce, Intercom, etc.)
 *   - Database query results
 *   - JSON/JSONL files
 *   - Spreadsheet exports
 *
 * HOW TO ADAPT:
 *   Replace the CSV parsing section (Step 2) with your data source.
 *   The rest of the script -- field mapping, chunking, batch memorize,
 *   progress tracking, error recovery -- stays exactly the same.
 *
 * KEY CONCEPTS TAUGHT:
 *   1. Field mapping: source columns --> Personize properties
 *   2. Batch memorize with per-item extraction control
 *   3. Chunking large datasets (batch size N, process sequentially)
 *   4. Progress reporting (processed/succeeded/failed/skipped per chunk)
 *   5. Dry-run preview (show what would be memorized without executing)
 *   6. Error recovery (retry failed items, exponential backoff on rate limits)
 *
 * USAGE:
 *   # Dry run (default) -- previews what would be imported
 *   npx ts-node script-data-ingest.ts --file contacts.csv --collection contacts
 *
 *   # Live execution
 *   npx ts-node script-data-ingest.ts --file contacts.csv --collection contacts --live
 *
 *   # With options
 *   npx ts-node script-data-ingest.ts --file data.csv --collection leads \
 *     --tier ultra --batch-size 25 --live
 *
 * =============================================================================
 */

import { Personize } from '@personize/sdk';

// =============================================================================
// Step 0: CLI Argument Parsing (lightweight, no external deps)
// =============================================================================
// WHY: Scripts should be self-contained. Pulling in yargs/commander adds
// dependency management overhead. This 2-line parser handles all common cases.

const args = process.argv.slice(2);
const get = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const has = (flag: string) => args.includes(flag);

// =============================================================================
// Step 1: Configuration
// =============================================================================
// WHY dry-run by default: Data imports can't be easily undone. A dry run lets
// you inspect what WOULD be memorized -- field mappings, entity keys, content
// previews -- before committing real credits and storage.

const dryRun = !has('--live');
const filePath = get('--file');
const collectionId = get('--collection');
const tier = (get('--tier') || 'pro') as 'basic' | 'pro' | 'pro_fast' | 'ultra';
const batchSize = parseInt(get('--batch-size') || '50', 10);

if (!process.env.PERSONIZE_SECRET_KEY) {
  console.error(JSON.stringify({ error: 'PERSONIZE_SECRET_KEY environment variable not set' }));
  process.exit(1);
}

if (!filePath) {
  console.error(JSON.stringify({ error: 'Missing --file <path>. Provide a CSV file to import.' }));
  process.exit(1);
}

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });

// =============================================================================
// Step 2: Read and Parse the Data Source
// =============================================================================
// WHY a separate parsing step: Decoupling "read data" from "send to Personize"
// means you can swap data sources without touching the import logic.
//
// TO ADAPT: Replace this entire section with your data source.
//   - HubSpot: const rows = await hubspot.crm.contacts.getAll();
//   - Salesforce: const rows = await conn.query("SELECT ... FROM Contact");
//   - JSON file: const rows = JSON.parse(fs.readFileSync(path, 'utf-8'));
//   - Database: const rows = await db.query('SELECT * FROM customers');

import { readFileSync } from 'fs';

interface RawRow {
  [key: string]: string;
}

function parseCSV(path: string): RawRow[] {
  // WHY a simple CSV parser: For a teaching example, clarity beats robustness.
  // In production, use a library like `csv-parse` for quoted fields, escaping, etc.
  const content = readFileSync(path, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim().length > 0);

  if (lines.length < 2) {
    console.error(JSON.stringify({ error: 'CSV file must have a header row and at least one data row' }));
    process.exit(1);
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows: RawRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: RawRow = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

// =============================================================================
// Step 3: Field Mapping
// =============================================================================
// WHY field mapping matters: Your source data has column names like "Company Website"
// or "contact_email". Personize needs to know which field is the entity key (email,
// website_url, or custom key) and which fields become properties.
//
// TO ADAPT: Change this mapping to match YOUR source data columns.
//   - The `identityKey` tells Personize how to identify the entity
//   - The `properties` map source column names to Personize property names
//   - Set `extractMemories: true` on properties that contain free-text worth extracting

interface FieldMapping {
  // Which source field identifies the entity (email, website URL, or custom key)
  identityField: string;
  identityType: 'email' | 'website_url' | 'custom';
  customKeyName?: string;  // Only needed when identityType is 'custom'

  // Entity type for Personize (Contact, Company, Lead, Student, etc.)
  entityType: string;

  // Source column --> Personize property mapping
  // Each entry: sourceColumn -> { propertyName, extractMemories? }
  properties: Record<string, {
    propertyName: string;
    extractMemories?: boolean;  // Set true for free-text fields worth AI extraction
  }>;

  // Which source fields to concatenate as the memorize content
  // WHY: The `content` field is what the AI reads for extraction. It should contain
  // the richest, most informative text about this entity.
  contentFields: string[];
}

// Example mapping for a typical contact CSV:
//   email, first_name, last_name, company, title, notes
//
// TO ADAPT: Replace these with your actual column names and desired property names.
function buildFieldMapping(headers: string[]): FieldMapping {
  // WHY auto-detection: Many CSVs use predictable column names. This saves the user
  // from having to manually specify every mapping. The user can always override.
  const headerSet = new Set(headers.map(h => h.toLowerCase()));

  // Detect identity field (order matters: email is most common for contacts)
  let identityField = 'email';
  let identityType: 'email' | 'website_url' | 'custom' = 'email';

  if (headerSet.has('email') || headerSet.has('email_address') || headerSet.has('contact_email')) {
    identityField = headerSet.has('email') ? 'email'
      : headerSet.has('email_address') ? 'email_address'
      : 'contact_email';
    identityType = 'email';
  } else if (headerSet.has('website') || headerSet.has('website_url') || headerSet.has('company_url')) {
    identityField = headerSet.has('website') ? 'website'
      : headerSet.has('website_url') ? 'website_url'
      : 'company_url';
    identityType = 'website_url';
  }

  // Map common column names to Personize properties
  // WHY per-property extractMemories: A "name" field is structured data (just store it).
  // A "notes" or "description" field contains free-text insights the AI should extract
  // into memories. This distinction saves credits and produces better extractions.
  const properties: FieldMapping['properties'] = {};

  // Structured fields (store as-is, no AI extraction needed)
  const structuredMappings: Record<string, string> = {
    'first_name': 'first_name', 'firstname': 'first_name', 'first name': 'first_name',
    'last_name': 'last_name', 'lastname': 'last_name', 'last name': 'last_name',
    'company': 'company_name', 'company_name': 'company_name',
    'title': 'job_title', 'job_title': 'job_title',
    'phone': 'phone_number', 'phone_number': 'phone_number',
    'city': 'city', 'state': 'state', 'country': 'country',
    'industry': 'industry', 'deal_stage': 'deal_stage',
  };

  // Free-text fields (AI extraction will mine insights from these)
  const extractableMappings: Record<string, string> = {
    'notes': 'notes', 'description': 'description', 'bio': 'bio',
    'summary': 'summary', 'comments': 'comments', 'feedback': 'feedback',
    'conversation': 'conversation_notes', 'meeting_notes': 'meeting_notes',
  };

  for (const header of headers) {
    const lower = header.toLowerCase();
    if (lower === identityField) continue; // Skip identity field, handled separately

    if (structuredMappings[lower]) {
      properties[header] = { propertyName: structuredMappings[lower], extractMemories: false };
    } else if (extractableMappings[lower]) {
      properties[header] = { propertyName: extractableMappings[lower], extractMemories: true };
    } else {
      // Unknown columns: store as structured data (safe default, no credit cost)
      properties[header] = { propertyName: lower.replace(/\s+/g, '_'), extractMemories: false };
    }
  }

  // Content fields: prefer free-text fields, fall back to everything
  // WHY: The content string is what the AI reads during extraction. Free-text fields
  // (notes, description) contain the richest signal. Structured fields (name, email)
  // are already captured as properties.
  const contentFields = Object.keys(extractableMappings).filter(f => headerSet.has(f));
  if (contentFields.length === 0) {
    // No free-text fields found: use all non-identity fields
    contentFields.push(...headers.filter(h => h.toLowerCase() !== identityField));
  }

  return {
    identityField,
    identityType,
    entityType: identityType === 'website_url' ? 'Company' : 'Contact',
    properties,
    contentFields,
  };
}

// =============================================================================
// Step 4: Build Batch Records
// =============================================================================
// WHY batch over sequential: Sending 1000 individual memorize calls would:
//   1. Hit rate limits quickly (429 errors)
//   2. Create 1000 separate extraction jobs (slow, expensive)
//   3. Give you no progress visibility
// Batch memorize groups items, processes them efficiently, and returns per-item results.

function buildBatchRecords(rows: RawRow[], mapping: FieldMapping): Array<{
  content: string;
  email?: string;
  website_url?: string;
  customKeyName?: string;
  customKeyValue?: string;
  type: string;
  collectionId?: string;
  properties: Record<string, { value: unknown; extractMemories?: boolean }>;
  tags: string[];
}> {
  const records = [];

  for (const row of rows) {
    // Build entity identity
    const identityValue = row[mapping.identityField]?.trim();
    if (!identityValue) {
      // WHY skip: Records without identity keys cannot be linked to an entity.
      // They would create orphaned memories. Better to skip and report.
      continue;
    }

    // Build content string from content fields
    // WHY we join content fields: The AI extraction prompt reads this text to mine
    // structured properties AND free-form memories. More context = better extraction.
    const contentParts = mapping.contentFields
      .map(field => {
        const val = row[field]?.trim();
        return val ? `${field}: ${val}` : null;
      })
      .filter(Boolean);

    const content = contentParts.length > 0
      ? contentParts.join('\n')
      : `Record for ${identityValue}`;  // Fallback: minimal content

    // Build properties
    const properties: Record<string, { value: unknown; extractMemories?: boolean }> = {};
    for (const [sourceCol, propMapping] of Object.entries(mapping.properties)) {
      const value = row[sourceCol]?.trim();
      if (value) {
        properties[propMapping.propertyName] = {
          value,
          extractMemories: propMapping.extractMemories,
        };
      }
    }

    // Build the record
    const record: any = {
      content,
      type: mapping.entityType,
      collectionId: collectionId || undefined,
      properties,
      tags: ['data-import'],
    };

    // Set identity key based on type
    if (mapping.identityType === 'email') {
      record.email = identityValue;
    } else if (mapping.identityType === 'website_url') {
      record.website_url = identityValue;
    } else if (mapping.identityType === 'custom' && mapping.customKeyName) {
      record.customKeyName = mapping.customKeyName;
      record.customKeyValue = identityValue;
    }

    records.push(record);
  }

  return records;
}

// =============================================================================
// Step 5: Chunk and Send
// =============================================================================
// WHY we chunk instead of sending all at once:
//   1. Memory: 10K records in one payload would exceed request size limits
//   2. Rate limits: Smaller chunks avoid 429 errors and play nice with quotas
//   3. Progress visibility: You see "chunk 3/20 complete" instead of waiting
//      silently for 10 minutes
//   4. Error isolation: If chunk 7 fails, chunks 1-6 are already saved
//
// WHY sequential (not parallel): Parallel chunks would multiply rate limit
// pressure. Sequential processing is slower but reliable. If you need speed,
// increase batch size instead of parallelizing.

async function processChunks(
  records: ReturnType<typeof buildBatchRecords>,
  options: { dryRun: boolean; tier: string; batchSize: number }
): Promise<{ total: number; succeeded: number; failed: number; skipped: number; dryRun: boolean }> {
  const summary = { total: records.length, succeeded: 0, failed: 0, skipped: 0, dryRun: options.dryRun };

  if (records.length === 0) {
    console.log(JSON.stringify({ warning: 'No valid records to import (all rows missing identity keys?)' }));
    return summary;
  }

  // Split into chunks
  const chunks: typeof records[] = [];
  for (let i = 0; i < records.length; i += options.batchSize) {
    chunks.push(records.slice(i, i + options.batchSize));
  }

  console.log(JSON.stringify({
    status: 'starting',
    totalRecords: records.length,
    chunks: chunks.length,
    batchSize: options.batchSize,
    tier: options.tier,
    dryRun: options.dryRun,
  }));

  // Dry-run: preview the first chunk and stop
  // WHY preview first chunk only: You want to verify field mapping is correct
  // before committing. Showing all 10K records would flood the terminal.
  if (options.dryRun) {
    const preview = chunks[0].slice(0, 3).map(r => ({
      identity: r.email || r.website_url || r.customKeyValue,
      entityType: r.type,
      propertyCount: Object.keys(r.properties).length,
      contentPreview: r.content.substring(0, 200),
      properties: Object.fromEntries(
        Object.entries(r.properties).map(([k, v]) => [k, {
          value: String(v.value).substring(0, 100),
          extractMemories: v.extractMemories || false,
        }])
      ),
    }));

    console.log(JSON.stringify({
      status: 'dry_run_preview',
      message: 'Pass --live to execute for real',
      sampleRecords: preview,
      totalWouldProcess: records.length,
    }));

    summary.skipped = records.length;
    return summary;
  }

  // Live execution: process each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkNumber = i + 1;

    try {
      // WHY saveBatch (content extraction): records here carry free-text `content`
      // plus properties flagged `extractMemories: true`, so the AI extraction path is
      // required to populate those fields. Each record keeps its own email/website_url
      // and per-item properties. (For rows that are PURELY known structured values with
      // no extraction needed, use client.memory.upsert() instead.)
      const _result = await client.memory.saveBatch({
        source: `data-import:${filePath}`,
        tier: options.tier as any,
        records: chunk,
      });

      // Track results
      // WHY per-chunk tracking: If chunk 15/20 fails, you know exactly which
      // records need retry. The final summary tells you the overall success rate.
      const chunkSucceeded = chunk.length; // Batch memorize is all-or-nothing per chunk
      summary.succeeded += chunkSucceeded;

      console.log(JSON.stringify({
        status: 'chunk_complete',
        chunk: chunkNumber,
        totalChunks: chunks.length,
        recordsInChunk: chunk.length,
        succeeded: chunkSucceeded,
        runningTotal: { succeeded: summary.succeeded, failed: summary.failed },
      }));
    } catch (error: any) {
      // WHY we catch per-chunk: A single chunk failure should not abort the entire
      // import. Log the failure, record which items failed, and continue.
      summary.failed += chunk.length;

      const errorInfo: any = {
        status: 'chunk_failed',
        chunk: chunkNumber,
        totalChunks: chunks.length,
        recordsInChunk: chunk.length,
        error: error.message || 'Unknown error',
      };

      // Rate limit handling: if we get a 429, wait and the SDK will auto-retry
      // (the SDK has built-in exponential backoff for 429s). But if we exhaust
      // retries, we log it and move on.
      if (error.status === 429) {
        errorInfo.hint = 'Rate limited. The SDK auto-retries with backoff, but all retries were exhausted. Try reducing --batch-size.';
      }

      console.error(JSON.stringify(errorInfo));
    }
  }

  return summary;
}

// =============================================================================
// Step 6: Main
// =============================================================================

async function main() {
  try {
    // Parse the CSV
    const rows = parseCSV(filePath!);
    console.log(JSON.stringify({ status: 'parsed', rowCount: rows.length, file: filePath }));

    // Build field mapping from headers
    const headers = Object.keys(rows[0] || {});
    const mapping = buildFieldMapping(headers);

    console.log(JSON.stringify({
      status: 'mapping_detected',
      identityField: mapping.identityField,
      identityType: mapping.identityType,
      entityType: mapping.entityType,
      propertyCount: Object.keys(mapping.properties).length,
      contentFields: mapping.contentFields,
      properties: Object.fromEntries(
        Object.entries(mapping.properties).map(([src, dst]) => [src, dst.propertyName])
      ),
    }));

    // Build batch records
    const records = buildBatchRecords(rows, mapping);
    const skippedCount = rows.length - records.length;

    if (skippedCount > 0) {
      console.log(JSON.stringify({
        warning: `${skippedCount} rows skipped (missing identity key: ${mapping.identityField})`,
      }));
    }

    // Process
    const summary = await processChunks(records, { dryRun, tier, batchSize });

    // Final summary
    // WHY JSON output: Scripts should be composable. JSON stdout can be piped to
    // jq, logged to a file, or parsed by a parent orchestrator. Human-readable
    // logs go to stderr (console.error), machine-readable results go to stdout.
    console.log(JSON.stringify({
      status: 'complete',
      ...summary,
    }));
  } catch (error: any) {
    console.error(JSON.stringify({
      status: 'fatal_error',
      error: error.message || 'Unknown error',
      stack: error.stack,
    }));
    process.exit(1);
  }
}

main();
