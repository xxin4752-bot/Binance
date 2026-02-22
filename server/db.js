import sqlite3 from 'sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import { Pool } from 'pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = process.env.DATA_DIR || __dirname
const dbPath = path.join(dataDir, 'data.sqlite')

const usePg = !!process.env.DATABASE_URL

function qmarksToDollars(sql) {
  let idx = 0
  return sql.replace(/\?/g, () => `$${++idx}`)
}

let db

if (!usePg) {
  sqlite3.verbose()
  const sdb = new sqlite3.Database(dbPath)
  sdb.serialize(() => {
    sdb.run('PRAGMA journal_mode=WAL')
    sdb.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password_hash TEXT, created_at INTEGER)')
    sdb.run('CREATE TABLE IF NOT EXISTS api_keys (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, exchange TEXT, api_key BLOB, api_secret BLOB, passphrase BLOB, created_at INTEGER, UNIQUE(user_id, exchange))')
    sdb.run('CREATE TABLE IF NOT EXISTS nav_history (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, ts INTEGER, nav_usd REAL)')
    sdb.run('CREATE TABLE IF NOT EXISTS nav_history_ex (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, ts INTEGER, exchange TEXT, nav_usd REAL)')
    sdb.run('CREATE TABLE IF NOT EXISTS positions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, ts INTEGER, exchange TEXT, asset TEXT, amount REAL, value_usd REAL)')
  })
  db = sdb
} else {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

  async function initPg() {
    const client = await pool.connect()
    try {
      await client.query('CREATE TABLE IF NOT EXISTS users (id serial PRIMARY KEY, email text UNIQUE, password_hash text, created_at bigint)')
      await client.query('CREATE TABLE IF NOT EXISTS api_keys (id serial PRIMARY KEY, user_id integer, exchange text, api_key text, api_secret text, passphrase text, created_at bigint, UNIQUE(user_id, exchange))')
      await client.query('CREATE TABLE IF NOT EXISTS nav_history (id serial PRIMARY KEY, user_id integer, ts bigint, nav_usd double precision)')
      await client.query('CREATE TABLE IF NOT EXISTS nav_history_ex (id serial PRIMARY KEY, user_id integer, ts bigint, exchange text, nav_usd double precision)')
      await client.query('CREATE TABLE IF NOT EXISTS positions (id serial PRIMARY KEY, user_id integer, ts bigint, exchange text, asset text, amount double precision, value_usd double precision)')
    } finally { client.release() }
  }
  // Fire and forget init
  initPg().catch(()=>{})

  const wrapper = {
    run(sql, params, cb) {
      (async () => {
        let q = sql
        let wantsId = false
        if (/^\s*insert/i.test(q) && /users\s*\(/i.test(q) && !/returning/i.test(q)) { q += ' RETURNING id'; wantsId = true }
        const res = await pool.query(qmarksToDollars(q), params)
        const ctx = wantsId && res.rows?.[0]?.id ? { lastID: res.rows[0].id } : {}
        if (cb) cb.call(ctx, null)
      })().catch(err => { if (cb) cb(err) })
    },
    get(sql, params, cb) {
      pool.query(qmarksToDollars(sql), params).then(r => cb(null, r.rows[0] || null)).catch(e => cb(e))
    },
    all(sql, params, cb) {
      pool.query(qmarksToDollars(sql), params).then(r => cb(null, r.rows || [])).catch(e => cb(e))
    },
    prepare(sql) {
      return {
        run: (params) => { wrapper.run(sql, params, ()=>{}) },
        finalize: () => {}
      }
    },
    serialize: (fn) => { fn && fn() }
  }
  db = wrapper
}

export default db
