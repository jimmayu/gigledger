import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { initDatabase, getDatabase } from './database/schema.js';
import apiRoutes from './routes/api.js';
import { requestCorrelationMiddleware, performanceMonitoringMiddleware, startMemoryHeartbeat } from './middleware/monitoring.js';
import { auditMiddleware, logAuthEvent } from './middleware/audit.js';
import { demoModeMiddleware } from './middleware/demoMode.js';
import { getDemoDatabase, DEMO_USER_ID } from './database/demoDatabase.js';
import { logger } from './utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server configuration constants
const PORT = process.env.PORT || 3000;
const API_BASE = '/api';
const BASE_PATH = process.env.GIGLEDGER_BASE_PATH || '';
const DEMO_RATE_LIMIT_WINDOW_MS = parseInt(process.env.DEMO_RATE_LIMIT_WINDOW_MS, 10) || 60 * 1000;
const DEMO_RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.DEMO_RATE_LIMIT_MAX_REQUESTS, 10) || 3;

// Initialize database
let db;
try {
  db = initDatabase();
  logger.info('Database initialized successfully');
} catch (error) {
  logger.error({ error: error.message, stack: error.stack }, 'Failed to initialize database');
  process.exit(1);
}

// Initialize Express app
const app = express();

// Middleware setup
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(demoModeMiddleware);

// Monitoring middleware (must be before routes)
app.use(requestCorrelationMiddleware);
app.use(performanceMonitoringMiddleware);
app.use(auditMiddleware);

// Authentication mode configuration
const AUTH_MODE = process.env.AUTH_MODE || (process.env.NODE_ENV === 'production' ? 'enabled' : 'disabled');
logger.info({ authMode: AUTH_MODE }, 'Authentication configuration loaded');

// Create default admin user when authentication is enabled
const createAdminUser = async () => {
  if (AUTH_MODE === 'enabled') {
    logger.info('Attempting to create admin user');
    try {
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || 'gigledger-change-me-2026!';

      if (!process.env.ADMIN_PASSWORD) {
        // Warn loudly when falling back to the default password
        console.log('SECURITY WARNING: ADMIN_PASSWORD not set in environment!');
        console.log(`Using default password for user "${adminUsername}". Set ADMIN_PASSWORD in your .env and restart.`);
        console.log('NEVER use the default password in production!');
        console.log('');
      }

      const existingAdmin = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
      logger.info({ existingAdmin: !!existingAdmin }, 'Admin user existence check');

      if (!existingAdmin) {
        logger.info('Importing bcrypt for password hashing');
        let bcrypt;
        try {
          bcrypt = await import('bcrypt');
          logger.info('Bcrypt imported successfully');
        } catch (importError) {
          logger.error({ error: importError.message }, 'Failed to import bcrypt');
          throw importError;
        }
        const saltRounds = 12;
        logger.info({ saltRounds }, 'Hashing admin password');
        const passwordHash = bcrypt.default.hashSync(adminPassword, saltRounds);
        logger.info('Password hashed successfully');

        logger.info({ adminUsername }, 'Inserting admin user into database');
        db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(
          adminUsername, passwordHash, 'admin'
        );
        logger.info({ adminUsername }, 'Default admin user created successfully');

      } else {
        logger.info('Admin user already exists');
      }
    } catch (error) {
      logger.error({
        error: error.message,
        stack: error.stack
      }, 'Error creating admin user');
    }
  } else {
    logger.info('Authentication disabled - skipping admin user creation');
  }
};

