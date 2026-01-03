// ===========================================
// Database Connection Configuration
// ===========================================
// This file sets up the PostgreSQL connection pool
// using the Neon serverless database

const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool
// A pool manages multiple database connections efficiently
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Neon connections
  }
});

// Test the database connection on startup
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

// Handle connection errors
pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// Export a query function for easy database access
// Usage: const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool // Export pool for transactions if needed
};
