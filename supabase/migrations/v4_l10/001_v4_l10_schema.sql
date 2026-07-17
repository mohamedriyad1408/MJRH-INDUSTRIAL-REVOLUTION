-- MJRH V4 — Layer 10: EVOLUTIONARY SCHEMA (v1.0 - PERSISTENCE)
CREATE SCHEMA IF NOT EXISTS v4_l10;

-- [TYPES]
DO $$ BEGIN
    CREATE TYPE v4_l10.mutation_status AS ENUM ('PROPOSED', 'SHADOW_TESTING', 'APPROVED', 'APPLIED', 'REVERTED', 'REJECTED');
    CREATE TYPE v4_l10.layer_target AS ENUM ('L2_POLICY', 'L3_CAPACITY', 'L4_BLUEPRINT', 'L6_SLA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [TABLE] Strategy Mutations
-- The central registry for all proposed evolutions.
CREATE TABLE v4_l10.mutations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sovereign_root_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    target_layer v4_l10.layer_target NOT NULL,
    target_entity_id uuid NOT NULL, -- e.g., SLA Policy ID or Job Blueprint ID
    mutation_payload jsonb NOT NULL, -- The patch/change (JSON Merge Patch)
    justification text NOT NULL, -- Evidence-based reasoning
    status v4_l10.mutation_status DEFAULT 'PROPOSED',
    confidence_score numeric(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    proposed_at timestamptz DEFAULT now(),
    decided_by uuid REFERENCES v4_l2.actors(id), -- L2 Authority who approved/rejected
    decided_at timestamptz,
    applied_at timestamptz
);

-- [TABLE] Evolutionary Inferences
-- Logs of patterns detected by the engine before a mutation is proposed.
CREATE TABLE v4_l10.inferences (
    id bigserial PRIMARY KEY,
    sovereign_root_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    pattern_type text NOT NULL, -- 'BOTTLENECK', 'RESOURCE_WASTE', 'INTEGRITY_RISK'
    evidence_payload jsonb NOT NULL, -- Links to L5 facts or L6 metrics
    detected_at timestamptz DEFAULT now(),
    is_actioned boolean DEFAULT false
);

-- [TABLE] Shadow Performance Logs
-- Tracks "What-if" scenarios for PROPOSED mutations.
CREATE TABLE v4_l10.shadow_logs (
    id bigserial PRIMARY KEY,
    mutation_id uuid REFERENCES v4_l10.mutations(id) ON DELETE CASCADE,
    simulated_impact numeric(5,2),
    actual_drift numeric(5,2),
    recorded_at timestamptz DEFAULT now()
);

-- [INDEXES]
CREATE INDEX idx_mutations_root ON v4_l10.mutations(sovereign_root_id, status);
CREATE INDEX idx_inferences_root ON v4_l10.inferences(sovereign_root_id, is_actioned);
