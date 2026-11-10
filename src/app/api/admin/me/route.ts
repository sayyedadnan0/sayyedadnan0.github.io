import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/server/auth'

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  return NextResponse.json({
    user: { email: session.email, name: session.name, role: session.role },
  })
}
