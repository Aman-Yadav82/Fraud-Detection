// ─── Main Router ────────────────────────────────────────────────────────────
// Aggregates every feature-specific router under a single prefix so app.js
// only needs one `app.use("/api", router)` call.
// ────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import authRoutes from "./auth.routes.js";

const router = Router();

// Mount sub-routers
router.use("/auth", authRoutes);

// Future feature routers go here, e.g.:
// router.use("/transactions", transactionRoutes);
// router.use("/alerts",       alertRoutes);
// router.use("/reports",      reportRoutes);

export default router;
