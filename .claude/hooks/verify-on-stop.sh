#!/usr/bin/env bash
# Stop-gate: refuse to finish on a broken tree. Only runs when tracked source
# under packages/, apps/, or templates/ has uncommitted changes — committed work
# is assumed already verified, and pure Q&A turns are never gated.
set -euo pipefail

input="$(cat)"
# Avoid an infinite loop if a prior stop hook is already re-running us.
[ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false')" = "true" ] && exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

paths=(packages apps templates)
if git diff --quiet -- "${paths[@]}" 2>/dev/null &&
  git diff --cached --quiet -- "${paths[@]}" 2>/dev/null; then
  exit 0
fi

log="$(mktemp)"
if ! bun run verify >"$log" 2>&1; then
  echo "bun run verify failed — fix before finishing. Last output:" >&2
  tail -n 25 "$log" >&2
  exit 2
fi
exit 0
