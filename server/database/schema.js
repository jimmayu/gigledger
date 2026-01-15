import Database from 'better-sqlite3';
import path from 'path';
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
      depreciation_method TEXT CHECK(depreciation_method IN ('ST_3YEAR', 'ST_5YEAR', 'ST_7YEAR', 'BONUS_100')) NOT NULL,
      disposal_date TEXT,        -- Nullable
      disposal_price INTEGER,    -- Nullable, stored as cents
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`
};

// Initialize database connection and schema
let db;

export function initDatabase(dbPath = path.join(__dirname, '../../../data/ledger.db')) {
  try {
    console.log('Database path:', dbPath);
    console.log('__dirname:', __dirname);
    console.log('Resolved path:', path.resolve(dbPath));
    console.log('Directory exists:', require('fs').existsSync(path.dirname(dbPath)));
    db = new Database(dbPath);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Create all tables
    Object.values(SCHEMA).forEach(tableSchema => {
      db.exec(tableSchema);
    });

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