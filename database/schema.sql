-- ==============================================================================
-- DeepShield: Video Injection & Deepfake Screening System
-- Relational Database Schema DDL (ANSI SQL / PostgreSQL / SQLite Compatible)
-- ==============================================================================

-- 1. Screening Session Table
CREATE TABLE IF NOT EXISTS screening_session (
    session_id UUID PRIMARY KEY,
    client_id VARCHAR(128) NOT NULL DEFAULT 'anonymous-client',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    duration_s DOUBLE PRECISION,
    frames_total INTEGER NOT NULL DEFAULT 0,
    frames_used INTEGER NOT NULL DEFAULT 0,
    error_message TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_screening_session_created ON screening_session(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screening_session_status ON screening_session(status);

-- 2. Channel Result Table (Isolated Multi-Signal Channels)
CREATE TABLE IF NOT EXISTS channel_result (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES screening_session(session_id) ON DELETE CASCADE,
    channel VARCHAR(32) NOT NULL, -- 'SPATIAL', 'LIVENESS', 'TELEMETRY'
    raw_score DOUBLE PRECISION NOT NULL,
    normalised_score DOUBLE PRECISION NOT NULL,
    flagged BOOLEAN NOT NULL DEFAULT FALSE,
    features_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_session_channel UNIQUE (session_id, channel)
);

-- 3. Fusion Result Table (Weighted Multi-Gate Decision Engine)
CREATE TABLE IF NOT EXISTS fusion_result (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL UNIQUE REFERENCES screening_session(session_id) ON DELETE CASCADE,
    fusion_version VARCHAR(64) NOT NULL DEFAULT 'v1.0-weighted-escalated',
    weights_json JSONB DEFAULT '{"spatial": 0.50, "liveness": 0.30, "telemetry": 0.20}'::jsonb,
    fused_score DOUBLE PRECISION NOT NULL,
    risk_band VARCHAR(32) NOT NULL DEFAULT 'LOW', -- 'LOW', 'GUARDED', 'ELEVATED', 'HIGH'
    escalated BOOLEAN NOT NULL DEFAULT FALSE,
    escalation_reason VARCHAR(255) DEFAULT '',
    recommendation TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Evidence Artifact Table (Grad-CAM, EAR plots, Video, Checksums)
CREATE TABLE IF NOT EXISTS evidence_artifact (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES screening_session(session_id) ON DELETE CASCADE,
    frame_index INTEGER,
    artifact_type VARCHAR(32) NOT NULL, -- 'GRADCAM_HEATMAP', 'EAR_TIME_SERIES', 'FRAME_CROP', 'APPLICANT_VIDEO'
    storage_ref VARCHAR(512) NOT NULL,
    checksum VARCHAR(64) NOT NULL, -- SHA-256 Digest
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Model Registry Table (Cryptographic ML Weight Traceability)
CREATE TABLE IF NOT EXISTS model_registry (
    model_id UUID PRIMARY KEY,
    channel VARCHAR(32) NOT NULL,
    architecture VARCHAR(128) NOT NULL, -- e.g. 'EfficientNet-B0'
    checkpoint_hash VARCHAR(64) NOT NULL,
    train_dataset VARCHAR(255) NOT NULL,
    export_format VARCHAR(32) NOT NULL DEFAULT 'PyTorch',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Immutable Audit Log Table (Forensic Tamper-Evident Trail)
CREATE TABLE IF NOT EXISTS audit_log (
    audit_id UUID PRIMARY KEY,
    session_id UUID REFERENCES screening_session(session_id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actor VARCHAR(128) NOT NULL DEFAULT 'SYSTEM_PIPELINE',
    action VARCHAR(64) NOT NULL, -- 'SESSION_INIT', 'CHANNELS_EVALUATED', 'OFFICER_REVIEW', etc.
    payload_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of payload
    metadata_json JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
