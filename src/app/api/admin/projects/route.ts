import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/server/prisma'
import { requireAdmin } from '@/server/api'
import { serializeGallery } from '@/server/services/project-media'

export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request)
  if (unauthorized) return unauthorized

  const projects = await prisma.project.findMany({
    include: {
      category: true,
      gallery: { orderBy: { order: 'asc' } },
    },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(projects)
}



export async function POST(request: NextRequest) {
  const unauthorized = requireAdmin(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const { title, slug, gallery, tools, tags, ...rest } = body

    if (!title || !slug) {
      return NextResponse.json({ error: 'Title and slug are required' }, { status: 400 })
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')

    // Check slug uniqueness
    const existing = await prisma.project.findUnique({ where: { slug: cleanSlug } })
    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
    }

    const processedTools = Array.isArray(tools) ? JSON.stringify(tools) : tools || null
    const processedTags = Array.isArray(tags) ? JSON.stringify(tags) : tags || null

    const project = await prisma.project.create({
      data: {
        title,
        slug: cleanSlug,
        tools: processedTools,
        tags: processedTags,
        ...rest,
        gallery: Array.isArray(gallery) && gallery.length > 0 ? {
          create: serializeGallery(gallery),
        } : undefined,
      },
      include: {
        category: true,
        gallery: { orderBy: { order: 'asc' } },
      },
    })

    try {
      revalidatePath('/', 'layout')
      revalidatePath('/')
      revalidatePath('/work')
      revalidatePath(`/work/${project.slug}`)
    } catch {}

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Create project error:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
