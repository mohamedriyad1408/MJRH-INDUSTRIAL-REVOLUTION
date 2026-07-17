-- MJRH V4 — SOVEREIGN CORE: FOUNDATION HARDENING (v1.2)
-- Mandate: Universal Actors, Translation DNA, and Strategic OIO

BEGIN;

-- 1. [L2] EXPAND ACTOR TYPES
-- Adding Machine, Vehicle, and Customer to the Sovereign Actor model.
ALTER TYPE v4_l2.actor_type ADD VALUE IF NOT EXISTS 'MACHINE';
ALTER TYPE v4_l2.actor_type ADD VALUE IF NOT EXISTS 'VEHICLE';
ALTER TYPE v4_l2.actor_type ADD VALUE IF NOT EXISTS 'CUSTOMER';
ALTER TYPE v4_l2.actor_type ADD VALUE IF NOT EXISTS 'SYSTEM';

-- 2. [L1-L4] ADD TRANSLATION DNA (JSONB i18n)
-- Injecting the translation column into all naming entities.
ALTER TABLE v4_l1.nodes ADD COLUMN IF NOT EXISTS translation jsonb DEFAULT '{}'::jsonb;
ALTER TABLE v4_l2.job_blueprints ADD COLUMN IF NOT EXISTS translation jsonb DEFAULT '{}'::jsonb;
ALTER TABLE v4_l4.activities ADD COLUMN IF NOT EXISTS translation jsonb DEFAULT '{}'::jsonb;
ALTER TABLE v4_l7.form_schemas ADD COLUMN IF NOT EXISTS translation jsonb DEFAULT '{}'::jsonb;

-- 3. [L3] ASSET INTELLIGENCE & TELEMETRY
-- Maintenance Blueprints for predictive health
CREATE TABLE IF NOT EXISTS v4_l3.maintenance_blueprints (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    capability_id text REFERENCES v4.capabilities(id),
    maintenance_interval interval NOT NULL,
    threshold_metric text, -- e.g., 'kilometers', 'cycles'
    threshold_value numeric,
    instruction_payload jsonb DEFAULT '{}'::jsonb
);

-- Asset Telemetry (The Real-time Pulse of Machines)
CREATE TABLE IF NOT EXISTS v4_l3.asset_telemetry (
    id bigserial PRIMARY KEY,
    node_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    metric_key text NOT NULL, -- 'km', 'temp', 'load'
    metric_value numeric NOT NULL,
    occurred_at timestamptz DEFAULT now()
);

-- 4. [L10] OIO: STRATEGIC GOALS
CREATE TABLE IF NOT EXISTS v4_l10.strategic_goals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sovereign_root_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    goal_name text NOT NULL,
    target_metric text NOT NULL, -- 'revenue', 'sla_compliance', 'efficiency'
    target_value numeric NOT NULL,
    current_value numeric DEFAULT 0,
    deadline date,
    status text DEFAULT 'TRACKING' CHECK (status IN ('TRACKING', 'ACHIEVED', 'FAILED', 'DEVIATED')),
    created_at timestamptz DEFAULT now()
);

-- 5. [L9] FINANCE DNA: INSTAPAY OCR GATEWAY
-- Placeholder for OCR Capability linkage
INSERT INTO v4.capabilities (id, category, version, metadata)
VALUES ('finance.instapay_ocr', 'FINANCE', '1.0.0', '{"description": "Automated InstaPay Payment Verification"}')
ON CONFLICT (id) DO NOTHING;

COMMIT;
