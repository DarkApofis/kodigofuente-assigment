#!/usr/bin/env bash
# Fails fast and loud when required environment variables are missing.
# Reads the variable names from .env.example (single source of truth) and
# reports EVERY missing one, not just the first.
set -euo pipefail

ENV_EXAMPLE="${1:-.env.example}"

if [ ! -f "$ENV_EXAMPLE" ]; then
  echo "ERROR: $ENV_EXAMPLE not found" >&2
  exit 1
fi

status=0

while IFS= read -r line || [ -n "$line" ]; do
  # Skip blank lines and comments
  case "$line" in
    '' | '#'*) continue ;;
  esac
  key="${line%%=*}"
  if [ -z "${!key:-}" ]; then
    echo "ERROR: missing required environment variable: $key" >&2
    status=1
  fi
done <"$ENV_EXAMPLE"

if [ "$status" -eq 0 ]; then
  echo "OK: all required environment variables are set"
fi

exit "$status"
