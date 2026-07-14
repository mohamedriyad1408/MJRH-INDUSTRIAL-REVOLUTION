CREATE TABLE v4_l1.structural_outbox (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_type text NOT NULL, -- e.g., 'NodeMoved', 'IdentityBound'
    aggregate_id uuid NOT NULL,
    payload jsonb NOT NULL, -- Full Snapshot
    correlation_id uuid,
    published boolean DEFAULT false,
    published_at timestamptz,
    retry_count int DEFAULT 0,
    created_at timestamptz DEFAULT clock_timestamp()
);
