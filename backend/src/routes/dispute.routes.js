import { Router } from "express";
import { body } from "express-validator";
import authenticate from "../middleware/auth.js";
import authorize from "../middleware/rbac.js";
import validate from "../middleware/validate.js";
import {
  createDispute,
  getCustomerDisputes,
  getAllDisputes,
  resolveDispute
} from "../controllers/dispute.controller.js";

const router = Router();
router.use(authenticate);

// Customer endpoints
router.post(
  "/",
  authorize("customer"),
  [
    body("transaction_id").notEmpty().withMessage("Transaction ID is required"),
    body("reason").trim().notEmpty().withMessage("Reason is required")
  ],
  validate,
  createDispute
);

router.get("/my", authorize("customer"), getCustomerDisputes);

// Staff endpoints (Analyst, Manager, Auditor, Admin)
router.get("/", authorize("analyst", "manager", "admin", "auditor"), getAllDisputes);
router.patch(
  "/:id/resolve",
  authorize("analyst", "manager", "admin"),
  [body("status").isIn(["resolved", "rejected"]).withMessage("Status must be resolved or rejected")],
  validate,
  resolveDispute
);

export default router;
