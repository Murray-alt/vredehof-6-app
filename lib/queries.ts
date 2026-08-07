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

export type LedgerEntryRow = {
  id: number;
  entry_date: string;
  entry_type: "income" | "expense" | "adjustment" | "opening_balance";
  description: string;
  notes: string | null;
  amount: string;
  balance_effect: string;
  source: "manual" | "imported";
  source_reference: string | null;
  is_visible_to_stakeholders: boolean;
  category_name: string | null;
  category_id: number | null;
  running_balance: string;
};

export type DashboardSummary = {
  current_balance: string;
  year_income_total: string;
  year_expense_total: string;
  year_net_total: string;
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

type LedgerFilters = {
  year?: string;
  month?: string;
  entryType?: string;
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
        le.description,
        le.notes,
        le.amount::text,
        le.balance_effect::text,
        le.source,
        le.source_reference,
        le.is_visible_to_stakeholders,
        c.name AS category_name,
        le.category_id,
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

export async function getLedgerEntryById(propertyId: number, entryId: number): Promise<LedgerEntryRow | null> {
  const rows = await sql<LedgerEntryRow>(
    `SELECT
        le.id,
        le.entry_date,
        le.entry_type,
        le.description,
        le.notes,
        le.amount::text,
        le.balance_effect::text,
        le.source,
        le.source_reference,
        le.is_visible_to_stakeholders,
        c.name AS category_name,
        le.category_id,
        SUM(le.balance_effect) OVER (
          PARTITION BY le.property_id
          ORDER BY le.entry_date ASC, le.id ASC
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        )::text AS running_balance
     FROM ledger_entries le
     LEFT JOIN categories c ON c.id = le.category_id
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
            WHEN entry_type = 'income' AND DATE_PART('year', entry_date) = DATE_PART('year', CURRENT_DATE)
            THEN amount ELSE 0 END), 0)::text AS year_income_total,
        COALESCE(SUM(CASE
            WHEN entry_type = 'expense' AND DATE_PART('year', entry_date) = DATE_PART('year', CURRENT_DATE)
            THEN amount ELSE 0 END), 0)::text AS year_expense_total,
        COALESCE(SUM(CASE
            WHEN DATE_PART('year', entry_date) = DATE_PART('year', CURRENT_DATE)
            THEN balance_effect ELSE 0 END), 0)::text AS year_net_total,
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
    visible_entry_count: 0,
    latest_entry_date: null
  };
}

export async function getMonthlySummaries(propertyId: number, stakeholdersOnly: boolean): Promise<MonthlySummaryRow[]> {
  const visibilityClause = stakeholdersOnly ? "AND le.is_visible_to_stakeholders = TRUE" : "";

  return sql<MonthlySummaryRow>(
    `SELECT
        TO_CHAR(le.entry_date, 'YYYY-MM') AS month_key,
        COALESCE(SUM(CASE WHEN le.entry_type = 'income' THEN le.amount ELSE 0 END), 0)::text AS income_total,
        COALESCE(SUM(CASE WHEN le.entry_type = 'expense' THEN le.amount ELSE 0 END), 0)::text AS expense_total,
        COALESCE(SUM(le.balance_effect), 0)::text AS net_total
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
       ${visibilityClause}
     GROUP BY COALESCE(c.name, 'Uncategorised')
     ORDER BY SUM(le.amount) DESC, category_name ASC`,
    [propertyId]
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
