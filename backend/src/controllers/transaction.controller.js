// ─── Transaction Controller ────────────────────────────────────────────────
import transactionService from "../services/transaction.service.js";
import { successResponse } from "../utils/apiResponse.js";

export const createTransaction = async (req, res, next) => {
  try {
    const result = await transactionService.processTransaction(req.user.id, req.body);
    return successResponse(res, result, result.message, 201);
  } catch (err) {
    next(err);
  }
};

export default { createTransaction };
