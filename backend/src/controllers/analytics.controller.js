import analyticsService from "../services/analytics.service.js";
import { successResponse } from "../utils/apiResponse.js";

export const getManagerMetrics = async (req, res, next) => {
  try {
    const metrics = await analyticsService.getManagerDashboardMetrics();
    return successResponse(res, metrics, "Analytics fetched successfully");
  } catch (err) {
    next(err);
  }
};

export default { getManagerMetrics };
