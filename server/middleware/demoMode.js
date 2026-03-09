import { getDatabase } from '../database/schema.js'
import { getDemoDatabase } from '../database/demoDatabase.js'

const READ_ONLY_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const PROTECTED_PATHS = ['/transactions', '/assets', '/admin']

function matchesProtectedPath(path) {
  return PROTECTED_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

export function demoModeMiddleware(req, res, next) {
  const demoCookie = req.cookies?.demo_mode === '1'
  req.isDemoMode = demoCookie
  req.db = demoCookie ? getDemoDatabase() : getDatabase()

  if (demoCookie && READ_ONLY_METHODS.has(req.method)) {
    if (matchesProtectedPath(req.path)) {
      return res.status(403).json({
        error: 'Demo mode is read only. Mutating endpoints are disabled.'
      })
    }
  }

  next()
}
