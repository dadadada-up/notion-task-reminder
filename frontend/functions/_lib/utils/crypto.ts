// =============================================
// Crypto utilities using Web Crypto API
// - JWT sign/verify (HMAC-SHA256)
// - Password hashing (PBKDF2-SHA256)
// - UUID generation
// =============================================

import type { JWTPayload } from '../types'

// --- UUID ---
export function generateId(): string {
  return crypto.randomUUID()
}

// --- Password Hashing (PBKDF2) ---

async function getKey(salt: Uint8Array, secret: string): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    true,
    ['verify']
  )
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await getKey(salt, password)
  const exported = await crypto.subtle.exportKey('raw', key) as ArrayBuffer
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
  const hashHex = Array.from(new Uint8Array(exported)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${saltHex}:${hashHex}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, expectedHash] = stored.split(':')
  if (!saltHex || !expectedHash) return false
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))
  const key = await getKey(salt, password)
  const exported = await crypto.subtle.exportKey('raw', key) as ArrayBuffer
  const actualHash = Array.from(new Uint8Array(exported)).map(b => b.toString(16).padStart(2, '0')).join('')
  return actualHash === expectedHash
}

// --- JWT (HMAC-SHA256) ---

function base64UrlEncode(data: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function signJwt(payload: object, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)))
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)))
  const message = `${headerB64}.${payloadB64}`

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  const signatureB64 = base64UrlEncode(new Uint8Array(signature))

  return `${message}.${signatureB64}`
}

async function verifyJwt(token: string, secret: string): Promise<object | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [headerB64, payloadB64, signatureB64] = parts
  const message = `${headerB64}.${payloadB64}`

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    base64UrlDecode(signatureB64),
    new TextEncoder().encode(message)
  )

  if (!valid) return null

  try {
    return JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)))
  } catch {
    return null
  }
}

// --- Public API ---

export async function createToken(payload: { userId: string; username: string; role: string }, secret: string): Promise<string> {
  const jwtPayload: JWTPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 72 * 60 * 60, // 72 hours
  }
  return signJwt(jwtPayload, secret)
}

export async function verifyToken(token: string, secret: string): Promise<JWTPayload | null> {
  const payload = await verifyJwt(token, secret) as JWTPayload | null
  if (!payload || !payload.exp) return null
  if (payload.exp < Math.floor(Date.now() / 1000)) return null
  return payload
}
