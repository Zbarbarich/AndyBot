/**
 * Apply schema migrations 000–022 in order.
 * Requires a running Postgres and env loaded from the current working directory's .env
 * (typically backend/auth-service/.env).
 *
 *   cd backend/auth-service && NODE_PATH=./node_modules node ../scripts/run-all-migrations.js
 */
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const { Pool } = require('pg');

const MIGRATIONS = [
  '000_users.sql',
  '001_customers_tickets.sql',
  '002_add_ticket_status.sql',
  '003_ticket_resolution_updates.sql',
  '004_erp_items_quotes_orders_invoices.sql',
  '005_quote_order_shared_document_number.sql',
  '006_invoice_payment_and_return_type.sql',
  '007_drop_quotes_orders_fresh_start.sql',
  '008_ticket_id_sequence.sql',
  '009_erp_plan_changes.sql',
  '010_purchase_order_line_ordered.sql',
  '011_unit_of_measure.sql',
  '012_drop_invoice_status.sql',
  '013_invoice_payment_reference.sql',
  '014_customer_contact.sql',
  '015_quantity_billed.sql',
  '016_items_decimal_columns.sql',
  '017_order_deposits.sql',
  '018_clear_orders_and_invoices_data.sql',
  '019_drop_redundant_indexes.sql',
  '020_purchase_order_line_notes_received.sql',
  '021_ticket_attachments_extend.sql',
  '022_user_ui_preferences.sql',
];

async function main() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
  });

  const schemaDir = path.join(__dirname, '..', 'shared', 'schema');

  try {
    for (const file of MIGRATIONS) {
      const sqlPath = path.join(schemaDir, file);
      if (!fs.existsSync(sqlPath)) {
        throw new Error(`Missing migration file: ${file}`);
      }
      const sql = fs.readFileSync(sqlPath, 'utf8');
      process.stdout.write(`Applying ${file}... `);
      await pool.query(sql);
      console.log('ok');
    }
    console.log('All migrations applied (000–021).');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
