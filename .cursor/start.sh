#!/usr/bin/env bash
set -euo pipefail

cd /workspace

# Start PostgreSQL for cloud sync / saved tunes (idempotent).
if command -v pg_isready >/dev/null 2>&1; then
  if ! pg_isready -q -h localhost 2>/dev/null; then
    sudo service postgresql start
  fi
  until pg_isready -q -h localhost; do sleep 1; done

  sudo -u postgres psql -v ON_ERROR_STOP=0 -tc "SELECT 1 FROM pg_roles WHERE rolname='autos_dev'" | grep -q 1 \
    || sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE USER autos_dev WITH PASSWORD 'autos_dev' CREATEDB;"
  sudo -u postgres psql -v ON_ERROR_STOP=0 -tc "SELECT 1 FROM pg_database WHERE datname='autos'" | grep -q 1 \
    || sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE autos OWNER autos_dev;"

  export SQL_HOST="${SQL_HOST:-localhost}"
  export SQL_USER="${SQL_USER:-autos_dev}"
  export SQL_PASSWORD="${SQL_PASSWORD:-autos_dev}"
  export SQL_DB_NAME="${SQL_DB_NAME:-autos}"
  export SQL_ADMIN_USER="${SQL_ADMIN_USER:-autos_dev}"
  export SQL_ADMIN_PASSWORD="${SQL_ADMIN_PASSWORD:-autos_dev}"

  ./node_modules/.bin/drizzle-kit push --config=src/db/drizzle.config.ts
fi

# Dev server (Express + Vite) on port 3000.
exec npm run dev
