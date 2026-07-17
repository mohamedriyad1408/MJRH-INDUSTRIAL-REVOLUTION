-- MJRH V4 — SECURITY PATCH: PUBLIC VISIBILITY (v1.2)
-- Purpose: Allow public (anon/authenticated) to see active sovereign roots and identities.

BEGIN;

-- 1. [L1] Identities Public Read
-- Needed for Landing page and public tracking.
DROP POLICY IF EXISTS p_identities_public_read ON v4_l1.identities;
CREATE POLICY p_identities_public_read ON v4_l1.identities
FOR SELECT TO anon, authenticated
USING (current_state = 'ACTIVE');

-- 2. [L1] Nodes Public Read (Sovereign Roots only)
-- Allow anyone to see the root nodes of active organizations.
DROP POLICY IF EXISTS p_nodes_public_root_read ON v4_l1.nodes;
CREATE POLICY p_nodes_public_root_read ON v4_l1.nodes
FOR SELECT TO anon, authenticated
USING (node_class = 'SOVEREIGN_ROOT' AND current_state = 'ACTIVE');

-- 3. [L7] Branding Public Read
-- Needed to show logos and colors on landing page.
DROP POLICY IF EXISTS p_v4_l7_branding_public_read ON v4_l7.branding_profiles;
CREATE POLICY p_v4_l7_branding_public_read ON v4_l7.branding_profiles
FOR SELECT TO anon, authenticated
USING (true);

COMMIT;
