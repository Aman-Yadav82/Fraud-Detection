# Fraud Detection Platform — Architecture Overview

## 1. System Overview

The Fraud Detection Platform is a full-stack application that ingests financial transactions, evaluates them against rule-based and machine-learning models, and surfaces suspicious activity as actionable alerts for analyst review.

The system is composed of **four primary components**:

| Component       | Role                                                        |
| --------------- | ----------------------------------------------------------- |
| **Frontend**    | React SPA for analysts to review alerts, manage cases, and configure rules |
| **Backend API** | Express.js REST API handling auth, business logic, and orchestration       |
| **ML Service**  | FastAPI microservice running fraud-detection ML models                     |
| **Database**    | PostgreSQL 15 storing transactions, users, rules, alerts, and cases        |

---

## 2. Technology Stack

| Layer            | Technology                        | Purpose                                 |
| ---------------- | --------------------------------- | --------------------------------------- |
| Frontend         | React 18, Vite, TailwindCSS      | Single-page application UI              |
| State Management | React Query, Zustand              | Server state caching & client state     |
| Backend          | Node.js, Express.js               | REST API server                         |
| ORM              | Sequelize                         | Database modeling & migrations          |
| Authentication   | JSON Web Tokens (JWT), bcrypt     | Stateless auth & password hashing       |
| ML Service       | Python, FastAPI, scikit-learn     | Model inference & feature engineering   |
| Database         | PostgreSQL 15                     | Relational data persistence             |
| Containerization | Docker, Docker Compose            | Service orchestration                   |
| Testing          | Jest, React Testing Library, pytest | Unit & integration tests              |

---

## 3. Component Descriptions

### 3.1 Frontend (React + Vite)

- **Dashboard** — real-time summary cards showing transaction volume, fraud rate, and active alerts.
- **Transaction Explorer** — paginated, filterable table of all transactions with risk indicators.
- **Alert Queue** — prioritized list of system-generated alerts awaiting analyst review.
- **Case Management** — workflow for investigating, annotating, and resolving fraud cases.
- **Rule Configuration** — UI for creating and editing rule-based detection thresholds.
- **User Administration** — role-based access control (Admin, Analyst, Viewer).

### 3.2 Backend API (Express.js)

- RESTful endpoints for CRUD operations on transactions, alerts, cases, rules, and users.
- JWT-based authentication and role-based authorization middleware.
- Orchestrates calls to the ML Service for real-time scoring.
- Applies rule-based checks before and after ML evaluation.
- Emits alerts when a transaction's composite risk score exceeds configurable thresholds.

### 3.3 ML Service (FastAPI)

- Exposes a `/predict` endpoint that accepts transaction feature vectors.
- Runs a trained classification model (e.g., Random Forest, Gradient Boosting) for fraud probability.
- Performs anomaly detection using Isolation Forest or similar unsupervised techniques.
- Returns a risk score (0–100) along with contributing feature importances.
- Provides `/health` and `/model-info` endpoints for observability.

### 3.4 Database (PostgreSQL 15)

- Normalized schema covering users, transactions, rules, alerts, cases, and audit logs.
- Indexed for high-read query patterns (transaction lookups, alert queues).
- Supports full-text search on transaction descriptions and case notes.

---

## 4. Data Flow

```
┌──────────────┐
│  Transaction  │   A new transaction is submitted or ingested via the API.
│   Ingestion   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Feature     │   The backend extracts derived features:
│  Engineering  │   velocity, amount deviation, geo-distance, time-of-day, etc.
└──────┬───────┘
       │
       ├──────────────────────────┐
       ▼                          ▼
┌──────────────┐          ┌──────────────┐
│  Rule-Based  │          │  ML Service   │
│   Engine     │          │  /predict     │
│              │          │              │
│ • Amount     │          │ • Classifier │
│   thresholds │          │   probability│
│ • Velocity   │          │ • Anomaly    │
│   checks     │          │   score      │
│ • Blocklists │          │ • Feature    │
│              │          │   importance │
└──────┬───────┘          └──────┬───────┘
       │                          │
       └──────────┬───────────────┘
                  ▼
       ┌──────────────────┐
       │  Risk Score       │   Composite score (0–100) combining rule hits
       │  Aggregation      │   and ML probability via weighted formula.
       └────────┬─────────┘
                │
                ▼
       ┌──────────────────┐
       │  Alert Generation │   If score ≥ threshold → create alert
       │                   │   with severity (LOW / MEDIUM / HIGH / CRITICAL).
       └────────┬─────────┘
                │
                ▼
       ┌──────────────────┐
       │  Case Assignment  │   Alert is queued for analyst review;
       │  & Investigation  │   analyst opens a case, annotates, resolves.
       └──────────────────┘
```

---

## 5. Communication Patterns

| Path                        | Protocol | Details                                              |
| --------------------------- | -------- | ---------------------------------------------------- |
| Frontend ↔ Backend          | REST / HTTP | JSON payloads; JWT bearer token in `Authorization` header |
| Backend ↔ ML Service        | REST / HTTP | Internal network call (`http://ml-service:8000/predict`)  |
| Backend ↔ PostgreSQL        | TCP (pg)    | Connection pool via Sequelize; max 20 connections         |
| pgAdmin ↔ PostgreSQL        | TCP (pg)    | Admin tool for direct DB inspection (dev/staging only)    |

All inter-service communication within Docker Compose uses the `fraud-net` bridge network. In production, services should communicate over TLS with mutual authentication.

---

## 6. Security Architecture

| Concern              | Approach                                                         |
| -------------------- | ---------------------------------------------------------------- |
| Authentication       | JWT tokens with configurable expiration; bcrypt-hashed passwords |
| Authorization        | Role-based access control (RBAC): Admin, Analyst, Viewer         |
| Input Validation     | express-validator on all API endpoints; Pydantic models in ML service |
| SQL Injection        | Parameterized queries via Sequelize ORM                          |
| XSS Protection       | React's default escaping; Content-Security-Policy headers        |
| CORS                 | Whitelisted origins only (`FRONTEND_URL`)                        |
| Rate Limiting        | express-rate-limit on auth endpoints                             |
| Secrets Management   | Environment variables; `.env` excluded from version control      |
| Audit Logging        | All state-changing operations logged with user ID and timestamp  |

---

## 7. Database Schema

> _Detailed schema documentation will be added after migrations are created. See `backend/src/models/` for Sequelize model definitions._

### Planned Tables

- `users` — platform users and credentials
- `transactions` — ingested financial transactions
- `rules` — configurable detection rules
- `alerts` — system-generated fraud alerts
- `cases` — investigation cases linked to alerts
- `audit_logs` — immutable record of all state changes

---

## 8. API Reference

> _Full API documentation will be generated once endpoints are implemented. See `backend/src/routes/` for route definitions._

### Planned Endpoint Groups

| Prefix              | Description                     |
| -------------------- | ------------------------------- |
| `POST /api/auth/*`   | Registration, login, profile    |
| `GET/POST /api/transactions/*` | Transaction CRUD & search |
| `GET/POST /api/rules/*`       | Rule management            |
| `GET/PATCH /api/alerts/*`     | Alert queue & triage        |
| `GET/POST /api/cases/*`       | Case lifecycle management   |
| `GET /api/dashboard/*`        | Aggregated statistics       |
| `GET/POST /api/users/*`       | User administration (Admin) |
