/**
 * Runs migration 007 (drop quotes_orders, quote_order_lines, and dependents) using the app DB config.
 * Run from backend/auth-service:
 *
 *   cd backend/auth-service ; NODE_PATH=./node_modules node ../scripts/run-migration-007.js
 *
 * After this, re-create tables by running schema 004, 005, 006 (e.g. via psql or run-migration-006.js for 006).
 */
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

const sqlPath = path.join(__dirname, '..', 'shared', 'schema', '007_drop_quotes_orders_fresh_start.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

pool.query(sql)
  .then(() => {
    console.log('Migration 007 applied: quote_order_lines, quotes_orders, invoices, invoice_lines dropped.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
