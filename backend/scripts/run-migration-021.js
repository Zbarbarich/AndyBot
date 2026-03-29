/**
 * Runs migration 021 (ticket_images: mime_type, original_filename; position 1-10) using the app DB config.
 * Run from backend/ticket-service (tunnel to DB must be up):
 *
 *   cd backend/ticket-service && NODE_PATH=./node_modules node ../scripts/run-migration-021.js
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

const sqlPath = path.join(__dirname, '..', 'shared', 'schema', '021_ticket_attachments_extend.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

pool.query(sql)
  .then(() => {
    console.log('Migration 021 applied: ticket_images.mime_type, original_filename; position 1-10.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration 021 failed:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
