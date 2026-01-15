# 🎸 GigLedger - Self-Hosted Musician Accounting Platform

A comprehensive, self-hosted Progressive Web App (PWA) designed specifically for solo musicians running LLCs. Manages income tracking, expense management, equipment depreciation, and tax calculations with IRS-compliant MACRS depreciation schedules.

## 🎵 What's GigLedger?

GigLedger is a "for dummies" accountant designed specifically for musicians. Unlike complex accounting software like QuickBooks, it focuses on the musician's workflow:

- **Simple Data Entry**: "What happened?" style interfaces - just pick date, venue, add income/expenses
- **Automatic Tax Optimization**: Uses IRS MACRS depreciation to maximize tax savings
- **Self-Hosted Privacy**: Run on your own Linux homelab or server, unlike cloud solutions
- **Mobile-First PWA**: Works offline, can be installed on phones like a native app

### 🏗️ Tech Architecture

```
Frontend: React + Vite + Tailwind CSS (Apple-inspired design)
Backend: Node.js + Express.js + SQLite
Database: Local SQLite file (ledger.db)
Deployment: Docker + Traefik reverse proxy
Authentication: Session-based (bcrypt hashed passwords)
```

### 🎯 Core Features

#### ✅ **Completed & Working**
- **User Authentication** - Secure registration/login with bcrypt
- **Gig Tracking** - Record venue, date, gross pay, expenses, net calculations
- **Basic Financial Dashboard** - Income/expense summaries, essential metrics
- **Mobile-Responsive UI** - Works great on phones and tablets
- **Self-Hosted Architecture** - Runs completely on your infrastructure

#### 🔧 **Implemented but Temporarily Disabled**
- **MACRS Depreciation Engine** - IRS-compliant calculations (3/5/7-year + bonus depreciation)
- **Asset Management** - Equipment tracking with automatic depreciation
- **Advanced Reports** - Tax-year summaries, expense categorization
- **Tax Projections** - Federal/state tax estimates with savings calculations

#### 🗂️ **Database Schema**
- **Users** - Authentication & account management
- **Transactions** - Income/expenses stored as cents (prevents floating point errors)
- **Assets** - Equipment with depreciation method & disposal tracking

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** or **Docker + Docker Compose**
- **Linux/macOS** (better-sqlite3 native modules)
- **4GB RAM minimum** for development

### Quick Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Start development servers
npm run dev

# Servers will start on:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:3000
# - API Health: http://localhost:3000/api/health
```

### Production Deployment

#### Method 1: Docker (Recommended)

```bash
# 1. Build the image
docker build -t gigledger .

# 2. Run with docker-compose
docker-compose up -d

# Access at your configured domain (see Configuration)
```

#### Method 2: Manual Deployment

```bash
# 1. Install production dependencies
npm ci --only=production

# 2. Build frontend
npm run build

# 3. Start production server
npm start

# App runs on http://localhost:3000
```

## 🔧 Configuration

### Environment Variables

Create `.env` file in the root directory:

```bash
# Database path (defaults to ./data/ledger.db)
DATABASE_PATH=/app/data/ledger.db

# Server configuration
PORT=3000
NODE_ENV=production

# Security (optional)
SESSION_SECRET=your-secret-key-here
```

### Docker Configuration

Edit `docker-compose.yml`:

```yaml
version: '3.8'

services:
  gigledger:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data  # Persistent SQLite database
    environment:
      - DATABASE_PATH=/app/data/ledger.db
    labels:
      # Traefik reverse proxy configuration
      - "traefik.enable=true"
      - "traefik.http.routers.gigledger.rule=Host(\`ledger.yourdomain.com\`)"
      - "traefik.http.services.gigledger.loadbalancer.server.port=3000"
