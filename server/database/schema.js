import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    )`
};

// Check if migration is needed
function needsMigration(db) {
  try {
    // Check if equipment_category column exists
    const columns = db.prepare("PRAGMA table_info(assets)").all();
    const hasEquipmentCategory = columns.some(column => column.name === 'equipment_category');

    // Check if depreciation_method constraint includes new values
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='assets'").get();
    const hasNewDepreciationMethods = tableInfo && tableInfo.sql.includes('BONUS_40') && tableInfo.sql.includes('SECTION_179');

    return !hasEquipmentCategory;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return true; // Assume migration is needed if we can't check
  }
}

// Apply migration to existing database
function applyMigration(db) {
  try {
    console.log('Starting database migration...');

    // Start transaction
    const migrationTransaction = db.transaction(() => {
      // Check if equipment_category column exists
      const columns = db.prepare("PRAGMA table_info(assets)").all();
      const hasEquipmentCategory = columns.some(column => column.name === 'equipment_category');

      // Add equipment_category column if it doesn't exist
      if (!hasEquipmentCategory) {
        console.log('Adding equipment_category column...');
        db.exec("ALTER TABLE assets ADD COLUMN equipment_category TEXT CHECK(equipment_category IN ('TECHNOLOGY_COMPUTING', 'INSTRUMENTS_SOUND', 'STAGE_STUDIO', 'TRANSPORTATION'))");
      }

      // Note: SQLite doesn't support modifying CHECK constraints directly
      // The CHECK constraint will be updated when we recreate the table if needed
      // For now, we'll leave the existing constraint as is since it's additive only

      console.log('Database migration completed successfully');
    });

    migrationTransaction();
    return true;
  } catch (error) {
    console.error('Database migration failed:', error);
    return false;
  }
}

// Initialize database connection and schema
let db;

export function initDatabase(dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/ledger.db')) {
  try {
    console.log('Database path:', dbPath);
    console.log('__dirname:', __dirname);
    console.log('Resolved path:', path.resolve(dbPath));
    console.log('Environment DATABASE_PATH:', process.env.DATABASE_PATH);

    // Ensure the directory exists
    const dbDir = path.dirname(dbPath);
    console.log('Database directory:', dbDir);
    if (!fs.existsSync(dbDir)) {
      console.log('Creating database directory...');
      fs.mkdirSync(dbDir, { recursive: true });
      console.log('Database directory created');
    } else {
      console.log('Database directory exists');
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
      console.log('Database migration needed');
      if (applyMigration(db)) {
        console.log('Database migrated successfully');
      } else {
        console.error('Failed to migrate database');
        throw new Error('Database migration failed');
      }
    } else {
      console.log('Database schema is up to date');
    }

    console.log('Database initialized successfully');
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