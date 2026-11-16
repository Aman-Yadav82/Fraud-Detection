# 🎓 Placement & Technical Interview Defense Guide
## AI-Powered Fraud Detection & Transaction Risk Management Platform

This dossier equips you with deep technical explanations, algorithmic rationales, trade-off comparisons, and direct answers to tough questions interviewers frequently ask about fraud detection, ML systems, and fintech architecture.

---

### 🏛️ 1. Architecture & Design Decisions

#### Q1: "Why build a hybrid engine combining Rules, ML, and Anomaly Detection instead of relying 100% on Machine Learning?"
> **The Real-World Fintech Problem:**
> In production banking (Mastercard, Visa, Stripe, PayPal), **pure ML models are black boxes with cold-start latency**.
> 1. **Immediate Regulatory Enforcement:** If a regulatory compliance mandate requires blocking all international transactions over ₹5,00,000 without 2FA, you cannot wait to retrain an ML model. A deterministic **Rule Engine** evaluates this in `< 2 milliseconds`.
> 2. **Novel Fraud Vectors (Zero-Day Fraud):** Supervised ML only detects patterns it was previously trained on. When attackers introduce an entirely new exploit, supervised models fail. Here, **Behavioral Anomaly Detection** (Isolation Forest / dynamic Z-score deviation from personal baseline) catches the outlier.
> 3. **Explainability & Adverse Action Notices:** Legal regulations (e.g. RBI guidelines, GDPR, FCRA) mandate providing reasons when a customer's payment is declined. A hybrid score provides exact rule names and SHAP feature contributions (`+0.35 due to velocity`, `+0.25 due to unrecognized device`).

#### Q2: "How is the hybrid risk score calculated mathematically?"
> The composite score $S \in [0, 100]$ combines three weighted signals:
> 
> $$S = \min\left(100, \max\left(0, \left(P_{\text{ML}} \times 100 \times 0.50\right) + \left(W_{\text{Rules}} \times 0.35\right) + \left(A_{\text{Anomaly}} \times 100 \times 0.15\right)\right)\right)$$
>
> - **$P_{\text{ML}} \times 0.50$**: Supervised probability of fraud from Random Forest / XGBoost ($[0.0, 1.0]$).
> - **$W_{\text{Rules}} \times 0.35$**: Sum of severity weights from fired database rules:
>   - `CRITICAL` rule: $+40$ pts
>   - `HIGH` rule: $+25$ pts
>   - `MEDIUM` rule: $+15$ pts
>   - `LOW` rule: $+5$ pts
> - **$A_{\text{Anomaly}} \times 0.15$**: Anomaly score based on velocity and amount deviation from the customer's personal average.
> - **Risk Bands**:
>   - **0 – 29:** `LOW` (Auto-approved)
>   - **30 – 59:** `MEDIUM` (Approved with logging)
>   - **60 – 84:** `HIGH` (Flagged, auto-creates Fraud Case in analyst queue)
>   - **85 – 100:** `CRITICAL` (Hard decline / blocked, urgent analyst assignment)

---

### 🤖 2. Machine Learning & Imbalanced Classification

#### Q3: "Fraud datasets have extreme class imbalance (e.g. 99.8% legitimate vs 0.2% fraud). Why is Accuracy a useless metric here?"
> **The Accuracy Paradox:**
> If a model predicts *“Legitimate”* on 100% of transactions, its accuracy is **99.8%**, but it catches **0 fraud cases**, causing millions in financial losses!
>
> **Metrics We Use Instead:**
> 1. **Recall (Sensitivity):** $\frac{\text{TP}}{\text{TP} + \text{FN}}$ — What percentage of all actual fraud did we successfully intercept? In banking, missing fraud (False Negative) is much more costly than a temporary false alarm.
> 2. **Precision:** $\frac{\text{TP}}{\text{TP} + \text{FP}}$ — What percentage of our fraud alerts were genuine fraud? High precision prevents alert fatigue for fraud investigation teams.
> 3. **PR-AUC (Precision-Recall Area Under Curve):** Far more informative than ROC-AUC on highly skewed datasets because it does not include True Negatives (the massive pool of harmless transactions) in its denominator.
>
> **Handling Techniques Implemented:**
> - `class_weight="balanced"` in Random Forest (inversely proportional to class frequencies).
> - `scale_pos_weight` in XGBoost.
> - Stratified K-fold train/test splits to preserve fraud distribution.

---

### 🛡️ 3. Concurrency, Database Design & Security

#### Q4: "How do you prevent double-spending race conditions if a customer sends multiple transactions simultaneously?"
> We use PostgreSQL **pessimistic row locking** via `SELECT ... FOR UPDATE` inside a database transaction (`BEGIN ... COMMIT`):
> 
> ```sql
> SELECT id, balance, currency FROM accounts WHERE customer_id = $1 FOR UPDATE;
> ```
> 
> While the fraud risk engine evaluates rules and ML inference, any concurrent request attempting to access that account row is queued in the database engine until the first transaction commits or rolls back.

#### Q5: "How is Customer Data Isolation guaranteed (preventing Insecure Direct Object References - IDOR)?"
> 1. **No Client-Supplied Customer IDs in API Paths:** All customer endpoints (`GET /api/customer/transactions`, `POST /api/disputes`) extract the `user_id` strictly from the cryptographically verified JWT token (`req.user.id`).
> 2. **Database Join Constraints:** Queries always join `customers c ON c.user_id = $1`, guaranteeing a user can never access another customer's data by tampering with request payloads or URL parameters.

---

### 📈 4. Workflow Lifecycle

```
[Simulated Txn] ➔ [Dynamic Features] ➔ [Rule + ML Evaluation] ➔ [Hybrid Risk Score]
                                                                        │
                 ┌──────────────────────────────────────────────────────┴──────────────────────────────────────────────────────┐
                 ▼                                                                                                             ▼
         Score < 60 (LOW / MED)                                                                                        Score >= 60 (HIGH / CRITICAL)
                 │                                                                                                             │
          [Approve & Deduct]                                                                                            [Flag / Block Account]
                 │                                                                                                             │
         [Customer Notified]                                                                                             [Alert Generated]
                 │                                                                                                             │
       [Customer may Dispute]                                                                                           [Auto-Create Case]
                 │                                                                                                             │
      [Analyst / Mgr Resolves]                                                                                         [Analyst Case Triage]
                 │                                                                                                             │
        [Auto-Refund Credit]                                                                                     [Legitimate / Confirmed Fraud]
```

---

### 🎯 Key Summary for Resume / Project Pitch:
> *"Architected an AI-powered financial fraud detection platform combining supervised machine learning (Random Forest/XGBoost), real-time rule evaluation, and behavioral anomaly detection into a calibrated 0–100 hybrid risk score. Features automated case creation, 5-role RBAC, dispute resolution with automated account re-credit, Recharts operations analytics, and an append-only compliance audit trail across 18 PostgreSQL relational tables."*
