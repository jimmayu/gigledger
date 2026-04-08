import { getDatabase } from '../database/schema.js'
import { getDemoDatabase, DEMO_USER_ID } from '../database/demoDatabase.js'

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const PROTECTED_PATHS = ['/transactions', '/assets', '/admin']

function matchesProtectedPath(path) {
  // Strip /api prefix if present for matching
  const checkPath = path.startsWith('/api') ? path.slice(4) : path
  return PROTECTED_PATHS.some((prefix) => checkPath === prefix || checkPath.startsWith(`${prefix}/`))
}

export function demoModeMiddleware(req, res, next) {
  const demoCookie = req.cookies?.demo_mode === '1'
  req.isDemoMode = demoCookie
  req.db = demoCookie ? getDemoDatabase() : getDatabase()

  if (demoCookie) {
    req.userId = DEMO_USER_ID
    req.userRole = 'user'

    if (WRITE_METHODS.has(req.method)) {
      if (matchesProtectedPath(req.path)) {
        return res.status(403).json({
          error: 'Demo mode is read only. Mutating endpoints are disabled.'
        })
      }
    }
  }

  next()
}
