// ─── Server Entry Point ──────────────────────────────────────────────────────
// Imports the configured Express app, tests the database connection, and starts
// listening on the configured port.
// ─────────────────────────────────────────────────────────────────────────────

import app from "./app.js";
import config from "./config/index.js";
import db from "./config/database.js";
const { pool, testConnection } = db;

const PORT = config.port || 5000;

async function startServer() {
  try {
    // ── Test database connection ──────────────────────────────────────────
    await testConnection();
    console.log("✅ Database connection established successfully");

    // ── Start listening ──────────────────────────────────────────────────
    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════╗
║  🛡️  Fraud Detection API Server                     ║
║                                                      ║
║  Environment : ${config.nodeEnv.padEnd(37)}║
║  Port        : ${String(PORT).padEnd(37)}║
║  Health      : http://localhost:${PORT}/api/health${" ".repeat(Math.max(0, 14 - String(PORT).length))}║
║  API Base    : http://localhost:${PORT}/api${" ".repeat(Math.max(0, 21 - String(PORT).length))}║
╚══════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);

    // If it's a database error, provide helpful guidance
    if (error.code === "ECONNREFUSED") {
      console.error(`
💡 Database connection refused. Make sure PostgreSQL is running:
   • Docker:  docker compose up db -d
   • Local:   Check that PostgreSQL service is started
   • Config:  Verify DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in .env
      `);
    }

    process.exit(1);
  }
}

// ── Graceful shutdown ────────────────────────────────────────────────────────
process.on("SIGTERM", async () => {
  console.log("\n🔄 SIGTERM received. Shutting down gracefully...");
  await pool.end();
  console.log("✅ Database pool closed.");
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("\n🔄 SIGINT received. Shutting down gracefully...");
  await pool.end();
  console.log("✅ Database pool closed.");
  process.exit(0);
});

// ── Start ────────────────────────────────────────────────────────────────────
startServer();
