/**
 * Runs migration 017 (order_deposits table) using the app DB config.
 * Run from a service that has .env with DB_* (e.g. order-service or auth-service):
 *
 *   cd backend/order-service && NODE_PATH=./node_modules node ../scripts/run-migration-017.js
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

const sqlPath = path.join(__dirname, '..', 'shared', 'schema', '017_order_deposits.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

pool.query(sql)
  .then(() => {
    console.log('Migration 017 applied: order_deposits table created.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration 017 failed:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
