// Database Connection Configuration

const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool
// A pool manages multiple database connections efficiently
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false 
  },
  // Prevent "Connection terminated unexpectedly" errors by closing idle connections
  // before Neon's proxy automatically drops them
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// Export a query function for easy database access
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool 
};
