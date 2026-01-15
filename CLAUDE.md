# Project: GigLedger
A self-hosted PWA for musician accounting (LLC).

## Tech Stack
- **Runtime:** Node.js (Express)
- **Frontend:** React + Vite + Tailwind CSS
- **Database:** SQLite (`ledger.db`) using `better-sqlite3`
- **Deployment:** Docker + Traefik
- **Language:** JavaScript (ES Modules) - usage of Typescript is not required.

## Architecture Rules
1. **Modularity:** Keep business logic (Depreciation math) separate from API routes.
2. **Database:** No external DB containers. Use SQLite file in a persistent volume.
3. **Security:** Passwords currently hashed. No plain text storage.
4. **Style:** Minimalist, Apple-like design. High contrast text.

## Commands
- Start Dev: `npm run dev` (Runs concurrently)
- Build: `docker build -t gigledger .`
- Test: `npm test`