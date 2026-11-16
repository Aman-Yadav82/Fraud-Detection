"""Feature engineering helpers for the fraud-detection pipeline.

These utilities are used both during training and at inference time to ensure
consistent feature transformations.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Amount normalisation
# ---------------------------------------------------------------------------

def normalize_amount(
    amount: float | np.ndarray | pd.Series,
    mean: float = 0.0,
    std: float = 1.0,
) -> float | np.ndarray | pd.Series:
    """Z-score normalise a transaction amount.

    Args:
        amount: Raw transaction amount(s).
        mean: Pre-computed population mean (from training set).
        std: Pre-computed population standard deviation (from training set).

    Returns:
        Normalised amount value(s).  When *std* is zero the original value(s)
        are returned unchanged to avoid division-by-zero.
    """
    if std == 0.0:
        return amount
    return (amount - mean) / std


# ---------------------------------------------------------------------------
# Categorical encoding
# ---------------------------------------------------------------------------

_DEFAULT_TRANSACTION_TYPES: list[str] = [
    "purchase",
    "transfer",
    "withdrawal",
    "refund",
    "payment",
]

_DEFAULT_MERCHANT_CATEGORIES: list[str] = [
    "electronics",
    "groceries",
    "travel",
    "entertainment",
    "dining",
    "utilities",
    "healthcare",
    "other",
]


def encode_transaction_type(
    value: str,
    categories: list[str] | None = None,
) -> list[int]:
    """One-hot encode a transaction type string.

    Args:
        value: The transaction type label (case-insensitive).
        categories: Ordered list of known categories.  Falls back to the
            built-in default list when *None*.

    Returns:
        A list of 0/1 integers with length equal to *categories*.  If *value*
        is not found every element is 0 (unknown category).
    """
    cats = categories or _DEFAULT_TRANSACTION_TYPES
    lower = value.lower()
    return [int(lower == c) for c in cats]


def encode_merchant_category(
    value: str,
    categories: list[str] | None = None,
) -> list[int]:
    """One-hot encode a merchant category string.

    Args:
        value: The merchant category label (case-insensitive).
        categories: Ordered list of known categories.  Falls back to the
            built-in default list when *None*.

    Returns:
        A list of 0/1 integers with length equal to *categories*.
    """
    cats = categories or _DEFAULT_MERCHANT_CATEGORIES
    lower = value.lower()
    return [int(lower == c) for c in cats]


# ---------------------------------------------------------------------------
# Velocity / time features
# ---------------------------------------------------------------------------

def compute_velocity_features(
    velocity_last_hour: int,
    hour_of_day: int,
    day_of_week: int,
) -> dict[str, float]:
    """Derive additional velocity and temporal features.

    Args:
        velocity_last_hour: Number of transactions by the same user in the
            preceding 60 minutes.
        hour_of_day: Hour component (0-23) of the transaction timestamp.
        day_of_week: ISO day-of-week (0=Monday .. 6=Sunday).

    Returns:
        Dictionary of computed features:

        - ``is_night``: 1.0 if the hour falls between 23:00 and 05:00.
        - ``is_weekend``: 1.0 if the day is Saturday (5) or Sunday (6).
        - ``high_velocity``: 1.0 if *velocity_last_hour* exceeds 5.
        - ``hour_sin``: Sine-encoded hour (cyclical).
        - ``hour_cos``: Cosine-encoded hour (cyclical).
    """
    hour_rad = 2 * np.pi * hour_of_day / 24.0
    return {
        "is_night": 1.0 if hour_of_day >= 23 or hour_of_day < 5 else 0.0,
        "is_weekend": 1.0 if day_of_week >= 5 else 0.0,
        "high_velocity": 1.0 if velocity_last_hour > 5 else 0.0,
        "hour_sin": float(np.sin(hour_rad)),
        "hour_cos": float(np.cos(hour_rad)),
    }


# ---------------------------------------------------------------------------
# Full feature vector builder
# ---------------------------------------------------------------------------

def build_feature_vector(
    amount: float,
    transaction_type: str,
    merchant_category: str,
    is_foreign: bool,
    hour_of_day: int,
    day_of_week: int,
    device_is_new: bool,
    velocity_last_hour: int,
    amount_deviation: float,
    *,
    amount_mean: float = 0.0,
    amount_std: float = 1.0,
) -> list[float]:
    """Assemble a flat numeric feature vector from raw transaction fields.

    The returned list order is deterministic and must match the order used
    during model training.

    Args:
        amount: Raw transaction amount.
        transaction_type: Transaction type label.
        merchant_category: Merchant category label.
        is_foreign: Foreign-transaction flag.
        hour_of_day: Hour (0-23).
        day_of_week: Day of week (0-6).
        device_is_new: New-device flag.
        velocity_last_hour: Txn count in last hour.
        amount_deviation: Std-dev distance from user average.
        amount_mean: Training-set mean for normalisation.
        amount_std: Training-set std for normalisation.

    Returns:
        Flat list of floats ready for model input.
    """
    norm_amount = normalize_amount(amount, mean=amount_mean, std=amount_std)
    txn_enc = encode_transaction_type(transaction_type)
    merch_enc = encode_merchant_category(merchant_category)
    vel = compute_velocity_features(velocity_last_hour, hour_of_day, day_of_week)

    vector: list[float] = [
        float(norm_amount),
        *[float(v) for v in txn_enc],
        *[float(v) for v in merch_enc],
        float(is_foreign),
        float(device_is_new),
        float(velocity_last_hour),
        float(amount_deviation),
        vel["is_night"],
        vel["is_weekend"],
        vel["high_velocity"],
        vel["hour_sin"],
        vel["hour_cos"],
    ]
    return vector
