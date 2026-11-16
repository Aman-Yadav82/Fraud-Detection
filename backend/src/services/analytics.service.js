// ─── Analytics & Operational Intelligence Service ────────────────────────────
// Powers Fraud Manager dashboards, real-time KPI metrics, fraud trend charts,
// and team workload distribution.
// ────────────────────────────────────────────────────────────────────────────

import db from "../config/database.js";

export const getManagerDashboardMetrics = async () => {
  // 1. Transaction overview stats
  const txnStatsRes = await db.query(`
    SELECT
      COUNT(*) AS total_transactions,
      COALESCE(SUM(amount), 0) AS total_volume,
      COUNT(CASE WHEN status IN ('flagged', 'blocked') THEN 1 END) AS flagged_count,
      COUNT(CASE WHEN status = 'blocked' THEN 1 END) AS blocked_count
    FROM transactions
  `);
  const txnStats = txnStatsRes.rows[0];

  // 2. Case stats
  const caseStatsRes = await db.query(`
    SELECT
      COUNT(*) AS total_cases,
      COUNT(CASE WHEN status = 'open' THEN 1 END) AS open_cases,
      COUNT(CASE WHEN status = 'investigating' THEN 1 END) AS investigating_cases,
      COUNT(CASE WHEN status = 'resolved' THEN 1 END) AS resolved_cases,
      COUNT(CASE WHEN priority = 'CRITICAL' THEN 1 END) AS critical_cases,
      COUNT(CASE WHEN decision = 'confirmed_fraud' THEN 1 END) AS confirmed_fraud_cases
    FROM fraud_cases
  `);
  const caseStats = caseStatsRes.rows[0];

  // 3. Risk level distribution
  const riskDistRes = await db.query(`
    SELECT risk_level, COUNT(*) as count
    FROM risk_assessments
    GROUP BY risk_level
    ORDER BY count DESC
  `);

  // 4. Analyst workload distribution
  const analystWorkloadRes = await db.query(`
    SELECT u.id, u.first_name, u.last_name, u.email,
           COUNT(fc.id) AS total_assigned,
           COUNT(CASE WHEN fc.status IN ('open', 'investigating') THEN 1 END) AS active_cases,
           COUNT(CASE WHEN fc.status = 'resolved' THEN 1 END) AS resolved_cases
    FROM users u
    LEFT JOIN fraud_cases fc ON fc.assigned_to = u.id
    WHERE u.role = 'analyst'
    GROUP BY u.id, u.first_name, u.last_name, u.email
  `);

  // 5. Fraud volume trends (Past 7 days)
  const trendsRes = await db.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS day,
      COUNT(*) AS total,
      COUNT(CASE WHEN status IN ('flagged', 'blocked') THEN 1 END) AS suspicious
    FROM transactions
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY day ASC
  `);

  // Compute fraud rate percentage
  const totalTxns = parseInt(txnStats.total_transactions, 10) || 0;
  const flaggedTxns = parseInt(txnStats.flagged_count, 10) || 0;
  const fraudRate = totalTxns > 0 ? ((flaggedTxns / totalTxns) * 100).toFixed(1) : "0.0";

  return {
    overview: {
      total_transactions: totalTxns,
      total_volume: parseFloat(txnStats.total_volume),
      flagged_count: flaggedTxns,
      blocked_count: parseInt(txnStats.blocked_count, 10) || 0,
      fraud_rate_pct: parseFloat(fraudRate),
      total_cases: parseInt(caseStats.total_cases, 10) || 0,
      open_cases: parseInt(caseStats.open_cases, 10) || 0,
      investigating_cases: parseInt(caseStats.investigating_cases, 10) || 0,
      resolved_cases: parseInt(caseStats.resolved_cases, 10) || 0,
      critical_cases: parseInt(caseStats.critical_cases, 10) || 0,
      confirmed_fraud_cases: parseInt(caseStats.confirmed_fraud_cases, 10) || 0
    },
    risk_distribution: riskDistRes.rows,
    analyst_workload: analystWorkloadRes.rows,
    trends: trendsRes.rows
  };
};

export default { getManagerDashboardMetrics };
