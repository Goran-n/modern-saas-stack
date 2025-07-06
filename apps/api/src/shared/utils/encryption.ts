import crypto from 'crypto'
import { getConfig } from '../../config/config'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16
const ITERATIONS = 100000
const KEY_LENGTH = 32

function getEncryptionKey(): Buffer {
  const config = getConfig()
  const masterKey = config.JWT_KEY || config.DATABASE_URL || 'default-insecure-key'
  
  // Derive a key from the master key
  const salt = crypto.createHash('sha256').update('kibly-encryption-salt').digest()
  return crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha256')
}

export async function encrypt(text: string): Promise<string> {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ])
  
  const tag = cipher.getAuthTag()
  
  // Combine iv + tag + encrypted
  const combined = Buffer.concat([iv, tag, encrypted])
  
  return combined.toString('base64')
}

export async function decrypt(encryptedText: string): Promise<string> {
  const key = getEncryptionKey()
  const combined = Buffer.from(encryptedText, 'base64')
  
  // Extract iv, tag, and encrypted data
  const iv = combined.slice(0, IV_LENGTH)
  const tag = combined.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = combined.slice(IV_LENGTH + TAG_LENGTH)
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])
  
  return decrypted.toString('utf8')
}

// Hash function for non-reversible data
export function hash(text: string): string {
  return crypto
    .createHash('sha256')
    .update(text)
    .digest('hex')
}