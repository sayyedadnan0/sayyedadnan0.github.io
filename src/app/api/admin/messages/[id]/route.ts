import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/prisma'
import { requireAdmin } from '@/server/api'

interface Params {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: Params) {
  const unauthorized = requireAdmin(request)
  if (unauthorized) return unauthorized

  const { id } = await params
  try {
    const body = await request.json()
    const { read } = body

    const updated = await prisma.contactSubmission.update({
      where: { id },
      data: { read: Boolean(read) },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update message error:', error)
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const unauthorized = requireAdmin(request)
  if (unauthorized) return unauthorized

  const { id } = await params
  try {
    await prisma.contactSubmission.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete message error:', error)
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
  }
}
