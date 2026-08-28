#!/bin/sh
# Runs schema migrations and the idempotent seed before starting the API.
# `set -e` makes the container exit non-zero (fail loudly) if any step fails.
set -e

echo "==> Running database migrations"
npm run migration:run

echo "==> Running seed"
npm run seed

echo "==> Starting API"
exec node dist/main.js
