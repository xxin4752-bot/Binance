import crypto from 'crypto'

const algo = 'aes-256-gcm'

export function encrypt(plain, key) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(algo, key, iv)
  const enc = Buffer.concat([cipher.update(Buffer.from(plain, 'utf8')), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decrypt(b64, key) {
  const raw = Buffer.from(b64, 'base64')
  const iv = raw.subarray(0, 12)
  const tag = raw.subarray(12, 28)
  const data = raw.subarray(28)
  const decipher = crypto.createDecipheriv(algo, key, iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(data), decipher.final()])
  return dec.toString('utf8')
}

export function getKey() {
  const k = process.env.ENCRYPTION_KEY || ''
  if (k.length !== 64) throw new Error('invalid key')
  return Buffer.from(k, 'hex')
}

