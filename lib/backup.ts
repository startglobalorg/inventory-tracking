import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_URL || 'sqlite.db';
const BACKUP_DIR = path.join(path.dirname(DB_PATH), 'backups');
const MAX_ACTION_BACKUPS = 20;

/**
 * Create an atomic backup of the SQLite database before destructive operations.
 * Uses better-sqlite3's backup API which handles WAL mode correctly.
 * Returns the backup file path, or null if backup failed (non-fatal).
 */
export function backupDatabase(label: string): string | null {
    try {
        if (!fs.existsSync(DB_PATH)) {
            console.warn('[backup] No database file found at', DB_PATH);
            return null;
        }

        const stats = fs.statSync(DB_PATH);
        if (stats.size === 0) {
            console.warn('[backup] Database file is empty, skipping backup');
            return null;
        }

        fs.mkdirSync(BACKUP_DIR, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeLabel = label.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
        const backupPath = path.join(BACKUP_DIR, `action_${safeLabel}_${timestamp}.db`);

        // Use better-sqlite3's backup API (WAL-safe, atomic)
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Database = require('better-sqlite3');
        const source = new Database(DB_PATH, { readonly: true });
        source.backup(backupPath)
            .then(() => {
                source.close();
                console.log(`[backup] Created: ${backupPath} (${stats.size} bytes)`);
                pruneOldBackups();
            })
            .catch((err: Error) => {
                source.close();
                console.error('[backup] Async backup failed:', err);
            });

        // Return path optimistically — backup runs in background
        return backupPath;
    } catch (err) {
        console.error('[backup] Failed to initiate backup:', err);
        return null;
    }
}

/**
 * Synchronous backup — blocks until complete. Use for critical operations.
 */
export function backupDatabaseSync(label: string): string | null {
    try {
        if (!fs.existsSync(DB_PATH)) return null;

        const stats = fs.statSync(DB_PATH);
        if (stats.size === 0) return null;

        fs.mkdirSync(BACKUP_DIR, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeLabel = label.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
        const backupPath = path.join(BACKUP_DIR, `action_${safeLabel}_${timestamp}.db`);

        // Simple file copy — safe when using WAL mode with a single writer
        fs.copyFileSync(DB_PATH, backupPath);

        // Also copy WAL file if it exists
        const walPath = DB_PATH + '-wal';
        if (fs.existsSync(walPath)) {
            fs.copyFileSync(walPath, backupPath + '-wal');
        }

        console.log(`[backup] Sync backup created: ${backupPath} (${stats.size} bytes)`);
        pruneOldBackups();
        return backupPath;
    } catch (err) {
        console.error('[backup] Sync backup failed:', err);
        return null;
    }
}

function pruneOldBackups() {
    try {
        if (!fs.existsSync(BACKUP_DIR)) return;

        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('action_') && f.endsWith('.db'))
            .map(f => ({
                name: f,
                path: path.join(BACKUP_DIR, f),
                mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs,
            }))
            .sort((a, b) => b.mtime - a.mtime);

        // Remove backups beyond the limit
        for (const file of files.slice(MAX_ACTION_BACKUPS)) {
            fs.unlinkSync(file.path);
            // Also remove WAL companion if present
            const walCompanion = file.path + '-wal';
            if (fs.existsSync(walCompanion)) fs.unlinkSync(walCompanion);
        }
    } catch (err) {
        console.error('[backup] Prune failed:', err);
    }
}
