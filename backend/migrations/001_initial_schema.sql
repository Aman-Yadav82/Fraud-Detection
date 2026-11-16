-- ============================================================================
-- Migration 001: Initial Schema
-- Fraud Detection & Transaction Risk Management Platform
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ROLES TABLE ────────────────────────────────────────────────────────────
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO roles (name, description) VALUES
    ('customer', 'End user who initiates transactions and submits disputes'),
    ('analyst', 'Fraud analyst who investigates cases and makes decisions'),
    ('manager', 'Fraud manager who oversees operations and assigns cases'),
    ('admin', 'System administrator who manages users, rules, and configuration'),
    ('auditor', 'Read-only access to audit trails, cases, and transactions');

-- ─── USERS TABLE ────────────────────────────────────────────────────────────
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL REFERENCES roles(name),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ─── CUSTOMERS TABLE ───────────────────────────────────────────────────────
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    risk_level VARCHAR(20) DEFAULT 'LOW',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── ACCOUNTS TABLE ────────────────────────────────────────────────────────
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    account_type VARCHAR(50) DEFAULT 'savings',
    balance DECIMAL(15, 2) DEFAULT 10000.00,
    currency VARCHAR(3) DEFAULT 'INR',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_accounts_customer ON accounts(customer_id);

-- ─── DEVICES TABLE ─────────────────────────────────────────────────────────
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    is_trusted BOOLEAN DEFAULT false,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_devices_customer ON devices(customer_id);

-- ─── TRANSACTIONS TABLE ────────────────────────────────────────────────────
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    transaction_type VARCHAR(50) NOT NULL,  -- purchase, transfer, withdrawal, deposit
    merchant_category VARCHAR(100),
    merchant_name VARCHAR(255),
    description TEXT,
    payment_method VARCHAR(50),             -- card, upi, netbanking, wallet
    is_international BOOLEAN DEFAULT false,
    device_id UUID REFERENCES devices(id),
    ip_address VARCHAR(45),
    location VARCHAR(255),
    status VARCHAR(30) DEFAULT 'pending',   -- pending, completed, flagged, blocked, reversed
    is_synthetic BOOLEAN DEFAULT true,      -- marks demo/synthetic transactions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created ON transactions(created_at);

-- ─── CUSTOMER BEHAVIOR PROFILES ────────────────────────────────────────────
CREATE TABLE customer_behavior_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID UNIQUE NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    avg_transaction_amount DECIMAL(15, 2) DEFAULT 0,
    max_transaction_amount DECIMAL(15, 2) DEFAULT 0,
    avg_daily_transactions INTEGER DEFAULT 0,
    typical_merchant_categories TEXT[],
    typical_locations TEXT[],
    typical_hours INTEGER[],
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── TRANSACTION FEATURES ──────────────────────────────────────────────────
CREATE TABLE transaction_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID UNIQUE NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    amount_zscore DECIMAL(10, 4),
    velocity_last_hour INTEGER DEFAULT 0,
    velocity_last_day INTEGER DEFAULT 0,
    is_new_device BOOLEAN DEFAULT false,
    is_unusual_location BOOLEAN DEFAULT false,
    is_unusual_hour BOOLEAN DEFAULT false,
    amount_deviation DECIMAL(10, 4) DEFAULT 0,
    feature_vector JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── MODEL VERSIONS ────────────────────────────────────────────────────────
CREATE TABLE model_versions (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    algorithm VARCHAR(100),
    metrics JSONB,
    file_path VARCHAR(500),
    is_active BOOLEAN DEFAULT false,
    trained_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── FRAUD PREDICTIONS ─────────────────────────────────────────────────────
CREATE TABLE fraud_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID UNIQUE NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    model_version_id INTEGER REFERENCES model_versions(id),
    fraud_probability DECIMAL(6, 4),
    anomaly_score DECIMAL(6, 4),
    prediction_label VARCHAR(20),
    feature_importance JSONB,
    prediction_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── FRAUD RULES ────────────────────────────────────────────────────────────
CREATE TABLE fraud_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL,         -- threshold, velocity, pattern, composite
    condition JSONB NOT NULL,               -- rule configuration
    severity VARCHAR(20) DEFAULT 'MEDIUM',  -- LOW, MEDIUM, HIGH, CRITICAL
    is_enabled BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── RISK ASSESSMENTS ──────────────────────────────────────────────────────
CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID UNIQUE NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level VARCHAR(20) NOT NULL,        -- LOW, MEDIUM, HIGH, CRITICAL
    model_probability DECIMAL(6, 4),
    anomaly_score DECIMAL(6, 4),
    triggered_rules JSONB,                  -- array of {rule_id, rule_name, reason}
    explanations JSONB,                     -- feature contributions / reasons
    assessment_method VARCHAR(50) DEFAULT 'hybrid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_risk_assessments_level ON risk_assessments(risk_level);
CREATE INDEX idx_risk_assessments_score ON risk_assessments(risk_score);

-- ─── ALERTS ─────────────────────────────────────────────────────────────────
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    risk_assessment_id UUID REFERENCES risk_assessments(id),
    alert_type VARCHAR(50) NOT NULL,        -- high_risk, rule_triggered, anomaly
    severity VARCHAR(20) NOT NULL,          -- LOW, MEDIUM, HIGH, CRITICAL
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(30) DEFAULT 'new',       -- new, acknowledged, investigating, resolved, dismissed
    assigned_to UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_assigned ON alerts(assigned_to);

-- ─── FRAUD CASES ────────────────────────────────────────────────────────────
CREATE TABLE fraud_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number VARCHAR(20) UNIQUE NOT NULL,
    alert_id UUID REFERENCES alerts(id),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'MEDIUM',  -- LOW, MEDIUM, HIGH, CRITICAL
    status VARCHAR(30) DEFAULT 'open',      -- open, investigating, escalated, resolved, closed
    decision VARCHAR(50),                   -- legitimate, suspected_fraud, confirmed_fraud
    assigned_to UUID REFERENCES users(id),
    escalated_to UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cases_status ON fraud_cases(status);
CREATE INDEX idx_cases_assigned ON fraud_cases(assigned_to);
CREATE INDEX idx_cases_customer ON fraud_cases(customer_id);
CREATE INDEX idx_cases_priority ON fraud_cases(priority);

-- ─── CASE NOTES ─────────────────────────────────────────────────────────────
CREATE TABLE case_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES fraud_cases(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    note_type VARCHAR(50) DEFAULT 'comment', -- comment, decision, escalation, system
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_case_notes_case ON case_notes(case_id);

-- ─── DISPUTES ───────────────────────────────────────────────────────────────
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    reason VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(30) DEFAULT 'submitted', -- submitted, under_review, resolved, rejected
    resolution TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_disputes_customer ON disputes(customer_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- ─── NOTIFICATIONS ──────────────────────────────────────────────────────────
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',        -- info, warning, alert, success
    is_read BOOLEAN DEFAULT false,
    link VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- ─── AUDIT LOGS ─────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),                -- user, transaction, case, rule, etc.
    entity_id VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ─── UPDATED_AT TRIGGER ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_fraud_rules_updated_at BEFORE UPDATE ON fraud_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_alerts_updated_at BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_fraud_cases_updated_at BEFORE UPDATE ON fraud_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_disputes_updated_at BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
