export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = params.error === "invalid";

  return (
    <main className="login-shell">
      <section className="hero login-card">
        <div className="login-layout">
          <div className="login-showcase">
            <span className="login-badge">Shared dashboard</span>
            <div>
              <h1 className="login-title">Property finances without spreadsheet chaos.</h1>
              <p className="login-copy">
                A live dashboard for Vredehof 6, designed so Murray can manage the ledger and Astrid and Kiki can check balances, expenses, and monthly movement whenever they need to.
              </p>
            </div>

            <div className="login-grid">
              <div className="login-metric">
                <span className="metric-label">Single source</span>
                <strong>One live ledger</strong>
                <span className="metric-detail">Income, expenses, adjustments, and summaries stay in sync.</span>
              </div>
              <div className="login-metric">
                <span className="metric-label">Stakeholder ready</span>
                <strong>Read-only access</strong>
                <span className="metric-detail">Clear reporting for owners without exposing editing tools.</span>
              </div>
            </div>
          </div>

          <div className="login-panel">
            <div>
              <p className="eyebrow">Sign in</p>
              <h2 className="section-title">Access the Vredehof 6 dashboard</h2>
              <p className="muted" style={{ margin: 0 }}>
                Use your account to open the ledger, reports, and current balance overview.
              </p>
            </div>

            {error ? (
              <div className="banner error">Email or password is incorrect.</div>
            ) : null}

            <form action="/auth/login" method="post" className="grid">
              <label>
                Email
                <input type="email" name="email" autoComplete="username" required />
              </label>

              <label>
                Password
                <input type="password" name="password" autoComplete="current-password" required />
              </label>

              <button type="submit">Sign in</button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
