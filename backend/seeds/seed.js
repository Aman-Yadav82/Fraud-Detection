import bcrypt from "bcryptjs";
import db from "../src/config/database.js";

async function seed() {
  console.log("🌱 Starting database seeding...");
  const passwordHash = await bcrypt.hash("Password@123", 10);

  const users = [
    { email: "admin@fraudguard.local", role: "admin", first: "System", last: "Admin" },
    { email: "manager@fraudguard.local", role: "manager", first: "Sarah", last: "Connor" },
    { email: "analyst@fraudguard.local", role: "analyst", first: "Alex", last: "Mercer" },
    { email: "auditor@fraudguard.local", role: "auditor", first: "Arthur", last: "Dent" },
    { email: "customer@fraudguard.local", role: "customer", first: "John", last: "Doe" }
  ];

  try {
    // 1. Insert seed users
    for (const u of users) {
      const res = await db.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             first_name = EXCLUDED.first_name,
             last_name = EXCLUDED.last_name,
             role = EXCLUDED.role
         RETURNING id, email, role;`,
        [u.email, passwordHash, u.first, u.last, u.role]
      );
      console.log(`👤 Seeded user: ${res.rows[0].email} (${res.rows[0].role})`);
    }

    // 2. Insert customer profile & account for John Doe
    const customerUserRes = await db.query(
      `SELECT id FROM users WHERE email = 'customer@fraudguard.local'`
    );
    const customerUserId = customerUserRes.rows[0].id;

    const customerRes = await db.query(
      `INSERT INTO customers (user_id, phone, city, country, risk_level)
       VALUES ($1, '+91-9876543210', 'Bengaluru', 'India', 'LOW')
       ON CONFLICT (user_id) DO UPDATE SET phone = EXCLUDED.phone
       RETURNING id;`,
      [customerUserId]
    );
    const customerId = customerRes.rows[0].id;

    await db.query(
      `INSERT INTO accounts (customer_id, account_number, account_type, balance, currency)
       VALUES ($1, 'ACC-78901234', 'savings', 125000.00, 'INR')
       ON CONFLICT (account_number) DO NOTHING;`,
      [customerId]
    );
    console.log("💳 Seeded customer profile & demo account");

    // 3. Seed baseline fraud rules
    const rules = [
      {
        name: "RULE_HIGH_AMOUNT",
        description: "Transactions exceeding 100,000 INR",
        rule_type: "threshold",
        condition: { field: "amount", operator: ">", value: 100000 },
        severity: "HIGH"
      },
      {
        name: "RULE_VELOCITY_1H",
        description: "More than 5 transactions within 1 hour",
        rule_type: "velocity",
        condition: { field: "velocity_last_hour", operator: ">", value: 5 },
        severity: "HIGH"
      },
      {
        name: "RULE_NEW_DEVICE_HIGH_AMOUNT",
        description: "Unrecognized device with amount greater than 25,000 INR",
        rule_type: "composite",
        condition: { is_new_device: true, amount_threshold: 25000 },
        severity: "MEDIUM"
      },
      {
        name: "RULE_INTERNATIONAL_TRANSACTION",
        description: "Cross-border payment flagged for review",
        rule_type: "pattern",
        condition: { field: "is_international", operator: "==", value: true },
        severity: "MEDIUM"
      }
    ];

    for (const r of rules) {
      await db.query(
        `INSERT INTO fraud_rules (name, description, rule_type, condition, severity, is_enabled)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (name) DO UPDATE
         SET description = EXCLUDED.description,
             condition = EXCLUDED.condition,
             severity = EXCLUDED.severity;`,
        [r.name, r.description, r.rule_type, JSON.stringify(r.condition), r.severity]
      );
    }
    console.log("🛡️ Seeded default fraud detection rules");

    console.log("✅ Seeding completed successfully!");
  } catch (err) {
    console.error("❌ Seeding failed:", err);
  } finally {
    await db.pool.end();
  }
}

seed();
