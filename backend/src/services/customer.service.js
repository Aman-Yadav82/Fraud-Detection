// ─── Customer Service ────────────────────────────────────────────────────────
// Manages customer profile, accounts, and customer-scoped transaction queries.
// Ensures strict ownership and customer isolation.
// ────────────────────────────────────────────────────────────────────────────

import db from "../config/database.js";
import ApiError from "../utils/ApiError.js";

/**
 * Fetch customer profile along with accounts for the logged-in user.
 */
export const getCustomerProfile = async (userId) => {
  const customerRes = await db.query(
    `SELECT c.*, u.email, u.first_name, u.last_name, u.role
     FROM customers c
     JOIN users u ON c.user_id = u.id
     WHERE c.user_id = $1`,
    [userId]
  );

  if (customerRes.rows.length === 0) {
    throw ApiError.notFound("Customer profile not found");
  }

  const customer = customerRes.rows[0];

  const accountsRes = await db.query(
    `SELECT id, account_number, account_type, balance, currency, is_active, created_at
     FROM accounts
     WHERE customer_id = $1 AND is_active = true
     ORDER BY created_at ASC`,
    [customer.id]
  );

  return {
    ...customer,
    accounts: accountsRes.rows
  };
};

/**
 * Fetch customer's own transaction history with pagination and filtering.
 */
export const getCustomerTransactions = async (userId, { limit = 20, offset = 0, status }) => {
  // Ensure customer exists
  const customerRes = await db.query(`SELECT id FROM customers WHERE user_id = $1`, [userId]);
  if (customerRes.rows.length === 0) {
    throw ApiError.notFound("Customer not found");
  }
  const customerId = customerRes.rows[0].id;

  let queryText = `
    SELECT t.id, t.amount, t.currency, t.transaction_type, t.merchant_category,
           t.merchant_name, t.description, t.payment_method, t.status, t.created_at,
           a.account_number,
           d.id AS dispute_id, d.status AS dispute_status
    FROM transactions t
    JOIN accounts a ON t.account_id = a.id
    LEFT JOIN disputes d ON d.transaction_id = t.id
    WHERE t.customer_id = $1
  `;
  const params = [customerId];

  if (status) {
    params.push(status);
    queryText += ` AND t.status = $${params.length}`;
  }

  queryText += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const { rows } = await db.query(queryText, params);

  const countRes = await db.query(
    `SELECT COUNT(*) FROM transactions WHERE customer_id = $1`,
    [customerId]
  );

  return {
    transactions: rows,
    total: parseInt(countRes.rows[0].count, 10),
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10)
  };
};

export default { getCustomerProfile, getCustomerTransactions };
