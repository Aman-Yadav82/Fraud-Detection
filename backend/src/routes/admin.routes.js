import { Router } from "express";
import { body } from "express-validator";
import authenticate from "../middleware/auth.js";
import authorize from "../middleware/rbac.js";
import validate from "../middleware/validate.js";
import {
  getUsers,
  updateUser,
  getFraudRules,
  toggleRule,
  createFraudRule,
  getAuditLogs
} from "../controllers/admin.controller.js";

const router = Router();
router.use(authenticate);

// Auditor & Admin can view audit logs
router.get("/audit-logs", authorize("admin", "auditor"), getAuditLogs);

// Rules - Admin can view/edit; Auditor can view
router.get("/rules", authorize("admin", "auditor", "manager"), getFraudRules);
router.patch(
  "/rules/:id/toggle",
  authorize("admin"),
  [body("is_enabled").isBoolean().withMessage("is_enabled must be a boolean")],
  validate,
  toggleRule
);
router.post(
  "/rules",
  authorize("admin"),
  [
    body("name").trim().notEmpty().withMessage("Rule name is required"),
    body("condition").notEmpty().withMessage("Rule condition is required"),
    body("severity").isIn(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).withMessage("Invalid severity")
  ],
  validate,
  createFraudRule
);

// Users - Admin only
router.get("/users", authorize("admin"), getUsers);
router.patch("/users/:id", authorize("admin"), updateUser);

export default router;
