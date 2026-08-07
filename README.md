# Vredehof 6 Ledger

A Zanode-friendly rental property ledger for Vredehof 6.

## Stack

- Next.js 16
- PostgreSQL
- Server-rendered authentication with signed cookies
- Simple owner/viewer role model for Murray, Astrid, and Kiki

## Core product

- Full property ledger with running balance
- Owner-managed entries and categories
- Owner-only import review screen for workbook-loaded history
- Stakeholder read-only dashboard and reports
- One-time workbook import for `VREDEHOF 6 ACCOUNTING.xlsx`

## Local setup

1. Copy `.env.example` to `.env`.
2. Create a PostgreSQL database.
3. Apply [`db/schema.sql`](./db/schema.sql).
4. Generate password hashes with `npm run db:hash-password -- <password>`.
5. Replace the placeholder password hashes in [`db/seed.sql`](./db/seed.sql), then run it.
6. Install dependencies with `npm install`.
7. Run `npm run db:check`.
8. Start the app with `npm run dev`.

## Workbook import

Use:

```bash
npm run db:import-workbook -- "C:\Users\Ryno\Downloads\VREDEHOF 6 ACCOUNTING.xlsx"
```

The importer reads:

- `Sheet1` as the historical rent/levy/expense ledger
- `Sheet2` as `Holiday/Shared` expenses

The importer is safe to rerun. Previously imported workbook references are skipped automatically.

## Zanode deployment notes

- Deploy as a Node/Next.js application from Git.
- Provision a managed PostgreSQL database on Zanode.
- Set `DATABASE_URL`, `SESSION_SECRET`, and `APP_URL` in Zanode environment variables.
- Run `db/schema.sql` and `db/seed.sql` before first launch.
- See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full launch checklist.
