// ─── Global Error Handler Middleware ─────────────────────────────────────────
// Must be registered LAST with app.use() so Express routes unhandled errors
// here.  Distinguishes operational ApiErrors from unexpected crashes.
// ────────────────────────────────────────────────────────────────────────────

import config from "../config/index.js";
import ApiError from "../utils/ApiError.js";
import { errorResponse } from "../utils/apiResponse.js";

/**
 * Express error-handling middleware (4-argument signature).
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  // ── 1. Normalise the error ────────────────────────────────────────────────
  let error = err;

  if (!(error instanceof ApiError)) {
    // Wrap unexpected errors so the response format is consistent.
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal server error";
    error = new ApiError(statusCode, message, false);
  }

  const { statusCode, message } = error;

  // ── 2. Log ────────────────────────────────────────────────────────────────
  if (!error.isOperational) {
    // Unexpected / programmer errors deserve a full stack trace.
    console.error("[ERROR]", err);
  } else if (config.isDev) {
    console.warn(`[WARN] ${statusCode} – ${message}`);
  }

  // ── 3. Respond ────────────────────────────────────────────────────────────
  const details = config.isDev && !error.isOperational ? err.stack : undefined;
  return errorResponse(res, message, statusCode, details);
};

export default errorHandler;
