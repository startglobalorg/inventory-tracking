import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const sqlite = new Database(process.env.DATABASE_URL || 'sqlite.db');
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('busy_timeout = 5000');
export const db = drizzle(sqlite, { schema });

// Safe incremental migrations — idempotent, won't fail on existing DBs
function runMigrations(rawDb: Database.Database) {
    // 0001: add size column if missing
    const cols = rawDb.prepare("PRAGMA table_info(items)").all() as { name: string }[];
    const hasSize = cols.some(c => c.name === 'size');
    if (!hasSize) {
        rawDb.exec("ALTER TABLE items ADD COLUMN size TEXT");
    }
    // 0002: add cold_storage column if missing (in case it's also absent)
    const hasColdStorage = cols.some(c => c.name === 'cold_storage');
    if (!hasColdStorage) {
        rawDb.exec("ALTER TABLE items ADD COLUMN cold_storage integer DEFAULT 0 NOT NULL");
    }
}

runMigrations(sqlite);
