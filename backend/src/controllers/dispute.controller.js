import disputeService from "../services/dispute.service.js";
import { successResponse } from "../utils/apiResponse.js";

export const createDispute = async (req, res, next) => {
  try {
    const dispute = await disputeService.createDispute(req.user.id, req.body);
    return successResponse(res, dispute, "Dispute submitted successfully", 201);
  } catch (err) {
    next(err);
  }
};

export const getCustomerDisputes = async (req, res, next) => {
  try {
    const disputes = await disputeService.getCustomerDisputes(req.user.id);
    return successResponse(res, disputes, "Disputes fetched successfully");
  } catch (err) {
    next(err);
  }
};

export const getAllDisputes = async (req, res, next) => {
  try {
    const { status, limit, offset } = req.query;
    const result = await disputeService.getAllDisputes({
      status,
      limit: parseInt(limit, 10) || 20,
      offset: parseInt(offset, 10) || 0
    });
    return successResponse(res, result, "Disputes fetched successfully");
  } catch (err) {
    next(err);
  }
};

export const resolveDispute = async (req, res, next) => {
  try {
    const updated = await disputeService.resolveDispute(req.params.id, req.user.id, req.body);
    return successResponse(res, updated, "Dispute updated successfully");
  } catch (err) {
    next(err);
  }
};

export default { createDispute, getCustomerDisputes, getAllDisputes, resolveDispute };
