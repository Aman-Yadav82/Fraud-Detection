import adminService from "../services/admin.service.js";
import { successResponse } from "../utils/apiResponse.js";

export const getUsers = async (req, res, next) => {
  try {
    const { role, limit, offset } = req.query;
    const result = await adminService.getUsers({ role, limit, offset });
    return successResponse(res, result, "Users fetched successfully");
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const updated = await adminService.updateUser(req.user.id, req.params.id, req.body);
    return successResponse(res, updated, "User updated successfully");
  } catch (err) {
    next(err);
  }
};

export const getFraudRules = async (req, res, next) => {
  try {
    const rules = await adminService.getFraudRules();
    return successResponse(res, rules, "Rules fetched successfully");
  } catch (err) {
    next(err);
  }
};

export const toggleRule = async (req, res, next) => {
  try {
    const updated = await adminService.toggleRule(req.user.id, req.params.id, req.body.is_enabled);
    return successResponse(res, updated, "Rule status updated successfully");
  } catch (err) {
    next(err);
  }
};

export const createFraudRule = async (req, res, next) => {
  try {
    const rule = await adminService.createFraudRule(req.user.id, req.body);
    return successResponse(res, rule, "Rule created successfully", 201);
  } catch (err) {
    next(err);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const { limit, offset, action, entity_type } = req.query;
    const result = await adminService.getAuditLogs({ limit, offset, action, entity_type });
    return successResponse(res, result, "Audit logs fetched successfully");
  } catch (err) {
    next(err);
  }
};

export default {
  getUsers,
  updateUser,
  getFraudRules,
  toggleRule,
  createFraudRule,
  getAuditLogs
};
