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

// Simple connection test
pool.connect((err, client, release) => {
  if (err) {
    return console.error("Error acquiring client:", err.stack);
  }
  if (!client) {
    return console.error("Error: client is undefined");
  }
  client.query("SELECT NOW()", (err, result) => {
    release();
    if (err) {
      return console.error("Error executing query:", err.stack);
    }
    console.log("Connected to database successfully");
  });
});

// Export the query interface
export const query = (text: string, params?: any[]) => pool.query(text, params);
export { pool };
