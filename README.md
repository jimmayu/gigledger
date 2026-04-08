# GigLedger

A self-hosted financial ledger for freelancers and small business owners. Track income, expenses, and equipment assets with IRS-compliant depreciation calculations and tax estimates.

## Features

- **Transaction tracking** — categorized income and expenses, filterable by year/month/type
- **Asset management** — equipment inventory with depreciation calculations (MACRS, Section 179, Bonus)
- **Tax estimates** — YTD financials, depreciation deductions, self-employment and federal tax projections
- **Multi-user** — admin and standard user roles with account lockout and login audit logs
- **Demo mode** — read-only view with sample data, no login required

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: SQLite (via better-sqlite3)
- **Auth**: bcrypt password hashing, httpOnly session cookies

## Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/YOUR_USERNAME/gigledger.git
cd gigledger
cp .env.example .env
# Edit .env — set ADMIN_PASSWORD and SESSION_SECRET before starting!
docker compose -f docker-compose.yml.example up -d
```

Access at `http://localhost:3000`. Log in with the username from your `.env` (`admin` by default) and the password you set.

### Development

```bash
npm install
npm run dev        # Vite dev server + API server
npm run build      # Production build
npm start          # Serve production build
```

Set `AUTH_MODE=disabled` in your `.env` to skip login during development.

## Configuration

Copy `.env.example` to `.env` and set the following before first run:

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_PASSWORD` | **Yes** | Password for the initial admin account |
| `SESSION_SECRET` | **Yes** | Random string for session signing (`openssl rand -hex 32`) |
| `AUTH_MODE` | No | `enabled` (default) or `disabled` (dev only) |
| `DATABASE_PATH` | No | Path to SQLite file (default: `./data/ledger.db`) |
| `PORT` | No | Server port (default: `3000`) |

See `.env.example` for all options.

## Data Persistence

The Docker setup uses a named volume (`gigledger_data`) so your database survives container rebuilds.

```bash
# Backup
docker compose exec gigledger sqlite3 /app/data/ledger.db .dump > backup-$(date +%Y%m%d).sql

# Volume snapshot
docker run --rm \
  -v gigledger_gigledger_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/gigledger-$(date +%Y%m%d).tar.gz -C /data .
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |
| GET | `/api/transactions` | List transactions |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| GET | `/api/assets` | List assets with depreciation |
| POST | `/api/assets` | Create asset |
| PUT | `/api/assets/:id` | Update asset |
| PUT | `/api/assets/:id/sell` | Mark asset as disposed |
| GET | `/api/summary` | Financial dashboard summary |
| GET | `/api/admin/users` | List users (admin) |
| POST | `/api/admin/users` | Create user (admin) |

## License

MIT
