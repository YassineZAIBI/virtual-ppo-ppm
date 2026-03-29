#!/usr/bin/env node
// .claude/hooks/guard-destructive.js
// Blocks dangerous shell commands before execution

const input = require('fs').readFileSync('/dev/stdin', 'utf8');

let command = '';
try {
  command = JSON.parse(input).command || '';
} catch {
  process.exit(0);
}

const BLOCKED_PATTERNS = [
  { pattern: /DROP\s+TABLE/i, reason: 'DROP TABLE is irreversible. Use a Prisma migration instead.' },
  { pattern: /DELETE\s+FROM\s+\w+\s*;/i, reason: 'DELETE without WHERE clause will wipe the entire table.' },
  { pattern: /prisma migrate reset/i, reason: 'migrate reset destroys all data. Use db push for dev changes.' },
  { pattern: /rm\s+-rf\s+\/(?!\w)/i, reason: 'rm -rf / is catastrophic. Specify a subdirectory.' },
  { pattern: /truncate\s+table/i, reason: 'TRUNCATE is irreversible. Confirm the intent explicitly.' },
];

for (const { pattern, reason } of BLOCKED_PATTERNS) {
  if (pattern.test(command)) {
    const response = JSON.stringify({
      block: true,
      message: `⛔ Blocked: ${reason}\n\nCommand was: ${command.slice(0, 120)}`,
    });
    process.stderr.write(response + '\n');
    process.exit(2);
  }
}

process.exit(0);
