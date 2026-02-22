const { json } = require('./_util')

module.exports = async (req, res) => json(res, 200, { ok: true })

