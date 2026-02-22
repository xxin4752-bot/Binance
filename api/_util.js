function json(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CRON-KEY')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.end(JSON.stringify(data))
}

function ok(res, data) { json(res, 200, data) }
function bad(res, error) { json(res, 400, { error }) }
function unauthorized(res) { json(res, 401, { error: 'unauthorized' }) }

export { json, ok, bad, unauthorized }

