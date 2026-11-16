// ─── Validation Middleware ───────────────────────────────────────────────────
// Wraps express-validator so route files stay clean.  Usage:
//
//   import validate from "../middleware/validate.js";
//   import { body } from "express-validator";
//
//   router.post(
//     "/register",
//     [body("email").isEmail(), body("password").isLength({ min: 8 })],
//     validate,
//     controller.register,
//   );
// ────────────────────────────────────────────────────────────────────────────

import { validationResult } from "express-validator";
import ApiError from "../utils/ApiError.js";

/**
 * Express middleware that checks the result of preceding express-validator
 * chains and returns 400 with structured errors if any failed.
 */
const validate = (req, _res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  // Map errors into a cleaner shape: [{ field, message }]
  const extractedErrors = errors.array().map((err) => ({
    field: err.path,
    message: err.msg,
  }));

  // Throw an ApiError so the global error handler picks it up.
  const apiError = ApiError.badRequest("Validation failed");
  apiError.details = extractedErrors;

  // Attach details manually since ApiError doesn't carry them by default.
  return next(apiError);
};

export default validate;
