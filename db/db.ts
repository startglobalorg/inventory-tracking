import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

// Lazy singleton — deferred so Next.js build step never opens the DB file
let _sqlite: Database.Database | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _migrated = false;

function getDb() {
    if (!_db) {
        _sqlite = new Database(process.env.DATABASE_URL || 'sqlite.db');
        _sqlite.pragma('journal_mode = WAL');
        _sqlite.pragma('busy_timeout = 5000');
        _db = drizzle(_sqlite, { schema });
    }
    if (!_migrated && _sqlite) {
        // Safe incremental migrations — idempotent, won't fail on existing DBs
        const cols = _sqlite.prepare('PRAGMA table_info(items)').all() as { name: string }[];
        const hasSize = cols.some(c => c.name === 'size');
        if (!hasSize) {
            _sqlite.exec('ALTER TABLE items ADD COLUMN size TEXT');
        }
        const hasColdStorage = cols.some(c => c.name === 'cold_storage');
        if (!hasColdStorage) {
            _sqlite.exec('ALTER TABLE items ADD COLUMN cold_storage integer NOT NULL DEFAULT 0');
        }
        _migrated = true;
    }
    return _db!;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
    get(_target, prop) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
    },
});
