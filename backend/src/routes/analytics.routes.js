import { Router } from "express";
import authenticate from "../middleware/auth.js";
import authorize from "../middleware/rbac.js";
import { getManagerMetrics } from "../controllers/analytics.controller.js";

const router = Router();
router.use(authenticate);

// Manager, Admin, and Auditor can access operational metrics
router.get("/metrics", authorize("manager", "admin", "auditor"), getManagerMetrics);

export default router;
