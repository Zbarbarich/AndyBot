/**
 * Runs migration 006 (invoice payment columns) using the same DB config as the app.
 * Run from backend/auth-service so .env and node_modules are used:
 *
 *   cd backend/auth-service && NODE_PATH=./node_modules node ../scripts/run-migration-006.js
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

const sqlPath = path.join(__dirname, '..', 'shared', 'schema', '006_invoice_payment_and_return_type.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

pool.query(sql)
  .then(() => {
    console.log('Migration 006 applied successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
