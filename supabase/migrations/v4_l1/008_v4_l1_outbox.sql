-- MJRH V4 — Layer 1: OUTBOX HARDENING (v1.1)
CREATE TABLE v4_l1.structural_outbox (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_type text NOT NULL,
    aggregate_id uuid NOT NULL,
    transaction_uuid uuid DEFAULT gen_random_uuid(), -- Fixed: Logical Trace ID
    payload jsonb NOT NULL,
    published boolean DEFAULT false,
    created_at timestamptz DEFAULT clock_timestamp()
);
