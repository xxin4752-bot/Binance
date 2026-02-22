const jwt = require('jsonwebtoken')

function issue(uid){ return jwt.sign({ uid }, process.env.JWT_SECRET || 'dev', { expiresIn: '7d' }) }
function verify(token){ return jwt.verify(token, process.env.JWT_SECRET || 'dev') }

module.exports = { issue, verify }

