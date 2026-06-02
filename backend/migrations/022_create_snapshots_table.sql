CREATE TABLE snapshots (
    id               SERIAL PRIMARY KEY,
    date             DATE NOT NULL,
    total            NUMERIC(12,2) NOT NULL,
    haspa            NUMERIC(12,2) NOT NULL DEFAULT 0,
    n26_b            NUMERIC(12,2) NOT NULL DEFAULT 0,
    n26_m            NUMERIC(12,2) NOT NULL DEFAULT 0,
    cash             NUMERIC(12,2) NOT NULL DEFAULT 0,
    uber_stocks      NUMERIC(12,2) NOT NULL DEFAULT 0,
    scalable_capital NUMERIC(12,2) NOT NULL DEFAULT 0,
    mono_b           NUMERIC(12,2) NOT NULL DEFAULT 0,
    mono_m           NUMERIC(12,2) NOT NULL DEFAULT 0,
    paypal_b         NUMERIC(12,2) NOT NULL DEFAULT 0,
    paypal_m         NUMERIC(12,2) NOT NULL DEFAULT 0,
    backup_cash      NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
