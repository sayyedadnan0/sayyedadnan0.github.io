import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/prisma'
import { rateLimit, getClientIp } from '@/server/api'
import { validateContact } from '@/features/contact/validation'

export async function POST(request: NextRequest) {
  const maxRequests = Math.max(1, Number.parseInt(process.env.RATE_LIMIT_MAX || '5', 10) || 5)
  const windowMs = Math.max(1000, Number.parseInt(process.env.RATE_LIMIT_WINDOW || '3600000', 10) || 3600000)
  if (!rateLimit(`contact:${getClientIp(request)}`, maxRequests, windowMs)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let body: unknown
  try {
    const text = await request.text()
    if (text.length > 20000) return NextResponse.json({ error: 'Your message is too long.' }, { status: 413 })
    body = JSON.parse(text)
  } catch { return NextResponse.json({ error: 'Please send a valid contact form.' }, { status: 400 }) }

  const validated = validateContact(body)
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 })
  if (typeof (body as Record<string, unknown>).website === 'string' && (body as Record<string, string>).website.trim()) {
    return NextResponse.json({ success: true, message: 'Your message has been received.' })
  }
  try {
    await prisma.contactSubmission.create({ data: validated.data })
    return NextResponse.json({ success: true, message: 'Your message has been received.' })
  } catch (error) {
    console.error('Could not save contact enquiry:', error)
    return NextResponse.json({ error: 'Your message could not be saved. Please try again or contact me by email.' }, { status: 500 })
  }
}
