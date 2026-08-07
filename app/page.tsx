import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatMonthLabel } from "@/lib/format";
import { getDashboardSummary, getExpenseBreakdown, getMonthlySummaries, getProperty, getSourceSummary } from "@/lib/queries";

export default async function DashboardPage() {
  const user = await requireUser();
  const property = await getProperty();

  if (!property) {
    return (
      <main className="grid" style={{ marginTop: 18 }}>
        <section className="hero">
          <h1 style={{ margin: 0 }}>Property not configured</h1>
          <p className="muted">Create the Vredehof 6 property record in the database before using the app.</p>
        </section>
      </main>
    );
  }

  const stakeholdersOnly = user.role_code === "stakeholder_viewer";
  const summary = await getDashboardSummary(property.id, stakeholdersOnly);
  const monthly = await getMonthlySummaries(property.id, stakeholdersOnly);
  const expenseBreakdown = await getExpenseBreakdown(property.id, stakeholdersOnly);
  const sourceSummary = stakeholdersOnly ? [] : await getSourceSummary(property.id);
  const latestMonth = monthly[0];
  const importedSummary = sourceSummary.find((row) => row.source === "imported");
  const manualSummary = sourceSummary.find((row) => row.source === "manual");

  return (
    <main className="grid" style={{ marginTop: 18 }}>
      <section className="hero">
        <div className="topbar">
          <div>
            <h1 style={{ margin: "0 0 8px" }}>{property.name}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {property.stakeholder_summary ?? "Shared rental overview for Murray, Astrid, and Kiki."}
            </p>
          </div>
          <div className="nav-links">
            <Link href="/ledger" className="nav-link">Open full ledger</Link>
            <Link href="/reports" className="nav-link secondary">Open reports</Link>
            {user.role_code === "owner_admin" ? (
              <Link href="/imports" className="nav-link ghost">Review imports</Link>
            ) : null}
          </div>
        </div>

        <div className="grid cards">
          <div className="metric">
            <strong>{formatCurrency(summary.current_balance)}</strong>
            <span>Current running balance</span>
          </div>
          <div className="metric">
            <strong>{formatCurrency(summary.year_income_total)}</strong>
            <span>Year-to-date income</span>
          </div>
          <div className="metric">
            <strong>{formatCurrency(summary.year_expense_total)}</strong>
            <span>Year-to-date expenses</span>
          </div>
          <div className="metric">
            <strong>{formatCurrency(summary.year_net_total)}</strong>
            <span>Year-to-date net movement</span>
          </div>
        </div>
      </section>

      <section className="grid cards">
        <article className="panel">
          <h2 style={{ marginTop: 0 }}>What changed this month</h2>
          {latestMonth ? (
            <>
              <p className="muted">{formatMonthLabel(latestMonth.month_key)}</p>
              <div className="grid cards">
                <div className="metric">
                  <strong>{formatCurrency(latestMonth.income_total)}</strong>
                  <span>Income recorded</span>
                </div>
                <div className="metric">
                  <strong>{formatCurrency(latestMonth.expense_total)}</strong>
                  <span>Expenses recorded</span>
                </div>
                <div className="metric">
                  <strong>{formatCurrency(latestMonth.net_total)}</strong>
                  <span>Net movement</span>
                </div>
              </div>
            </>
          ) : (
            <p className="muted">No ledger activity has been recorded yet.</p>
          )}
        </article>

        <article className="panel">
          <h2 style={{ marginTop: 0 }}>Overview notes</h2>
          <ul className="muted" style={{ margin: 0, paddingLeft: 20 }}>
            <li>The running balance is the total of all visible ledger movements.</li>
            <li>Income raises the balance. Expenses reduce it.</li>
            <li>Owner-only hidden entries are excluded for stakeholder viewers.</li>
            <li>The full ledger shows each underlying line item in date order.</li>
          </ul>
        </article>
      </section>

      {user.role_code === "owner_admin" ? (
        <section className="grid cards">
          <article className="panel">
            <h2 style={{ marginTop: 0 }}>Imported history</h2>
            <div className="grid cards">
              <div className="metric">
                <strong>{importedSummary?.entry_count ?? 0}</strong>
                <span>Imported ledger rows</span>
              </div>
              <div className="metric">
                <strong>{formatCurrency(importedSummary?.total_amount ?? 0)}</strong>
                <span>Imported row total</span>
              </div>
              <div className="metric">
                <strong>{importedSummary?.latest_entry_date ?? "None"}</strong>
                <span>Latest imported date</span>
              </div>
            </div>
          </article>

          <article className="panel">
            <h2 style={{ marginTop: 0 }}>Manual updates</h2>
            <div className="grid cards">
              <div className="metric">
                <strong>{manualSummary?.entry_count ?? 0}</strong>
                <span>Manual ledger rows</span>
              </div>
              <div className="metric">
                <strong>{formatCurrency(manualSummary?.total_amount ?? 0)}</strong>
                <span>Manual row total</span>
              </div>
              <div className="metric">
                <strong>{manualSummary?.latest_entry_date ?? "None"}</strong>
                <span>Latest manual date</span>
              </div>
            </div>
          </article>
        </section>
      ) : null}

      <section className="panel">
        <div className="topbar">
          <div>
            <h2 style={{ margin: "0 0 8px" }}>Expense mix</h2>
            <p className="muted" style={{ margin: 0 }}>
              Quick view of where outflows are currently concentrated.
            </p>
          </div>
          <span className="pill">{summary.visible_entry_count} visible ledger entries</span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Total expenses</th>
              </tr>
            </thead>
            <tbody>
              {expenseBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={2}>No expenses have been recorded yet.</td>
                </tr>
              ) : (
                expenseBreakdown.map((row) => (
                  <tr key={row.category_name}>
                    <td>{row.category_name}</td>
                    <td>{formatCurrency(row.total)}</td>
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
