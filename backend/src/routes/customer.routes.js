// ─── Customer Routes ────────────────────────────────────────────────────────
import { Router } from "express";
import authenticate from "../middleware/auth.js";
import authorize from "../middleware/rbac.js";
import {
  getProfile,
  getTransactions,
  getNotifications,
  markNotificationRead
} from "../controllers/customer.controller.js";

const router = Router();

router.use(authenticate);
router.use(authorize("customer"));

router.get("/profile", getProfile);
router.get("/transactions", getTransactions);
router.get("/notifications", getNotifications);
router.patch("/notifications/:id/read", markNotificationRead);

export default router;
