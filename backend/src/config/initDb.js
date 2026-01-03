// ===========================================
// Database Initialization Script
// ===========================================
// Run this script to create all database tables
// Command: npm run db:init

const fs = require('fs');
const path = require('path');
const db = require('./db');

async function initializeDatabase() {
    try {
        console.log('🚀 Initializing database...\n');

        // Read the SQL file
        const sqlPath = path.join(__dirname, 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute the SQL
        await db.query(sql);

        console.log('✅ Database tables created successfully!\n');
        console.log('Tables created:');
        console.log('  - organizations');
        console.log('  - users');
        console.log('  - projects');
        console.log('  - project_members');
        console.log('  - tasks');
        console.log('  - notifications');
        console.log('\n🎉 Database initialization complete!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        process.exit(1);
    }
}

initializeDatabase();
