// ─── Main Router ────────────────────────────────────────────────────────────
// Aggregates every feature-specific router under the /api prefix.
// ────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import authRoutes from "./auth.routes.js";
import customerRoutes from "./customer.routes.js";
import transactionRoutes from "./transaction.routes.js";
import caseRoutes from "./case.routes.js";

const router = Router();

// Mount sub-routers
router.use("/auth", authRoutes);
router.use("/customer", customerRoutes);
router.use("/transactions", transactionRoutes);
router.use("/cases", caseRoutes);

export default router;
