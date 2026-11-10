import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (secret && secret.length >= 32) {
    return secret
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET must be defined with at least 32 characters in production.')
  }
  return 'adnan_dev_secure_jwt_secret_6f4b9c1d2e3a8f7e5b2d0c1'
}

const SESSION_COOKIE = 'adnan_admin_session'
const SESSION_DURATION = 7 * 24 * 60 * 60 // 7 days in seconds

export interface AdminUser {
  id: string
  email: string
  name: string
  role: string
}

export interface JWTPayload {
  userId: string
  email: string
  name: string
  role: string
  iat?: number
  exp?: number
}

export function generateToken(user: AdminUser): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: SESSION_DURATION }
  )
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null
    return verifyToken(token)
  } catch {
    return null
  }
}

export function getSessionFromRequest(request: NextRequest): JWTPayload | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

export function createSessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${SESSION_DURATION}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE
