# Orbyte Cloud

Next.js website with PostgreSQL storage, GitHub Actions CI/CD, and EC2 hosting.
The RDS migration checklist is in [RDS_MIGRATION.md](RDS_MIGRATION.md).

## Requirements

- Node.js 22.13 or newer
- npm
- PostgreSQL 18 for development or tests

## Start locally

    npm ci
    cp .env.example .env.local

Set the local PostgreSQL connection values in `.env.local`. Initialize a local
database named `orbyte_ci` with the SQL in `scripts/schema.sql`, then start:

    npm run dev

Then open:

- Website: http://127.0.0.1:3000
- User details dashboard: http://127.0.0.1:3000/admin

## Data storage

Submissions are stored in PostgreSQL's `public.consultation_requests` table.
Production uses a protected JSON connection file on EC2, selected by
`ORBYTE_DATABASE_CONFIG`. Development and CI can use the standard PostgreSQL
environment variables shown in `.env.example`. Database connections are lazy:
building the application does not connect to RDS or create production tables.

View submissions through the private admin dashboard or `npm run db:show`.
The latter requires the database variables to be exported in the shell, or
`ORBYTE_DATABASE_CONFIG` to point to a protected connection file.

## Production build

    npm run build
    cp -r public .next/standalone/public
    cp -r .next/static .next/standalone/.next/static
    HOSTNAME=127.0.0.1 PORT=3000 node .next/standalone/server.js

Export database connection settings in the shell when starting the standalone
server. It binds to loopback; production Nginx forwards public traffic to it.

## Tests

CI provisions a disposable PostgreSQL 18 service named `orbyte_ci` and runs
lint, migration integration tests, the production build, and application smoke
checks. Migration tests intentionally refuse other database names and use
synthetic SQLite fixtures only. Never point tests at production.
