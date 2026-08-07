# Zanode Deployment Guide

This project is intended for Zanode-style Git deployment with managed PostgreSQL.

## Before pushing

1. Confirm local dependencies install cleanly with `npm install`.
2. Confirm the production build passes with `npm run build`.
3. Prepare `.env` locally from `.env.example`.
4. Run `npm run db:check` once the database has been seeded.

## Database preparation

1. Create a PostgreSQL database.
2. Run [`db/schema.sql`](./db/schema.sql).
3. Generate password hashes with:

```bash
npm run db:hash-password -- your-password
```

4. Replace the placeholders in [`db/seed.sql`](./db/seed.sql).
5. Run [`db/seed.sql`](./db/seed.sql).
6. Import the workbook:

```bash
npm run db:import-workbook -- "C:\Users\Ryno\Downloads\VREDEHOF 6 ACCOUNTING.xlsx"
```

The import is safe to rerun. Duplicate imported workbook references are skipped automatically.

## Zanode environment variables

Set these values in Zanode before the first deploy:

- `DATABASE_URL`
- `SESSION_SECRET`
- `APP_URL`

`APP_URL` should be the final deployed app URL on Zanode.

## First deploy checklist

1. Push [vredehof-6-ledger](C:\Users\Ryno\Documents\Codex Projects\Murray Personal Financial Records Manager\vredehof-6-ledger) into its own Git repository.
2. Connect the repo to Zanode.
3. Configure the environment variables.
4. Run the database schema and seed scripts against Zanode PostgreSQL.
5. Run the workbook import against the same database.
6. Open the deployed app and verify:
   - Murray can sign in.
   - Astrid and Kiki can sign in.
   - Dashboard totals load.
   - Imported rows appear under `/imports`.
   - Stakeholder accounts cannot see owner-only controls.

## Post-deploy smoke test

Run these checks after the first live deployment:

1. Add a manual ledger entry as Murray.
2. Edit that entry.
3. Disable and restore a category.
4. Open the ledger as a stakeholder account and confirm read-only access.
