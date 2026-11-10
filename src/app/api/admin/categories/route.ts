import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/server/prisma'
import { requireAdmin } from '@/server/api'

export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request)
  if (unauthorized) return unauthorized

  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { projects: true } },
    },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(categories)
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAdmin(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const { name, slug, color, order } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')

    const existing = await prisma.category.findFirst({
      where: { OR: [{ slug: cleanSlug }, { name }] },
    })

    if (existing) {
      return NextResponse.json({ error: 'Category name or slug already exists' }, { status: 409 })
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug: cleanSlug,
        color: color || '#E8C99A',
        order: Number(order) || 0,
      },
    })

    try {
      revalidatePath('/work')
      revalidatePath('/')
    } catch {}

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Create category error:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
