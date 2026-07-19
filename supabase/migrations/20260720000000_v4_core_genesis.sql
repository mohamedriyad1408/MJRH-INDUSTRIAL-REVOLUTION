-- MJRH V4 — Core Genesis
-- Layer 1: Core Engine Implementation
-- Responsibility: Identity, Capability Registry, Object Identity, and Event Foundation.

CREATE SCHEMA IF NOT EXISTS v4;

-- ============================================================================
-- 1. Organization Structure (Recursive Tree)
-- ============================================================================

CREATE TABLE IF NOT EXISTS v4.org_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES v4.org_nodes(id) ON DELETE CASCADE,
  node_type text NOT NULL, -- 'enterprise', 'legal_entity', 'region', 'site', 'department', 'unit'
  name_ar text NOT NULL,
  name_en text NOT NULL,
  external_id text, -- For ERP/Legacy sync
  path ltree, -- For high-speed recursive querying at scale
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_nodes_path ON v4.org_nodes USING gist(path);
CREATE INDEX IF NOT EXISTS idx_org_nodes_parent ON v4.org_nodes(parent_id);

-- ============================================================================
-- 2. Capability Registry (The Business DNA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS v4.capabilities (
  id text PRIMARY KEY, -- e.g., 'core.finance', 'ops.manufacturing'
  category text NOT NULL,
  version text NOT NULL,
  dependencies text[] DEFAULT '{}',
  config_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  permission_surface jsonb NOT NULL DEFAULT '{}'::jsonb,
  activation_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system_level boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v4.capability_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_node_id uuid NOT NULL REFERENCES v4.org_nodes(id) ON DELETE CASCADE,
  capability_id text NOT NULL REFERENCES v4.capabilities(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_setup')),
  config_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  activated_at timestamptz NOT NULL DEFAULT now(),
  activated_by uuid,
  UNIQUE(org_node_id, capability_id)
);

-- ============================================================================
-- 3. Business Object Identity (Universal Registry)
-- ============================================================================

CREATE TABLE IF NOT EXISTS v4.bus_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  global_id text UNIQUE NOT NULL, -- human-readable or cross-system ID
  object_type text NOT NULL, -- e.g., 'identity.user', 'asset.machine', 'finance.account'
  org_node_id uuid NOT NULL REFERENCES v4.org_nodes(id),
  capability_owner text REFERENCES v4.capabilities(id),
  lifecycle_state text NOT NULL DEFAULT 'draft',
  current_version int NOT NULL DEFAULT 1,
  is_archived boolean NOT NULL DEFAULT false,
  owner_user_id uuid,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bus_objects_type ON v4.bus_objects(object_type);
CREATE INDEX IF NOT EXISTS idx_bus_objects_node ON v4.bus_objects(org_node_id);

-- ============================================================================
-- 4. Event Foundation (The Heartbeat)
-- ============================================================================

CREATE TABLE IF NOT EXISTS v4.core_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL, -- 'object.created', 'state.changed', 'capability.activated'
  object_id uuid REFERENCES v4.bus_objects(id),
  org_node_id uuid REFERENCES v4.org_nodes(id),
  actor_id uuid, -- The user or system-id who did it
  payload jsonb NOT NULL DEFAULT '{}'::jsonb, -- The 'What'
  prev_state jsonb, -- For Audit/Time-travel
  trace_id uuid, -- For observability across services
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_core_events_occurred ON v4.core_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_core_events_object ON v4.core_events(object_id);

-- ============================================================================
-- 5. Business Control Hooks (Placeholders for Layer 3)
-- ============================================================================

CREATE TABLE IF NOT EXISTS v4.control_hooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid REFERENCES v4.bus_objects(id),
  hook_type text NOT NULL, -- 'approval', 'policy_check', 'kpi_trigger'
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_blocking boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
