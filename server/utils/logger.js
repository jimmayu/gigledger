// Centralized structured logging utility using Pino
// Provides consistent logging across the application with different levels and context

import pino from 'pino';

// Create logger instance with production-ready configuration
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // In production, logs should go to files or external services
  // For now, we'll use console output
});

// Specialized loggers for different concerns

/**
 * Audit logger for financial data changes and security events
 * These logs are critical for compliance and debugging
 */
export const auditLogger = logger.child({ component: 'audit' });

/**
 * Performance logger for monitoring system performance
 * Tracks execution times, memory usage, and scaling metrics
 */
export const perfLogger = logger.child({ component: 'performance' });

/**
 * Request logger for API request/response tracking
 * Includes correlation IDs and timing information
 */
export const requestLogger = logger.child({ component: 'request' });

/**
 * Business logic logger for financial calculations and validations
 * Tracks calculation results and potential data integrity issues
 */
export const businessLogger = logger.child({ component: 'business' });

// Utility functions for common logging patterns

/**
 * Log performance metrics for a function execution
 * @param {string} operation - Name of the operation being timed
 * @param {number} duration - Duration in milliseconds
 * @param {Object} context - Additional context (userId, transactionCount, etc.)
 */
export function logPerformance(operation, duration, context = {}) {
  perfLogger.info({
    operation,
    duration_ms: duration,
    ...context
  }, `Performance: ${operation} completed in ${duration}ms`);
}

/**
 * Log business logic validation results
 * @param {string} validation - Name of the validation check
 * @param {boolean} passed - Whether the validation passed
 * @param {Object} details - Additional validation details
 */
export function logValidation(validation, passed, details = {}) {
  const level = passed ? 'info' : 'warn';
  businessLogger[level]({
    validation,
    passed,
    ...details
  }, `Validation: ${validation} - ${passed ? 'PASSED' : 'FAILED'}`);
}

/**
 * Log audit trail for financial data modifications
 * @param {string} action - The action performed (CREATE, UPDATE, DELETE)
 * @param {string} entityType - Type of entity (transaction, asset, user)
 * @param {string|number} entityId - ID of the affected entity
 * @param {Object} changes - Before/after values (sanitized)
 * @param {Object} context - Additional context (userId, requestId, etc.)
 */
export function logAudit(action, entityType, entityId, changes = {}, context = {}) {
  auditLogger.info({
    action,
    entity_type: entityType,
    entity_id: entityId,
    changes,
    ...context
  }, `Audit: ${action} ${entityType} ${entityId}`);
}