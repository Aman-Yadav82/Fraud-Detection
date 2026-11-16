// ─── Auth Service ───────────────────────────────────────────────────────────
// Business logic for authentication — keeps controllers thin.
// ────────────────────────────────────────────────────────────────────────────

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/index.js";
import { createUser, findByEmail } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";

const SALT_ROUNDS = 10;

/**
 * Generate a signed JWT for the given user.
 * @param {object} user – Must have at least { id, email, role }.
 * @returns {string} Signed JWT string.
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

/**
 * Register a new user.
 */
export const registerUser = async ({ first_name, last_name, name, email, password, role = "customer" }) => {
  // Check for duplicate email
  const existing = await findByEmail(email);
  if (existing) {
    throw ApiError.conflict("A user with this email already exists");
  }

  const fName = first_name || (name ? name.split(" ")[0] : "User");
  const lName = last_name || (name ? name.split(" ").slice(1).join(" ") : "");

  // Hash the password
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  // Persist the user
  const user = await createUser({
    first_name: fName,
    last_name: lName,
    email,
    password_hash,
    role
  });

  // Issue a token
  const token = generateToken(user);

  return { user, token };
};

/**
 * Authenticate an existing user.
 */
export const loginUser = async ({ email, password }) => {
  // 1. Find user
  const user = await findByEmail(email);
  if (!user) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  if (user.is_active === false) {
    throw ApiError.forbidden("Account is disabled. Please contact administrator.");
  }

  // 2. Compare passwords
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  // 3. Issue a token
  const token = generateToken(user);

  // Strip password_hash before returning
  const { password_hash: _pwd, ...safeUser } = user;
  return { user: safeUser, token };
};

export default { registerUser, loginUser };
