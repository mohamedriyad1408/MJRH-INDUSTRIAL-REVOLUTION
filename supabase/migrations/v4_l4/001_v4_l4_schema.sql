-- MJRH V4 — Layer 4: RUNTIME EXECUTION (v1.0 - ARCHITECTURE)
CREATE SCHEMA IF NOT EXISTS v4_l4;

-- [TYPES]
DO $$ BEGIN
    CREATE TYPE v4_l4.work_order_status AS ENUM ('PENDING', 'RUNNING', 'BLOCKED', 'COMPLETED', 'CANCELLED');
    CREATE TYPE v4_l4.fact_type AS ENUM ('WO_CREATED', 'ACTIVITY_STARTED', 'ACTIVITY_COMPLETED', 'WO_BLOCKED', 'WO_CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [TABLE] Value Stream Blueprints (Process Definitions)
CREATE TABLE v4_l4.value_streams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sovereign_root_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    name text NOT NULL,
    version int NOT NULL DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    UNIQUE (sovereign_root_id, name, version)
);

-- [TABLE] Activities (Process Steps)
CREATE TABLE v4_l4.activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id uuid NOT NULL REFERENCES v4_l4.value_streams(id) ON DELETE CASCADE,
    name text NOT NULL,
    capability_definition_id uuid, -- Link to L3 Capability Definition
    mandate_required text, -- Link to L2 Mandate type
    sequence_order int NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    UNIQUE (stream_id, sequence_order)
);

-- [TABLE] Work Orders (Job Instances)
CREATE TABLE v4_l4.work_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    stream_id uuid NOT NULL REFERENCES v4_l4.value_streams(id),
    current_activity_id uuid REFERENCES v4_l4.activities(id),
    status v4_l4.work_order_status DEFAULT 'PENDING',
    actor_id uuid REFERENCES v4_l2.actors(id), -- Currently assigned primary actor
    payload jsonb DEFAULT '{}'::jsonb,
    version bigint NOT NULL DEFAULT 1,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- [TABLE] Operational Facts (The Pulse Outbox)
CREATE TABLE v4_l4.outbox_facts (
    id bigserial PRIMARY KEY,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    work_order_id uuid NOT NULL,
    node_id uuid NOT NULL,
    actor_id uuid,
    fact_type v4_l4.fact_type NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb
);

-- [INDEXES]
CREATE INDEX idx_wo_node ON v4_l4.work_orders(node_id);
CREATE INDEX idx_wo_stream ON v4_l4.work_orders(stream_id);
CREATE INDEX idx_facts_wo ON v4_l4.outbox_facts(work_order_id);
