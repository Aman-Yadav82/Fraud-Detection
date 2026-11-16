// ─── Customer Controller ────────────────────────────────────────────────────
import customerService from "../services/customer.service.js";
import { successResponse } from "../utils/apiResponse.js";

export const getProfile = async (req, res, next) => {
  try {
    const profile = await customerService.getCustomerProfile(req.user.id);
    return successResponse(res, profile, "Profile fetched successfully");
  } catch (err) {
    next(err);
  }
};

export const getTransactions = async (req, res, next) => {
  try {
    const { limit, offset, status } = req.query;
    const result = await customerService.getCustomerTransactions(req.user.id, {
      limit: parseInt(limit, 10) || 20,
      offset: parseInt(offset, 10) || 0,
      status
    });
    return successResponse(res, result, "Transactions fetched successfully");
  } catch (err) {
    next(err);
  }
};

export default { getProfile, getTransactions };
