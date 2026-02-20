/**
 * Runs migration 009 (ERP plan: line cols, items stock/our_cost, customer_po, invoice_payments, POs, etc.) using the app DB config.
 * Run from backend/auth-service:
 *
 *   cd backend/auth-service && NODE_PATH=./node_modules node ../scripts/run-migration-009.js
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

const sqlPath = path.join(__dirname, '..', 'shared', 'schema', '009_erp_plan_changes.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

pool.query(sql)
  .then(() => {
    console.log('Migration 009 applied: line item cols, items stock/our_cost, customer_po, invoice_payments, purchase_orders, etc.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration 009 failed:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
