import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/server/prisma'
import { generateToken, createSessionCookie } from '@/server/auth'
import { rateLimit, getClientIp } from '@/server/api'

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 attempts per hour per IP
    const ip = getClientIp(request)
    const allowed = rateLimit(`login:${ip}`, 10, 3600000)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    // Find user
    const user = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    // Set cookie
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    })
    response.headers.set('Set-Cookie', createSessionCookie(token))

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
