const axios = require('axios')
const crypto = require('crypto')

async function binanceBalances(key, secret){
  const base='https://api.binance.com'
  const ts=Date.now()
  const qs=`timestamp=${ts}&recvWindow=5000`
  const sig=crypto.createHmac('sha256', secret).update(qs).digest('hex')
  const url=`${base}/api/v3/account?${qs}&signature=${sig}`
  const res=await axios.get(url,{headers:{'X-MBX-APIKEY':key}})
  return res.data.balances.filter(b=>parseFloat(b.free)+parseFloat(b.locked)>0).map(b=>({asset:b.asset,amount:parseFloat(b.free)+parseFloat(b.locked)}))
}

async function binancePrices(symbols){
  const base='https://api.binance.com'
  const out={}
  const reqs=[]
  for(const s of symbols){ if(['USDT','BUSD','FDUSD','USDC'].includes(s)){out[s]=1;continue} reqs.push(s+'USDT') }
  const all=await Promise.allSettled(reqs.map(sym=>axios.get(`${base}/api/v3/ticker/price`,{params:{symbol:sym}})))
  all.forEach((r,i)=>{ if(r.status==='fulfilled'){ out[reqs[i].replace('USDT','')]=parseFloat(r.value.data.price) } })
  return out
}

async function okxBalances(key, secret, passphrase){
  const base='https://www.okx.com'
  const ts=new Date().toISOString(); const path='/api/v5/account/balance'
  const sign=crypto.createHmac('sha256', secret).update(ts+'GET'+path).digest('base64')
  const res=await axios.get(base+path,{headers:{'OK-ACCESS-KEY':key,'OK-ACCESS-PASSPHRASE':passphrase,'OK-ACCESS-TIMESTAMP':ts,'OK-ACCESS-SIGN':sign}})
  const details=res.data.data?.[0]?.details||[]
  return details.filter(d=>parseFloat(d.cashBal)||parseFloat(d.eq)).map(d=>({asset:d.ccy,amount:parseFloat(d.cashBal||d.eq||'0')}))
}

async function okxPrices(symbols){
  const base='https://www.okx.com'
  const out={}
  const reqs=[]
  for(const s of symbols){ if(['USDT','USDC'].includes(s)){out[s]=1;continue} reqs.push({s,url:`${base}/api/v5/market/ticker`,params:{instId:`${s}-USDT`}}) }
  const all=await Promise.allSettled(reqs.map(r=>axios.get(r.url,{params:r.params})))
  all.forEach((r,i)=>{ if(r.status==='fulfilled'){ const d=r.value.data.data?.[0]?.last; if(d) out[reqs[i].s]=parseFloat(d) } })
  return out
}

module.exports={binanceBalances,binancePrices,okxBalances,okxPrices}

