// ─── Case Routes ────────────────────────────────────────────────────────────
import { Router } from "express";
import { body } from "express-validator";
import authenticate from "../middleware/auth.js";
import authorize from "../middleware/rbac.js";
import validate from "../middleware/validate.js";
import {
  getCases,
  getAlerts,
  getCaseById,
  addNote,
  recordDecision,
  reassign
} from "../controllers/case.controller.js";

const router = Router();

router.use(authenticate);

// Alerts route (must be before /:id)
router.get("/alerts/all", authorize("analyst", "manager", "admin", "auditor"), getAlerts);

// Cases list & details
router.get("/", authorize("analyst", "manager", "admin", "auditor"), getCases);
router.get("/:id", authorize("analyst", "manager", "admin", "auditor"), getCaseById);

// Analysts and Managers can add investigation notes
router.post(
  "/:id/notes",
  authorize("analyst", "manager"),
  [body("content").trim().notEmpty().withMessage("Note content is required")],
  validate,
  addNote
);

// Analysts and Managers can record decisions
router.post(
  "/:id/decision",
  authorize("analyst", "manager"),
  [body("decision").isIn(["legitimate", "suspected_fraud", "confirmed_fraud"]).withMessage("Invalid decision")],
  validate,
  recordDecision
);

// Only managers and admins can reassign cases
router.patch(
  "/:id/reassign",
  authorize("manager", "admin"),
  [body("analyst_id").notEmpty().withMessage("Analyst ID is required")],
  validate,
  reassign
);

export default router;
