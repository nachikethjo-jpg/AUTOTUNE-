#!/usr/bin/env bash
set -euo pipefail

cd /workspace

# PostgreSQL for local Drizzle-backed cloud sync in development.
if ! command -v psql >/dev/null 2>&1; then
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends postgresql postgresql-client
fi

npm ci
