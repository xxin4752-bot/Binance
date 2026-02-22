const db = require('./_db')
const { verify } = require('./_jwt')
const { encrypt } = require('./_crypto')
const { ok, bad, unauthorized, json } = require('./_util')

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 200, {})
  if (req.method !== 'POST') return bad(res, 'invalid')
  try{
    const h = req.headers['authorization']||''
    const t = h.split(' ')[1]
    const { uid } = verify(t)
    const { exchange, apiKey, apiSecret, passphrase } = JSON.parse(req.body || '{}')
    if(!exchange||!apiKey||!apiSecret) return bad(res,'invalid')
    const ts = Date.now()
    const ek = encrypt(apiKey)
    const es = encrypt(apiSecret)
    const ep = passphrase? encrypt(passphrase): null
    await db.query('INSERT INTO api_keys(user_id,exchange,api_key,api_secret,passphrase,created_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(user_id,exchange) DO UPDATE SET api_key=EXCLUDED.api_key, api_secret=EXCLUDED.api_secret, passphrase=EXCLUDED.passphrase',[uid, exchange, ek, es, ep, ts])
    return ok(res,{ok:true})
  }catch(e){ return unauthorized(res) }
}

