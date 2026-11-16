// ─── Transaction & Fraud Detection Engine Service ───────────────────────────
// Handles transaction creation, dynamic feature extraction, rule evaluation,
// ML inference call, hybrid risk score generation, and automated alerts/cases.
// ────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import db from "../config/database.js";
import config from "../config/index.js";
import ApiError from "../utils/ApiError.js";

/**
 * Generate a unique case number like 'CASE-20261116-8392'
 */
const generateCaseNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CASE-${dateStr}-${rand}`;
};

/**
 * Evaluates active database fraud rules against the transaction context.
 */
const evaluateRules = async (txnContext) => {
  const { rows: rules } = await db.query(
    `SELECT id, name, description, rule_type, condition, severity
     FROM fraud_rules
     WHERE is_enabled = true`
  );

  const triggeredRules = [];

  for (const rule of rules) {
    const cond = rule.condition || {};
    let fired = false;
    let reason = "";

    switch (rule.name) {
      case "RULE_HIGH_AMOUNT":
        if (txnContext.amount > (cond.value || 100000)) {
          fired = true;
          reason = `Transaction amount (₹${txnContext.amount}) exceeds threshold ₹${cond.value || 100000}`;
        }
        break;

      case "RULE_VELOCITY_1H":
        if (txnContext.velocity_last_hour > (cond.value || 5)) {
          fired = true;
          reason = `High velocity: ${txnContext.velocity_last_hour} transactions in the last hour exceeds limit of ${cond.value || 5}`;
        }
        break;

      case "RULE_NEW_DEVICE_HIGH_AMOUNT":
        if (txnContext.is_new_device && txnContext.amount > (cond.amount_threshold || 25000)) {
          fired = true;
          reason = `Unrecognized device used for a high-value transaction (₹${txnContext.amount})`;
        }
        break;

      case "RULE_INTERNATIONAL_TRANSACTION":
        if (txnContext.is_international) {
          fired = true;
          reason = "International cross-border transaction flagged for verification";
        }
        break;

      default:
        // Generic evaluation if operator specified
        if (cond.field && cond.operator && cond.value !== undefined) {
          const val = txnContext[cond.field];
          if (cond.operator === ">" && val > cond.value) fired = true;
          if (cond.operator === ">=" && val >= cond.value) fired = true;
          if (cond.operator === "==" && val === cond.value) fired = true;
          if (fired) reason = `Rule ${rule.name} triggered on ${cond.field}`;
        }
        break;
    }

    if (fired) {
      triggeredRules.push({
        rule_id: rule.id,
        rule_name: rule.name,
        severity: rule.severity,
        reason
      });
    }
  }

  return triggeredRules;
};

/**
 * Call Python FastAPI ML Service with fallback resilience.
 */
const getMLPrediction = async (features) => {
  const mlUrl = config.mlServiceUrl || "http://localhost:8000";
  try {
    const response = await axios.post(`${mlUrl}/predict`, features, { timeout: 3500 });
    return response.data;
  } catch (err) {
    console.warn(`[ML Service Warning] Prediction fallback triggered: ${err.message}`);
    // Graceful degraded mode: Calculate heuristic fallback without failing transaction
    let fallbackProb = 0.05;
    if (features.amount > 50000) fallbackProb += 0.25;
    if (features.velocity_last_hour > 3) fallbackProb += 0.35;
    if (features.device_is_new) fallbackProb += 0.20;
    if (features.is_foreign) fallbackProb += 0.20;

    fallbackProb = Math.min(0.98, fallbackProb);
    return {
      fraud_probability: parseFloat(fallbackProb.toFixed(4)),
      risk_score: Math.round(fallbackProb * 100),
      risk_level: fallbackProb > 0.75 ? "CRITICAL" : fallbackProb > 0.5 ? "HIGH" : fallbackProb > 0.25 ? "MEDIUM" : "LOW",
      triggered_rules: [],
      anomaly_score: parseFloat((fallbackProb * 0.8).toFixed(4)),
      explanations: {
        note: "Heuristic evaluation (ML service in offline/fallback mode)",
        amount_contribution: features.amount > 50000 ? 0.3 : 0.05,
        velocity_contribution: features.velocity_last_hour > 3 ? 0.4 : 0.05
      }
    };
  }
};

/**
 * Core hybrid transaction processing pipeline.
 */
export const processTransaction = async (userId, transactionData) => {
  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    // 1. Validate customer & account
    const custRes = await client.query(
      `SELECT c.id FROM customers c WHERE c.user_id = $1`,
      [userId]
    );
    if (custRes.rows.length === 0) {
      throw ApiError.notFound("Customer account not found");
    }
    const customerId = custRes.rows[0].id;

    const accRes = await client.query(
      `SELECT id, balance, currency FROM accounts WHERE customer_id = $1 FOR UPDATE`,
      [customerId]
    );
    if (accRes.rows.length === 0) {
      throw ApiError.badRequest("No active bank account linked");
    }
    const account = accRes.rows[0];

    const amount = parseFloat(transactionData.amount);
    if (isNaN(amount) || amount <= 0) {
      throw ApiError.badRequest("Invalid transaction amount");
    }

    if (parseFloat(account.balance) < amount) {
      throw ApiError.badRequest("Insufficient funds in account");
    }

    // 2. Compute dynamic behavioral velocity features
    const velocity1hRes = await client.query(
      `SELECT COUNT(*) FROM transactions
       WHERE customer_id = $1 AND created_at >= NOW() - INTERVAL '1 hour'`,
      [customerId]
    );
    const velocityLastHour = parseInt(velocity1hRes.rows[0].count, 10);

    const velocity24hRes = await client.query(
      `SELECT COUNT(*) FROM transactions
       WHERE customer_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
      [customerId]
    );
    const velocityLastDay = parseInt(velocity24hRes.rows[0].count, 10);

    const isNewDevice = Boolean(transactionData.is_new_device);
    const isInternational = Boolean(transactionData.is_international);
    const hourOfDay = new Date().getHours();
    const dayOfWeek = new Date().getDay();

    const txnContext = {
      amount,
      velocity_last_hour: velocityLastHour,
      velocity_last_day: velocityLastDay,
      is_new_device: isNewDevice,
      is_international: isInternational,
      hour_of_day: hourOfDay,
      day_of_week: dayOfWeek,
      merchant_category: transactionData.merchant_category || "retail"
    };

    // 3. Rule-based evaluation
    const triggeredRules = await evaluateRules(txnContext);

    // 4. ML model inference
    const mlPayload = {
      amount,
      transaction_type: transactionData.transaction_type || "purchase",
      merchant_category: transactionData.merchant_category || "retail",
      is_foreign: isInternational,
      hour_of_day: hourOfDay,
      day_of_week: dayOfWeek,
      device_is_new: isNewDevice,
      velocity_last_hour: velocityLastHour,
      amount_deviation: amount > 50000 ? parseFloat((amount / 10000).toFixed(2)) : 1.0
    };

    const mlResult = await getMLPrediction(mlPayload);

    // 5. Hybrid Risk Score Aggregation
    // Formula: 50% ML Model Probability + 35% Rule Severity Weights + 15% Anomaly Signal
    let ruleWeight = 0;
    for (const r of triggeredRules) {
      if (r.severity === "CRITICAL") ruleWeight += 40;
      else if (r.severity === "HIGH") ruleWeight += 25;
      else if (r.severity === "MEDIUM") ruleWeight += 15;
      else ruleWeight += 5;
    }
    ruleWeight = Math.min(100, ruleWeight);

    const mlProbScore = Math.round(mlResult.fraud_probability * 100);
    const anomalyScoreNorm = Math.round((mlResult.anomaly_score || 0) * 100);

    let compositeScore = Math.round(
      mlProbScore * 0.50 + ruleWeight * 0.35 + anomalyScoreNorm * 0.15
    );
    compositeScore = Math.max(0, Math.min(100, compositeScore));

    let riskLevel = "LOW";
    if (compositeScore >= 85) riskLevel = "CRITICAL";
    else if (compositeScore >= 60) riskLevel = "HIGH";
    else if (compositeScore >= 30) riskLevel = "MEDIUM";

    // 6. Determine transaction status based on risk level
    let txnStatus = "completed";
    let customerMessage = "Transaction approved and processed successfully.";

    if (riskLevel === "CRITICAL") {
      txnStatus = "blocked";
      customerMessage = "Transaction declined due to unusual risk indicators. Please contact customer support.";
    } else if (riskLevel === "HIGH") {
      txnStatus = "flagged";
      customerMessage = "Transaction processed with elevated security review.";
    }

    // Deduct balance if not blocked
    if (txnStatus !== "blocked") {
      await client.query(
        `UPDATE accounts SET balance = balance - $1, updated_at = NOW() WHERE id = $2`,
        [amount, account.id]
      );
    }

    // 7. Persist Transaction
    const txnInsertRes = await client.query(
      `INSERT INTO transactions (
         account_id, customer_id, amount, currency, transaction_type,
         merchant_category, merchant_name, description, payment_method,
         is_international, status, is_synthetic, location
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12)
       RETURNING *`,
      [
        account.id,
        customerId,
        amount,
        account.currency,
        transactionData.transaction_type || "purchase",
        transactionData.merchant_category || "retail",
        transactionData.merchant_name || "Demo Merchant Store",
        transactionData.description || "Simulated demo transaction",
        transactionData.payment_method || "card",
        isInternational,
        txnStatus,
        transactionData.location || "Bengaluru, IN"
      ]
    );
    const savedTxn = txnInsertRes.rows[0];

    // 8. Persist Transaction Features
    await client.query(
      `INSERT INTO transaction_features (
         transaction_id, velocity_last_hour, velocity_last_day,
         is_new_device, is_unusual_location, amount_deviation, feature_vector
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        savedTxn.id,
        velocityLastHour,
        velocityLastDay,
        isNewDevice,
        isInternational,
        amount > 50000 ? parseFloat((amount / 10000).toFixed(2)) : 1.0,
        JSON.stringify(mlPayload)
      ]
    );

    // 9. Persist Fraud Prediction
    await client.query(
      `INSERT INTO fraud_predictions (
         transaction_id, fraud_probability, anomaly_score, prediction_label, feature_importance
       ) VALUES ($1, $2, $3, $4, $5)`,
      [
        savedTxn.id,
        mlResult.fraud_probability,
        mlResult.anomaly_score,
        riskLevel,
        JSON.stringify(mlResult.explanations || {})
      ]
    );

    // 10. Persist Risk Assessment
    const riskAssessmentRes = await client.query(
      `INSERT INTO risk_assessments (
         transaction_id, risk_score, risk_level, model_probability,
         anomaly_score, triggered_rules, explanations, assessment_method
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'hybrid_rule_ml_anomaly')
       RETURNING *`,
      [
        savedTxn.id,
        compositeScore,
        riskLevel,
        mlResult.fraud_probability,
        mlResult.anomaly_score,
        JSON.stringify(triggeredRules),
        JSON.stringify(mlResult.explanations || {})
      ]
    );
    const savedRiskAssessment = riskAssessmentRes.rows[0];

    // 11. Automated Alert & Fraud Case Creation if HIGH or CRITICAL
    if (riskLevel === "HIGH" || riskLevel === "CRITICAL") {
      // Find an analyst for round-robin assignment
      const analystRes = await client.query(
        `SELECT id FROM users WHERE role = 'analyst' AND is_active = true LIMIT 1`
      );
      const assignedAnalystId = analystRes.rows[0]?.id || null;

      // Create Alert
      const alertRes = await client.query(
        `INSERT INTO alerts (
           transaction_id, risk_assessment_id, alert_type, severity, title,
           description, status, assigned_to
         ) VALUES ($1, $2, $3, $4, $5, $6, 'new', $7)
         RETURNING id`,
        [
          savedTxn.id,
          savedRiskAssessment.id,
          triggeredRules.length > 0 ? "rule_and_ml_triggered" : "high_risk_ml",
          riskLevel,
          `${riskLevel} Risk Alert: ₹${amount} at ${savedTxn.merchant_name}`,
          `Triggered rules: ${triggeredRules.map(r => r.rule_name).join(", ") || "ML anomaly flag"}`,
          assignedAnalystId
        ]
      );
      const alertId = alertRes.rows[0].id;

      // Create Fraud Case
      const caseNumber = generateCaseNumber();
      await client.query(
        `INSERT INTO fraud_cases (
           case_number, alert_id, transaction_id, customer_id, title,
           description, priority, status, assigned_to
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8)`,
        [
          caseNumber,
          alertId,
          savedTxn.id,
          customerId,
          `Investigation for ${savedTxn.merchant_name} (₹${amount})`,
          `Automated fraud case created due to ${riskLevel} risk assessment score of ${compositeScore}/100.`,
          riskLevel,
          assignedAnalystId
        ]
      );

      // Create customer notification
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, $2, $3, $4)`,
        [
          userId,
          riskLevel === "CRITICAL" ? "Transaction Blocked" : "Security Notice",
          riskLevel === "CRITICAL"
            ? `Your transaction of ₹${amount} at ${savedTxn.merchant_name} was declined for security.`
            : `Your transaction of ₹${amount} at ${savedTxn.merchant_name} has been processed under review.`,
          riskLevel === "CRITICAL" ? "alert" : "warning"
        ]
      );
    }

    await client.query("COMMIT");

    // 12. Return safe customer response (sanitized, no internal fraud engine internals)
    return {
      transaction: {
        id: savedTxn.id,
        amount: savedTxn.amount,
        currency: savedTxn.currency,
        status: savedTxn.status,
        merchant_name: savedTxn.merchant_name,
        merchant_category: savedTxn.merchant_category,
        transaction_type: savedTxn.transaction_type,
        created_at: savedTxn.created_at
      },
      message: customerMessage,
      risk_level: riskLevel
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export default { processTransaction };
