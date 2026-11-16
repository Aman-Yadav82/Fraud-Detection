// ─── Main Router ────────────────────────────────────────────────────────────
// Aggregates every feature-specific router under the /api prefix.
// ────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import authRoutes from "./auth.routes.js";
import customerRoutes from "./customer.routes.js";
import transactionRoutes from "./transaction.routes.js";
import caseRoutes from "./case.routes.js";
import disputeRoutes from "./dispute.routes.js";
import analyticsRoutes from "./analytics.routes.js";
import adminRoutes from "./admin.routes.js";

const router = Router();

// Mount sub-routers
router.use("/auth", authRoutes);
router.use("/customer", customerRoutes);
router.use("/transactions", transactionRoutes);
router.use("/cases", caseRoutes);
router.use("/disputes", disputeRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/admin", adminRoutes);

export default router;
