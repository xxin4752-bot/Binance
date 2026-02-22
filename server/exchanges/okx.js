import crypto from 'crypto'
import axios from 'axios'

const base = 'https://www.okx.com'

function sign(ts, method, path, body, secret) {
  const msg = ts + method.toUpperCase() + path + (body || '')
  return crypto.createHmac('sha256', secret).update(msg).digest('base64')
}

export async function getAccountBalances(key, secret, passphrase) {
  const ts = new Date().toISOString()
  const p = '/api/v5/account/balance'
  const s = sign(ts, 'GET', p, '', secret)
  const res = await axios.get(base + p, { headers: { 'OK-ACCESS-KEY': key, 'OK-ACCESS-PASSPHRASE': passphrase, 'OK-ACCESS-TIMESTAMP': ts, 'OK-ACCESS-SIGN': s } })
  const details = res.data.data?.[0]?.details || []
  return details.filter(d => parseFloat(d.cashBal) !== 0 || parseFloat(d.eq) !== 0).map(d => ({ asset: d.ccy, amount: parseFloat(d.cashBal || d.eq || '0') }))
}

export async function getUSDTPriceMap(symbols) {
  const out = {}
  const reqs = []
  for (const s of symbols) {
    if (s === 'USDT' || s === 'USDC') { out[s] = 1; continue }
    reqs.push({ s, url: `${base}/api/v5/market/ticker`, params: { instId: `${s}-USDT` } })
  }
  if (reqs.length) {
    const all = await Promise.allSettled(reqs.map(r => axios.get(r.url, { params: r.params })))
    all.forEach((r, i) => { if (r.status === 'fulfilled') { const d = r.value.data.data?.[0]?.last; if (d) out[reqs[i].s] = parseFloat(d) } })
  }
  return out
}

