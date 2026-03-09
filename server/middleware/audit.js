// Audit middleware for tracking financial data changes and security events
// Creates immutable audit trail for compliance and debugging

import { logAudit, auditLogger } from '../utils/logger.js';

/**
 * Sanitize sensitive data before logging
 * Removes passwords, full credit card numbers, etc.
 */
function sanitizeForAudit(data) {
  if (!data) return null;

  const sanitized = { ...data };

  // Remove sensitive fields
  delete sanitized.password;
  delete sanitized.password_hash;
  delete sanitized.credit_card_number;
  delete sanitized.ssn;

  // Sanitize amounts (keep only dollar amounts, not raw cents for readability)
  if (sanitized.amount && typeof sanitized.amount === 'number') {
    sanitized.amount_dollars = (sanitized.amount / 100).toFixed(2);
  }
  if (sanitized.cost_basis && typeof sanitized.cost_basis === 'number') {
    sanitized.cost_basis_dollars = (sanitized.cost_basis / 100).toFixed(2);
  }

  return JSON.stringify(sanitized);
}

/**
 * Audit middleware for API routes
 * Captures CREATE, UPDATE, DELETE operations on financial data
 */
export function auditMiddleware(req, res, next) {
  const originalJson = res.json;
  const originalStatus = res.status;

  // Store original request data for comparison
  let originalEntityData = null;

  // Extract entity information from request
  const urlParts = req.url.split('/');
  const entityType = urlParts[2]; // e.g., /api/transactions -> 'transactions'
  const entityId = urlParts[3];   // e.g., /api/transactions/123 -> '123'

  // Only audit financial entities
  const auditableEntities = ['transactions', 'assets'];
  if (!auditableEntities.includes(entityType)) {
    return next();
  }

  // For updates, fetch original data
  if (req.method === 'PUT' && entityId) {
    try {
      // Note: This would need database access in a real implementation
      // For now, we'll log the request data
      originalEntityData = req.body;
    } catch (error) {
      auditLogger.warn({
        requestId: req.requestId,
        error: error.message
      }, 'Failed to fetch original entity data for audit');
    }
  }

  // Override response methods to capture the result
  res.json = function(data) {
    // Log successful operations
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const action = getActionFromMethod(req.method);
      const userId = req.cookies?.user_id || null;

      logAudit(action, entityType.slice(0, -1), entityId || 'new', {
        old_values: sanitizeForAudit(originalEntityData),
        new_values: sanitizeForAudit(req.method === 'POST' ? req.body : data)
      }, {
        requestId: req.requestId,
        userId,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
    }

    return originalJson.call(this, data);
  };

  next();
}

/**
 * Map HTTP methods to audit actions
 */
function getActionFromMethod(method) {
  switch (method) {
    case 'POST': return 'CREATE';
    case 'PUT': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default: return 'UNKNOWN';
  }
}

/**
 * Log authentication events
 */
export function logAuthEvent(action, username, success, req, additionalData = {}) {
  logAudit(action, 'auth', username, null, {
    success,
    ip_address: req.ip,
    user_agent: req.get('User-Agent'),
    requestId: req.requestId,
    ...additionalData
  });
}