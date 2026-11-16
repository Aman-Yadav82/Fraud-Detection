// ─── Auth Controller ────────────────────────────────────────────────────────
// Thin HTTP layer — delegates all business logic to auth.service.js.
// ────────────────────────────────────────────────────────────────────────────

import { registerUser, loginUser } from "../services/auth.service.js";
import { successResponse } from "../utils/apiResponse.js";

/**
 * POST /api/auth/register
 * Body: { name, email, password, role? }
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const { user, token } = await registerUser({ name, email, password, role });

    return successResponse(res, { user, token }, "User registered successfully", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { user, token } = await loginUser({ email, password });

    return successResponse(res, { user, token }, "Logged in successfully");
  } catch (err) {
    next(err);
  }
};

export default { register, login };
