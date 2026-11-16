// ─── Express Application Setup ──────────────────────────────────────────────
// Configures the Express app with all middleware and routes but does NOT call
// app.listen().  This separation makes the app easily testable.
// ────────────────────────────────────────────────────────────────────────────

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import config from "./config/index.js";
import routes from "./routes/index.js";
import errorHandler from "./middleware/errorHandler.js";
import { errorResponse } from "./utils/apiResponse.js";

const app = express();

// ── Security ────────────────────────────────────────────────────────────────
app.use(helmet());                             // sets various HTTP security headers
app.use(cors());                               // enable CORS for all origins (tighten in prod)

// ── Rate limiting ───────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: "Too many requests, please try again later." } },
});
app.use(limiter);

// ── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Request logging ─────────────────────────────────────────────────────────
app.use(morgan(config.isDev ? "dev" : "combined"));

// ── Health check ────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Fraud Detection API is running",
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// ── API routes ──────────────────────────────────────────────────────────────
app.use("/api", routes);

// ── 404 catch-all ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  errorResponse(res, "Route not found", 404);
});

// ── Global error handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

export default app;
