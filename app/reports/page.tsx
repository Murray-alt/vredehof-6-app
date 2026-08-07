import { requireUser } from "@/lib/auth";
import { formatCurrency, formatMonthLabel } from "@/lib/format";
import { getExpenseBreakdown, getMonthlySummaries, getProperty } from "@/lib/queries";

export default async function ReportsPage() {
  const user = await requireUser();
  const property = await getProperty();

  if (!property) {
    return null;
  }

  const stakeholdersOnly = user.role_code === "stakeholder_viewer";
  const [monthly, expenses] = await Promise.all([
    getMonthlySummaries(property.id, stakeholdersOnly),
    getExpenseBreakdown(property.id, stakeholdersOnly)
  ]);

  return (
    <main className="grid" style={{ marginTop: 18 }}>
      <section className="hero">
        <h1 style={{ margin: "0 0 8px" }}>Monthly and yearly reports</h1>
        <p className="muted" style={{ margin: 0 }}>
          These summaries sit on top of the same ledger, so stakeholders can trace totals back to underlying entries.
        </p>
      </section>

      <section className="grid cards">
        <article className="panel">
          <h2 style={{ marginTop: 0 }}>Monthly summary</h2>
          <div className="table-wrap">
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
                      <td>{formatMonthLabel(row.month_key)}</td>
                      <td>{formatCurrency(row.income_total)}</td>
                      <td>{formatCurrency(row.expense_total)}</td>
                      <td>{formatCurrency(row.net_total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <h2 style={{ marginTop: 0 }}>Expense categories</h2>
          <div className="table-wrap">
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
                      <td>{row.category_name}</td>
                      <td>{formatCurrency(row.total)}</td>
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
