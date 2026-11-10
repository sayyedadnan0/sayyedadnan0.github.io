import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from './auth'

// Simple in-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 3600000
): boolean {
  const now = Date.now()
  const existing = rateLimitStore.get(identifier)

  if (!existing || now > existing.resetAt) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs })
    return true // allowed
  }

  if (existing.count >= maxRequests) {
    return false // blocked
  }

  existing.count++
  return true // allowed
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}

export function requireAdmin(request: NextRequest): NextResponse | null {
  const session = getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function sanitizeString(str: string, maxLength: number = 1000): string {
  return str.trim().slice(0, maxLength)
}

// CORS headers for API routes
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export function apiResponse<T>(
  data: T,
  status: number = 200,
  headers?: Record<string, string>
): NextResponse {
  return NextResponse.json(data, { status, headers })
}

export function apiError(
  message: string,
  status: number = 400,
  details?: unknown
): NextResponse {
  return NextResponse.json({ error: message, details }, { status })
}
