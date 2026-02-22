import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from './db.js'
import { encrypt, decrypt, getKey } from './crypto.js'
import { getAccountBalances as binanceBalances, getUSDTPriceMap as binancePrices } from './exchanges/binance.js'
import { getAccountBalances as okxBalances, getUSDTPriceMap as okxPrices } from './exchanges/okx.js'
import cron from 'node-cron'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

function issueToken(user) { return jwt.sign({ uid: user.id }, process.env.JWT_SECRET || 'dev', { expiresIn: '7d' }) }
function authed(req, res, next) {
  const h = req.headers.authorization || ''
  const t = h.split(' ')[1]
  try { const d = jwt.verify(t, process.env.JWT_SECRET || 'dev'); req.uid = d.uid; next() } catch { return res.status(401).json({ error: 'unauthorized' }) }
}

app.post('/api/register', (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'invalid' })
  const hash = bcrypt.hashSync(password, 10)
  const ts = Date.now()
  db.run('INSERT INTO users(email,password_hash,created_at) VALUES(?,?,?)', [email, hash, ts], function(err){
    if (err) return res.status(400).json({ error: 'exists' })
    res.json({ token: issueToken({ id: this.lastID }) })
  })
})

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'invalid' })
  db.get('SELECT * FROM users WHERE email=?', [email], (err, row) => {
    if (!row) return res.status(400).json({ error: 'invalid' })
    if (!bcrypt.compareSync(password, row.password_hash)) return res.status(400).json({ error: 'invalid' })
    res.json({ token: issueToken(row) })
  })
})

app.post('/api/keys/save', authed, (req, res) => {
  const { exchange, apiKey, apiSecret, passphrase } = req.body || {}
  if (!exchange || !apiKey || !apiSecret) return res.status(400).json({ error: 'invalid' })
  const k = getKey()
  const ek = encrypt(apiKey, k)
  const es = encrypt(apiSecret, k)
  const ep = passphrase ? encrypt(passphrase, k) : null
  const ts = Date.now()
  db.run('INSERT INTO api_keys(user_id,exchange,api_key,api_secret,passphrase,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,exchange) DO UPDATE SET api_key=excluded.api_key, api_secret=excluded.api_secret, passphrase=excluded.passphrase', [req.uid, exchange, ek, es, ep, ts], (err)=>{
    if (err) return res.status(500).json({ error: 'db' })
    res.json({ ok: true })
  })
})

app.get('/api/history', authed, (req, res) => {
  db.all('SELECT ts, nav_usd FROM nav_history WHERE user_id=? ORDER BY ts', [req.uid], (err, overall) => {
    db.all('SELECT ts, exchange, nav_usd FROM nav_history_ex WHERE user_id=? ORDER BY ts', [req.uid], (e2, exRows) => {
      const exchanges = { binance: [], okx: [] }
      (exRows||[]).forEach(r=>{ if(r.exchange==='binance') exchanges.binance.push({ts:r.ts, nav_usd:r.nav_usd}); if(r.exchange==='okx') exchanges.okx.push({ts:r.ts, nav_usd:r.nav_usd}) })
      res.json({ overall: overall||[], exchanges })
    })
  })
})

app.get('/api/positions', authed, (req, res) => {
  db.all('SELECT ts, exchange, asset, amount, value_usd FROM positions WHERE user_id=? AND ts=(SELECT MAX(ts) FROM positions WHERE user_id=?) ORDER BY value_usd DESC', [req.uid, req.uid], (err, rows) => {
    res.json({ items: rows || [] })
  })
})

async function computeForUser(uid) {
  return new Promise((resolve) => {
    db.all('SELECT * FROM api_keys WHERE user_id=?', [uid], async (err, keys) => {
      if (!keys || !keys.length) return resolve()
      const k = getKey()
      let total = 0
      const now = Date.now()
      const pos = []
      const exTotals = {}
      for (const row of keys) {
        const ex = row.exchange
        const ak = decrypt(row.api_key.toString(), k)
        const as = decrypt(row.api_secret.toString(), k)
        const pp = row.passphrase ? decrypt(row.passphrase.toString(), k) : undefined
        try {
          let balances = []
          if (ex === 'binance') balances = await binanceBalances(ak, as)
          if (ex === 'okx') balances = await okxBalances(ak, as, pp)
          const symbols = balances.map(b => b.asset)
          let priceMap = {}
          if (ex === 'binance') priceMap = await binancePrices(symbols)
          if (ex === 'okx') priceMap = await okxPrices(symbols)
          for (const b of balances) {
            const p = priceMap[b.asset] || 0
            const v = b.amount * p
            total += v
            exTotals[ex] = (exTotals[ex] || 0) + v
            pos.push([uid, now, ex, b.asset, b.amount, v])
          }
        } catch {}
      }
      db.run('INSERT INTO nav_history(user_id,ts,nav_usd) VALUES(?,?,?)', [uid, now, total])
      const exStmt = db.prepare('INSERT INTO nav_history_ex(user_id,ts,exchange,nav_usd) VALUES(?,?,?,?)')
      Object.entries(exTotals).forEach(([ex, v]) => exStmt.run([uid, now, ex, v]))
      exStmt.finalize()
      if (pos.length) {
        const stmt = db.prepare('INSERT INTO positions(user_id,ts,exchange,asset,amount,value_usd) VALUES(?,?,?,?,?,?)')
        pos.forEach(p => stmt.run(p))
        stmt.finalize()
      }
      resolve()
    })
  })
}

function computeAll() {
  db.all('SELECT id FROM users', [], async (err, rows) => {
    if (!rows) return
    for (const r of rows) await computeForUser(r.id)
  })
}

cron.schedule('*/15 * * * *', () => { computeAll() })

const port = process.env.PORT || 4000
app.listen(port, () => { console.log(`listening on :${port}`) })
app.get('/health', (req, res) => res.send('ok'))
