/**
 * Runs migration 018 (clear orders and invoices data only; keep customers, tickets, items, etc.).
 * Run from a service that has .env with DB_* (e.g. order-service or auth-service):
 *
 *   cd backend/order-service && NODE_PATH=./node_modules node ../scripts/run-migration-018.js
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

const sqlPath = path.join(__dirname, '..', 'shared', 'schema', '018_clear_orders_and_invoices_data.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

pool.query(sql)
  .then(() => {
    console.log('Migration 018 applied: orders and invoices data cleared; sequences reset.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration 018 failed:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
