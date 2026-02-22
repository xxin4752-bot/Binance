import sqlite3 from 'sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dbPath = path.join(__dirname, 'data.sqlite')

sqlite3.verbose()
const db = new sqlite3.Database(dbPath)

db.serialize(() => {
  db.run('PRAGMA journal_mode=WAL')
  db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password_hash TEXT, created_at INTEGER)')
  db.run('CREATE TABLE IF NOT EXISTS api_keys (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, exchange TEXT, api_key BLOB, api_secret BLOB, passphrase BLOB, created_at INTEGER, UNIQUE(user_id, exchange))')
  db.run('CREATE TABLE IF NOT EXISTS nav_history (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, ts INTEGER, nav_usd REAL)')
  db.run('CREATE TABLE IF NOT EXISTS nav_history_ex (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, ts INTEGER, exchange TEXT, nav_usd REAL)')
  db.run('CREATE TABLE IF NOT EXISTS positions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, ts INTEGER, exchange TEXT, asset TEXT, amount REAL, value_usd REAL)')
})

export default db
