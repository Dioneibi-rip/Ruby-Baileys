"use strict"

Object.defineProperty(exports, "__esModule", { value: true })

const nodeCrypto = require('crypto')

const MODULE_CANDIDATES = [
  process.env.BAILEYS_LIBSIGNAL_MODULE,
  '@itsukichan/libsignal-node',
  'libsignal-node',
  '@whiskeysockets/libsignal',
  '@nstar-y/libsignal',
  'libsignal'
].filter(Boolean)

const tryRequire = (id) => {
  try {
    return require(id)
  } catch {
    return null
  }
}

let loadedModule
let loadedModuleName
for (const candidate of MODULE_CANDIDATES) {
  const mod = tryRequire(candidate)
  if (mod) {
    loadedModule = mod
    loadedModuleName = candidate
    break
  }
}

if (!loadedModule) {
  throw new Error(`No compatible libsignal module found. Tried: ${MODULE_CANDIDATES.join(', ')}`)
}

const curve = loadedModule.curve || tryRequire(`${loadedModuleName}/src/curve`) || {}
const crypto = tryRequire(`${loadedModuleName}/src/crypto`) || {}

const toBuffer = (value) => {
  if (Buffer.isBuffer(value)) return value
  if (value instanceof Uint8Array) return Buffer.from(value)
  if (typeof value === 'string') return Buffer.from(value, 'base64')
  if (value && typeof value === 'object') return Buffer.from(Object.values(value))
  return Buffer.alloc(0)
}

const fallbackCalculateMAC = (key, data) => nodeCrypto.createHmac('sha256', toBuffer(key)).update(toBuffer(data)).digest()
const fallbackDeriveSecrets = (seed, salt, info) => {
  const i = toBuffer(info)
  const s = toBuffer(seed)
  const sl = toBuffer(salt)
  const first = nodeCrypto.createHmac('sha256', sl).update(Buffer.concat([i, s, Buffer.from([1])])).digest()
  const second = nodeCrypto.createHmac('sha256', sl).update(Buffer.concat([first, i, s, Buffer.from([2])])).digest()
  return [first, second]
}
const fallbackEncrypt = (key, plaintext, iv) => {
  const cipher = nodeCrypto.createCipheriv('aes-256-cbc', toBuffer(key), toBuffer(iv))
  return Buffer.concat([cipher.update(toBuffer(plaintext)), cipher.final()])
}
const fallbackDecrypt = (key, ciphertext, iv) => {
  const decipher = nodeCrypto.createDecipheriv('aes-256-cbc', toBuffer(key), toBuffer(iv))
  return Buffer.concat([decipher.update(toBuffer(ciphertext)), decipher.final()])
}

const compatCrypto = {
  calculateMAC: crypto.calculateMAC || fallbackCalculateMAC,
  deriveSecrets: crypto.deriveSecrets || fallbackDeriveSecrets,
  encrypt: crypto.encrypt || fallbackEncrypt,
  decrypt: crypto.decrypt || fallbackDecrypt
}

const compatCurve = {
  generateKeyPair: curve.generateKeyPair || (() => loadedModule.curve.generateKeyPair()),
  calculateAgreement: curve.calculateAgreement || ((pub, priv) => loadedModule.curve.calculateAgreement(pub, priv)),
  calculateSignature: curve.calculateSignature || ((priv, msg) => loadedModule.curve.calculateSignature(priv, msg)),
  verifySignature: curve.verifySignature || ((pub, msg, sig) => loadedModule.curve.verifySignature(pub, msg, sig))
}

module.exports = {
  libsignal: loadedModule,
  curve: compatCurve,
  groupCrypto: compatCrypto
}
