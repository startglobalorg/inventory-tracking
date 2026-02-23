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

        db.close();
        console.log('Schema migration complete!');
    } catch (error) {
        console.error('Error applying schema migration:', error.message);
        process.exit(1);
    }
}

console.log('Database initialization complete!');
