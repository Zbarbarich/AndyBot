/**
 * Runs migration 010 (purchase_order_lines: ordered_at, ordered_via) using the app DB config.
 * Run from backend/auth-service:
 *
 *   cd backend/auth-service && NODE_PATH=./node_modules node ../scripts/run-migration-010.js
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

const sqlPath = path.join(__dirname, '..', 'shared', 'schema', '010_purchase_order_line_ordered.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

pool.query(sql)
  .then(() => {
    console.log('Migration 010 applied: purchase_order_lines.ordered_at, ordered_via.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration 010 failed:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
