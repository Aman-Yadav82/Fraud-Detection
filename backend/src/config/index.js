// ─── Central Configuration ──────────────────────────────────────────────────
// Reads every env-var once and exposes a frozen config object so the rest of
// the app never touches process.env directly.
// ────────────────────────────────────────────────────────────────────────────

import dotenv from "dotenv";
dotenv.config(); // load .env at the earliest possible moment

const config = Object.freeze({
  // Server
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: (process.env.NODE_ENV || "development") === "development",
  isProd: process.env.NODE_ENV === "production",

  // PostgreSQL
  db: Object.freeze({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || "fraud_detection",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
  }),

  // JWT
  jwt: Object.freeze({
    secret: process.env.JWT_SECRET || "unsafe-default-secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  }),

  // External services
  mlServiceUrl: process.env.ML_SERVICE_URL || "http://localhost:8000",
});

export default config;
