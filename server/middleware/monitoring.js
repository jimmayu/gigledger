// Request correlation middleware for tracking requests across the application
// Generates unique request IDs and attaches them to logs and responses

import crypto from 'crypto';
import { requestLogger } from '../utils/logger.js';

/**
 * Middleware to add request correlation ID and timing
 * Attaches X-Request-ID header to responses and all log entries
 */
export function requestCorrelationMiddleware(req, res, next) {
  // Generate unique request ID
  const requestId = crypto.randomUUID();

  // Attach to request object for use in other middleware
  req.requestId = requestId;

  // Add to response headers
  res.setHeader('X-Request-ID', requestId);

  // Record request start time
  req.startTime = process.hrtime.bigint();

  // Log the incoming request
  requestLogger.info({
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress
  }, `Request: ${req.method} ${req.url}`);

  // Override res.end to log response timing
  const originalEnd = res.end;
  res.end = function(...args) {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - req.startTime) / 1000000; // Convert nanoseconds to milliseconds

    // Log the response
    requestLogger.info({
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration_ms: Math.round(durationMs * 100) / 100, // Round to 2 decimal places
      contentLength: res.get('Content-Length')
    }, `Response: ${req.method} ${req.url} ${res.statusCode} (${durationMs.toFixed(2)}ms)`);

    // Call original end method
    originalEnd.apply(this, args);
  };

  next();
}

/**
 * Performance monitoring middleware for API endpoints
 * Tracks memory usage and alerts on performance degradation
 */
export function performanceMonitoringMiddleware(req, res, next) {
  const startMemory = process.memoryUsage();
  const startTime = process.hrtime.bigint();

  // Override res.end to capture performance metrics
  const originalEnd = res.end;
  res.end = function(...args) {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();

    const durationMs = Number(endTime - startTime) / 1000000;
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    // Log performance metrics for slow requests or high memory usage
    if (durationMs > 100 || memoryDelta > 10 * 1024 * 1024) { // 100ms or 10MB
      requestLogger.warn({
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        duration_ms: Math.round(durationMs * 100) / 100,
        memory_delta_mb: Math.round(memoryDelta / 1024 / 1024 * 100) / 100,
        heap_used_mb: Math.round(endMemory.heapUsed / 1024 / 1024 * 100) / 100
      }, `Performance Alert: ${req.method} ${req.url} slow or memory-intensive`);
    }

    // Call original end method
    originalEnd.apply(this, args);
  };

  next();
}

/**
 * Memory usage heartbeat logger
 * Logs memory usage every 60 seconds for monitoring trends
 */
export function startMemoryHeartbeat() {
  const interval = setInterval(() => {
    const memUsage = process.memoryUsage();

    requestLogger.info({
      heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
      heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
      external_mb: Math.round(memUsage.external / 1024 / 1024 * 100) / 100,
      rss_mb: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100
    }, 'Memory heartbeat');

  }, 60000); // Every 60 seconds

  // Return cleanup function
  return () => clearInterval(interval);
}