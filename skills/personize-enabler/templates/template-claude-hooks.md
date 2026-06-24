# Claude Code Hooks for Personize Agents

**Description:** Ready-to-use hook configurations for Claude Code that inject session state, enforce safety, and maintain status files.

**Tags:** `hooks`, `claude-code`, `safety`, `automation`

---

## Hook 1: Session State Injection (UserPromptSubmit)

Injects live system state before every prompt. Agent knows DRY_RUN status without making API calls.

```json
// .claude/settings.json
{
  "hooks": {
    "UserPromptSubmit": [
      { "matcher": "", "command": "node scripts/hooks/session-state.js" }
    ]
  }
}
```

```javascript
// scripts/hooks/session-state.js
const fs = require('fs');
const path = require('path');

const stateDir = path.join(__dirname, '../../data/state');
const dryRun = fs.existsSync(path.join(stateDir, 'dry_run.txt'))
  ? fs.readFileSync(path.join(stateDir, 'dry_run.txt'), 'utf8').trim()
  : 'true';

const optOutFile = path.join(__dirname, '../../data/opt-outs.txt');
const optOuts = fs.existsSync(optOutFile)
  ? fs.readFileSync(optOutFile, 'utf8').split('\n').filter(l => l.trim() && !l.startsWith('#')).length
  : 0;

console.log(`---
SESSION STATE (${new Date().toISOString()})
DRY_RUN: ${dryRun === 'true' ? 'ON' : 'OFF (LIVE)'}
Opt-outs: ${optOuts} protected contacts
---`);
```

## Hook 2: DRY_RUN Safety Gate (PreToolUse)

Blocks notification/send tools when DRY_RUN is true. Hard infrastructure-level safety.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__personize__notification_send|mcp__personize__notification_broadcast",
        "command": "node scripts/hooks/send-guard.js"
      }
    ]
  }
}
```

```javascript
// scripts/hooks/send-guard.js
const fs = require('fs');
const dryRun = fs.readFileSync(
  require('path').join(__dirname, '../../data/state/dry_run.txt'), 'utf8'
).trim();
if (dryRun === 'true') {
  console.error('BLOCKED: DRY_RUN is ON. Set to false in data/state/dry_run.txt to enable.');
  process.exit(1);
}
```

## Hook 3: Opt-Out Enforcement (PreToolUse)

Checks email against opt-out list before any memory store on a contact.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__personize__memory_save",
        "command": "node scripts/hooks/opt-out-check.js"
      }
    ]
  }
}
```

```javascript
// scripts/hooks/opt-out-check.js
const fs = require('fs');
let input = '';
process.stdin.on('data', d => input += d);
process.stdin.on('end', () => {
  try {
    const { email } = JSON.parse(input);
    if (!email) process.exit(0);
    const optOuts = fs.readFileSync(
      require('path').join(__dirname, '../../data/opt-outs.txt'), 'utf8'
    ).split('\n').map(l => l.trim().toLowerCase()).filter(l => l && !l.startsWith('#'));
    if (optOuts.includes(email.toLowerCase())) {
      console.error(`BLOCKED: ${email} is opted out.`);
      process.exit(1);
    }
  } catch { process.exit(0); }
});
```

## Hook 4: Status File Staleness (PostToolUse)

Marks STATUS.md as stale after workspace changes. Agent regenerates on next session.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "mcp__personize__memory_save|mcp__personize__memory_update_property",
        "command": "node scripts/hooks/mark-stale.js"
      }
    ]
  }
}
```

```javascript
// scripts/hooks/mark-stale.js
const fs = require('fs');
const f = require('path').join(__dirname, '../../STATUS.md');
if (fs.existsSync(f)) {
  let c = fs.readFileSync(f, 'utf8');
  if (!c.includes('STALE')) {
    fs.writeFileSync(f, c.replace(/Last updated:.*/, 'Last updated: **STALE** -- refresh needed'));
  }
}
```
