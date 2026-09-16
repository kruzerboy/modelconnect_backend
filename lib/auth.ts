import { SignJWT, jwtVerify } from 'jose'
import bcryptjs from 'bcryptjs'
import { getValidatedEnv } from './env'

const JWT_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '7d'
const PASSWORD_RESET_EXPIRY = '1h'

function getKey() {
  const env = getValidatedEnv()
  return new TextEncoder().encode(env.JWT_SECRET)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcryptjs.genSalt(10)
  return bcryptjs.hash(password, salt)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash)
}

export async function createAccessToken(userId: string, role: string): Promise<string> {
  const key = getKey()
  const token = await new SignJWT({
    userId,
    role,
    type: 'access',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key)

  return token
}

export async function createRefreshToken(userId: string): Promise<string> {
  const key = getKey()
  const token = await new SignJWT({
    userId,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key)

  return token
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const key = getKey()
  const token = await new SignJWT({
    userId,
    type: 'password-reset',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key)

  return token
}

export interface TokenPayload {
  userId: string
  role?: string
  type: 'access' | 'refresh' | 'password-reset'
  iat: number
  exp: number
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const key = getKey()
    const verified = await jwtVerify(token, key)
    return (verified.payload as unknown) as TokenPayload
  } catch {
    return null
  }
}

export async function verifyAccessToken(token: string): Promise<{ userId: string; role: string } | null> {
  const payload = await verifyToken(token)
  if (payload?.type === 'access' && payload.userId && payload.role) {
    return { userId: payload.userId, role: payload.role }
  }
  return null
}

export async function verifyRefreshToken(token: string): Promise<{ userId: string } | null> {
  const payload = await verifyToken(token)
  if (payload?.type === 'refresh' && payload.userId) {
    return { userId: payload.userId }
  }
  return null
}

export async function verifyPasswordResetToken(token: string): Promise<{ userId: string } | null> {
  const payload = await verifyToken(token)
  if (payload?.type === 'password-reset' && payload.userId) {
    return { userId: payload.userId }
  }
  return null
}
