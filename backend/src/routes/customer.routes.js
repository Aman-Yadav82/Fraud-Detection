// ─── Customer Routes ────────────────────────────────────────────────────────
import { Router } from "express";
import authenticate from "../middleware/auth.js";
import authorize from "../middleware/rbac.js";
import { getProfile, getTransactions } from "../controllers/customer.controller.js";

const router = Router();

router.use(authenticate);
router.use(authorize("customer"));

router.get("/profile", getProfile);
router.get("/transactions", getTransactions);

export default router;
