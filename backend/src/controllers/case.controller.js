import caseService from "../services/case.service.js";
import { successResponse } from "../utils/apiResponse.js";

export const getCases = async (req, res, next) => {
  try {
    const { status, priority, assigned_to, limit, offset } = req.query;
    const result = await caseService.getCases({
      status,
      priority,
      assigned_to: req.user.role === "analyst" ? req.user.id : assigned_to,
      limit: parseInt(limit, 10) || 20,
      offset: parseInt(offset, 10) || 0
    });
    return successResponse(res, result, "Cases fetched successfully");
  } catch (err) {
    next(err);
  }
};

export const getAlerts = async (req, res, next) => {
  try {
    const { severity, status, limit, offset } = req.query;
    const result = await caseService.getAlerts({
      severity,
      status,
      limit: parseInt(limit, 10) || 50,
      offset: parseInt(offset, 10) || 0
    });
    return successResponse(res, result, "Alerts fetched successfully");
  } catch (err) {
    next(err);
  }
};

export const getCaseById = async (req, res, next) => {
  try {
    const caseData = await caseService.getCaseById(req.params.id);
    return successResponse(res, caseData, "Case details fetched successfully");
  } catch (err) {
    next(err);
  }
};

export const addNote = async (req, res, next) => {
  try {
    const note = await caseService.addCaseNote(req.params.id, req.user.id, req.body);
    return successResponse(res, note, "Note added successfully", 201);
  } catch (err) {
    next(err);
  }
};

export const recordDecision = async (req, res, next) => {
  try {
    const updated = await caseService.recordDecision(req.params.id, req.user.id, req.body);
    return successResponse(res, updated, "Decision recorded successfully");
  } catch (err) {
    next(err);
  }
};

export const reassign = async (req, res, next) => {
  try {
    const updated = await caseService.reassignCase(req.params.id, req.user.id, req.body.analyst_id);
    return successResponse(res, updated, "Case reassigned successfully");
  } catch (err) {
    next(err);
  }
};

export default { getCases, getAlerts, getCaseById, addNote, recordDecision, reassign };
