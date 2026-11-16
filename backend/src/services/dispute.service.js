// ─── Customer Dispute Management Service ────────────────────────────────────
// Handles customer dispute submission, status tracking, and analyst/manager resolution.
// ────────────────────────────────────────────────────────────────────────────

import db from "../config/database.js";
import ApiError from "../utils/ApiError.js";

/**
 * Customer submits a dispute on an eligible transaction.
 */
export const createDispute = async (userId, { transaction_id, reason, description }) => {
  if (!reason || !reason.trim()) {
    throw ApiError.badRequest("Dispute reason is required");
  }

  // 1. Get customer ID
  const custRes = await db.query(`SELECT id FROM customers WHERE user_id = $1`, [userId]);
  if (custRes.rows.length === 0) {
    throw ApiError.notFound("Customer account not found");
  }
  const customerId = custRes.rows[0].id;

  // 2. Verify transaction belongs to this customer
  const txnRes = await db.query(
    `SELECT id, amount, currency, status, merchant_name FROM transactions WHERE id = $1 AND customer_id = $2`,
    [transaction_id, customerId]
  );
  if (txnRes.rows.length === 0) {
    throw ApiError.notFound("Transaction not found or does not belong to your account");
  }
  const txn = txnRes.rows[0];

  // 3. Check for existing dispute
  const existingRes = await db.query(
    `SELECT id FROM disputes WHERE transaction_id = $1`,
    [transaction_id]
  );
  if (existingRes.rows.length > 0) {
    throw ApiError.conflict("A dispute has already been submitted for this transaction");
  }

  // 4. Insert dispute & audit log
  const client = await db.getClient();
  try {
    await client.query("BEGIN");

    const disputeRes = await client.query(
      `INSERT INTO disputes (transaction_id, customer_id, reason, description, status)
       VALUES ($1, $2, $3, $4, 'submitted')
       RETURNING *`,
      [transaction_id, customerId, reason.trim(), description || ""]
    );
    const dispute = disputeRes.rows[0];

    // Notification for customer
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, 'Dispute Submitted', $2, 'info')`,
      [
        userId,
        `Your dispute for ₹${txn.amount} at ${txn.merchant_name} has been received (Ref: ${dispute.id.slice(0, 8)}).`
      ]
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'SUBMIT_DISPUTE', 'disputes', $2, $3)`,
      [userId, dispute.id, JSON.stringify({ transaction_id, reason })]
    );

    await client.query("COMMIT");
    return dispute;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Customer fetches their own disputes.
 */
export const getCustomerDisputes = async (userId) => {
  const custRes = await db.query(`SELECT id FROM customers WHERE user_id = $1`, [userId]);
  if (custRes.rows.length === 0) {
    throw ApiError.notFound("Customer account not found");
  }
  const customerId = custRes.rows[0].id;

  const { rows } = await db.query(
    `SELECT d.*, t.amount, t.currency, t.merchant_name, t.created_at AS transaction_date
     FROM disputes d
     JOIN transactions t ON d.transaction_id = t.id
     WHERE d.customer_id = $1
     ORDER BY d.created_at DESC`,
    [customerId]
  );
  return rows;
};

/**
 * Staff (Analyst / Manager) fetches all disputes.
 */
export const getAllDisputes = async ({ status, limit = 20, offset = 0 }) => {
  let queryText = `
    SELECT d.*, t.amount, t.currency, t.merchant_name,
           u.first_name AS customer_first, u.last_name AS customer_last, u.email AS customer_email
    FROM disputes d
    JOIN transactions t ON d.transaction_id = t.id
    JOIN customers c ON d.customer_id = c.id
    JOIN users u ON c.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    params.push(status);
    queryText += ` AND d.status = $${params.length}`;
  }

  queryText += ` ORDER BY d.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const { rows } = await db.query(queryText, params);
  const countRes = await db.query(`SELECT COUNT(*) FROM disputes`);

  return {
    disputes: rows,
    total: parseInt(countRes.rows[0].count, 10)
  };
};

/**
 * Resolve a dispute (Staff).
 */
export const resolveDispute = async (disputeId, staffUserId, { status, resolution }) => {
  if (!["resolved", "rejected"].includes(status)) {
    throw ApiError.badRequest("Dispute status must be 'resolved' or 'rejected'");
  }

  const client = await db.getClient();
  try {
    await client.query("BEGIN");

    const disputeRes = await client.query(
      `UPDATE disputes
       SET status = $1, resolution = $2, resolved_by = $3, resolved_at = NOW(), updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, resolution || `Dispute marked as ${status}`, staffUserId, disputeId]
    );

    if (disputeRes.rows.length === 0) {
      throw ApiError.notFound("Dispute not found");
    }
    const dispute = disputeRes.rows[0];

    // If resolved, credit the customer's account back
    if (status === "resolved") {
      const txnRes = await client.query(
        `SELECT account_id, amount FROM transactions WHERE id = $1`,
        [dispute.transaction_id]
      );
      if (txnRes.rows.length > 0) {
        const { account_id, amount } = txnRes.rows[0];
        await client.query(
          `UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2`,
          [amount, account_id]
        );
      }
    }

    // Notify customer
    const userRes = await client.query(
      `SELECT c.user_id FROM customers c WHERE c.id = $1`,
      [dispute.customer_id]
    );
    if (userRes.rows.length > 0) {
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, 'Dispute Update', $2, $3)`,
        [
          userRes.rows[0].user_id,
          `Your dispute for transaction has been ${status.toUpperCase()}. Note: ${resolution || "No extra notes."}`,
          status === "resolved" ? "success" : "warning"
        ]
      );
    }

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'RESOLVE_DISPUTE', 'disputes', $2, $3)`,
      [staffUserId, disputeId, JSON.stringify({ status, resolution })]
    );

    await client.query("COMMIT");
    return dispute;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export default { createDispute, getCustomerDisputes, getAllDisputes, resolveDispute };
