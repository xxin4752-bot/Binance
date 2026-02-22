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
    const latestTs = (await db.query('SELECT MAX(ts) AS ts FROM positions WHERE user_id=$1',[uid])).rows[0]?.ts
    const rows = latestTs? (await db.query('SELECT ts, exchange, asset, amount, value_usd FROM positions WHERE user_id=$1 AND ts=$2 ORDER BY value_usd DESC',[uid, latestTs])).rows : []
    return ok(res,{ items: rows })
  }catch(e){ return unauthorized(res) }
}

