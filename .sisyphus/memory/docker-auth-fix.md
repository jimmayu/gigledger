# GigLedger Docker Deployment Fix (2026-01-20)

## Problem
When running GigLedger in Docker with Traefik HTTPS reverse proxy (gigledger.rosick.com), login succeeded but subsequent pages showed blank screen.

## Root Cause
Cookie security configuration was incompatible with HTTPS production environment:
- Server set `secure: false` hardcoded on cookies
- Browsers reject non-secure cookies over HTTPS connections
- Result: Login API call succeeded, but subsequent API calls failed with 401 Unauthorized
- Frontend interpreted 401s as logout/blank state

## Solution Implemented

### 1. server.js Changes (3 modifications)

**Trust Proxy Support (line 49):**
```javascript
app.set('trust proxy', process.env.TRUST_PROXY === '1' ? 1 : false);
```
- Enables Express to trust X-Forwarded-* headers from Traefik
- Required for proper request protocol detection

**Cookie Secure Flag (lines 133, 169):**
```javascript
secure: process.env.NODE_ENV === 'production'
```
- Was: `secure: false` (hardcoded)
- Now: `true` in production (NODE_ENV=production), `false` in development
- Browsers accept secure cookies over HTTPS

**Cookie Domain Support (lines 134, 170):**
```javascript
domain: process.env.COOKIE_DOMAIN || undefined
```
- Supports wildcard domain (.rosick.com) for subdomain compatibility
- Environment variable override available via docker-compose.yml

### 2. docker-compose.yml Changes

**Environment Variables Added:**
```yaml
- TRUST_PROXY=1
- COOKIE_DOMAIN=.rosick.com
```
- `TRUST_PROXY=1` enables trust proxy in Express
- `COOKIE_DOMAIN=.rosick.com` sets wildcard domain for cookies

### 3. Dockerfile Optimization

**Build Speed Improvement:**
- Removed: `rm -rf node_modules/better-sqlite3 && npm install better-sqlite3 --build-from-source`
- Reason: Native module already compiled, rebuild unnecessary and slow (5+ minutes)
- Impact: Build time reduced from 5+ minutes to <30 seconds with caching

## Files Modified
- `server/server.js` (production cookie config + trust proxy)
- `docker-compose.yml` (TRUST_PROXY, COOKIE_DOMAIN env vars)
- `Dockerfile` (removed slow native module rebuild)

## Testing Checklist
After deployment, verify:
1. Login at https://gigledger.rosick.com
2. Browser DevTools → Application → Cookies
   - `user_id` cookie has Secure: ✓ true
   - Domain: `.rosick.com` (with leading dot)
   - SameSite: `lax`
3. Dashboard loads without blank screen
4. All API calls return 200 OK (check Network tab)
5. Page refresh maintains authentication state

## Environment Variables
| Variable | Value | Purpose |
|----------|-------|---------|
| NODE_ENV | production | Sets secure cookies |
| TRUST_PROXY | 1 | Enables proxy trust |
| COOKIE_DOMAIN | .rosick.com | Cookie domain wildcard |
| AUTH_MODE | enabled | Enables authentication |

## Commit Info
- Commit: 23b0c42
- Message: "Fix Docker HTTPS authentication cookie configuration"
- Date: 2026-01-20

## Notes
- `docker-compose.yml` remains in .gitignore for local environment overrides
- Same configuration works for local development (NODE_ENV not set to production)
- Cookie domain can be omitted for development (defaults to undefined)
