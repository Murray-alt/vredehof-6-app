import { sql } from "@/lib/db";

export type PropertyRow = {
  id: number;
  name: string;
  slug: string;
  stakeholder_summary: string | null;
};

export type CategoryRow = {
  id: number;
  name: string;
  category_type: "income" | "expense" | "adjustment" | "opening_balance";
  sort_order: number;
  is_active?: boolean;
};

export type CategoryManagementRow = {
  id: number;
  name: string;
  category_type: "income" | "expense" | "adjustment" | "opening_balance";
  sort_order: number;
  is_active: boolean;
  entry_count: number;
  total_amount: string;
};

export type OwnerRow = {
  id: number;
  display_name: string;
  ownership_share: string;
  is_active: boolean;
};

export type LedgerEntryRow = {
  id: number;
  entry_date: string;
  entry_type: "income" | "expense" | "adjustment" | "opening_balance";
  entry_scope:
    | "shared_property"
    | "owner_withdrawal"
    | "owner_expense"
    | "tenant_deposit"
    | "owner_distribution";
  description: string;
  notes: string | null;
  amount: string;
  balance_effect: string;
  source: "manual" | "imported";
  source_reference: string | null;
  is_visible_to_stakeholders: boolean;
  category_name: string | null;
  category_id: number | null;
  owner_id: number | null;
  owner_name: string | null;
  running_balance: string;
};

export type DashboardSummary = {
  current_balance: string;
  year_income_total: string;
  year_expense_total: string;
  year_net_total: string;
  tenant_funds_balance: string;
  owner_draw_total: string;
  visible_entry_count: number;
  latest_entry_date: string | null;
};

export type MonthlySummaryRow = {
  month_key: string;
  income_total: string;
  expense_total: string;
  net_total: string;
};

export type SourceSummaryRow = {
  source: "manual" | "imported";
  entry_count: number;
  total_amount: string;
  latest_entry_date: string | null;
};

export type OwnerSettlementRow = {
  owner_id: number;
  owner_name: string;
  ownership_share: string;
  distributable_profit: string;
  gross_share: string;
  owner_draw_total: string;
  settlement_due: string;
};

export type ImportReviewRow = {
  id: number;
  entry_date: string;
  entry_type: "income" | "expense" | "adjustment" | "opening_balance";
  description: string;
  amount: string;
  balance_effect: string;
  category_name: string | null;
  source_reference: string | null;
  is_visible_to_stakeholders: boolean;
  running_balance: string;
};

export async function getProperty(): Promise<PropertyRow | null> {
  const rows = await sql<PropertyRow>(
    `SELECT id, name, slug, stakeholder_summary
     FROM properties
     WHERE slug = 'vredehof-6' AND is_active = TRUE
     LIMIT 1`
  );

  return rows[0] ?? null;
}

export async function getCategories(propertyId: number): Promise<CategoryRow[]> {
  return sql<CategoryRow>(
    `SELECT id, name, category_type, sort_order, is_active
     FROM categories
     WHERE property_id = $1 AND is_active = TRUE
     ORDER BY sort_order ASC, name ASC`,
    [propertyId]
  );
}

export async function getAllCategories(propertyId: number): Promise<CategoryManagementRow[]> {
  return sql<CategoryManagementRow>(
    `SELECT
        c.id,
        c.name,
        c.category_type,
        c.sort_order,
        c.is_active,
        COUNT(le.id)::int AS entry_count,
        COALESCE(SUM(le.amount), 0)::text AS total_amount
     FROM categories c
     LEFT JOIN ledger_entries le
       ON le.category_id = c.id
      AND le.is_archived = FALSE
     WHERE c.property_id = $1
     GROUP BY c.id, c.name, c.category_type, c.sort_order, c.is_active
     ORDER BY c.sort_order ASC, c.name ASC`,
    [propertyId]
  );
}

export async function getOwners(propertyId: number): Promise<OwnerRow[]> {
  return sql<OwnerRow>(
    `SELECT id, display_name, ownership_share::text, is_active
     FROM owners
     WHERE property_id = $1
       AND is_active = TRUE
     ORDER BY display_name ASC`,
    [propertyId]
  );
}

