"""Pydantic request and response schemas for the prediction API."""

from pydantic import BaseModel, Field


class TransactionFeatures(BaseModel):
    """Input features describing a single transaction for fraud scoring."""

    amount: float = Field(..., gt=0, description="Transaction amount in USD")
    transaction_type: str = Field(
        ..., description="Type of transaction (e.g. purchase, transfer, withdrawal)"
    )
    merchant_category: str = Field(
        ..., description="Merchant category code or label"
    )
    is_foreign: bool = Field(
        ..., description="Whether the transaction originated from a foreign country"
    )
    hour_of_day: int = Field(
        ..., ge=0, le=23, description="Hour of day the transaction occurred (0-23)"
    )
    day_of_week: int = Field(
        ..., ge=0, le=6, description="Day of week (0=Monday .. 6=Sunday)"
    )
    device_is_new: bool = Field(
        ..., description="Whether the device has not been seen before"
    )
    velocity_last_hour: int = Field(
        ..., ge=0, description="Number of transactions in the last hour"
    )
    amount_deviation: float = Field(
        ..., description="Standard-deviation distance from the user's average amount"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
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
            ]
        }
    }


class PredictionResponse(BaseModel):
    """Fraud prediction result returned by the /predict endpoint."""

    fraud_probability: float = Field(
        ..., ge=0.0, le=1.0, description="Probability that the transaction is fraudulent"
    )
    risk_score: int = Field(
        ..., ge=0, le=100, description="Normalised risk score (0-100)"
    )
    risk_level: str = Field(
        ..., description="Categorical risk bucket: low, medium, high, critical"
    )
    triggered_rules: list[str] = Field(
        default_factory=list,
        description="List of rule identifiers that fired for this transaction",
    )
    anomaly_score: float = Field(
        ..., description="Isolation-forest style anomaly score"
    )
    explanations: dict[str, float] = Field(
        default_factory=dict,
        description="SHAP-style per-feature contribution map",
    )
    warning: str | None = Field(
        default=None,
        description="Present when the prediction was generated without a trained model",
    )
