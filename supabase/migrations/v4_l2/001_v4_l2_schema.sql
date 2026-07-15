CREATE SCHEMA IF NOT EXISTS v4_l2;

-- Standard Legal Statuses
DO $$ BEGIN
    CREATE TYPE v4_l2.assignment_status AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED', 'DRAFT');
    CREATE TYPE v4_l2.signature_domain AS ENUM ('CONTRACTS', 'INVOICES', 'HR', 'FINANCE', 'PROCUREMENT', 'TAX', 'BANK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
