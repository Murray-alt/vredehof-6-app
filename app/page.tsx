import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatMonthLabel } from "@/lib/format";
import { getDashboardSummary, getExpenseBreakdown, getMonthlySummaries, getOwnerSettlements, getProperty, getSourceSummary } from "@/lib/queries";

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
  const [summary, monthly, expenseBreakdown, sourceSummary, ownerSettlements] = await Promise.all([
    getDashboardSummary(property.id, stakeholdersOnly),
    getMonthlySummaries(property.id, stakeholdersOnly),
    getExpenseBreakdown(property.id, stakeholdersOnly),
    stakeholdersOnly ? Promise.resolve([]) : getSourceSummary(property.id),
    getOwnerSettlements(property.id)
  ]);
  const latestMonth = monthly[0];
  const importedSummary = sourceSummary.find((row) => row.source === "imported");
  const manualSummary = sourceSummary.find((row) => row.source === "manual");

  return (
    <main className="grid" style={{ marginTop: 18 }}>
      <section className="hero hero-dashboard">
        <div className="hero-grid">
          <div className="grid" style={{ gap: 20 }}>
            <div>
              <p className="eyebrow">Live snapshot</p>
              <h2 className="hero-title">{property.name}</h2>
              <p className="muted hero-copy">
                {property.stakeholder_summary ?? "Shared rental overview for Murray, Astrid, and Kiki."}
              </p>
            </div>

            <div className="stat-strip">
              <div className="metric metric-featured">
                <span className="metric-label">Current running balance</span>
                <strong>{formatCurrency(summary.current_balance)}</strong>
                <span className="metric-detail">Updated from every visible ledger movement</span>
              </div>
              <div className="metric">
                <span className="metric-label">Shared income</span>
                <strong>{formatCurrency(summary.year_income_total)}</strong>
                <span className="metric-detail">Income available for owner sharing, excluding tenant deposits</span>
              </div>
              <div className="metric">
                <span className="metric-label">Shared expenses</span>
                <strong>{formatCurrency(summary.year_expense_total)}</strong>
                <span className="metric-detail">Levies, repairs, utilities, and shared costs</span>
              </div>
              <div className="metric">
                <span className="metric-label">Distributable profit</span>
                <strong>{formatCurrency(summary.year_net_total)}</strong>
                <span className="metric-detail">The year-to-date pool that is split 50/50 between Astrid and Kiki</span>
              </div>
            </div>
          </div>

          <aside className="hero-aside panel">
            <div className="eyebrow">Quick actions</div>
            <div className="grid" style={{ gap: 10 }}>
              <Link href="/ledger" className="nav-link">Open full ledger</Link>
              <Link href="/reports" className="nav-link secondary">Open reports</Link>
              {user.role_code === "owner_admin" ? (
                <Link href="/imports" className="nav-link ghost">Review imports</Link>
              ) : null}
            </div>

            <div className="divider" />

            <div className="mini-grid">
              <div>
                <span className="muted">Tenant funds held</span>
                <strong className="mini-metric">{formatCurrency(summary.tenant_funds_balance)}</strong>
              </div>
              <div>
                <span className="muted">Owner withdrawals this year</span>
                <strong className="mini-metric">{formatCurrency(summary.owner_draw_total)}</strong>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="insight-grid">
        <article className="panel panel-spotlight">
          <div className="topbar">
            <div>
              <p className="eyebrow">Monthly movement</p>
              <h2 className="section-title">What changed this month</h2>
            </div>
            {latestMonth ? <span className="pill">{formatMonthLabel(latestMonth.month_key)}</span> : null}
          </div>

          {latestMonth ? (
            <div className="stat-strip compact">
              <div className="metric">
                <span className="metric-label">Income recorded</span>
                <strong>{formatCurrency(latestMonth.income_total)}</strong>
                <span className="metric-detail">Money received this month</span>
              </div>
              <div className="metric">
                <span className="metric-label">Expenses recorded</span>
                <strong>{formatCurrency(latestMonth.expense_total)}</strong>
                <span className="metric-detail">Outflows captured in the ledger</span>
              </div>
              <div className="metric">
                <span className="metric-label">Net movement</span>
                <strong>{formatCurrency(latestMonth.net_total)}</strong>
                <span className="metric-detail">Balance effect after income and expenses</span>
              </div>
            </div>
          ) : (
            <p className="muted">No ledger activity has been recorded yet.</p>
          )}
        </article>

        <article className="panel">
          <p className="eyebrow">Reading guide</p>
          <h2 className="section-title">How to interpret the numbers</h2>
          <ul className="notes-list muted">
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
            <p className="eyebrow">Year-end split</p>
            <h2 className="section-title">Astrid and Kiki settlement</h2>
            <div className="table-wrap table-glow">
              <table>
                <thead>
                  <tr>
                    <th>Owner</th>
                    <th>Gross 50% share</th>
                    <th>Personal withdrawals/expenses</th>
                    <th>Settlement due</th>
                  </tr>
                </thead>
                <tbody>
                  {ownerSettlements.map((owner) => (
                    <tr key={owner.owner_id}>
                      <td>{owner.owner_name}</td>
                      <td>{formatCurrency(owner.gross_share)}</td>
                      <td>{formatCurrency(owner.owner_draw_total)}</td>
                      <td>{formatCurrency(owner.settlement_due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel">
            <p className="eyebrow">Data source</p>
            <h2 className="section-title">Imported history</h2>
            <div className="stat-strip compact">
              <div className="metric">
                <span className="metric-label">Imported ledger rows</span>
                <strong>{importedSummary?.entry_count ?? 0}</strong>
                <span className="metric-detail">Historical lines currently kept in the app</span>
              </div>
              <div className="metric">
                <span className="metric-label">Imported row total</span>
                <strong>{formatCurrency(importedSummary?.total_amount ?? 0)}</strong>
                <span className="metric-detail">Combined amount value of imported lines</span>
              </div>
              <div className="metric">
                <span className="metric-label">Latest imported date</span>
                <strong>{importedSummary?.latest_entry_date ?? "None"}</strong>
                <span className="metric-detail">Most recent date among imported entries</span>
              </div>
            </div>
          </article>

          <article className="panel">
            <p className="eyebrow">Manual work</p>
            <h2 className="section-title">Manual updates</h2>
            <div className="stat-strip compact">
              <div className="metric">
                <span className="metric-label">Manual ledger rows</span>
                <strong>{manualSummary?.entry_count ?? 0}</strong>
                <span className="metric-detail">Entries captured directly in the app</span>
              </div>
              <div className="metric">
                <span className="metric-label">Manual row total</span>
                <strong>{formatCurrency(manualSummary?.total_amount ?? 0)}</strong>
                <span className="metric-detail">Combined value of manual entries</span>
              </div>
              <div className="metric">
                <span className="metric-label">Latest manual date</span>
                <strong>{manualSummary?.latest_entry_date ?? "None"}</strong>
                <span className="metric-detail">Most recent date captured manually</span>
              </div>
            </div>
          </article>
        </section>
      ) : null}

      <section className="panel">
        <div className="topbar">
          <div>
            <p className="eyebrow">Expense concentration</p>
            <h2 className="section-title">Expense mix</h2>
            <p className="muted" style={{ margin: 0 }}>
              Quick view of where outflows are currently concentrated.
            </p>
          </div>
          <span className="pill">{summary.visible_entry_count} visible ledger entries</span>
        </div>

        <div className="table-wrap table-glow">
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
