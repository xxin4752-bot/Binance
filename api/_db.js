const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

async function init(){
  const c = await pool.connect()
  try{
    await c.query('CREATE TABLE IF NOT EXISTS users (id serial PRIMARY KEY, email text UNIQUE, password_hash text, created_at bigint)')
    await c.query('CREATE TABLE IF NOT EXISTS api_keys (id serial PRIMARY KEY, user_id integer, exchange text, api_key text, api_secret text, passphrase text, created_at bigint, UNIQUE(user_id, exchange))')
    await c.query('CREATE TABLE IF NOT EXISTS nav_history (id serial PRIMARY KEY, user_id integer, ts bigint, nav_usd double precision)')
    await c.query('CREATE TABLE IF NOT EXISTS nav_history_ex (id serial PRIMARY KEY, user_id integer, ts bigint, exchange text, nav_usd double precision)')
    await c.query('CREATE TABLE IF NOT EXISTS positions (id serial PRIMARY KEY, user_id integer, ts bigint, exchange text, asset text, amount double precision, value_usd double precision)')
  } finally { c.release() }
}

init().catch(()=>{})

module.exports = {
  query: (text, params) => pool.query(text, params)
}

