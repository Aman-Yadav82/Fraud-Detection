// ─── System Administrator Service ───────────────────────────────────────────
// Manages platform users, dynamic fraud rules configuration, and audit logs.
// ────────────────────────────────────────────────────────────────────────────

import db from "../config/database.js";
import ApiError from "../utils/ApiError.js";

/**
 * List platform users with their details.
 */
export const getUsers = async ({ role, limit = 50, offset = 0 }) => {
  let queryText = `
    SELECT id, email, first_name, last_name, role, is_active, last_login, created_at
    FROM users
    WHERE 1=1
  `;
  const params = [];

  if (role) {
    params.push(role);
    queryText += ` AND role = $${params.length}`;
  }

  queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const { rows } = await db.query(queryText, params);
  const countRes = await db.query(`SELECT COUNT(*) FROM users`);

  return {
    users: rows,
    total: parseInt(countRes.rows[0].count, 10)
  };
};

/**
 * Update user status or role (Admin only).
 */
export const updateUser = async (adminId, targetUserId, { role, is_active }) => {
  const updates = [];
  const params = [targetUserId];

  if (role !== undefined) {
    const validRoles = ["customer", "analyst", "manager", "admin", "auditor"];
    if (!validRoles.includes(role)) {
      throw ApiError.badRequest("Invalid role specified");
    }
    params.push(role);
    updates.push(`role = $${params.length}`);
  }

  if (is_active !== undefined) {
    params.push(Boolean(is_active));
    updates.push(`is_active = $${params.length}`);
  }

  if (updates.length === 0) {
    throw ApiError.badRequest("No valid fields to update");
  }

  updates.push("updated_at = NOW()");

  const res = await db.query(
    `UPDATE users SET ${updates.join(", ")} WHERE id = $1 RETURNING id, email, first_name, last_name, role, is_active`,
    params
  );

  if (res.rows.length === 0) {
    throw ApiError.notFound("User not found");
  }

  // Audit log
  await db.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
     VALUES ($1, 'UPDATE_USER_PERMISSIONS', 'users', $2, $3)`,
    [adminId, targetUserId, JSON.stringify({ role, is_active })]
  );

  return res.rows[0];
};

/**
 * List all fraud rules.
 */
export const getFraudRules = async () => {
  const { rows } = await db.query(
    `SELECT id, name, description, rule_type, condition, severity, is_enabled, created_at, updated_at
     FROM fraud_rules
     ORDER BY id ASC`
  );
  return rows;
};

/**
 * Toggle enable/disable status for a fraud rule.
 */
export const toggleRule = async (adminId, ruleId, is_enabled) => {
  const res = await db.query(
    `UPDATE fraud_rules SET is_enabled = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [Boolean(is_enabled), ruleId]
  );
  if (res.rows.length === 0) {
    throw ApiError.notFound("Rule not found");
  }

  await db.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
     VALUES ($1, 'TOGGLE_FRAUD_RULE', 'fraud_rules', $2, $3)`,
    [adminId, String(ruleId), JSON.stringify({ is_enabled })]
  );

  return res.rows[0];
};

/**
 * Create a new fraud rule.
 */
export const createFraudRule = async (adminId, { name, description, rule_type, condition, severity }) => {
  if (!name || !condition) {
    throw ApiError.badRequest("Rule name and condition are required");
  }

  const res = await db.query(
    `INSERT INTO fraud_rules (name, description, rule_type, condition, severity, is_enabled, created_by)
     VALUES ($1, $2, $3, $4, $5, true, $6)
     RETURNING *`,
    [name.trim(), description || "", rule_type || "threshold", JSON.stringify(condition), severity || "MEDIUM", adminId]
  );

  await db.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
     VALUES ($1, 'CREATE_FRAUD_RULE', 'fraud_rules', $2, $3)`,
    [adminId, String(res.rows[0].id), JSON.stringify({ name, severity })]
  );

  return res.rows[0];
};

/**
 * Fetch immutable audit logs.
 */
export const getAuditLogs = async ({ limit = 50, offset = 0, action, entity_type }) => {
  let queryText = `
    SELECT al.*, u.email AS user_email, u.first_name, u.last_name, u.role
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (action) {
    params.push(action);
    queryText += ` AND al.action = $${params.length}`;
  }
  if (entity_type) {
    params.push(entity_type);
    queryText += ` AND al.entity_type = $${params.length}`;
  }

  queryText += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const { rows } = await db.query(queryText, params);
  const countRes = await db.query(`SELECT COUNT(*) FROM audit_logs`);

  return {
    logs: rows,
    total: parseInt(countRes.rows[0].count, 10)
  };
};

export default { getUsers, updateUser, getFraudRules, toggleRule, createFraudRule, getAuditLogs };
