import { requireUser } from "@/lib/auth";
import { formatCurrency, formatMonthLabel } from "@/lib/format";
import { getDashboardSummary, getExpenseBreakdown, getMonthlySummaries, getOwnerSettlements, getProperty } from "@/lib/queries";

export default async function ReportsPage() {
  const user = await requireUser();
  const property = await getProperty();

  if (!property) {
    return null;
  }

  const stakeholdersOnly = user.role_code === "stakeholder_viewer";
  const [monthly, expenses, summary, ownerSettlements] = await Promise.all([
    getMonthlySummaries(property.id, stakeholdersOnly),
    getExpenseBreakdown(property.id, stakeholdersOnly),
    getDashboardSummary(property.id, stakeholdersOnly),
    getOwnerSettlements(property.id)
  ]);

  return (
    <main className="grid" style={{ marginTop: 18 }}>
      <section className="hero">
        <p className="eyebrow">Reporting</p>
        <h2 className="section-title">Monthly and yearly reports</h2>
        <p className="muted" style={{ margin: 0 }}>
          These summaries sit on top of the same ledger, so stakeholders can trace totals back to underlying entries.
        </p>
      </section>

      <section className="grid cards">
        <article className="panel">
          <p className="eyebrow">Settlement</p>
          <h2 className="section-title">Owner split summary</h2>
          <div className="table-wrap table-glow">
            <table>
              <thead>
                <tr>
                  <th>Owner</th>
                  <th>Gross share</th>
                  <th>Owner withdrawals</th>
                  <th>Amount due</th>
                </tr>
              </thead>
              <tbody>
                {ownerSettlements.map((owner) => (
                  <tr key={owner.owner_id}>
                    <td data-label="Owner">{owner.owner_name}</td>
                    <td data-label="Gross share">{formatCurrency(owner.gross_share)}</td>
                    <td data-label="Owner withdrawals">{formatCurrency(owner.owner_draw_total)}</td>
                    <td data-label="Amount due">{formatCurrency(owner.settlement_due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Protected funds</p>
          <h2 className="section-title">Tenant deposit balance</h2>
          <div className="metric metric-featured">
            <span className="metric-label">Excluded from owner income</span>
            <strong>{formatCurrency(summary.tenant_funds_balance)}</strong>
            <span className="metric-detail">Deposits stay in the account balance, but never count toward Astrid and Kiki&apos;s shared income.</span>
          </div>
        </article>
      </section>

      <section className="grid cards">
        <article className="panel">
          <p className="eyebrow">Trend view</p>
          <h2 className="section-title">Monthly summary</h2>
          <div className="table-wrap table-glow">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Income</th>
                  <th>Expenses</th>
                  <th>Net movement</th>
                </tr>
              </thead>
              <tbody>
                {monthly.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No monthly data is available yet.</td>
                  </tr>
                ) : (
                  monthly.map((row) => (
                    <tr key={row.month_key}>
                      <td data-label="Month">{formatMonthLabel(row.month_key)}</td>
                      <td data-label="Income">{formatCurrency(row.income_total)}</td>
                      <td data-label="Expenses">{formatCurrency(row.expense_total)}</td>
                      <td data-label="Net movement">{formatCurrency(row.net_total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Breakdown</p>
          <h2 className="section-title">Expense categories</h2>
          <div className="table-wrap table-glow">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={2}>No expense data is available yet.</td>
                  </tr>
                ) : (
                  expenses.map((row) => (
                    <tr key={row.category_name}>
                      <td data-label="Category">{row.category_name}</td>
                      <td data-label="Total">{formatCurrency(row.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}
