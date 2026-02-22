const bcrypt = require('bcryptjs')
const db = require('./_db')
const { issue } = require('./_jwt')
const { ok, bad, json } = require('./_util')

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 200, {})
  if (req.method !== 'POST') return bad(res, 'invalid')
  try{
    const { email, password } = JSON.parse(req.body || '{}')
    if(!email||!password) return bad(res,'invalid')
    const hash = bcrypt.hashSync(password, 10)
    const ts = Date.now()
    const r = await db.query('INSERT INTO users(email,password_hash,created_at) VALUES($1,$2,$3) RETURNING id',[email,hash,ts])
    return ok(res,{ token: issue(r.rows[0].id) })
  }catch(e){ return bad(res,'exists') }
}

