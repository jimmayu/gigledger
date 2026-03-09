import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { SCHEMA } from './schema.js'
import { logger } from '../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEMO_DB_PATH = process.env.DEMO_DATABASE_PATH || path.join(__dirname, '../../data/demo.db')
const DEMO_USER_ID = 999
const SEED_SQL_PATH = path.join(__dirname, 'demo-seed.sql')

let demoDbInstance

function ensureDemoDirectory() {
  const dir = path.dirname(DEMO_DB_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function seedDemoData(db) {
  try {
    const hasTransactions = db.prepare('SELECT COUNT(*) as count FROM transactions').get()
    if (hasTransactions && hasTransactions.count > 0) {
      logger.debug('Demo database already seeded')
      return
    }

    if (!fs.existsSync(SEED_SQL_PATH)) {
      throw new Error('Demo seed file not found')
    }

    const seedSql = fs.readFileSync(SEED_SQL_PATH, 'utf8')
    db.exec(seedSql)
    logger.info('Demo database seeded with sample data')
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Failed to seed demo database')
    throw error
  }
}

function createDemoDatabase() {
  ensureDemoDirectory()

  const db = new Database(DEMO_DB_PATH)
  db.pragma('foreign_keys = ON')

  Object.values(SCHEMA).forEach((tableSql) => {
    db.exec(tableSql)
  })

  seedDemoData(db)

  return db
}

export function getDemoDatabase() {
  if (!demoDbInstance) {
    demoDbInstance = createDemoDatabase()
  }
  return demoDbInstance
}

export { DEMO_DB_PATH, DEMO_USER_ID }
