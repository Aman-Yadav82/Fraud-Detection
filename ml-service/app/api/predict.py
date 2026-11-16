"""Prediction API router for the Fraud Detection ML Service."""

from __future__ import annotations

import logging
import random
from typing import Any

from fastapi import APIRouter, HTTPException

from app.api.schemas import PredictionResponse, TransactionFeatures
from app.preprocessing.features import build_feature_vector

logger = logging.getLogger(__name__)

router = APIRouter(tags=["prediction"])

# The loaded model is injected at startup via app.state; we read it lazily.
_model: Any = None


def set_model(model: Any) -> None:
    """Set the globally-available model reference (called at startup)."""
    global _model
    _model = model


def _classify_risk(probability: float) -> tuple[str, int]:
    """Map a fraud probability to a risk level and 0-100 score.

    Args:
        probability: Fraud probability between 0.0 and 1.0.

    Returns:
        Tuple of (risk_level, risk_score).
    """
    score = int(round(probability * 100))
    if probability >= 0.75:
        level = "critical"
    elif probability >= 0.50:
        level = "high"
    elif probability >= 0.25:
        level = "medium"
    else:
        level = "low"
    return level, score


def _evaluate_rules(features: TransactionFeatures) -> list[str]:
    """Run simple heuristic rules against the transaction.

    These supplement the ML model with deterministic business logic.

    Args:
        features: Incoming transaction features.

    Returns:
        List of triggered rule identifiers.
    """
    triggered: list[str] = []
    if features.amount > 5000:
        triggered.append("RULE_HIGH_AMOUNT")
    if features.is_foreign and features.device_is_new:
        triggered.append("RULE_FOREIGN_NEW_DEVICE")
    if features.velocity_last_hour > 10:
        triggered.append("RULE_HIGH_VELOCITY")
    if features.hour_of_day >= 23 or features.hour_of_day < 5:
        triggered.append("RULE_NIGHT_TRANSACTION")
    if features.amount_deviation > 3.0:
        triggered.append("RULE_AMOUNT_OUTLIER")
    return triggered


def _mock_prediction(features: TransactionFeatures) -> PredictionResponse:
    """Generate a deterministic mock prediction when no trained model is loaded.

    The mock uses a simple rule-weighted score so the API is still exercisable
    during development.

    Args:
        features: Incoming transaction features.

    Returns:
        A :class:`PredictionResponse` with a ``warning`` flag set.
    """
    score = 0.0
    score += min(features.amount / 10000.0, 0.3)
    score += 0.15 if features.is_foreign else 0.0
    score += 0.10 if features.device_is_new else 0.0
    score += min(features.velocity_last_hour / 20.0, 0.15)
    score += min(features.amount_deviation / 5.0, 0.20)
    score += 0.05 if (features.hour_of_day >= 23 or features.hour_of_day < 5) else 0.0

    probability = round(min(max(score, 0.0), 1.0), 4)
    risk_level, risk_score = _classify_risk(probability)
    triggered = _evaluate_rules(features)

    explanations = {
        "amount": round(features.amount / 10000.0, 4),
        "is_foreign": 0.15 if features.is_foreign else 0.0,
        "device_is_new": 0.10 if features.device_is_new else 0.0,
        "velocity_last_hour": round(features.velocity_last_hour / 20.0, 4),
        "amount_deviation": round(features.amount_deviation / 5.0, 4),
    }

    return PredictionResponse(
        fraud_probability=probability,
        risk_score=risk_score,
        risk_level=risk_level,
        triggered_rules=triggered,
        anomaly_score=round(random.uniform(-0.5, 0.5), 4),
        explanations=explanations,
        warning="No trained model loaded — returning heuristic mock prediction.",
    )


@router.post("/predict", response_model=PredictionResponse)
async def predict(features: TransactionFeatures) -> PredictionResponse:
    """Score a single transaction for fraud risk.

    If a trained model is loaded the endpoint runs real inference; otherwise it
    falls back to a rule-based mock so development can continue without a
    model artefact.
    """
    try:
        if _model is None:
            logger.warning("No model loaded — returning mock prediction.")
            return _mock_prediction(features)

        # Build the feature vector expected by the sklearn / xgboost model
        vector = build_feature_vector(
            amount=features.amount,
            transaction_type=features.transaction_type,
            merchant_category=features.merchant_category,
            is_foreign=features.is_foreign,
            hour_of_day=features.hour_of_day,
            day_of_week=features.day_of_week,
            device_is_new=features.device_is_new,
            velocity_last_hour=features.velocity_last_hour,
            amount_deviation=features.amount_deviation,
        )

        import numpy as np

        X = np.array(vector).reshape(1, -1)

        # predict_proba returns [[p_legit, p_fraud]]
        proba = float(_model.predict_proba(X)[0][1])
        risk_level, risk_score = _classify_risk(proba)
        triggered = _evaluate_rules(features)

        # Attempt SHAP explanations (best-effort)
        explanations: dict[str, float] = {}
        try:
            import shap

            explainer = shap.TreeExplainer(_model)
            shap_values = explainer.shap_values(X)
            feature_names = [
                "amount_norm",
                *[f"txn_type_{i}" for i in range(5)],
                *[f"merch_cat_{i}" for i in range(8)],
                "is_foreign",
                "device_is_new",
                "velocity_last_hour",
                "amount_deviation",
                "is_night",
                "is_weekend",
                "high_velocity",
                "hour_sin",
                "hour_cos",
            ]
            if isinstance(shap_values, list):
                vals = shap_values[1][0]
            else:
                vals = shap_values[0]
            explanations = {
                name: round(float(val), 4)
                for name, val in zip(feature_names, vals)
            }
        except Exception:
            logger.debug("SHAP explanations unavailable.", exc_info=True)

        return PredictionResponse(
            fraud_probability=round(proba, 4),
            risk_score=risk_score,
            risk_level=risk_level,
            triggered_rules=triggered,
            anomaly_score=0.0,
            explanations=explanations,
        )

    except Exception as exc:
        logger.exception("Prediction failed.")
        raise HTTPException(status_code=500, detail=f"Prediction error: {exc}") from exc
