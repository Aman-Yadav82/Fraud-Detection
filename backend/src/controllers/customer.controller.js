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

export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await customerService.getCustomerNotifications(req.user.id);
    return successResponse(res, notifications, "Notifications fetched successfully");
  } catch (err) {
    next(err);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const updated = await customerService.markNotificationRead(req.user.id, req.params.id);
    return successResponse(res, updated, "Notification marked as read");
  } catch (err) {
    next(err);
  }
};

export default { getProfile, getTransactions, getNotifications, markNotificationRead };
