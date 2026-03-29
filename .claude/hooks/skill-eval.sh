#!/bin/bash
# .claude/hooks/skill-eval.sh
# Runs on every UserPromptSubmit to suggest relevant skills

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
  exit 0
fi

# Read prompt from stdin (Claude passes hook input as JSON via stdin)
INPUT=$(cat)

# Run the skill evaluation engine
echo "$INPUT" | node "$SCRIPT_DIR/skill-eval.js" 2>/dev/null

exit 0
