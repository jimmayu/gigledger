# GigLedger

A comprehensive financial ledger application for tracking business income, expenses, assets, and tax calculations.

## 🚨 First Run Security - CRITICAL

**⚠️ IMPORTANT: You MUST change the default admin password immediately after first startup!**

### Default Login Credentials
- **Username**: `admin`
- **Password**: `gigledger-change-me-2026!`

### Steps to Secure Your Installation
1. **Start the application** using Docker Compose
2. **Open your browser** and navigate to the application
3. **Login** with the default credentials above
4. **Go to Admin Panel** (accessible to admin users)
5. **Change the admin password** to a strong, unique password
6. **Create additional users** as needed

### Security Warnings
- 🚨 **NEVER use the default password in production!**
- 🚨 **Change the password immediately after first login!**
- 🚨 **Use a strong password with at least 8 characters, including uppercase, lowercase, numbers, and symbols**
- 🚨 **Consider enabling 2FA if available in future versions**

The application will display security warnings in the console until you change the default password.

## Installation

### Docker (Recommended)

1. Clone repository
2. Copy `.env.example` to `.env` and configure as needed
3. Run `docker compose build`
4. Run `docker compose up -d`
5. Access the application at `http://localhost:3000`

### Development

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Build for production: `npm run build`
4. Start production server: `npm start`

## Production Data Persistence & Backups

### Named Volume (Persists Across Rebuilds)

The application uses a Docker named volume `gigledger_data` to persist the database. This volume survives normal container restarts and Docker Compose rebuilds.

**Why Named Volumes:**
- Bind mounts (`./data:/app/data`) are **wiped** by `docker compose down -v`
- Named volumes (`gigledger_data:/app/data`) persist **independently** of container lifecycle
- Production upgrades/rebuilds **do not lose data** with named volumes

### Data Persistence Behavior

| Operation | Effect on Data | Recovery Method |
|-----------|----------------|----------------|
| `docker compose down -v` | **NO CHANGE** (down -v only removes containers, keeps volume) | Restore from backup if needed |
| `docker compose up -d` | **NO CHANGE** (reuses existing volume) | N/A |
| `docker compose down` + `docker compose up -d` | **NO CHANGE** (reuses existing volume) | N/A |
| `docker compose build` + `docker compose up -d` | **NO CHANGE** (image rebuild doesn't affect volume) | N/A |
| `docker volume rm gigledger_data` | **DATA LOSS** (destroys volume) | Restore from backup |

**Important**: With `.dockerignore` in place, the database is NOT baked into the Docker image. The `gigledger_data` volume stores all application data.

### Backup Strategies

#### 1. Application-Level Backup (Recommended)

```bash
# Backup while container is running
docker compose exec gigledger sqlite3 /app/data/ledger.db .dump > backup-$(date +%Y%m%d).sql

# Backup to timestamped SQL file
docker compose exec gigledger cat /app/data/ledger.db > backup-$(date +%Y%m%d).db
```

#### 2. Volume-Level Backup (Full Snapshot)

```bash
# Requires docker-volume-backup or manual tar export
docker run --rm -v gigledger_gigledger_data:/data -v $(pwd):/backup alpine tar czf backup-$(date +%Y%m%d_%H%M%S).tar.gz -C /data .

# Restore from volume backup
docker run --rm -v gigledger_gigledger_data:/data -v $(pwd):/restore alpine tar xzf backup-20260122_144500.tar.gz -C /data
```

#### 3. Disaster Recovery (Reset Everything)

**Warning**: This destroys ALL data including admin users and transactions.

```bash
# Stop and remove volume (complete wipe)
docker compose down -v
docker volume rm gigledger_data

# Start fresh (new admin user created)
docker compose up -d
```

### Testing Persistence

```bash
# 1. Add sample data via UI
# 2. Stop: docker compose down -v
# 3. Start: docker compose up -d
# 4. Verify: Login → Dashboard shows same data (persists)
```

### Development vs Production

**Development** (bind mounts): `./data:/app/data`
- Fast development cycles
- Manual database management
- `docker compose down -v` wipes data (by design)

**Production** (named volume): `gigledger_data:/app/data`
- Survives rebuilds/upgrades
- Safe deployment workflow
- `docker compose down -v` does NOT wipe data (only containers)

### Database Location

| Environment | DB Path |
|-------------|---------|
| Container | `/app/data/ledger.db` |
| Host (named volume) | `/var/lib/docker/volumes/gigledger_gigledger_data/_data/ledger.db` |
| Host (bind mount) | `./data/ledger.db` |

## Features

- User authentication and authorization
- Transaction tracking (income/expenses)
- Asset management and depreciation calculations
- Tax year reporting
- Admin panel for user management
- Responsive web interface

## API

The application provides a REST API for programmatic access:

- `GET /api/health` - Health check
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Current user info
- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transaction
- `GET /api/assets` - List assets
- `POST /api/assets` - Create asset
- `GET /api/summary` - Financial summary

## Environment Variables

See `.env.example` for all available configuration options.

## License

[Add license information here]