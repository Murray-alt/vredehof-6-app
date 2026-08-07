CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role_code TEXT NOT NULL CHECK (role_code IN ('owner_admin', 'stakeholder_viewer')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS properties (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    stakeholder_summary TEXT,
    currency_code TEXT NOT NULL DEFAULT 'ZAR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES properties (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category_type TEXT NOT NULL CHECK (category_type IN ('income', 'expense', 'adjustment', 'opening_balance')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (property_id, name)
);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES properties (id) ON DELETE CASCADE,
    category_id BIGINT REFERENCES categories (id) ON DELETE SET NULL,
    entry_date DATE NOT NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('income', 'expense', 'adjustment', 'opening_balance')),
    description TEXT NOT NULL,
    notes TEXT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    balance_effect NUMERIC(12, 2) NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('manual', 'imported')),
    source_reference TEXT,
    is_visible_to_stakeholders BOOLEAN NOT NULL DEFAULT TRUE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_user_id BIGINT REFERENCES users (id) ON DELETE SET NULL,
    updated_by_user_id BIGINT REFERENCES users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_property_date
    ON ledger_entries (property_id, entry_date DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_visibility
    ON ledger_entries (property_id, is_visible_to_stakeholders, is_archived);

CREATE INDEX IF NOT EXISTS idx_categories_property_sort
    ON categories (property_id, sort_order ASC, name ASC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_entries_imported_source_reference
    ON ledger_entries (property_id, source, source_reference)
    WHERE source = 'imported' AND source_reference IS NOT NULL;
