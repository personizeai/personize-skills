# Reference: Guideline Attachments

Full parameter tables, response shapes, and code examples for the four attachment actions: UPLOAD, LIST, READ, DELETE.

---

## Overview

Attachments let you associate files — scripts, templates, configs, prompts, schemas, reference data — directly with a guideline. Agents can list and read attachments at runtime to retrieve executable content or reference material that's too large or too structured to embed inline in the guideline body.

**Common uses:**
- Attach a SQL migration script to a `database-change-policy` guideline
- Attach a prompt template to a `cold-email-playbook` guideline
- Attach a JSON config to an `api-conventions` guideline
- Attach a reference spreadsheet or data sample to a `pricing-rules` guideline

---

## SDK and MCP Reference

| Action | SDK Method | MCP Tool |
|---|---|---|
| Upload | `client.guidelines.uploadAttachment(guidelineId, opts)` | `guideline_attachment_upload` |
| List | `client.guidelines.listAttachments(guidelineId)` | `guideline_attachment_list` |
| Read | `client.guidelines.getAttachmentContent(guidelineId, attachmentId)` | `guideline_attachment_read` |
| Delete | `client.guidelines.deleteAttachment(guidelineId, attachmentId)` | `guideline_attachment_delete` |

---

## Upload Attachment

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `guidelineId` | `string` | Yes | The ID of the guideline to attach the file to |
| `file` | `Buffer \| string` | Yes | File content as a Buffer (binary) or string (text) |
| `type` | `string` | Yes | Attachment type — see type values below |
| `description` | `string` | Yes | What this file is. Used by agents to decide when to retrieve it. Be specific: "SQL migration for adding the users.plan_tier column" not "migration script". |
| `usage` | `string` | Yes | When and how agents should use this file. E.g. "Run this before deploying changes that alter the users table schema." |
| `language` | `string` | No | Programming language for scripts (e.g. `typescript`, `python`, `sql`, `bash`). Helps agents understand how to execute it. |
| `filename` | `string` | No | Original filename. Defaults to `attachment.<ext>` based on type if omitted. |

### Type Values

| Type | Use for |
|---|---|
| `script` | Executable code: shell scripts, SQL, Python, TypeScript, etc. |
| `template` | Fill-in-the-blank documents: email templates, prompt templates, report formats |
| `reference` | Read-only reference material: specs, standards, style guides |
| `config` | Configuration files: JSON, YAML, TOML, .env examples |
| `data` | Data samples, CSVs, seed data, example payloads |
| `schema` | JSON Schema, OpenAPI specs, Zod schemas, database schema definitions |
| `prompt` | Standalone LLM prompt files |
| `image` | Diagrams, wireframes, screenshots (PNG, JPG, SVG) |

### Response Shape

```typescript
{
  data: {
    attachmentId: string,      // Use this to read or delete the attachment
    guidelineId: string,
    type: string,
    description: string,
    usage: string,
    language?: string,
    filename: string,
    size: number,              // File size in bytes
    createdAt: string,         // ISO timestamp
  }
}
```

### SDK Example

```typescript
import { readFileSync } from 'fs';

const file = readFileSync('./migrations/add-plan-tier.sql', 'utf-8');

const result = await client.guidelines.uploadAttachment(guidelineId, {
    file,
    type: 'script',
    description: 'SQL migration for adding users.plan_tier column',
    usage: 'Run this before deploying any code that references users.plan_tier. Apply with: psql $DATABASE_URL < migration.sql',
    language: 'sql',
    filename: 'add-plan-tier.sql',
});

console.log('Attachment ID:', result.data.attachmentId);
```

### MCP Example

```
guideline_attachment_upload(
  guidelineId: "gl_abc123",
  type: "template",
  description: "Cold outreach email template for SaaS prospects",
  usage: "Use this template when writing first-touch cold emails to SaaS decision-makers. Fill in [COMPANY], [PAIN_POINT], and [CTA].",
  file: "Subject: Quick question about [COMPANY]'s [PAIN_POINT]\n\nHi [FIRST_NAME],\n\n..."
)
```

---

## List Attachments

Returns all attachments associated with a guideline. Use this before reading or deleting — always list first to get `attachmentId` values.

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `guidelineId` | `string` | Yes | The guideline to list attachments for |

### Response Shape

```typescript
{
  data: {
    attachments: Array<{
      attachmentId: string,
      type: string,
      description: string,
      usage: string,
      language?: string,
      filename: string,
      size: number,
      createdAt: string,
    }>,
    count: number,
  }
}
```

