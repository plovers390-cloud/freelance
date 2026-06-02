// ============================================
// db.js — PostgreSQL Connection Pool
// ============================================
// Creates and exports a reusable connection pool
// used by all route handlers and utilities.
//
// Supports: Supabase, Render, Railway, or any
// provider that gives a DB_CONNECTION_STRING.
// ============================================

const { Pool } = require('pg');
require('dotenv').config();

// Supabase / Render / Railway provide a single DB_CONNECTION_STRING;
// local dev uses individual DB_* vars.
const poolConfig = process.env.DB_CONNECTION_STRING
  ? {
      connectionString: process.env.DB_CONNECTION_STRING,
      ssl: { rejectUnauthorized: false }, // required for hosted PG (Supabase, Render, etc.)
    }
  : {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    };

const pool = new Pool({
  ...poolConfig,

  // Connection pool tuning
  // Supabase free tier allows ~15 direct connections;
  // keep max lower to leave headroom for dashboard/migrations
  max: 10,
  idleTimeoutMillis: 30000,    // close idle connections after 30s
  connectionTimeoutMillis: 5000 // fail fast if DB unreachable
});

// Log successful pool connection on first query
pool.on('connect', () => {
  console.log('📦 Connected to PostgreSQL');
});

// Log pool-level errors (prevents unhandled crashes)
pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL pool error:', err.message);
});

module.exports = pool;
