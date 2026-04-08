# GigLedger — Claude Code Context

## What this project is

GigLedger is a self-hosted financial ledger for freelancers/LLC owners. It tracks income, expenses, equipment assets, and generates IRS-compliant depreciation calculations and tax estimates. It was originally built for a musician running a single-member LLC.

## Tech stack

- **Frontend**: React 18, React Router v6, Vite, Tailwind CSS
- **Backend**: Node.js (ESM), Express 4
- **Database**: SQLite via `better-sqlite3` (synchronous API)
- **Auth**: bcrypt session cookies (no JWT), `AUTH_MODE` env var gates it

## Key conventions

### Currency
All monetary values stored as **integers in cents** in the database. Divide by 100 for display; multiply by 100 before inserting/updating. This is intentional — no floating-point money bugs.

### Authentication mode
`AUTH_MODE=enabled` (production) enforces login. `AUTH_MODE=disabled` (dev) bypasses auth and uses a hardcoded user ID of 1. Never commit code that assumes disabled mode in production paths.

### Demo mode
Set cookie `demo_mode=1` to enter read-only demo mode. The server injects a separate SQLite database (`demoDatabase.js`) for this user. All mutating endpoints reject demo mode requests.

### Database access pattern
`req.db` is set by `demoModeMiddleware` — it points to either the live DB or the demo DB. Always use `getRequestDb(req)` (defined in `api.js`) instead of calling `getDatabase()` directly in route handlers.

### Request IDs
`requestCorrelationMiddleware` attaches `req.requestId` to every request. Include it in error logs.

## Directory layout

```
server/
  server.js          — Express setup, auth routes, admin user bootstrap
  auth/auth.js       — Session validation, rate limiting, account lockout
  database/
    schema.js        — SQLite schema + initDatabase() + migrations
    demoDatabase.js  — In-memory demo DB seeded from demo-seed.sql
    demo-seed.sql    — Demo data
  routes/api.js      — All business API routes (transactions, assets, admin)
  logic/
    financial.js     — YTD income/expense calculations, tax liability
    depreciation.js  — IRS MACRS depreciation per asset
  middleware/
    audit.js         — Audit log writes for CREATE/UPDATE/DELETE/auth events
    demoMode.js      — Injects req.db and blocks writes in demo mode
    monitoring.js    — Request correlation IDs and performance logging
  data/
    irs_depreciation_tables.js — MACRS rate tables
  utils/logger.js    — Pino structured logger (use logger.info/error, not console.log)

src/
  App.jsx            — Top-level: auth state, routing
  pages/
    AuthPage.jsx     — Login + demo mode entry
    Dashboard.jsx    — YTD summary, tax estimates
    Transactions.jsx — CRUD transaction list
    Assets.jsx       — Asset list with depreciation
    Reports.jsx      — Financial reports
    AdminPage.jsx    — User management (admin only)
  components/
    NavBar.jsx
    modals/
      TransactionModal.jsx
      AssetModal.jsx
```

## Running locally

```bash
cp .env.example .env  # set ADMIN_PASSWORD and SESSION_SECRET
npm install
npm run dev           # Vite dev server on :5173, API on :3000
```

Or with Docker:
```bash
docker compose -f docker-compose.yml.example up -d
```

## Environment variables

Required before first run: `ADMIN_PASSWORD`, `SESSION_SECRET`.  
See `.env.example` for full list with descriptions.

## Depreciation methods

Assets support: `ST_3YEAR`, `ST_5YEAR`, `ST_7YEAR` (straight-line MACRS), `BONUS_100`, `BONUS_40` (bonus depreciation), `SECTION_179`.

Equipment categories: `TECHNOLOGY_COMPUTING`, `INSTRUMENTS_SOUND`, `STAGE_STUDIO`, `TRANSPORTATION`.

## What to avoid

- Don't call `getDatabase()` directly in route handlers — use `getRequestDb(req)` to respect demo mode
- Don't use `console.log` in server code — use the Pino `logger` from `utils/logger.js`
- Don't store fractional dollars — always convert to cents before DB writes
- Don't commit `.env` — it contains real credentials
