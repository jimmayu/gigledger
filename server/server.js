import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { initDatabase } from './database/schema.js';
import apiRoutes from './routes/api.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database
let db;
try {
  db = initDatabase();
  console.log('Database initialized successfully');
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}

// Authentication mode configuration
const AUTH_MODE = process.env.AUTH_MODE || (process.env.NODE_ENV === 'production' ? 'enabled' : 'disabled');
console.log(`Authentication mode: ${AUTH_MODE}`);

// Create default user when authentication is disabled
if (AUTH_MODE === 'disabled') {
  try {
    // Check if default user exists
    const defaultUser = db.prepare('SELECT id FROM users WHERE id = 1').get();
    if (!defaultUser) {
      // Create default user with a simple password hash (since it won't be used)
      const defaultPasswordHash = '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; // Placeholder hash
      db.prepare('INSERT OR IGNORE INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(
        1, 'default-user', defaultPasswordHash
      );
      console.log('Default user created for development');
    } else {
      console.log('Default user already exists');
    }
  } catch (error) {
    console.error('Error creating default user:', error);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

const normalizeBasePath = (raw) => {
  const value = (raw || '').trim();
  if (value === '' || value === '/') return '';
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.replace(/\/$/, '');
};

const BASE_PATH = normalizeBasePath(process.env.GIGLEDGER_BASE_PATH);
const API_BASE = `${BASE_PATH}/api`; // '' => '/api'

// Middleware
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// API routes
app.use(API_BASE, apiRoutes);

// Health check
app.get(`${API_BASE}/health`, (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Auth mode check
app.get(`${API_BASE}/auth/mode`, (req, res) => {
  res.json({ authMode: AUTH_MODE });
});

// User registration
app.post(`${API_BASE}/auth/register`, async (req, res) => {
  // When authentication is disabled, skip registration
  if (AUTH_MODE === 'disabled') {
    return res.status(200).json({
      message: 'Authentication disabled - using default user',
      userId: 1,
      user: { id: 1, username: 'default-user' }
    });
  }

  try {
    const db = initDatabase(); // Get database instance
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const bcrypt = await import('bcrypt');
    const saltRounds = 10;
    const passwordHash = await bcrypt.default.hash(password, saltRounds);

    // Create user
    const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);

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
  // When authentication is disabled, automatically login as default user
  if (AUTH_MODE === 'disabled') {
    res.cookie('user_id', 1, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
      secure: false
    });

    return res.json({
      message: 'Login successful (authentication disabled)',
      user: { id: 1, username: 'default-user' }
    });
  }

  try {
    const db = initDatabase(); // Get database instance
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const bcrypt = await import('bcrypt');
    const isValidPassword = await bcrypt.default.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set session cookie
    res.cookie('user_id', user.id, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
      secure: false // Allow insecure for development
    });

    res.json({
      message: 'Login successful',
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
app.post(`${API_BASE}/auth/logout`, (req, res) => {
  res.clearCookie('user_id');
  res.json({ message: 'Logout successful' });
});

// Get current user
app.get(`${API_BASE}/auth/me`, (req, res) => {
  // When authentication is disabled, return default user
  if (AUTH_MODE === 'disabled') {
    return res.json({
      user: { id: 1, username: 'default-user', created_at: new Date().toISOString() }
    });
  }

  const userId = req.cookies?.user_id;
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = initDatabase();
  const user = db.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  res.json({ user });
});

// Serve the built frontend when running in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');

  if (BASE_PATH === '') {
    // Root deployment
    app.use(express.static(distPath, { index: false }));

    // SPA fallback: let React Router handle client-side routes
    app.get(['/', '/*'], (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Subpath deployment (e.g. /gigledger)
    app.use(BASE_PATH, express.static(distPath, { index: false }));

    // SPA fallback: let React Router handle client-side routes
    app.get([BASE_PATH, `${BASE_PATH}/`, `${BASE_PATH}/*`], (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  const lanIP = process.env.LAN_IP || '192.168.1.13'; // Default to the user's IP
  console.log(`GigLedger server running on port ${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`LAN access: http://${lanIP}:${PORT}`);
  console.log(`API Health check: http://localhost:${PORT}${API_BASE}/health`);
});

export default app;