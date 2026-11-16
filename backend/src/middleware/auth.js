// ─── JWT Authentication Middleware ───────────────────────────────────────────
// Extracts the Bearer token from the Authorization header, verifies it, and
// attaches the decoded user payload to `req.user`.  Downstream handlers can
// then access req.user.id, req.user.email, req.user.role, etc.
// ────────────────────────────────────────────────────────────────────────────

import jwt from "jsonwebtoken";
import config from "../config/index.js";
import ApiError from "../utils/ApiError.js";

/**
 * Express middleware – call `authenticate` on any route that requires a
 * logged-in user.
 */
const authenticate = (req, _res, next) => {
  try {
    // 1. Read the header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Missing or malformed Authorization header");
    }

    // 2. Extract & verify the token
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    // 3. Attach user info to the request object
    req.user = decoded; // { id, email, role, iat, exp }

    next();
  } catch (err) {
    // jwt.verify throws its own errors (TokenExpiredError, JsonWebTokenError)
    if (err instanceof ApiError) {
      return next(err);
    }
    next(ApiError.unauthorized(err.message === "jwt expired" ? "Token has expired" : "Invalid token"));
  }
};

export default authenticate;
