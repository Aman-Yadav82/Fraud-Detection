"""Generate synthetic fraud transaction dataset for model training and benchmark."""

import numpy as np
import pandas as pd
from pathlib import Path

def generate_benchmark_dataset(n_samples: int = 10000, output_path: str = "data/transactions.csv"):
    np.random.seed(42)

    categories = ["retail", "electronics", "travel", "dining", "groceries", "crypto"]
    types = ["purchase", "transfer", "withdrawal", "deposit"]

    amounts = []
    transaction_types = []
    merchant_categories = []
    is_foreign = []
    hours = []
    days = []
    new_devices = []
    velocities = []
    amount_deviations = []
    is_fraud = []

    for _ in range(n_samples):
        # 95% legitimate, 5% fraudulent
        fraud = np.random.choice([0, 1], p=[0.95, 0.05])

        if fraud == 1:
            # Fraudulent pattern: higher amounts, foreign, new device, high velocity, late hours
            amt = np.random.choice([
                np.random.uniform(50000, 250000),
                np.random.uniform(25000, 80000)
            ])
            foreign = np.random.choice([0, 1], p=[0.25, 0.75])
            dev = np.random.choice([0, 1], p=[0.20, 0.80])
            hr = np.random.choice([np.random.randint(1, 5), np.random.randint(12, 23)], p=[0.6, 0.4])
            velo = np.random.randint(3, 12)
            cat = np.random.choice(["electronics", "travel", "crypto", "retail"], p=[0.4, 0.3, 0.2, 0.1])
            dev_mult = amt / 8000.0
        else:
            # Normal pattern
            amt = np.random.exponential(scale=3500) + 150
            amt = min(amt, 45000)
            foreign = np.random.choice([0, 1], p=[0.97, 0.03])
            dev = np.random.choice([0, 1], p=[0.94, 0.06])
            hr = np.random.randint(6, 23)
            velo = np.random.choice([0, 1, 2], p=[0.75, 0.20, 0.05])
            cat = np.random.choice(categories, p=[0.3, 0.15, 0.1, 0.2, 0.2, 0.05])
            dev_mult = max(0.2, amt / 5000.0)

        amounts.append(round(float(amt), 2))
        transaction_types.append(np.random.choice(types, p=[0.7, 0.15, 0.1, 0.05]))
        merchant_categories.append(cat)
        is_foreign.append(int(foreign))
        hours.append(int(hr))
        days.append(int(np.random.randint(0, 7)))
        new_devices.append(int(dev))
        velocities.append(int(velo))
        amount_deviations.append(round(float(dev_mult), 2))
        is_fraud.append(int(fraud))

    df = pd.DataFrame({
        "amount": amounts,
        "transaction_type": transaction_types,
        "merchant_category": merchant_categories,
        "is_foreign": is_foreign,
        "hour_of_day": hours,
        "day_of_week": days,
        "device_is_new": new_devices,
        "velocity_last_hour": velocities,
        "amount_deviation": amount_deviations,
        "is_fraud": is_fraud
    })

    dest = Path(output_path)
    dest.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(dest, index=False)
    print(f"Generated {len(df)} transactions to {dest}. Fraud count: {df['is_fraud'].sum()} ({df['is_fraud'].mean()*100:.1f}%)")

if __name__ == "__main__":
    generate_benchmark_dataset()
