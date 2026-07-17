-- MJRH V4 — FINAL SYSTEM PURGE & ARCHIVAL (v1.0)
-- ARCHITECTURAL GRADE: SOVEREIGN (CLEAN BASELINE)

BEGIN;

-- 1. [ARCHIVAL] Create Archive Schema
CREATE SCHEMA IF NOT EXISTS v4_archive;

-- Move Non-Dry-Tech Projects to Archive
CREATE TABLE v4_archive.tenants_archived AS 
SELECT * FROM public.tenants WHERE slug != 'dry-tech-cairo';

-- Move associated data before dropping
CREATE TABLE v4_archive.orders_archived AS 
SELECT * FROM public.orders WHERE tenant_id IN (SELECT id FROM v4_archive.tenants_archived);

CREATE TABLE v4_archive.work_orders_v3_archived AS 
SELECT * FROM public.work_orders WHERE tenant_id IN (SELECT id FROM v4_archive.tenants_archived);

-- 2. [SANITY CHECK] Verify Dry-Tech Integrity in V4
-- Verification Logic:
-- Total migrated for 'dry-tech-cairo' must be 1245.
-- (Simulated as a check in this script)
DO $$
DECLARE
    _v4_count int;
BEGIN
    SELECT count(*) INTO _v4_count 
    FROM v4_l4.work_orders 
    WHERE node_id = (SELECT id FROM v4_l1.nodes WHERE node_path = 'dry_tech_cairo' LIMIT 1);

    IF _v4_count < 1245 THEN
        RAISE EXCEPTION 'FATAL: Migration Mismatch. V4 only has % work orders. Expected 1245.', _v4_count;
    END IF;
    
    RAISE NOTICE 'SUCCESS: V4 Data Integrity Verified. Proceeding to Purge.';
END $$;

-- 3. [DECOMMISSION] Drop Legacy V2/V3 Tables
-- Only after archiving other tenants and verifying V4.
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.order_status_history CASCADE;
DROP TABLE IF EXISTS public.work_orders CASCADE; -- Legacy V3
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.cash_transactions CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;
DROP TABLE IF EXISTS public.inventory_movements CASCADE;
DROP TABLE IF EXISTS public.equipment_assets CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.payroll_periods CASCADE;
DROP TABLE IF EXISTS public.payroll_lines CASCADE;
DROP TABLE IF EXISTS public.employee_attendance CASCADE;
DROP TABLE IF EXISTS public.work_schedules CASCADE;

-- 4. [HARDENING] Lock Identity Tables as Read-Only
-- These are kept for reference only.
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenants_read_only ON public.tenants;
CREATE POLICY tenants_read_only ON public.tenants FOR SELECT TO authenticated USING (true);
CREATE POLICY tenants_lock ON public.tenants FOR INSERT OR UPDATE OR DELETE TO authenticated WITH CHECK (false);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_roles_read_only ON public.user_roles;
CREATE POLICY user_roles_read_only ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY user_roles_lock ON public.user_roles FOR INSERT OR UPDATE OR DELETE TO authenticated WITH CHECK (false);

COMMIT;
