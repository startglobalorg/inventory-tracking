#!/bin/sh
set -e

echo "Starting application..."

# Initialize database
echo "Initializing database..."
node /app/scripts/init-db.js

# Start Next.js server
echo "Starting Next.js server..."
exec node server.js
