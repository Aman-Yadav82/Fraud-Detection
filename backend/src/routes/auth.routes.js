// ─── Auth Routes ────────────────────────────────────────────────────────────
// POST /api/auth/register – create a new account
// POST /api/auth/login    – obtain a JWT
// ────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import { body } from "express-validator";
import validate from "../middleware/validate.js";
import { register, login } from "../controllers/auth.controller.js";

const router = Router();

// ── Validation chains ──────────────────────────────────────────────────────

const registerRules = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Must be a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),

  body("first_name")
    .optional()
    .trim()
    .isLength({ max: 100 }),

  body("last_name")
    .optional()
    .trim()
    .isLength({ max: 100 }),

  body("name")
    .optional()
    .trim()
    .isLength({ max: 100 }),

  body("role")
    .optional()
    .isIn(["customer", "analyst", "manager", "admin", "auditor"])
    .withMessage("Role must be one of: customer, analyst, manager, admin, auditor"),
];

const loginRules = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Must be a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];

// ── Route definitions ──────────────────────────────────────────────────────

router.post("/register", registerRules, validate, register);
router.post("/login", loginRules, validate, login);

export default router;
