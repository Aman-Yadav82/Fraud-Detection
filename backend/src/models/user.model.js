// ─── User Model ─────────────────────────────────────────────────────────────
// Thin data-access layer around the `users` table. Each function runs a raw
// pg query and returns plain JS objects (no ORM).
// ────────────────────────────────────────────────────────────────────────────

import db from "../config/database.js";

/**
 * Insert a new user row.
 *
 * @param {{ first_name: string, last_name: string, email: string, password_hash: string, role?: string }} data
 * @returns {Promise<object>} The newly created user (without password hash).
 */
export const createUser = async ({ first_name, last_name, email, password_hash, role = "customer" }) => {
  const { rows } = await db.query(
    `INSERT INTO users (first_name, last_name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, first_name, last_name, email, role, created_at`,
    [first_name, last_name, email, password_hash, role]
  );
  return rows[0];
};

/**
 * Look up a user by email address.
 *
 * @param {string} email
 * @returns {Promise<object|null>} User row (includes password_hash) or null.
 */
export const findByEmail = async (email) => {
  const { rows } = await db.query(
    `SELECT id, first_name, last_name, email, password_hash, role, is_active, created_at
     FROM users
     WHERE email = $1`,
    [email]
  );
  return rows[0] || null;
};

/**
 * Look up a user by primary key.
 *
 * @param {number|string} id
 * @returns {Promise<object|null>} User row (without password hash) or null.
 */
export const findById = async (id) => {
  const { rows } = await db.query(
    `SELECT id, first_name, last_name, email, role, is_active, created_at
     FROM users
     WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
};

export default { createUser, findByEmail, findById };
