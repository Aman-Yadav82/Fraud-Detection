// ─── Transaction Routes ─────────────────────────────────────────────────────
import { Router } from "express";
import { body } from "express-validator";
import authenticate from "../middleware/auth.js";
import authorize from "../middleware/rbac.js";
import validate from "../middleware/validate.js";
import { createTransaction } from "../controllers/transaction.controller.js";

const router = Router();

const transactionValidation = [
  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isFloat({ min: 1 })
    .withMessage("Amount must be a positive number"),
  body("merchant_category")
    .optional()
    .trim(),
  body("merchant_name")
    .optional()
    .trim(),
  body("payment_method")
    .optional()
    .isIn(["card", "upi", "netbanking", "wallet"])
    .withMessage("Payment method must be one of: card, upi, netbanking, wallet"),
];

router.post(
  "/simulate",
  authenticate,
  authorize("customer"),
  transactionValidation,
  validate,
  createTransaction
);

export default router;