// Initialize admin user and start server
(async () => {
  await createAdminUser();

  // Mount API routes
  app.use(API_BASE, apiRoutes);

  // Health check endpoint
  app.get(`${API_BASE}/health`, (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth mode check
  app.get(`${API_BASE}/auth/mode`, (req, res) => {
    res.json({ authMode: AUTH_MODE });
  });

  // User registration
  app.post(`${API_BASE}/auth/register`, async (req, res) => {
    if (AUTH_MODE === 'disabled') {
      return res.status(200).json({
        message: 'Authentication disabled - using default user',
        userId: 1,
        user: { id: 1, username: 'default-user' }
      });
    }

    try {
      const db = getDatabase();
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const auth = await import('./auth/auth.js');
      const passwordValidation = auth.validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ error: passwordValidation.error });
      }

      const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const bcrypt = await import('bcrypt');
      const saltRounds = 12;
      const passwordHash = await bcrypt.default.hash(password, saltRounds);

      const result = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, passwordHash, 'user');

      res.status(201).json({
        message: 'User created successfully',
        userId: result.lastInsertRowid
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // User login
  app.post(`${API_BASE}/auth/login`, async (req, res) => {
    if (AUTH_MODE === 'disabled') {
      res.cookie('user_id', 1, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
        secure: req.secure,
        domain: process.env.COOKIE_DOMAIN || undefined
      });

      return res.json({
        message: 'Login successful (authentication disabled)',
        user: { id: 1, username: 'default-user' }
      });
    }

    try {
      const db = initDatabase();
      const auth = await import('./auth/auth.js');
      const { username, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      if (auth.isAccountLocked(username)) {
        auth.recordLoginAttempt(username, ipAddress, false);
        return res.status(429).json({ error: 'Account temporarily locked due to too many failed attempts. Please try again later.' });
      }

      const rateLimitCheck = auth.checkRateLimits(ipAddress, username);

      if (rateLimitCheck.ipLimitReached || rateLimitCheck.usernameLimitReached) {
        auth.recordLoginAttempt(username, ipAddress, false);
        return res.status(429).json({ error: 'Too many failed attempts. Please try again later.' });
      }

      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

      if (!user) {
        auth.recordLoginAttempt(username, ipAddress, false);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const bcrypt = await import('bcrypt');
      const isValidPassword = await bcrypt.default.compare(password, user.password_hash);

      if (!isValidPassword) {
        // Audit log failed login attempt
        logAuthEvent('LOGIN', username, false, req);
        auth.recordLoginAttempt(username, ipAddress, false);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

       auth.recordLoginAttempt(username, ipAddress, true);
       auth.updateLastActivity(user.id);

       // Audit log successful login
       logAuthEvent('LOGIN', username, true, req, {
         userId: user.id,
         role: user.role
       });

       res.cookie('user_id', user.id, {
         httpOnly: true,
         maxAge: 7 * 24 * 60 * 60 * 1000,
         sameSite: 'lax',
         secure: req.secure,
         domain: process.env.COOKIE_DOMAIN || undefined
       });

       res.json({
         message: 'Login successful',
         user: { id: user.id, username: user.username, role: user.role }
       });
    } catch (error) {
      logger.error({
        error: error.message,
        stack: error.stack,
        requestId: req.requestId,
        username: req.body?.username,
        ip: req.ip
      }, 'Login processing error');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Logout
  app.post(`${API_BASE}/auth/logout`, (req, res) => {
    res.clearCookie('user_id');
    res.json({ message: 'Logout successful' });
  });

  // Get current user
  app.get(`${API_BASE}/auth/me`, async (req, res) => {
    if (req.isDemoMode) {
      return res.json({
        user: { id: 999, username: 'demo-user', role: 'user', created_at: new Date().toISOString() }
      });
    }

    if (AUTH_MODE === 'disabled') {
      return res.json({
        user: { id: 1, username: 'default-user', role: 'user', created_at: new Date().toISOString() }
      });
    }

    const userId = req.cookies?.user_id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const auth = await import('./auth/auth.js');

      if (!auth.isSessionValid(userId)) {
        res.clearCookie('user_id');
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }

      auth.updateLastActivity(userId);

      const db = initDatabase();
      const user = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(userId);

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Serve the built frontend when running in production
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '..', 'dist');

    // Custom static file handler with explicit MIME types
    const serveStaticWithMimeTypes = express.static(distPath, {
      index: false,
      setHeaders: (res, filepath) => {
        // Set explicit MIME types for common file extensions
        if (filepath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        } else if (filepath.endsWith('.js') || filepath.endsWith('.mjs')) {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (filepath.endsWith('.html')) {
          res.setHeader('Content-Type', 'text/html');
        } else if (filepath.endsWith('.json')) {
          res.setHeader('Content-Type', 'application/json');
        } else if (filepath.endsWith('.png')) {
          res.setHeader('Content-Type', 'image/png');
        } else if (filepath.endsWith('.jpg') || filepath.endsWith('.jpeg')) {
          res.setHeader('Content-Type', 'image/jpeg');
        } else if (filepath.endsWith('.svg')) {
          res.setHeader('Content-Type', 'image/svg+xml');
        } else if (filepath.endsWith('.ico')) {
          res.setHeader('Content-Type', 'image/x-icon');
        } else if (filepath.endsWith('.woff')) {
          res.setHeader('Content-Type', 'font/woff');
        } else if (filepath.endsWith('.woff2')) {
          res.setHeader('Content-Type', 'font/woff2');
        }
      }
    });

    if (BASE_PATH === '') {
      // Root deployment
      app.use(serveStaticWithMimeTypes);

      // SPA fallback: let React Router handle client-side routes
      app.get(['/', '/*'], (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      // Subpath deployment (e.g. /gigledger)
      app.use(BASE_PATH, serveStaticWithMimeTypes);

      // SPA fallback: let React Router handle client-side routes
      app.get([BASE_PATH, `${BASE_PATH}/`, `${BASE_PATH}/*`], (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  // Start server
  // Start memory monitoring heartbeat
  const stopMemoryHeartbeat = startMemoryHeartbeat();

  app.listen(PORT, '0.0.0.0', () => {
    logger.info({
      port: PORT,
      apiBase: API_BASE,
      authMode: AUTH_MODE,
      monitoring: ['request_correlation', 'performance_tracking', 'memory_heartbeat', 'audit_logging']
    }, 'GigLedger server started successfully');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    stopMemoryHeartbeat();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    stopMemoryHeartbeat();
    process.exit(0);
  });
})();




