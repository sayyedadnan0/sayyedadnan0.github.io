import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
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
    const { name, slug, color, order } = body

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(slug ? { slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-') } : {}),
        ...(color !== undefined ? { color } : {}),
        ...(order !== undefined ? { order: Number(order) } : {}),
      },
    })

    try {
      revalidatePath('/work')
      revalidatePath('/')
    } catch {}

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update category error:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const unauthorized = requireAdmin(request)
  if (unauthorized) return unauthorized

  const { id } = await params
  try {
    // Unlink category from projects before delete
    await prisma.project.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    })

    await prisma.category.delete({ where: { id } })

    try {
      revalidatePath('/work')
      revalidatePath('/')
    } catch {}

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete category error:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
