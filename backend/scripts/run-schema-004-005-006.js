/**
 * Re-creates quotes_orders, quote_order_lines, invoices, invoice_lines by running schema 004, 005, 006.
 * Use after running migration 007 (drop). Run from backend/auth-service:
 *
 *   cd backend/auth-service ; NODE_PATH=./node_modules node ../scripts/run-schema-004-005-006.js
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

const schemaDir = path.join(__dirname, '..', 'shared', 'schema');
const files = ['004_erp_items_quotes_orders_invoices.sql', '005_quote_order_shared_document_number.sql', '006_invoice_payment_and_return_type.sql'];

async function run() {
  for (const file of files) {
    const sqlPath = path.join(schemaDir, file);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('Applied:', file);
  }
  console.log('Schema 004, 005, 006 applied. quotes_orders, quote_order_lines, invoices, invoice_lines are ready.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
}).finally(() => pool.end());
