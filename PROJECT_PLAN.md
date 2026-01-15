# GigLedger: Project Implementation Plan

## 1. Project Overview
**Goal:** A self-hosted PWA for musician accounting (LLC).
**User:** Single user (musician), low accounting knowledge ("For Dummies" workflow).
**Key Feature:** Asset depreciation tracking (Aggressive/Bonus schedules) with tax summary outputs.
**Stack:**
- **Backend:** Node.js (Express)
- **Database:** SQLite (local file `ledger.db`)
- **Frontend:** React + Vite + Tailwind CSS
- **Deployment:** Docker + Traefik (Linux Homelab)

---

## 2. Architecture & Modularity
To ensure maintainability, the codebase must separate concerns:
1.  **`/server/database`**: Handles all SQLite connections and schema definitions.
2.  **`/server/logic`**: Pure mathematical functions (e.g., depreciation formulas) separate from API routes.
3.  **`/server/routes`**: API endpoints that connect Frontend requests to Logic/Database.
4.  **`/client`**: The React UI.

---

## 3. Implementation Steps

### Step 1: Scaffolding
*   Initialize Git repository.
*   Create directory structure:
    ```text
    /client (Vite React app)
    /server (Node Express app)
    /server/database
    /server/routes
    /server/logic
    ```
*   Set up `package.json` for both root (concurrent running) and subfolders.

### Step 2: Database & Schema (SQLite)
*   Install `better-sqlite3`.
*   Create initialization script to generate tables if they don't exist:
    *   **Table: Transactions**
        *   `id` (INT PK)
        *   `date` (ISO String)
        *   `type` (Enum: 'INCOME', 'EXPENSE')
        *   `category` (String)
        *   `amount` (Integer - store as cents)
        *   `description` (String)
        *   `payment_method` (String)
    *   **Table: Assets**
        *   `id` (INT PK)
        *   `name` (String)
        *   `purchase_date` (ISO String)
        *   `cost_basis` (Integer - cents)
        *   `depreciation_method` (Enum: 'ST_5YEAR', 'BONUS_100', etc.)
        *   `disposal_date` (ISO String, nullable)
        *   `disposal_price` (Integer, nullable)

### Step 3: Backend Logic & Math
*   **Depreciation Logic:** Create a robust service that takes an asset and a target tax year and calculates:
    *   Current Year Deduction
    *   Accumulated Depreciation
    *   Remaining Basis
    *   *Constraint:* Must handle partial years (e.g., if bought in June, only 6 months depreciation—unless Bonus 100% applies).
*   **API Routes:**
    *   `GET /api/summary`: Returns JSON for dashboard (YTD Income, YTD Expense).
    *   `POST /api/transaction`: Add generic income/expense.
    *   `POST /api/asset`: Add new asset.
    *   `PUT /api/asset/:id/sell`: Mark asset as sold.

### Step 4: Frontend UI (React)
*   **Design System:** "Clean/Minimalist" (Apple/Wave style). Use Tailwind CSS.
*   **Navigation:** Sidebar (Dashboard, Transactions, Asset Locker, Reports).
*   **"Add New" Modal:**
    *   A central "+" button opens a dialog asking "What happened?".
    *   **Gig Income:** Inputs for Date, Venue, Amount.
    *   **Expense:** Inputs for Vendor, Category, Amount.
    *   **New Asset:** Inputs for Name, Cost, Purchase Date, Method.
    *   **Disposal:** Select asset from list -> Enter Sale Date/Price.
*   **Reports View:** A simple tabular summary of Income, Expenses, and Asset Depreciation for the selected tax year.

### Step 5: Security & Docker
*   **Auth:** Implement a simple Global Password check on the backend.
    *   Store hash of password in specific file or ENV.
    *   On launch, check if `APP_PASSWORD` hash matches request header.
*   **Docker:**
    *   Multi-stage build: Build React app -> Serve static files via Express.
    *   `docker-compose.yml`:
        *   Service: `gigledger`
        *   Volume: `./data:/app/data` (Persist SQLite DB)
        *   Labels: Traefik routing configuration (e.g., `traefik.http.routers.gigledger.rule=Host('ledger.mydomain.com')`).

---

## 4. Requirements Checklist for AI
- [ ] Do not use an external Database server (Postgres/MySQL).
- [ ] Ensure all currency is performed using Integers (cents) to avoid floating point errors.
- [ ] Ensure specific "Depreciation" math logic is isolated in its own file for future editing.
- [ ] UI must be mobile-responsive (PWA compatible).