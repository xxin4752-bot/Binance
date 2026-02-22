import crypto from 'crypto'
import axios from 'axios'

const base = 'https://api.binance.com'

function sign(query, secret) {
  return crypto.createHmac('sha256', secret).update(query).digest('hex')
}

export async function getAccountBalances(key, secret) {
  const ts = Date.now()
  const qs = `timestamp=${ts}&recvWindow=5000`
  const sig = sign(qs, secret)
  const url = `${base}/api/v3/account?${qs}&signature=${sig}`
  const res = await axios.get(url, { headers: { 'X-MBX-APIKEY': key } })
  const nonzero = res.data.balances.filter(b => parseFloat(b.free) + parseFloat(b.locked) > 0)
  return nonzero.map(b => ({ asset: b.asset, amount: parseFloat(b.free) + parseFloat(b.locked) }))
}

export async function getUSDTPriceMap(symbols) {
  const out = {}
  const batches = []
  for (const s of symbols) {
    if (s === 'USDT' || s === 'BUSD' || s === 'FDUSD' || s === 'USDC') { out[s] = 1; continue }
    batches.push(`${s}USDT`)
  }
  if (batches.length) {
    const all = await Promise.allSettled(batches.map(sym => axios.get(`${base}/api/v3/ticker/price`, { params: { symbol: sym } })))
    all.forEach((r, i) => { if (r.status === 'fulfilled') { out[batches[i].replace('USDT','')] = parseFloat(r.value.data.price) } })
  }
  return out
}

