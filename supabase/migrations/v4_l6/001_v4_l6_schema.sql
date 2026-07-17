-- MJRH V4 — Layer 6: OBSERVABILITY SCHEMA (v1.0 - PERSISTENCE)
CREATE SCHEMA IF NOT EXISTS v4_l6;

-- [TABLE] SLA Policies
-- Defines timing expectations for activities.
CREATE TABLE v4_l6.sla_policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id uuid NOT NULL REFERENCES v4_l4.activities(id) ON DELETE CASCADE,
    target_duration interval NOT NULL, -- "Comfortable" time
    critical_duration interval NOT NULL, -- "Breach" time
    is_active boolean DEFAULT true,
    UNIQUE (activity_id)
);

-- [TABLE] SLA Breaches
-- Persistent record of violations for forensic/performance review.
CREATE TABLE v4_l6.sla_breaches (
    id bigserial PRIMARY KEY,
    work_order_id uuid NOT NULL REFERENCES v4_l4.work_orders(id),
    activity_id uuid NOT NULL REFERENCES v4_l4.activities(id),
    node_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    actual_duration interval,
    severity text CHECK (severity IN ('WARNING', 'CRITICAL')),
    detected_at timestamptz DEFAULT now()
);

-- [TABLE] Sovereign Alerts
-- Alerts routed to Actors based on Sovereign Root.
CREATE TABLE v4_l6.alerts (
    id bigserial PRIMARY KEY,
    sovereign_root_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    actor_id uuid REFERENCES v4_l2.actors(id), -- Specific recipient or NULL for mandate-group
    mandate_class text, -- Target actors with this mandate
    title text NOT NULL,
    body text,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- [TABLE] Node Health Scores
-- Periodic snapshot of operational health.
CREATE TABLE v4_l6.node_health_scores (
    node_id uuid PRIMARY KEY REFERENCES v4_l1.nodes(id),
    compliance_score numeric(5,2),
    sla_score numeric(5,2),
    resource_score numeric(5,2),
    total_score numeric(5,2) GENERATED ALWAYS AS (
        (compliance_score * 0.4) + (sla_score * 0.4) + (resource_score * 0.2)
    ) STORED,
    computed_at timestamptz DEFAULT now()
);

-- [INDEXES]
CREATE INDEX idx_alerts_sovereign ON v4_l6.alerts(sovereign_root_id, is_read);
CREATE INDEX idx_breaches_node ON v4_l6.sla_breaches(node_id);
CREATE INDEX idx_breaches_wo ON v4_l6.sla_breaches(work_order_id);
