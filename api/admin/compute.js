const db = require('../_db')
const { decrypt } = require('../_crypto')
const { binanceBalances, binancePrices, okxBalances, okxPrices } = require('../_exchanges')
const { json, ok, bad } = require('../_util')

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 200, {})
  if (req.method !== 'GET') return bad(res, 'invalid')
  if ((req.headers['x-cron-key']||'') !== (process.env.CRON_SECRET||'')) return bad(res,'forbidden')
  const users = (await db.query('SELECT id FROM users',[])).rows
  const now = Date.now()
  for (const u of users){
    const keys = (await db.query('SELECT * FROM api_keys WHERE user_id=$1',[u.id])).rows
    let total = 0
    const exTotals = {}
    const pos = []
    for(const row of keys){
      const ex = row.exchange
      const ak = decrypt(row.api_key)
      const as = decrypt(row.api_secret)
      const pp = row.passphrase? decrypt(row.passphrase): undefined
      try{
        let balances=[]
        if(ex==='binance') balances = await binanceBalances(ak, as)
        if(ex==='okx') balances = await okxBalances(ak, as, pp)
        const symbols = balances.map(b=>b.asset)
        let prices={}
        if(ex==='binance') prices = await binancePrices(symbols)
        if(ex==='okx') prices = await okxPrices(symbols)
        for(const b of balances){ const p = prices[b.asset]||0; const v = b.amount*p; total+=v; exTotals[ex]=(exTotals[ex]||0)+v; pos.push([u.id, now, ex, b.asset, b.amount, v]) }
      }catch(e){}
    }
    await db.query('INSERT INTO nav_history(user_id,ts,nav_usd) VALUES($1,$2,$3)',[u.id, now, total])
    for(const [ex,v] of Object.entries(exTotals)){
      await db.query('INSERT INTO nav_history_ex(user_id,ts,exchange,nav_usd) VALUES($1,$2,$3,$4)',[u.id, now, ex, v])
    }
    for(const p of pos){ await db.query('INSERT INTO positions(user_id,ts,exchange,asset,amount,value_usd) VALUES($1,$2,$3,$4,$5,$6)',p) }
  }
  return ok(res,{ok:true})
}

