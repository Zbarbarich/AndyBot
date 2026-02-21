/**
 * Runs migration 015 (quote_order_lines.quantity_billed) using the app DB config.
 * Run from a service that has .env with DB_* (e.g. auth-service):
 *
 *   cd backend/auth-service && NODE_PATH=./node_modules node ../scripts/run-migration-015.js
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

const sqlPath = path.join(__dirname, '..', 'shared', 'schema', '015_quantity_billed.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

pool.query(sql)
  .then(() => {
    console.log('Migration 015 applied: quote_order_lines.quantity_billed added.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration 015 failed:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
