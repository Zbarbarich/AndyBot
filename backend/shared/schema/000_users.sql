-- Auth service: users table for login and JWT.
-- Run once (e.g. before or with 001–013). Idempotent with IF NOT EXISTS.
CREATE TABLE IF NOT EXISTS "users" (
  "userID"    SERIAL PRIMARY KEY,
  "userName"  VARCHAR(50) NOT NULL,
  "password"  VARCHAR(255) NOT NULL,
  "email"     VARCHAR(50) UNIQUE NOT NULL,
  "role"      VARCHAR(10) NOT NULL DEFAULT 'tech'
);
