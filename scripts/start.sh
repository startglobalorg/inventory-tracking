#!/bin/sh
set -e

DB_PATH="/app/sqlite-data/sqlite.db"
BACKUP_DIR="/app/sqlite-data/backups"

echo "=== Container starting ==="

# Ensure database directory exists and has correct permissions
if [ ! -d "/app/sqlite-data" ]; then
    echo "Creating database directory..."
    mkdir -p /app/sqlite-data
fi

# === BACKUP BEFORE ANYTHING ELSE ===
if [ -f "$DB_PATH" ] && [ -s "$DB_PATH" ]; then
    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/startup_${TIMESTAMP}.db"
    echo "Backing up database to $BACKUP_FILE..."

    # Use sqlite3 .backup for atomic WAL-safe copy
    if command -v sqlite3 >/dev/null 2>&1; then
        sqlite3 "$DB_PATH" ".backup $BACKUP_FILE"
        BACKUP_EXIT=$?
        if [ "$BACKUP_EXIT" -ne 0 ]; then
            echo "WARNING: sqlite3 backup failed (exit $BACKUP_EXIT), falling back to file copy"
            cp "$DB_PATH" "$BACKUP_FILE"
            [ -f "${DB_PATH}-wal" ] && cp "${DB_PATH}-wal" "${BACKUP_FILE}-wal"
            [ -f "${DB_PATH}-shm" ] && cp "${DB_PATH}-shm" "${BACKUP_FILE}-shm"
        fi
    else
        echo "WARNING: sqlite3 not found, using file copy"
        cp "$DB_PATH" "$BACKUP_FILE"
        [ -f "${DB_PATH}-wal" ] && cp "${DB_PATH}-wal" "${BACKUP_FILE}-wal"
        [ -f "${DB_PATH}-shm" ] && cp "${DB_PATH}-shm" "${BACKUP_FILE}-shm"
    fi
    echo "Backup complete: $BACKUP_FILE"

    # Prune old startup backups: keep the 10 most recent
    ls -1t "$BACKUP_DIR"/startup_*.db 2>/dev/null | tail -n +11 | while read -r old; do
        rm -f "$old" "${old}-wal" "${old}-shm"
    done
    echo "Old startup backups pruned (keeping 10 most recent)."
elif [ -f "$DB_PATH" ]; then
    echo "WARNING: Database file exists but is empty (0 bytes). Skipping backup."
else
    echo "No existing database found. First run — will create fresh database."
fi

# Set ownership to nextjs user
chown -R 1001:1001 /app/sqlite-data
chmod -R 755 /app/sqlite-data

# Initialize database as nextjs user
echo "Initializing database..."
su-exec 1001:1001 node /app/scripts/init-db.js

echo "=== Database ready ==="

# Start periodic backup in background (every 4 hours)
(
    while true; do
        sleep 14400  # 4 hours
        if [ -f "$DB_PATH" ] && [ -s "$DB_PATH" ]; then
            mkdir -p "$BACKUP_DIR"
            TIMESTAMP=$(date +%Y%m%d_%H%M%S)
            BACKUP_FILE="$BACKUP_DIR/periodic_${TIMESTAMP}.db"
            if command -v sqlite3 >/dev/null 2>&1; then
                if sqlite3 "$DB_PATH" ".backup $BACKUP_FILE"; then
                    echo "[$(date)] Periodic backup complete: $BACKUP_FILE"
                else
                    echo "[$(date)] WARNING: Periodic backup via sqlite3 failed, falling back to cp"
                    cp "$DB_PATH" "$BACKUP_FILE"
                    [ -f "${DB_PATH}-wal" ] && cp "${DB_PATH}-wal" "${BACKUP_FILE}-wal"
                    [ -f "${DB_PATH}-shm" ] && cp "${DB_PATH}-shm" "${BACKUP_FILE}-shm"
                fi
            else
                cp "$DB_PATH" "$BACKUP_FILE"
                [ -f "${DB_PATH}-wal" ] && cp "${DB_PATH}-wal" "${BACKUP_FILE}-wal"
                [ -f "${DB_PATH}-shm" ] && cp "${DB_PATH}-shm" "${BACKUP_FILE}-shm"
            fi
            # Prune: keep 20 most recent periodic backups
            ls -1t "$BACKUP_DIR"/periodic_*.db 2>/dev/null | tail -n +21 | while read -r old; do
                rm -f "$old" "${old}-wal" "${old}-shm"
            done
        fi
    done
) &

# Start Next.js server as nextjs user
echo "Starting Next.js server..."
exec su-exec 1001:1001 node server.js
