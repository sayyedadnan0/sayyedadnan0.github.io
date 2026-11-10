import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/prisma'
import { requireAdmin } from '@/server/api'

export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request)
  if (unauthorized) return unauthorized

  const messages = await prisma.contactSubmission.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(messages)
}
