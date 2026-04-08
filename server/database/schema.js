import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Schema for GigLedger SQLite database
export const SCHEMA = {
  // Users table for authentication
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
      failed_attempts INTEGER DEFAULT 0,
      locked_until DATETIME,
      last_activity DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

  // Login attempts for security monitoring
  login_attempts: `
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      ip_address TEXT,
      success BOOLEAN NOT NULL,
      attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

  // Transactions table for income/expenses (stored in cents)
  transactions: `
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      type TEXT CHECK(type IN ('INCOME', 'EXPENSE')) NOT NULL,
      category TEXT NOT NULL,
      amount INTEGER NOT NULL,  -- Stored as cents
      description TEXT,
      payment_method TEXT,
      venue TEXT, -- For income transactions from gigs
      vendor TEXT, -- For expense transactions
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`,

  // Assets table for equipment tracking and depreciation
  assets: `
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      purchase_date TEXT NOT NULL,
      cost_basis INTEGER NOT NULL,  -- Stored as cents
      depreciation_method TEXT CHECK(depreciation_method IN ('ST_3YEAR', 'ST_5YEAR', 'ST_7YEAR', 'BONUS_100', 'BONUS_40', 'SECTION_179')) NOT NULL,
      equipment_category TEXT CHECK(equipment_category IN ('TECHNOLOGY_COMPUTING', 'INSTRUMENTS_SOUND', 'STAGE_STUDIO', 'TRANSPORTATION')),
      disposal_date TEXT,        -- Nullable
      disposal_price INTEGER,    -- Nullable, stored as cents
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`,

  // Audit logs for financial data changes and security events
  audit_logs: `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT')),
      entity_type TEXT NOT NULL CHECK(entity_type IN ('transaction', 'asset', 'user', 'auth')),
      entity_id TEXT,  -- Can be ID or username depending on entity_type
      old_values TEXT, -- JSON string of previous values (sanitized)
      new_values TEXT, -- JSON string of new values (sanitized)
      ip_address TEXT,
      user_agent TEXT,
      request_id TEXT, -- Correlation ID for request tracing
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`
};

function needsMigration(db) {
  try {
    const userColumns = db.prepare("PRAGMA table_info(users)").all();
    const hasRoleColumn = userColumns.some(column => column.name === 'role');

    const loginAttemptsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='login_attempts'").get();
    const hasLoginAttemptsTable = !!loginAttemptsTable;

    const assetColumns = db.prepare("PRAGMA table_info(assets)").all();
    const hasEquipmentCategory = assetColumns.some(column => column.name === 'equipment_category');

    return !hasRoleColumn || !hasLoginAttemptsTable || !hasEquipmentCategory;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return true;
  }
}

// Apply migration to existing database
function applyMigration(db) {
  try {
    logger.info('Starting database migration');

    // Add role column to users table
    const userColumns = db.prepare("PRAGMA table_info(users)").all();
    if (!userColumns.some(column => column.name === 'role')) {
      logger.info('Adding role column to users table');
      db.exec('ALTER TABLE users ADD COLUMN role TEXT DEFAULT \'user\' CHECK(role IN (\'admin\', \'user\'))');
    }

    // Add failed_attempts column
    if (!userColumns.some(column => column.name === 'failed_attempts')) {
      logger.info('Adding failed_attempts column to users table');
      db.exec('ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0');
    }

    // Add locked_until column
    if (!userColumns.some(column => column.name === 'locked_until')) {
      logger.info('Adding locked_until column to users table');
      db.exec('ALTER TABLE users ADD COLUMN locked_until DATETIME');
    }

    // Add last_activity column
    if (!userColumns.some(column => column.name === 'last_activity')) {
      logger.info('Adding last_activity column to users table');
      db.exec('ALTER TABLE users ADD COLUMN last_activity DATETIME');
    }

    // Create login_attempts table if it doesn't exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='login_attempts'").get();
    if (!tables) {
      logger.info('Creating login_attempts table');
      db.exec(SCHEMA.login_attempts);
    }

    // Add equipment_category column to assets table
    const assetColumns = db.prepare("PRAGMA table_info(assets)").all();
    if (!assetColumns.some(column => column.name === 'equipment_category')) {
      logger.info('Adding equipment_category column to assets table');
      db.exec('ALTER TABLE assets ADD COLUMN equipment_category TEXT CHECK(equipment_category IN (\'TECHNOLOGY_COMPUTING\', \'INSTRUMENTS_SOUND\', \'STAGE_STUDIO\', \'TRANSPORTATION\'))');
    }

    logger.info('Database migration completed successfully');
    return true;
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Database migration failed');
    return false;
  }
}

// Initialize database connection and schema
let db;

export function initDatabase(dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/ledger.db')) {
  if (db) {
    logger.debug('Database already initialized, returning existing connection');
    return db;
  }
  try {
    // Ensure the directory exists
    const dbDir = path.dirname(dbPath);
    logger.info({
      dbPath: dbPath,
      dbDir: dbDir,
      envDbPath: process.env.DATABASE_PATH
    }, 'Initializing database');

    if (!fs.existsSync(dbDir)) {
      logger.info({ dbDir }, 'Creating database directory');
      fs.mkdirSync(dbDir, { recursive: true });
      logger.info('Database directory created');
    } else {
      logger.debug('Database directory exists');
    }

    db = new Database(dbPath);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Create all tables
    Object.values(SCHEMA).forEach(tableSchema => {
      db.exec(tableSchema);
    });

    // Check if migration is needed and apply it
    if (needsMigration(db)) {
      logger.info('Database migration needed');
      if (applyMigration(db)) {
        logger.info('Database migrated successfully');
      } else {
        logger.error('Database migration failed');
        throw new Error('Database migration failed');
      }
    } else {
      logger.info('Database schema is up to date');
    }

    logger.info('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Clean up database connection
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}