type LedgerFilters = {
  year?: string;
  month?: string;
  entryType?: string;
  entryScope?: string;
  ownerId?: string;
  search?: string;
  stakeholdersOnly?: boolean;
};

export async function getLedgerEntries(propertyId: number, filters: LedgerFilters = {}): Promise<LedgerEntryRow[]> {
  const clauses = ["le.property_id = $1", "le.is_archived = FALSE"];
  const values: unknown[] = [propertyId];

  if (filters.year) {
    values.push(filters.year);
    clauses.push(`EXTRACT(YEAR FROM le.entry_date) = $${values.length}`);
  }

  if (filters.month) {
    values.push(filters.month);
    clauses.push(`TO_CHAR(le.entry_date, 'YYYY-MM') = $${values.length}`);
  }

  if (filters.entryType) {
    values.push(filters.entryType);
    clauses.push(`le.entry_type = $${values.length}`);
  }

  if (filters.entryScope) {
    values.push(filters.entryScope);
    clauses.push(`le.entry_scope = $${values.length}`);
  }

  if (filters.ownerId) {
    values.push(filters.ownerId);
    clauses.push(`le.owner_id = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search.toLowerCase()}%`);
    clauses.push(`(LOWER(le.description) LIKE $${values.length} OR LOWER(COALESCE(le.notes, '')) LIKE $${values.length})`);
  }

  if (filters.stakeholdersOnly) {
    clauses.push("le.is_visible_to_stakeholders = TRUE");
  }

  return sql<LedgerEntryRow>(
    `SELECT
        le.id,
        le.entry_date,
        le.entry_type,
        le.entry_scope,
        le.description,
        le.notes,
        le.amount::text,
        le.balance_effect::text,
        le.source,
        le.source_reference,
        le.is_visible_to_stakeholders,
        c.name AS category_name,
        le.category_id,
        le.owner_id,
        o.display_name AS owner_name,
        SUM(le.balance_effect) OVER (
          PARTITION BY le.property_id
          ORDER BY le.entry_date ASC, le.id ASC
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        )::text AS running_balance
     FROM ledger_entries le
     LEFT JOIN categories c ON c.id = le.category_id
     LEFT JOIN owners o ON o.id = le.owner_id
     WHERE ${clauses.join(" AND ")}
     ORDER BY le.entry_date DESC, le.id DESC`,
    values
  );
}

export async function getLedgerEntryById(propertyId: number, entryId: number): Promise<LedgerEntryRow | null> {
  const rows = await sql<LedgerEntryRow>(
    `SELECT
        le.id,
        le.entry_date,
        le.entry_type,
        le.entry_scope,
        le.description,
        le.notes,
        le.amount::text,
        le.balance_effect::text,
        le.source,
        le.source_reference,
        le.is_visible_to_stakeholders,
        c.name AS category_name,
        le.category_id,
        le.owner_id,
        o.display_name AS owner_name,
        SUM(le.balance_effect) OVER (
          PARTITION BY le.property_id
          ORDER BY le.entry_date ASC, le.id ASC
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        )::text AS running_balance
     FROM ledger_entries le
     LEFT JOIN categories c ON c.id = le.category_id
     LEFT JOIN owners o ON o.id = le.owner_id
     WHERE le.property_id = $1
       AND le.id = $2
       AND le.is_archived = FALSE
     LIMIT 1`,
    [propertyId, entryId]
  );

  return rows[0] ?? null;
}

