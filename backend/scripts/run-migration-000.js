/**
 * Creates the auth "users" table (000_users.sql). Run when the live DB has no users table.
 * Run from backend/auth-service with SSH tunnel to live DB:
 *
 *   cd backend/auth-service && NODE_PATH=./node_modules node ../scripts/run-migration-000.js
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

const sqlPath = path.join(__dirname, '..', 'shared', 'schema', '000_users.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

pool.query(sql)
  .then(() => {
    console.log('Migration 000 applied: users table created.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
