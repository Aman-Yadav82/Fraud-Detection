// ─── Custom API Error ───────────────────────────────────────────────────────
// Extends the native Error class with an HTTP status code so the global error
// handler can translate it into a proper JSON response.
// ────────────────────────────────────────────────────────────────────────────

class ApiError extends Error {
  /**
   * @param {number} statusCode – HTTP status code (e.g. 400, 401, 404, 500)
   * @param {string} message    – Human-readable error description
   * @param {boolean} [isOperational=true] – Flag to distinguish expected errors
   *   (bad input, not found) from unexpected programmer errors.
   */
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Capture stack trace, excluding the constructor call from it.
    Error.captureStackTrace(this, this.constructor);
  }

  // ── Convenience factory methods ──────────────────────────────────────────

  static badRequest(message = "Bad request") {
    return new ApiError(400, message);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }

  static conflict(message = "Conflict") {
    return new ApiError(409, message);
  }

  static internal(message = "Internal server error") {
    return new ApiError(500, message, false);
  }
}

export default ApiError;
