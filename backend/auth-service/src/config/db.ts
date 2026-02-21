import { Pool, PoolConfig } from "pg";
require("dotenv").config();

const poolConfig: PoolConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
};

// Only use SSL if explicitly enabled (for production/remote databases)
if (process.env.DB_SSL === "true") {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const pool = new Pool(poolConfig);

// All timestamps and CURRENT_DATE in this app are in Eastern (New York).
pool.on("connect", (client) => {
  void client.query("SET timezone = 'America/New_York'");
});

// Connection test - log clear message if DB is unreachable
pool.connect((err, client, release) => {
  if (err) {
    console.error("Database connection failed. Check that PostgreSQL is running and .env has correct DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD.");
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
    console.log("Connected to database successfully");
  });
});

// Export the query interface
export const query = (text: string, params?: any[]) => pool.query(text, params);
export { pool };
