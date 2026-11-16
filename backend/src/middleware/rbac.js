// ─── Role-Based Access Control Middleware ────────────────────────────────────
// Works in tandem with the auth middleware.  After `authenticate` populates
// `req.user`, call `authorize("admin", "analyst")` to restrict the route to
// only those roles.
// ────────────────────────────────────────────────────────────────────────────

import ApiError from "../utils/ApiError.js";

/**
 * Returns an Express middleware that allows only the specified roles.
 *
 * @param  {...string} allowedRoles – One or more role names
 * @returns {import("express").RequestHandler}
 *
 * @example
 *   router.get("/admin-only", authenticate, authorize("admin"), handler);
 */
const authorize = (...allowedRoles) => {
  return (req, _res, next) => {
    // Guard: auth middleware must run first
    if (!req.user) {
      return next(ApiError.unauthorized("Authentication required"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Role '${req.user.role}' is not authorised to access this resource`
        )
      );
    }

    next();
  };
};

export default authorize;
