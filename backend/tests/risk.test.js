// ─── Risk Calculation Unit Tests ─────────────────────────────────────────────
import { describe, it, expect } from "@jest/globals";

describe("Fraud Risk Engine Logic", () => {
  const calculateCompositeRisk = (mlProb, ruleWeight, anomalyScore) => {
    const mlScore = Math.round(mlProb * 100);
    const anomalyScoreNorm = Math.round(anomalyScore * 100);
    const composite = Math.round(mlScore * 0.50 + ruleWeight * 0.35 + anomalyScoreNorm * 0.15);
    const bounded = Math.max(0, Math.min(100, composite));

    let level = "LOW";
    if (bounded >= 85) level = "CRITICAL";
    else if (bounded >= 60) level = "HIGH";
    else if (bounded >= 30) level = "MEDIUM";

    return { score: bounded, level };
  };

  it("should classify low risk when ML prob and rules are baseline", () => {
    const res = calculateCompositeRisk(0.05, 0, 0.05);
    expect(res.score).toBeLessThan(30);
    expect(res.level).toBe("LOW");
  });

  it("should classify medium risk on moderate signals", () => {
    const res = calculateCompositeRisk(0.40, 30, 0.20);
    expect(res.score).toBeGreaterThanOrEqual(30);
    expect(res.score).toBeLessThan(60);
    expect(res.level).toBe("MEDIUM");
  });

  it("should classify high risk when high severity rules fire alongside elevated ML probability", () => {
    // 70% ML prob (35) + 65 rule weight (22.75) + 30% anomaly (4.5) = 62 -> HIGH
    const res = calculateCompositeRisk(0.70, 65, 0.30);
    expect(res.score).toBeGreaterThanOrEqual(60);
    expect(res.level).toBe("HIGH");
  });

  it("should classify critical risk when high amount, velocity, and anomaly combine", () => {
    const res = calculateCompositeRisk(0.95, 80, 0.85);
    expect(res.score).toBeGreaterThanOrEqual(85);
    expect(res.level).toBe("CRITICAL");
  });
});