### SDK Example

```typescript
const result = await client.guidelines.listAttachments(guidelineId);
const attachments = result.data?.attachments ?? [];

for (const a of attachments) {
    console.log(`[${a.type}] ${a.filename} — ${a.description} (${a.attachmentId})`);
}
```

### Presenting to Users

Display as a table:

| ID | Type | Filename | Description | Size | Created |
|---|---|---|---|---|---|
| `att_abc` | script | add-plan-tier.sql | SQL migration for users.plan_tier | 1.2 KB | 2026-04-01 |
| `att_def` | template | cold-email.md | Cold outreach email template | 0.8 KB | 2026-03-28 |

---

## Read Attachment

Returns the full content of a single attachment. Agents use this to retrieve templates to fill in, scripts to execute, or configs to apply.

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `guidelineId` | `string` | Yes | The guideline the attachment belongs to |
| `attachmentId` | `string` | Yes | The attachment to read (from `listAttachments`) |

### Response Shape

```typescript
{
  data: {
    attachmentId: string,
    type: string,
    description: string,
    usage: string,
    language?: string,
    filename: string,
    content: string,           // Full file content as a string
    size: number,
    createdAt: string,
  }
}
```

### SDK Example

```typescript
const result = await client.guidelines.getAttachmentContent(guidelineId, attachmentId);
const { content, language, usage } = result.data;

console.log(`Usage instructions: ${usage}`);
console.log(`Content (${language}):\n${content}`);
```

### Agent Pattern: Fetch and Execute

```typescript
// Agent workflow: get guidelines, find attachments, retrieve and apply
const guidelines = await client.ai.smartGuidelines({ message: 'database migration policy' });

// If guidelines reference an attachment, list and read it
const attachments = await client.guidelines.listAttachments(guidelineId);
const migration = attachments.data.attachments.find(a => a.type === 'script' && a.language === 'sql');

if (migration) {
    const { content, usage } = (await client.guidelines.getAttachmentContent(guidelineId, migration.attachmentId)).data;
    // Agent reads `usage` to understand when/how to apply `content`
}
```

---

## Delete Attachment

Permanently removes an attachment. This action is irreversible — always confirm with the user before calling.

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `guidelineId` | `string` | Yes | The guideline the attachment belongs to |
| `attachmentId` | `string` | Yes | The attachment to delete |

### Response Shape

```typescript
{
  data: {
    deleted: true,
    attachmentId: string,
  }
}
```

### SDK Example

```typescript
await client.guidelines.deleteAttachment(guidelineId, attachmentId);
console.log('Attachment deleted.');
```

---

## Workflow: Full Attachment Lifecycle

```typescript
import { Personize } from '@personize/sdk';
import { readFileSync } from 'fs';

const client = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY! });
const guidelineId = 'gl_abc123';

// 1. Upload
const upload = await client.guidelines.uploadAttachment(guidelineId, {
    file: readFileSync('./prompt.md', 'utf-8'),
    type: 'prompt',
    description: 'Cold email prompt template for B2B SaaS outreach',
    usage: 'Use this prompt when generating cold emails for SaaS prospects. Replace [COMPANY] and [PAIN_POINT] before sending.',
    filename: 'cold-email-prompt.md',
});
const attachmentId = upload.data.attachmentId;

// 2. List — confirm it's there
const list = await client.guidelines.listAttachments(guidelineId);
console.log('Attachments:', list.data.count);

// 3. Read — retrieve content
const read = await client.guidelines.getAttachmentContent(guidelineId, attachmentId);
console.log('Content:', read.data.content);

// 4. Delete — clean up
await client.guidelines.deleteAttachment(guidelineId, attachmentId);
```

---

## Constraints

- **MUST** confirm the target guideline before uploading — attach to the most relevant guideline (the one agents query when they need this file).
- **MUST** write a clear, specific `description` — agents use this to decide whether to fetch the attachment. Vague descriptions ("script", "template") reduce retrievability.
- **MUST** write explicit `usage` instructions — tell agents exactly when and how to use the file, including any prerequisites, substitutions required, or commands to run.
- **SHOULD** set `language` for all script-type attachments — this helps agents understand how to execute the file without inferring from filename.
- **MUST** always call `listAttachments` before `getAttachmentContent` or `deleteAttachment` when the `attachmentId` is not already known.
- **MUST** confirm with the user before deleting an attachment — deletion is permanent and not recoverable.
- **SHOULD** prefer one well-described attachment per purpose over multiple similar files — attachments compete for agent attention just like guidelines do.
