"""Tests for the Fraud Detection ML Service API endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

class TestHealthEndpoint:
    """Tests for GET /health."""

    def test_health_returns_200(self) -> None:
        """Health endpoint should return 200 with a status field."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "service" in data

    def test_health_response_structure(self) -> None:
        """Health response must contain exactly the expected keys."""
        response = client.get("/health")
        data = response.json()
        assert set(data.keys()) == {"status", "service"}


# ---------------------------------------------------------------------------
# Prediction
# ---------------------------------------------------------------------------

_VALID_PAYLOAD: dict = {
    "amount": 249.99,
    "transaction_type": "purchase",
    "merchant_category": "electronics",
    "is_foreign": False,
    "hour_of_day": 14,
    "day_of_week": 2,
    "device_is_new": False,
    "velocity_last_hour": 2,
    "amount_deviation": 0.5,
}


class TestPredictEndpoint:
    """Tests for POST /predict."""

    def test_predict_returns_200(self) -> None:
        """A valid payload should return 200."""
        response = client.post("/predict", json=_VALID_PAYLOAD)
        assert response.status_code == 200

    def test_predict_response_structure(self) -> None:
        """Response must contain all expected fields."""
        response = client.post("/predict", json=_VALID_PAYLOAD)
        data = response.json()
        assert "fraud_probability" in data
        assert "risk_score" in data
        assert "risk_level" in data
        assert "triggered_rules" in data
        assert "anomaly_score" in data
        assert "explanations" in data

    def test_predict_mock_warning(self) -> None:
        """When no model is loaded the response should carry a warning."""
        response = client.post("/predict", json=_VALID_PAYLOAD)
        data = response.json()
        # Without a trained model artefact, the mock path should be used
        assert data.get("warning") is not None

    def test_predict_risk_level_values(self) -> None:
        """Risk level must be one of the expected categories."""
        response = client.post("/predict", json=_VALID_PAYLOAD)
        data = response.json()
        assert data["risk_level"] in {"low", "medium", "high", "critical"}

    def test_predict_probability_range(self) -> None:
        """Fraud probability must be between 0 and 1."""
        response = client.post("/predict", json=_VALID_PAYLOAD)
        data = response.json()
        assert 0.0 <= data["fraud_probability"] <= 1.0

    def test_predict_score_range(self) -> None:
        """Risk score must be an integer between 0 and 100."""
        response = client.post("/predict", json=_VALID_PAYLOAD)
        data = response.json()
        assert 0 <= data["risk_score"] <= 100

    def test_predict_high_risk_transaction(self) -> None:
        """A clearly suspicious transaction should score higher risk."""
        suspicious = {
            "amount": 9999.99,
            "transaction_type": "transfer",
            "merchant_category": "electronics",
            "is_foreign": True,
            "hour_of_day": 3,
            "day_of_week": 6,
            "device_is_new": True,
            "velocity_last_hour": 15,
            "amount_deviation": 4.5,
        }
        response = client.post("/predict", json=suspicious)
        data = response.json()
        assert data["risk_level"] in {"high", "critical"}
        assert data["risk_score"] >= 50

    def test_predict_missing_field_returns_422(self) -> None:
        """Omitting a required field should return a 422 validation error."""
        incomplete = {k: v for k, v in _VALID_PAYLOAD.items() if k != "amount"}
        response = client.post("/predict", json=incomplete)
        assert response.status_code == 422

    def test_predict_invalid_hour_returns_422(self) -> None:
        """An out-of-range hour_of_day should trigger validation."""
        bad = {**_VALID_PAYLOAD, "hour_of_day": 25}
        response = client.post("/predict", json=bad)
        assert response.status_code == 422

    def test_predict_triggered_rules_list(self) -> None:
        """triggered_rules must always be a list of strings."""
        response = client.post("/predict", json=_VALID_PAYLOAD)
        data = response.json()
        assert isinstance(data["triggered_rules"], list)
        for rule in data["triggered_rules"]:
            assert isinstance(rule, str)