export async function getDashboardSummary(propertyId: number, stakeholdersOnly: boolean): Promise<DashboardSummary> {
  const visibilityClause = stakeholdersOnly ? "AND is_visible_to_stakeholders = TRUE" : "";
  const rows = await sql<DashboardSummary>(
    `SELECT
        COALESCE(SUM(balance_effect), 0)::text AS current_balance,
        COALESCE(SUM(CASE
            WHEN entry_type = 'income'
             AND entry_scope = 'shared_property'
             AND DATE_PART('year', entry_date) = DATE_PART('year', CURRENT_DATE)
            THEN amount ELSE 0 END), 0)::text AS year_income_total,
        COALESCE(SUM(CASE
            WHEN entry_type = 'expense'
             AND entry_scope = 'shared_property'
             AND DATE_PART('year', entry_date) = DATE_PART('year', CURRENT_DATE)
            THEN amount ELSE 0 END), 0)::text AS year_expense_total,
        COALESCE(SUM(CASE
            WHEN entry_scope = 'shared_property'
             AND entry_type <> 'opening_balance'
             AND DATE_PART('year', entry_date) = DATE_PART('year', CURRENT_DATE)
            THEN balance_effect ELSE 0 END), 0)::text AS year_net_total,
        COALESCE(SUM(CASE
            WHEN entry_scope = 'tenant_deposit'
            THEN balance_effect ELSE 0 END), 0)::text AS tenant_funds_balance,
        COALESCE(SUM(CASE
            WHEN entry_scope IN ('owner_withdrawal', 'owner_expense', 'owner_distribution')
             AND DATE_PART('year', entry_date) = DATE_PART('year', CURRENT_DATE)
            THEN amount ELSE 0 END), 0)::text AS owner_draw_total,
        COUNT(*)::int AS visible_entry_count,
        MAX(entry_date)::text AS latest_entry_date
     FROM ledger_entries
     WHERE property_id = $1
       AND is_archived = FALSE
       ${visibilityClause}`,
    [propertyId]
  );

  return rows[0] ?? {
    current_balance: "0",
    year_income_total: "0",
    year_expense_total: "0",
    year_net_total: "0",
    tenant_funds_balance: "0",
    owner_draw_total: "0",
    visible_entry_count: 0,
    latest_entry_date: null
  };
}

export async function getMonthlySummaries(propertyId: number, stakeholdersOnly: boolean): Promise<MonthlySummaryRow[]> {
  const visibilityClause = stakeholdersOnly ? "AND le.is_visible_to_stakeholders = TRUE" : "";

  return sql<MonthlySummaryRow>(
    `SELECT
        TO_CHAR(le.entry_date, 'YYYY-MM') AS month_key,
        COALESCE(SUM(CASE WHEN le.entry_type = 'income' AND le.entry_scope = 'shared_property' THEN le.amount ELSE 0 END), 0)::text AS income_total,
        COALESCE(SUM(CASE WHEN le.entry_type = 'expense' AND le.entry_scope = 'shared_property' THEN le.amount ELSE 0 END), 0)::text AS expense_total,
        COALESCE(SUM(CASE
            WHEN le.entry_scope = 'shared_property' AND le.entry_type <> 'opening_balance'
            THEN le.balance_effect ELSE 0 END), 0)::text AS net_total
     FROM ledger_entries le
     WHERE le.property_id = $1
       AND le.is_archived = FALSE
       ${visibilityClause}
     GROUP BY TO_CHAR(le.entry_date, 'YYYY-MM')
     ORDER BY month_key DESC`,
    [propertyId]
  );
}

export async function getExpenseBreakdown(propertyId: number, stakeholdersOnly: boolean): Promise<Array<{ category_name: string; total: string }>> {
  const visibilityClause = stakeholdersOnly ? "AND le.is_visible_to_stakeholders = TRUE" : "";

  return sql<Array<{ category_name: string; total: string }>[number]>(
    `SELECT
       COALESCE(c.name, 'Uncategorised') AS category_name,
        COALESCE(SUM(le.amount), 0)::text AS total
     FROM ledger_entries le
     LEFT JOIN categories c ON c.id = le.category_id
     WHERE le.property_id = $1
       AND le.is_archived = FALSE
       AND le.entry_type = 'expense'
       AND le.entry_scope = 'shared_property'
       ${visibilityClause}
     GROUP BY COALESCE(c.name, 'Uncategorised')
     ORDER BY SUM(le.amount) DESC, category_name ASC`,
    [propertyId]
  );
}