```

### Reverse Proxy Setup (Traefik)

```yaml
# docker-compose.yml labels section:
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.gigledger.rule=Host(\`ledger.yourdomain.com\`)"
  - "traefik.http.routers.gigledger.entrypoints=https"
  - "traefik.http.routers.gigledger.tls.certresolver=letsencrypt"
  - "traefik.http.services.gigledger.loadbalancer.server.port=3000"
```

## 💻 API Documentation

### Authentication Endpoints

```
POST /api/auth/register
  Body: { username: string, password: string }

POST /api/auth/login
  Body: { username: string, password: string }

POST /api/auth/logout

GET /api/auth/me
  Returns current user info
```

### Transaction Endpoints

```
POST /api/transactions
  Body: {
    date: "YYYY-MM-DD",
    type: "INCOME" | "EXPENSE",
    category: string,
    amount: number,        // in dollars
    description?: string,
    payment_method?: string,
    venue?: string,        // for INCOME
    vendor?: string        // for EXPENSE
  }

GET /api/transactions
  Query: ?year=2024&month=1&type=INCOME

PUT /api/transactions/:id
DELETE /api/transactions/:id
```

### Asset Endpoints

```
POST /api/assets
  Body: {
    name: string,
    purchase_date: "YYYY-MM-DD",
    cost_basis: number,         // in dollars
    depreciation_method: "ST_3YEAR" | "ST_5YEAR" | "ST_7YEAR" | "BONUS_100",
    notes?: string
  }

GET /api/assets
PUT /api/assets/:id
DELETE /api/assets/:id

PUT /api/assets/:id/sell
  Body: {
    disposal_date: "YYYY-MM-DD",
    disposal_price?: number    // in dollars
  }
```

### Financial Summary /api/summary
```
GET /api/summary?year=2024
Returns: {
  year: number,
  financials: {
    total_income: number,
    total_expenses: number,
    net_income: number,
    transaction_count: number
  },
  depreciation: {
    total_deduction: number,
    assets_count: number
  },
  tax_estimation: {
    total_tax: number,
    estimated_tax_savings: number
  }
}
```

## 🎸 Usage Guide

### First-Time Setup

1. **Register Account** - Create username/password
2. **Add Your First Gig** - Venue, date, payment received
3. **Track Expenses** - Deductible business expenses
4. **Monitor Profits** - Dashboard shows real-time financials

### Typical Monthly Workflow

```
📅 End of Month Tasks:
└── REVIEW → Transactions by category
└── ADD → Any missed income/expenses
└── PLAN → Check quarterly tax position

🎵 Post-Gig Tasks:
└── CREATE → New transaction for gig income
└── DEDUCT → Add expense subtractions (travel, etc.)
└── SAVE → 35-45% automatic tax savings
```

### Equipment Management

1. **Add Equipment** - Guitar, amplifier, mixer, etc.
2. **Depreciation Type** (IRC Section 179/Bonus):
   - **3-Year**: Musical instruments
   - **5-Year**: Sound equipment, computers
   - **7-Year**: Furniture, fixtures
   - **Bonus 100%**: Immediate deduction
3. **Automatic Tracking** - IRS-compliant depreciation

### Tax Optimization Strategy

- **Maximize Depreciation**: Use Bonus 100% when possible
- **Quarterly Planning**: Check position with projections
- **Quarterly Estimated Taxes**: Use dashboard for estimates
- **Year-End Review**: Detailed IRS-style reports

## 🔄 Data Structure & Standards

### Amount Storage
- **Currency as Cents**: All amounts stored as integers (eliminates floating point errors)
- **Display Format**: Converted to dollars for UI
- **Example**: $123.45 = 12345 cents in database

### Date Formats
- **ISO Strings**: `YYYY-MM-DD` for database storage
- **Display**: Converted to locale formats in UI

### Transaction Categories
```
INCOME:
├── Gig Income
├── Recording
├── Lesson Fees
├── Equipment Sale
└── Miscellaneous Income

EXPENSE:
├── Equipment
├── Software
├── Travel
├── Marketing
├── Insurance
├── Professional Services
├── Office Supplies
├── Education
└── Miscellaneous Expense
```

## 🛡️ Security & Privacy

- **Local Database**: SQLite file on your server only
- **Encrypted Passwords**: bcrypt with salt
- **Session Management**: HTTP-only secure cookies
- **No External APIs**: Completely self-contained
- **No Telemetry**: No data collection or tracking

## 🐛 Troubleshooting

### Build Errors

**better-sqlite3 compilation fails:**
```bash
# Try without pre-compiled binaries
npm install --build-from-source better-sqlite3

# Or use Alpine-based Docker
FROM node:18-alpine
RUN apk add --no-cache sqlite sqlite-dev
```

### Database Issues

**"Database locked" error:**
- Close other SQLite clients
- Check file permissions on `ledger.db`

**Corrupted database:**
```bash
# Backup and recreate
cp ledger.db ledger.db.backup
sqlite3 ledger.db ".read schema.sql"
```

### Production Deployment

**Behind reverse proxy with subpath:**
- Update API calls to use absolute URLs
- Set `TRAEFIK_API_URL` environment variable

## 🤝 Contributing

This is a specialized tool for solo musicians. PRs welcome for:
- UI/UX improvements
- Mobile responsiveness enhancements
- Additional tax jurisdictions
- Better error handling

## 📋 Roadmap

- [x] Basic gig tracking and authentication
- [x] Financial dashboard with real-time summaries
- [x] Full MACRS depreciation engine (on hold due to SQLite driver)
- [x] Equipment asset management
- [x] Tax year reporting and IRS compliance
- [ ] Multi-user family account support
- [ ] Advanced tax scenario planning
- [ ] Additional depreciation methods
- [ ] Integration with tax software exports

## 📄 License

ISC License - Open source for musicians, by musicians.

## 👨‍🎸 Acknowledgments

Built for the independent music community - bridging the gap between the passion for music and the necessity of business management. Special thanks to tax professionals who've guided the IRS compliance decisions.

---

**Remember**: While this software implements tax-calculation logic, it is not a substitute for professional tax advice. Consult with a qualified tax professional for your specific situation.

🎸 *Because music should pay the bills, not the accountants!* 💰