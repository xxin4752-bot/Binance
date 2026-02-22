const bcrypt = require('bcryptjs')
const db = require('./_db')
const { issue } = require('./_jwt')
const { ok, bad, json } = require('./_util')

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 200, {})
  if (req.method !== 'POST') return bad(res, 'invalid')
  try{
    const { email, password } = JSON.parse(req.body || '{}')
    const r = await db.query('SELECT * FROM users WHERE email=$1',[email])
    const row = r.rows[0]
    if(!row) return bad(res,'invalid')
    if(!bcrypt.compareSync(password, row.password_hash)) return bad(res,'invalid')
    return ok(res,{ token: issue(row.id) })
  }catch(e){ return bad(res,'invalid') }
}

