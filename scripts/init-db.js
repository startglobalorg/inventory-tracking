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

    // Push schema to database
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
    console.log('Database already exists, checking for schema updates...');
    try {
        execSync('npx drizzle-kit push', {
            stdio: 'inherit',
            env: { ...process.env, DATABASE_URL: dbPath }
        });
        console.log('Schema check complete!');
    } catch (error) {
        console.warn('Warning: Could not update schema:', error.message);
    }
}

console.log('Database initialization complete!');
