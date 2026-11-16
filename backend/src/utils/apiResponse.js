// ─── Standardised API Response Helpers ───────────────────────────────────────
// Every endpoint should return a consistent JSON envelope so the frontend can
// rely on a predictable shape:
//
//   { success: true,  data: { … }, message: "…" }
//   { success: false, error: { message: "…", details: … } }
// ────────────────────────────────────────────────────────────────────────────

/**
 * Send a success response.
 *
 * @param {import("express").Response} res
 * @param {object}  data            – Payload
 * @param {string}  [message="OK"]  – Optional human-readable message
 * @param {number}  [statusCode=200]
 */
export const successResponse = (res, data = null, message = "OK", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send an error response.
 *
 * @param {import("express").Response} res
 * @param {string}  message          – Error description
 * @param {number}  [statusCode=500]
 * @param {any}     [details=null]   – Optional extra info (validation errors, etc.)
 */
export const errorResponse = (res, message = "Internal server error", statusCode = 500, details = null) => {
  const body = {
    success: false,
    error: { message },
  };

  if (details) {
    body.error.details = details;
  }

  return res.status(statusCode).json(body);
};
