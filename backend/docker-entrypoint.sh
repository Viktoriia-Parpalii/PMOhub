#!/bin/sh
set -eu

echo "Applying pending database migrations..."
npm run db:migrate

echo "Starting PMO Hub API..."
exec node dist/main.js
