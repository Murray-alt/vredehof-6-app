import { loginAction } from "@/app/actions";

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
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 8 }}>Vredehof 6</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            Sign in to view the rental ledger, balances, and monthly summaries.
          </p>
        </div>

        {error ? (
          <div className="banner error">Email or password is incorrect.</div>
        ) : null}

        <form action={loginAction} className="grid">
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
      </section>
    </main>
  );
}
