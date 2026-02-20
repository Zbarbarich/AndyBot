/**
 * Runs migration 012 (drop invoice status) using the app DB config.
 * Run from a service that has .env with DB_* (e.g. auth-service or invoice-service):
 *
 *   cd backend/auth-service && NODE_PATH=./node_modules node ../scripts/run-migration-012.js
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

const sqlPath = path.join(__dirname, '..', 'shared', 'schema', '012_drop_invoice_status.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

pool.query(sql)
  .then(() => {
    console.log('Migration 012 applied: invoices.status dropped.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration 012 failed:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
