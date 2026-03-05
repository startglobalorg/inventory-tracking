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

// Check if database file exists
const dbExists = fs.existsSync(dbPath);
console.log('Database exists:', dbExists);

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
    // For existing databases, apply any missing schema changes directly with SQL.
    // drizzle-kit push is interactive when new tables are detected (prompts to
    // confirm "create or rename"), which hangs in a Docker container without a TTY.
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

        // runner_id column on orders (nullable FK, SET NULL handled at app level)
        const orderCols = db.prepare('PRAGMA table_info(orders)').all();
        if (!orderCols.some(c => c.name === 'runner_id')) {
            db.exec('ALTER TABLE orders ADD COLUMN runner_id TEXT REFERENCES runners(id)');
            console.log('orders.runner_id column: added');
        } else {
            console.log('orders.runner_id column: OK');
        }

        // custom_request column on orders (text requests from non-inventory locations)
        if (!orderCols.some(c => c.name === 'custom_request')) {
            db.exec('ALTER TABLE orders ADD COLUMN custom_request TEXT');
            console.log('orders.custom_request column: added');
        } else {
            console.log('orders.custom_request column: OK');
        }

        // type column on locations ('inventory' | 'text', defaults to 'inventory')
        const locationCols = db.prepare('PRAGMA table_info(locations)').all();
        if (!locationCols.some(c => c.name === 'type')) {
            db.exec("ALTER TABLE locations ADD COLUMN type TEXT NOT NULL DEFAULT 'inventory'");
            console.log('locations.type column: added');
        } else {
            console.log('locations.type column: OK');
        }

        // cancelled_by column on orders (set when a location cancels their own order)
        if (!orderCols.some(c => c.name === 'cancelled_by')) {
            db.exec('ALTER TABLE orders ADD COLUMN cancelled_by TEXT');
            console.log('orders.cancelled_by column: added');
        } else {
            console.log('orders.cancelled_by column: OK');
        }

        // Fix Accreditation to use text-based request form
        db.prepare("UPDATE locations SET type = 'text' WHERE slug = 'accreditation' AND type = 'inventory'").run();
        console.log('locations.accreditation type: OK');

        // Insert Info Points 1-5 (text type) if they don't exist
        const insertLoc = db.prepare("INSERT OR IGNORE INTO locations (id, name, slug, type) VALUES (?, ?, ?, 'text')");
        const { randomUUID } = require('crypto');
        for (let i = 1; i <= 5; i++) {
            insertLoc.run(randomUUID(), `Info Point ${i}`, `info-point-${i}`);
        }
        console.log('Info Points 1-5: OK');

        // Insert Speaker Lounge (text type) if it doesn't exist
        insertLoc.run(randomUUID(), 'Speaker Lounge', 'speaker-lounge');
        console.log('Speaker Lounge: OK');

        db.close();
        console.log('Schema migration complete!');
    } catch (error) {
        console.error('Error applying schema migration:', error.message);
        process.exit(1);
    }
}

console.log('Database initialization complete!');
