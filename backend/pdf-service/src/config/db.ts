import { Pool, PoolConfig } from "pg";
require("dotenv").config();

const poolConfig: PoolConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
};

if (process.env.DB_SSL === "true") {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const pool = new Pool(poolConfig);

pool.connect((err, client, release) => {
  if (err) {
    console.error("PDF-service DB connection failed. Check PostgreSQL and .env (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD).");
    if (err.message) console.error(err.message);
    return;
  }
  if (!client) {
    console.error("Error: client is undefined");
    return;
  }
  client.query("SELECT NOW()", (err, result) => {
    release();
    if (err) {
      console.error("Database query failed:", err.message);
      return;
    }
    console.log("PDF-service connected to database");
  });
});

export const query = (text: string, params?: unknown[]) =>
  pool.query(text, params as never);
export { pool };
