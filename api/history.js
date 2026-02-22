const db = require('./_db')
const { verify } = require('./_jwt')
const { ok, bad, unauthorized, json } = require('./_util')

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 200, {})
  if (req.method !== 'GET') return bad(res, 'invalid')
  try{
    const h = req.headers['authorization']||''
    const t = h.split(' ')[1]
    const { uid } = verify(t)
    const overall = (await db.query('SELECT ts, nav_usd FROM nav_history WHERE user_id=$1 ORDER BY ts',[uid])).rows
    const exRows = (await db.query('SELECT ts, exchange, nav_usd FROM nav_history_ex WHERE user_id=$1 ORDER BY ts',[uid])).rows
    const exchanges = { binance: [], okx: [] }
    exRows.forEach(r=>{ if(r.exchange==='binance') exchanges.binance.push({ts:Number(r.ts), nav_usd:Number(r.nav_usd)}) ; if(r.exchange==='okx') exchanges.okx.push({ts:Number(r.ts), nav_usd:Number(r.nav_usd)}) })
    return ok(res,{ overall, exchanges })
  }catch(e){ return unauthorized(res) }
}

