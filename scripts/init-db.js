const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get database path from environment or use default
const dbPath = process.env.DATABASE_URL || 'sqlite.db';
const dbDir = path.dirname(dbPath);

console.log('Initializing database...');
console.log('Database path:', dbPath);
console.log('Database directory:', dbDir);

// Create directory if it doesn't exist
if (dbDir !== '.' && !fs.existsSync(dbDir)) {
    console.log('Creating database directory:', dbDir);
    fs.mkdirSync(dbDir, { recursive: true });
}

// ─── Validate existing database ────────────────────────────────────────
// Check if the file exists AND is a valid SQLite database with tables.
// This prevents silently overwriting real data when the file is corrupt or empty.
let dbExists = fs.existsSync(dbPath);
let dbIsValid = false;

if (dbExists) {
    try {
        const stats = fs.statSync(dbPath);
        if (stats.size === 0) {
            console.log('WARNING: Database file exists but is empty (0 bytes).');
            const renamed = dbPath + '.empty.' + Date.now();
            fs.renameSync(dbPath, renamed);
            console.log('Renamed empty file to:', renamed);
            dbExists = false;
        } else {
            // Verify it's a real SQLite database with tables
            const Database = require('better-sqlite3');
            const testDb = new Database(dbPath, { readonly: true });
            const tables = testDb.prepare(
                "SELECT count(*) as cnt FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            ).get();
            testDb.close();

            if (tables.cnt > 0) {
                dbIsValid = true;
                console.log(`Database is valid: ${stats.size} bytes, ${tables.cnt} tables.`);
            } else {
                console.log('WARNING: Database file exists but has no tables. Will apply schema.');
            }
        }
    } catch (err) {
        console.error('WARNING: Database file exists but cannot be opened:', err.message);
        const renamed = dbPath + '.corrupt.' + Date.now();
        fs.renameSync(dbPath, renamed);
        console.log('Renamed corrupt file to:', renamed);
        dbExists = false;
    }
}

// ─── Fresh database creation ───────────────────────────────────────────
if (!dbExists) {
    console.log('Database does not exist, creating and initializing schema...');

    // Create empty database file
    fs.writeFileSync(dbPath, '');

    // Push schema to brand-new database — no interactive prompt on a blank DB
    try {
        console.log('Pushing schema to database...');
        execSync('npx drizzle-kit push', {
            stdio: 'inherit',
            env: { ...process.env, DATABASE_URL: dbPath }
        });
        console.log('Schema pushed successfully!');
    } catch (error) {
        console.error('Error pushing schema:', error);
        process.exit(1);
    }
} else {
    // ─── Incremental migration for existing databases ──────────────────
    // drizzle-kit push is interactive when new tables are detected (prompts to
    // confirm "create or rename"), which hangs in a Docker container without a TTY.
    // Apply changes via direct SQL instead.
    console.log('Database already exists, applying any missing schema changes...');
    try {
        const Database = require('better-sqlite3');
        const db = new Database(dbPath);

        // runners table (added for volunteer delivery system)
        db.exec(`
            CREATE TABLE IF NOT EXISTS runners (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                created_at INTEGER NOT NULL DEFAULT (unixepoch())
            )
        `);
        console.log('runners table: OK');

        // ── orders table columns ──────────────────────────────────────
        const orderCols = db.prepare('PRAGMA table_info(orders)').all();
        const orderColNames = new Set(orderCols.map(c => c.name));

        if (!orderColNames.has('runner_id')) {
            db.exec('ALTER TABLE orders ADD COLUMN runner_id TEXT REFERENCES runners(id)');
            console.log('orders.runner_id column: added');
        } else {
            console.log('orders.runner_id column: OK');
        }

        if (!orderColNames.has('custom_request')) {
            db.exec('ALTER TABLE orders ADD COLUMN custom_request TEXT');
            console.log('orders.custom_request column: added');
        } else {
            console.log('orders.custom_request column: OK');
        }

        if (!orderColNames.has('cancelled_by')) {
            db.exec('ALTER TABLE orders ADD COLUMN cancelled_by TEXT');
            console.log('orders.cancelled_by column: added');
        } else {
            console.log('orders.cancelled_by column: OK');
        }

        if (!orderColNames.has('storage_type')) {
            db.exec("ALTER TABLE orders ADD COLUMN storage_type TEXT NOT NULL DEFAULT 'normal'");
            console.log('orders.storage_type column: added');
        } else {
            console.log('orders.storage_type column: OK');
        }

        if (!orderColNames.has('completed_at')) {
            db.exec('ALTER TABLE orders ADD COLUMN completed_at INTEGER');
            console.log('orders.completed_at column: added');
        } else {
            console.log('orders.completed_at column: OK');
        }

        // ── locations table columns ───────────────────────────────────
        const locationCols = db.prepare('PRAGMA table_info(locations)').all();
        const locationColNames = new Set(locationCols.map(c => c.name));

        if (!locationColNames.has('type')) {
            db.exec("ALTER TABLE locations ADD COLUMN type TEXT NOT NULL DEFAULT 'inventory'");
            console.log('locations.type column: added');
        } else {
            console.log('locations.type column: OK');
        }

        // ── items table columns ───────────────────────────────────────
        const itemCols = db.prepare('PRAGMA table_info(items)').all();
        const itemColNames = new Set(itemCols.map(c => c.name));

        if (!itemColNames.has('image_url')) {
            db.exec('ALTER TABLE items ADD COLUMN image_url TEXT');
            console.log('items.image_url column: added');
        } else {
            console.log('items.image_url column: OK');
        }

        if (!itemColNames.has('size')) {
            db.exec('ALTER TABLE items ADD COLUMN size TEXT');
            console.log('items.size column: added');
        } else {
            console.log('items.size column: OK');
        }

        if (!itemColNames.has('cold_storage')) {
            db.exec("ALTER TABLE items ADD COLUMN cold_storage INTEGER NOT NULL DEFAULT 0");
            console.log('items.cold_storage column: added');
        } else {
            console.log('items.cold_storage column: OK');
        }

        if (!itemColNames.has('restricted_to_location_slug')) {
            db.exec('ALTER TABLE items ADD COLUMN restricted_to_location_slug TEXT');
            console.log('items.restricted_to_location_slug column: added');
        } else {
            console.log('items.restricted_to_location_slug column: OK');
        }

        // ── Seed data (INSERT OR IGNORE — safe to run repeatedly) ─────

        // Fix Accreditation to use text-based request form
        db.prepare("UPDATE locations SET type = 'text' WHERE slug = 'accreditation' AND type = 'inventory'").run();
        console.log('locations.accreditation type: OK');

        const { randomUUID } = require('crypto');
        const insertLoc = db.prepare("INSERT OR IGNORE INTO locations (id, name, slug, type) VALUES (?, ?, ?, 'text')");

        // Insert Info Points 1-5 (text type) if they don't exist
        for (let i = 1; i <= 5; i++) {
            insertLoc.run(randomUUID(), `Info Point ${i}`, `info-point-${i}`);
        }
        console.log('Info Points 1-5: OK');

        // Insert Speaker Lounge (text type) if it doesn't exist
        insertLoc.run(randomUUID(), 'Speaker Lounge', 'speaker-lounge');
        console.log('Speaker Lounge: OK');

        // Insert Bio Energy Shot (100ml) by SuddenRush, restricted to coffee-point-1
        db.prepare(`
            INSERT OR IGNORE INTO items (id, name, sku, stock, min_threshold, category, quantity_per_unit, unit_name, restricted_to_location_slug, cold_storage, created_at)
            VALUES (?, ?, ?, 0, 0, 'Energy Drinks', 1, 'unit', 'coffee-point-1', 0, unixepoch())
        `).run(randomUUID(), 'Bio Energy Shot (100ml)', 'ENERGYDR-BIOENERGYSHOT-100');
        console.log('Bio Energy Shot (SuddenRush): OK');

        db.close();
        console.log('Schema migration complete!');
    } catch (error) {
        console.error('Error applying schema migration:', error.message);
        process.exit(1);
    }
}

console.log('Database initialization complete!');
