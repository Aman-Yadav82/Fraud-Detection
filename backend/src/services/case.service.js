// ─── Fraud Case Management Service ──────────────────────────────────────────
// Powers analyst investigation workspace, decision recording, case notes,
// timeline history, and manager reassignment.
// ────────────────────────────────────────────────────────────────────────────

import db from "../config/database.js";
import ApiError from "../utils/ApiError.js";

/**
 * Fetch case queue with filtering, priority sorting, and pagination.
 */
export const getCases = async ({ status, priority, assigned_to, limit = 20, offset = 0 }) => {
  let queryText = `
    SELECT fc.id, fc.case_number, fc.title, fc.priority, fc.status, fc.decision,
           fc.created_at, fc.updated_at,
           t.amount, t.currency, t.merchant_name, t.merchant_category,
           u.first_name AS analyst_first, u.last_name AS analyst_last,
           ra.risk_score, ra.risk_level
    FROM fraud_cases fc
    JOIN transactions t ON fc.transaction_id = t.id
    LEFT JOIN users u ON fc.assigned_to = u.id
    LEFT JOIN alerts a ON fc.alert_id = a.id
    LEFT JOIN risk_assessments ra ON a.risk_assessment_id = ra.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    params.push(status);
    queryText += ` AND fc.status = $${params.length}`;
  }
  if (priority) {
    params.push(priority);
    queryText += ` AND fc.priority = $${params.length}`;
  }
  if (assigned_to) {
    params.push(assigned_to);
    queryText += ` AND fc.assigned_to = $${params.length}`;
  }

  queryText += ` ORDER BY CASE fc.priority
                   WHEN 'CRITICAL' THEN 1
                   WHEN 'HIGH' THEN 2
                   WHEN 'MEDIUM' THEN 3
                   ELSE 4 END, fc.created_at DESC
                 LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const { rows } = await db.query(queryText, params);

  const countRes = await db.query(`SELECT COUNT(*) FROM fraud_cases`);

  return {
    cases: rows,
    total: parseInt(countRes.rows[0].count, 10),
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10)
  };
};

/**
 * Detailed case view for deep investigation workspace.
 */
export const getCaseById = async (caseId) => {
  const caseRes = await db.query(
    `SELECT fc.*,
            t.amount, t.currency, t.transaction_type, t.merchant_category,
            t.merchant_name, t.payment_method, t.is_international, t.location,
            t.created_at AS transaction_time,
            c.id AS customer_id, c.phone, c.city, c.country,
            u.email AS customer_email, u.first_name AS customer_first, u.last_name AS customer_last,
            ra.risk_score, ra.risk_level, ra.model_probability, ra.anomaly_score,
            ra.triggered_rules, ra.explanations,
            tf.velocity_last_hour, tf.velocity_last_day, tf.is_new_device, tf.amount_deviation,
            au.first_name AS analyst_first, au.last_name AS analyst_last
     FROM fraud_cases fc
     JOIN transactions t ON fc.transaction_id = t.id
     JOIN customers c ON fc.customer_id = c.id
     JOIN users u ON c.user_id = u.id
     LEFT JOIN users au ON fc.assigned_to = au.id
     LEFT JOIN alerts a ON fc.alert_id = a.id
     LEFT JOIN risk_assessments ra ON a.risk_assessment_id = ra.id
     LEFT JOIN transaction_features tf ON tf.transaction_id = t.id
     WHERE fc.id = $1`,
    [caseId]
  );

  if (caseRes.rows.length === 0) {
    throw ApiError.notFound("Case not found");
  }

  const caseData = caseRes.rows[0];

  // Fetch case timeline / notes
  const notesRes = await db.query(
    `SELECT cn.id, cn.note_type, cn.content, cn.created_at,
            u.first_name, u.last_name, u.role
     FROM case_notes cn
     JOIN users u ON cn.author_id = u.id
     WHERE cn.case_id = $1
     ORDER BY cn.created_at ASC`,
    [caseId]
  );

  // Fetch customer's past recent transactions for behavioral baseline
  const pastTxnsRes = await db.query(
    `SELECT id, amount, currency, merchant_name, merchant_category, status, created_at
     FROM transactions
     WHERE customer_id = $1 AND id != $2
     ORDER BY created_at DESC
     LIMIT 5`,
    [caseData.customer_id, caseData.transaction_id]
  );

  return {
    case: caseData,
    notes: notesRes.rows,
    customer_history: pastTxnsRes.rows
  };
};

/**
 * Add an analyst investigation note.
 */
export const addCaseNote = async (caseId, authorId, { content, note_type = "comment" }) => {
  if (!content || !content.trim()) {
    throw ApiError.badRequest("Note content cannot be empty");
  }

  const res = await db.query(
    `INSERT INTO case_notes (case_id, author_id, note_type, content)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [caseId, authorId, note_type, content.trim()]
  );

  // Update case status to 'investigating' if open
  await db.query(
    `UPDATE fraud_cases SET status = 'investigating', updated_at = NOW()
     WHERE id = $1 AND status = 'open'`,
    [caseId]
  );

  return res.rows[0];
};

/**
 * Record a formal fraud investigation decision.
 */
export const recordDecision = async (caseId, userId, { decision, notes }) => {
  const validDecisions = ["legitimate", "suspected_fraud", "confirmed_fraud"];
  if (!validDecisions.includes(decision)) {
    throw ApiError.badRequest(`Decision must be one of: ${validDecisions.join(", ")}`);
  }

  const client = await db.getClient();
  try {
    await client.query("BEGIN");

    // Update case
    const caseRes = await client.query(
      `UPDATE fraud_cases
       SET decision = $1, status = 'resolved', resolved_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [decision, caseId]
    );

    if (caseRes.rows.length === 0) {
      throw ApiError.notFound("Case not found");
    }
    const resolvedCase = caseRes.rows[0];

    // Add note recording decision
    await client.query(
      `INSERT INTO case_notes (case_id, author_id, note_type, content)
       VALUES ($1, $2, 'decision', $3)`,
      [caseId, userId, `Decision recorded: [${decision.toUpperCase()}]. ${notes || ""}`]
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'RECORD_CASE_DECISION', 'fraud_cases', $2, $3)`,
      [userId, caseId, JSON.stringify({ decision, notes })]
    );

    await client.query("COMMIT");
    return resolvedCase;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Manager tool: Reassign a case to another analyst.
 */
export const reassignCase = async (caseId, managerId, newAnalystId) => {
  // Validate analyst user
  const userRes = await db.query(
    `SELECT id, first_name, last_name, role FROM users WHERE id = $1 AND role = 'analyst'`,
    [newAnalystId]
  );
  if (userRes.rows.length === 0) {
    throw ApiError.badRequest("Selected assignee is not an active fraud analyst");
  }
  const analyst = userRes.rows[0];

  const res = await db.query(
    `UPDATE fraud_cases
     SET assigned_to = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [newAnalystId, caseId]
  );

  if (res.rows.length === 0) {
    throw ApiError.notFound("Case not found");
  }

  // Add system note
  await db.query(
    `INSERT INTO case_notes (case_id, author_id, note_type, content)
     VALUES ($1, $2, 'escalation', $3)`,
    [caseId, managerId, `Case reassigned to ${analyst.first_name} ${analyst.last_name}`]
  );

  return res.rows[0];
};

export default { getCases, getCaseById, addCaseNote, recordDecision, reassignCase };
