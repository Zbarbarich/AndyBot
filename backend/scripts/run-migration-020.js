/**
 * Runs migration 020 (purchase_order_lines: ordered_via_notes, received_at) using the app DB config.
 * Run from backend/order-service (tunnel to DB must be up):
 *
 *   cd backend/order-service && NODE_PATH=./node_modules node ../scripts/run-migration-020.js
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

const sqlPath = path.join(__dirname, '..', 'shared', 'schema', '020_purchase_order_line_notes_received.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

pool.query(sql)
  .then(() => {
    console.log('Migration 020 applied: purchase_order_lines.ordered_via_notes, received_at.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration 020 failed:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
