/**
 * Inserts the first user into the "users" table (run after 000_users.sql).
 * Run from backend/auth-service (tunnel to DB must be up):
 *
 *   cd backend/auth-service && NODE_PATH=./node_modules node ../scripts/create-first-user.js "your@email.com" "YourPassword" "Your Name"
 *
 * Role defaults to "admin" for the first user; change in the script if needed.
 */
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

const [,, email, password, userName] = process.argv;
if (!email || !password || !userName) {
  console.error('Usage: node create-first-user.js "email@example.com" "password" "Display Name"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);

pool.query(
  `INSERT INTO "users" ("userName", "password", "email", "role") VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING "userID", "userName", "email", "role"`,
  [userName.trim(), hash, email.trim(), 'admin']
)
  .then((res) => {
    if (res.rows.length > 0) {
      console.log('User created:', res.rows[0].email);
    } else {
      console.log('User already exists with that email (no change).');
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
