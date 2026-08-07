-- Replace each PASSWORD_HASH_* value with the output of:
-- npm run db:hash-password -- <plain-text-password>

INSERT INTO properties (name, slug, stakeholder_summary)
VALUES (
    'Vredehof 6',
    'vredehof-6',
    'Shared rental overview for Murray, Astrid, and Kiki.'
)
ON CONFLICT (slug) DO UPDATE
SET
    name = EXCLUDED.name,
    stakeholder_summary = EXCLUDED.stakeholder_summary,
    updated_at = NOW();

WITH property_row AS (
    SELECT id
    FROM properties
    WHERE slug = 'vredehof-6'
)
INSERT INTO categories (property_id, name, category_type, sort_order)
SELECT property_row.id, seed.name, seed.category_type, seed.sort_order
FROM property_row
JOIN (
    VALUES
        ('Rent', 'income', 10),
        ('Levy', 'expense', 20),
        ('Maintenance', 'expense', 30),
        ('Utilities', 'expense', 40),
        ('Holiday/Shared', 'expense', 50),
        ('Other', 'expense', 60),
        ('Opening Balance', 'opening_balance', 70),
        ('Adjustment', 'adjustment', 80)
) AS seed(name, category_type, sort_order) ON TRUE
ON CONFLICT (property_id, name) DO UPDATE
SET
    category_type = EXCLUDED.category_type,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

INSERT INTO users (email, password_hash, display_name, role_code)
VALUES
    ('murray@vredehof6.local', 'PASSWORD_HASH_MURRAY', 'Murray', 'owner_admin'),
    ('astrid@vredehof6.local', 'PASSWORD_HASH_ASTRID', 'Astrid', 'stakeholder_viewer'),
    ('kiki@vredehof6.local', 'PASSWORD_HASH_KIKI', 'Kiki', 'stakeholder_viewer')
ON CONFLICT (email) DO UPDATE
SET
    password_hash = EXCLUDED.password_hash,
    display_name = EXCLUDED.display_name,
    role_code = EXCLUDED.role_code,
    updated_at = NOW();
