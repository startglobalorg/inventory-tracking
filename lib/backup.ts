import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_URL || 'sqlite.db';
const BACKUP_DIR = path.join(path.dirname(DB_PATH), 'backups');
const MAX_ACTION_BACKUPS = 20;

/**
 * Synchronous backup — blocks until complete. Use before all destructive operations.
 * Copies the main DB file + WAL + SHM files for complete WAL-mode backup.
 * Returns the backup file path, or null if backup failed.
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

        // Copy main DB file
        fs.copyFileSync(DB_PATH, backupPath);

        // Copy WAL file if it exists (required for complete WAL-mode backup)
        const walPath = DB_PATH + '-wal';
        if (fs.existsSync(walPath)) {
            fs.copyFileSync(walPath, backupPath + '-wal');
        }

        // Copy SHM file if it exists (shared memory for WAL mode)
        const shmPath = DB_PATH + '-shm';
        if (fs.existsSync(shmPath)) {
            fs.copyFileSync(shmPath, backupPath + '-shm');
        }

        console.log(`[backup] Created: ${backupPath} (${stats.size} bytes)`);
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
            // Also remove WAL/SHM companions if present
            const walCompanion = file.path + '-wal';
            if (fs.existsSync(walCompanion)) fs.unlinkSync(walCompanion);
            const shmCompanion = file.path + '-shm';
            if (fs.existsSync(shmCompanion)) fs.unlinkSync(shmCompanion);
        }
    } catch (err) {
        console.error('[backup] Prune failed:', err);
    }
}
