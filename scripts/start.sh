#!/bin/sh
set -e

echo "Starting application..."

# Ensure database directory exists and has correct permissions
if [ ! -d "/app/sqlite-data" ]; then
    echo "Creating database directory..."
    mkdir -p /app/sqlite-data
fi

# Set ownership to nextjs user
chown -R 1001:1001 /app/sqlite-data
chmod -R 755 /app/sqlite-data

# Initialize database as nextjs user
echo "Initializing database..."
su-exec 1001:1001 node /app/scripts/init-db.js

# Start Next.js server as nextjs user
echo "Starting Next.js server..."
exec su-exec 1001:1001 node server.js