export async function getOwnerSettlements(
  propertyId: number,
  year: number = new Date().getFullYear()
): Promise<OwnerSettlementRow[]> {
  return sql<OwnerSettlementRow>(
    `WITH distributable AS (
       SELECT
         COALESCE(SUM(CASE
           WHEN le.entry_scope = 'shared_property'
            AND le.entry_type <> 'opening_balance'
            AND EXTRACT(YEAR FROM le.entry_date) = $2
           THEN le.balance_effect ELSE 0 END), 0) AS distributable_profit
       FROM ledger_entries le
       WHERE le.property_id = $1
         AND le.is_archived = FALSE
     ),
     owner_count AS (
       SELECT COUNT(*)::numeric AS count_active
       FROM owners
       WHERE property_id = $1
         AND is_active = TRUE
     ),
     owner_draws AS (
       SELECT
         le.owner_id,
         COALESCE(SUM(le.amount), 0) AS owner_draw_total
       FROM ledger_entries le
       WHERE le.property_id = $1
         AND le.is_archived = FALSE
         AND le.entry_scope IN ('owner_withdrawal', 'owner_expense', 'owner_distribution')
         AND EXTRACT(YEAR FROM le.entry_date) = $2
         AND le.owner_id IS NOT NULL
       GROUP BY le.owner_id
     )
     SELECT
       o.id AS owner_id,
       o.display_name AS owner_name,
       o.ownership_share::text,
       d.distributable_profit::text,
       CASE
         WHEN oc.count_active = 0 THEN 0::text
         ELSE ROUND((d.distributable_profit * o.ownership_share), 2)::text
       END AS gross_share,
       COALESCE(od.owner_draw_total, 0)::text AS owner_draw_total,
       ROUND((d.distributable_profit * o.ownership_share) - COALESCE(od.owner_draw_total, 0), 2)::text AS settlement_due
     FROM owners o
     CROSS JOIN distributable d
     CROSS JOIN owner_count oc
     LEFT JOIN owner_draws od ON od.owner_id = o.id
     WHERE o.property_id = $1
       AND o.is_active = TRUE
     ORDER BY o.display_name ASC`,
    [propertyId, year]
  );
}

export async function getSourceSummary(propertyId: number): Promise<SourceSummaryRow[]> {
  return sql<SourceSummaryRow>(
    `SELECT
        le.source,
        COUNT(*)::int AS entry_count,
        COALESCE(SUM(le.amount), 0)::text AS total_amount,
        MAX(le.entry_date)::text AS latest_entry_date
     FROM ledger_entries le
     WHERE le.property_id = $1
       AND le.is_archived = FALSE
     GROUP BY le.source
     ORDER BY le.source ASC`,
    [propertyId]
  );
}

type ImportReviewFilters = {
  month?: string;
  entryType?: string;
  search?: string;
};

export async function getImportedEntries(propertyId: number, filters: ImportReviewFilters = {}): Promise<ImportReviewRow[]> {
  const clauses = [
    "le.property_id = $1",
    "le.is_archived = FALSE",
    "le.source = 'imported'"
  ];
  const values: unknown[] = [propertyId];

  if (filters.month) {
    values.push(filters.month);
    clauses.push(`TO_CHAR(le.entry_date, 'YYYY-MM') = $${values.length}`);
  }

  if (filters.entryType) {
    values.push(filters.entryType);
    clauses.push(`le.entry_type = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search.toLowerCase()}%`);
    clauses.push(
      `(LOWER(le.description) LIKE $${values.length} OR LOWER(COALESCE(le.source_reference, '')) LIKE $${values.length})`
    );
  }

  return sql<ImportReviewRow>(
    `SELECT
        le.id,
        le.entry_date,
        le.entry_type,
        le.description,
        le.amount::text,
        le.balance_effect::text,
        c.name AS category_name,
        le.source_reference,
        le.is_visible_to_stakeholders,
        SUM(le.balance_effect) OVER (
          PARTITION BY le.property_id
          ORDER BY le.entry_date ASC, le.id ASC
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        )::text AS running_balance
     FROM ledger_entries le
     LEFT JOIN categories c ON c.id = le.category_id
     WHERE ${clauses.join(" AND ")}
     ORDER BY le.entry_date DESC, le.id DESC`,
    values
  );
}
