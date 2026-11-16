"""Training script for the Fraud Detection model.

Run directly to train on a CSV dataset and persist the best model:

    python -m app.training.train --data data/transactions.csv

The script supports three model families out of the box:
  - Logistic Regression
  - Random Forest
  - XGBoost (gradient-boosted trees)
"""

from __future__ import annotations

import argparse
import logging
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    auc,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_dataset(path: str | Path) -> pd.DataFrame:
    """Load a transaction dataset from a CSV file.

    The CSV is expected to have at least the following columns:
      amount, transaction_type, merchant_category, is_foreign,
      hour_of_day, day_of_week, device_is_new, velocity_last_hour,
      amount_deviation, is_fraud

    Args:
        path: Filesystem path to the CSV file.

    Returns:
        A pandas DataFrame with all columns preserved.
    """
    df = pd.read_csv(path)
    logger.info("Loaded %d rows from %s", len(df), path)
    return df


# ---------------------------------------------------------------------------
# Preprocessing pipeline
# ---------------------------------------------------------------------------

_NUMERIC_FEATURES: list[str] = [
    "amount",
    "hour_of_day",
    "day_of_week",
    "velocity_last_hour",
    "amount_deviation",
]

_BOOLEAN_FEATURES: list[str] = [
    "is_foreign",
    "device_is_new",
]

_CATEGORICAL_FEATURES: list[str] = [
    "transaction_type",
    "merchant_category",
]

TARGET = "is_fraud"


def preprocess(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    """Convert a raw DataFrame into (X, y) arrays for training.

    Categorical columns are one-hot encoded and boolean columns are cast to
    int.  Numeric columns are left as-is (scaling is handled inside the
    sklearn Pipeline).

    Args:
        df: Raw transaction DataFrame.

    Returns:
        Tuple of feature matrix *X* and label vector *y*.
    """
    df = df.copy()

    # One-hot encode categoricals
    df = pd.get_dummies(df, columns=_CATEGORICAL_FEATURES, drop_first=False)

    # Cast booleans to int
    for col in _BOOLEAN_FEATURES:
        if col in df.columns:
            df[col] = df[col].astype(int)

    y = df[TARGET].values.astype(int)
    X = df.drop(columns=[TARGET]).select_dtypes(include=[np.number]).values

    logger.info("Feature matrix shape: %s, label distribution: %s", X.shape, dict(zip(*np.unique(y, return_counts=True))))
    return X, y


# ---------------------------------------------------------------------------
# Model factory
# ---------------------------------------------------------------------------

def get_model(name: str) -> Any:
    """Return an untrained scikit-learn compatible estimator.

    Args:
        name: One of ``logistic``, ``random_forest``, or ``xgboost``.

    Returns:
        A Pipeline wrapping a StandardScaler and the chosen classifier.

    Raises:
        ValueError: If *name* is unrecognised.
    """
    classifiers: dict[str, Any] = {
        "logistic": LogisticRegression(
            max_iter=1000,
            class_weight="balanced",
            random_state=42,
        ),
        "random_forest": RandomForestClassifier(
            n_estimators=200,
            max_depth=12,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        ),
        "xgboost": XGBClassifier(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.1,
            scale_pos_weight=10,
            use_label_encoder=False,
            eval_metric="logloss",
            random_state=42,
            n_jobs=-1,
        ),
    }

    if name not in classifiers:
        raise ValueError(f"Unknown model '{name}'. Choose from {list(classifiers)}")

    return Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", classifiers[name]),
    ])


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

def evaluate(model: Any, X_test: np.ndarray, y_test: np.ndarray) -> dict[str, Any]:
    """Compute evaluation metrics on a held-out test set.

    Args:
        model: A trained scikit-learn Pipeline.
        X_test: Feature matrix.
        y_test: True labels.

    Returns:
        Dictionary containing precision, recall, F1, ROC-AUC, PR-AUC,
        and the confusion matrix.
    """
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    roc = roc_auc_score(y_test, y_proba)
    pr_precision, pr_recall, _ = precision_recall_curve(y_test, y_proba)
    pr_auc = auc(pr_recall, pr_precision)
    cm = confusion_matrix(y_test, y_pred)

    metrics = {
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(roc, 4),
        "pr_auc": round(pr_auc, 4),
        "confusion_matrix": cm.tolist(),
    }

    logger.info("Evaluation metrics:\n%s", metrics)
    logger.info("\n%s", classification_report(y_test, y_pred, zero_division=0))
    return metrics


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

def save_model(model: Any, path: str | Path) -> Path:
    """Serialise a trained model to disk using joblib.

    Args:
        model: Trained sklearn Pipeline.
        path: Destination file path.

    Returns:
        Resolved Path object where the model was saved.
    """
    dest = Path(path)
    dest.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, dest)
    logger.info("Model saved to %s", dest)
    return dest


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(data_path: str, model_name: str = "xgboost", output_path: str = "app/models/model.joblib") -> None:
    """End-to-end training entrypoint.

    Args:
        data_path: Path to the training CSV.
        model_name: Model family to train (logistic | random_forest | xgboost).
        output_path: Where to save the trained model artefact.
    """
    df = load_dataset(data_path)
    X, y = preprocess(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,
        stratify=y,
        random_state=42,
    )
    logger.info(
        "Train/test split — train: %d, test: %d",
        len(y_train),
        len(y_test),
    )

    model = get_model(model_name)
    logger.info("Training %s …", model_name)
    model.fit(X_train, y_train)

    evaluate(model, X_test, y_test)
    save_model(model, output_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train a fraud-detection model.")
    parser.add_argument("--data", required=True, help="Path to training CSV.")
    parser.add_argument(
        "--model",
        default="xgboost",
        choices=["logistic", "random_forest", "xgboost"],
        help="Model family to train (default: xgboost).",
    )
    parser.add_argument(
        "--output",
        default="app/models/model.joblib",
        help="Output path for the serialised model.",
    )
    args = parser.parse_args()
    main(data_path=args.data, model_name=args.model, output_path=args.output)
