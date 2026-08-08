import { requireOwner } from "@/lib/auth";
import { formatCurrency, formatMonthLabel } from "@/lib/format";
import { getImportedEntries, getProperty, getSourceSummary } from "@/lib/queries";

export default async function ImportsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOwner();
  const property = await getProperty();
  const search = await searchParams;

  if (!property) {
    return null;
  }

  const filters = {
    month: typeof search.month === "string" ? search.month : undefined,
    entryType: typeof search.entry_type === "string" ? search.entry_type : undefined,
    search: typeof search.search === "string" ? search.search : undefined
  };

  const [summaryRows, importedEntries] = await Promise.all([
    getSourceSummary(property.id),
    getImportedEntries(property.id, filters)
  ]);

  const importedSummary = summaryRows.find((row) => row.source === "imported");

  return (
    <main className="grid" style={{ marginTop: 18 }}>
      <section className="hero">
        <p className="eyebrow">Import audit</p>
        <h2 className="section-title">Import review</h2>
        <p className="muted" style={{ margin: 0 }}>
          Review everything loaded from the workbook, including its source reference, category, visibility, and running balance effect.
        </p>
      </section>

      <section className="grid cards">
        <article className="panel">
          <p className="eyebrow">Overview</p>
          <h2 className="section-title">Imported overview</h2>
          <div className="grid cards">
            <div className="metric">
              <strong>{importedSummary?.entry_count ?? 0}</strong>
              <span>Imported rows</span>
            </div>
            <div className="metric">
              <strong>{formatCurrency(importedSummary?.total_amount ?? 0)}</strong>
              <span>Imported amount total</span>
            </div>
            <div className="metric">
              <strong>{importedSummary?.latest_entry_date ?? "None"}</strong>
              <span>Latest imported date</span>
            </div>
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Review tools</p>
          <h2 className="section-title">Filter imported rows</h2>
          <form method="get" className="form-grid">
            <label>
              Month
              <input type="month" name="month" defaultValue={filters.month ?? ""} />
            </label>
            <label>
              Entry type
              <select name="entry_type" defaultValue={filters.entryType ?? ""}>
                <option value="">All types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="adjustment">Adjustment</option>
                <option value="opening_balance">Opening balance</option>
              </select>
            </label>
            <label>
              Search
              <input type="search" name="search" defaultValue={filters.search ?? ""} placeholder="Description or Sheet reference" />
            </label>
            <div style={{ alignSelf: "end" }}>
              <button type="submit">Apply filters</button>
            </div>
          </form>
        </article>
      </section>

      <section className="panel">
        <div className="topbar">
          <div>
            <p className="eyebrow">Traceability</p>
            <h2 className="section-title">Imported ledger rows</h2>
            <p className="muted" style={{ margin: 0 }}>
              Use the source reference to trace an entry back to the original workbook cell or row.
            </p>
          </div>
          {filters.month ? <span className="pill">{formatMonthLabel(filters.month)}</span> : null}
        </div>

        <div className="table-wrap table-glow">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Balance effect</th>
                <th>Running balance</th>
                <th>Workbook source</th>
                <th>Visibility</th>
              </tr>
            </thead>
            <tbody>
              {importedEntries.length === 0 ? (
                <tr>
                  <td colSpan={9}>No imported rows match the current filters.</td>
                </tr>
              ) : (
                importedEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.entry_date}</td>
                    <td>{entry.entry_type.replace("_", " ")}</td>
                    <td>{entry.description}</td>
                    <td>{entry.category_name ?? "Uncategorised"}</td>
                    <td>{formatCurrency(entry.amount)}</td>
                    <td>{formatCurrency(entry.balance_effect)}</td>
                    <td>{formatCurrency(entry.running_balance)}</td>
                    <td><code>{entry.source_reference ?? "No reference"}</code></td>
                    <td>
                      <span className={`pill ${entry.is_visible_to_stakeholders ? "" : "hidden"}`}>
                        {entry.is_visible_to_stakeholders ? "Visible" : "Owner only"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
