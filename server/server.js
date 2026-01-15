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
try {
  initDatabase();
  console.log('Database initialized successfully');
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// When deployed behind Traefik with PathPrefix(`/gigledger`), requests arrive as
// /gigledger/... so we mount API routes at both locations.
const API_BASES = ['/api', '/gigledger/api'];

// Middleware
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// API routes
for (const base of API_BASES) {
  app.use(base, apiRoutes);
}

// Health check
app.get(API_BASES.map(base => `${base}/health`), (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// User registration
app.post(API_BASES.map(base => `${base}/auth/register`), async (req, res) => {
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
app.post(API_BASES.map(base => `${base}/auth/login`), async (req, res) => {
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
app.post(API_BASES.map(base => `${base}/auth/logout`), (req, res) => {
  res.clearCookie('user_id');
  res.json({ message: 'Logout successful' });
});

// Get current user
app.get(API_BASES.map(base => `${base}/auth/me`), (req, res) => {
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

  // Serve assets at /gigledger/*
  app.use('/gigledger', express.static(distPath, { index: false }));

  // SPA fallback: let React Router handle client-side routes
  app.get(['/gigledger', '/gigledger/', '/gigledger/*'], (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`GigLedger server running on port ${PORT}`);
  console.log(`API Health check: http://localhost:${PORT}/api/health`);
});

export default app;