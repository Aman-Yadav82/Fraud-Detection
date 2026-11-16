// ─── PostgreSQL Connection Pool ─────────────────────────────────────────────
// Creates a single Pool instance shared across the application.  Exports a
// thin `query` helper so callers can simply do:
//
//   import db from "../config/database.js";
//   const { rows } = await db.query("SELECT * FROM users WHERE id = $1", [id]);
// ────────────────────────────────────────────────────────────────────────────

import pg from "pg";
import config from "./index.js";

const { Pool } = pg;

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,

  // Connection-pool tuning
  max: 20,                   // max simultaneous connections
  idleTimeoutMillis: 30_000, // close idle clients after 30 s
  connectionTimeoutMillis: 5_000, // fail fast if DB is unreachable
});

// Log unexpected errors on idle clients so they don't crash the process.
pool.on("error", (err) => {
  console.error("[DB] Unexpected error on idle client:", err.message);
});

/**
 * Convenience wrapper around pool.query().
 * @param {string}  text   – SQL query string (with $1, $2 … placeholders)
 * @param {any[]}   params – Parameterised values
 * @returns {Promise<pg.QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * Obtain a dedicated client for transactions.
 * Remember to call client.release() when done.
 */
const getClient = () => pool.connect();

/**
 * Quick connectivity check — used at server startup.
 */
const testConnection = async () => {
  const client = await pool.connect();
  try {
    await client.query("SELECT NOW()");
    console.log("[DB] Connected to PostgreSQL successfully.");
  } finally {
    client.release();
  }
};

export default { query, getClient, pool, testConnection };
