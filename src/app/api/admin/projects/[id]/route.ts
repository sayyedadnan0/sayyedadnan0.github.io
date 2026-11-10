import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/server/prisma'
import { requireAdmin } from '@/server/api'
import { Prisma } from '@prisma/client'
import { serializeGallery } from '@/server/services/project-media'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  const unauthorized = requireAdmin(request)
  if (unauthorized) return unauthorized

  const { id } = await params
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      category: true,
      gallery: { orderBy: { order: 'asc' } },
      sections: { orderBy: { order: 'asc' } },
    },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}



export async function PUT(request: NextRequest, { params }: Params) {
  const unauthorized = requireAdmin(request)
  if (unauthorized) return unauthorized

  const { id } = await params
  try {
    const body = await request.json()
    const { gallery, tools, tags, slug, ...data } = body
    delete data.sections
    delete data.category

    const existingProject = await prisma.project.findUnique({ where: { id } })
    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    let cleanSlug = existingProject.slug
    if (slug) {
      cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
      if (cleanSlug !== existingProject.slug) {
        const slugExists = await prisma.project.findFirst({
          where: { slug: cleanSlug, NOT: { id } },
        })
        if (slugExists) {
          return NextResponse.json({ error: 'Slug already in use by another project' }, { status: 409 })
        }
      }
    }

    const processedTools = Array.isArray(tools) ? JSON.stringify(tools) : tools !== undefined ? tools : undefined
    const processedTags = Array.isArray(tags) ? JSON.stringify(tags) : tags !== undefined ? tags : undefined

    const updateData: Prisma.ProjectUpdateInput = {
      ...data,
      slug: cleanSlug,
    }
    if (processedTools !== undefined) updateData.tools = processedTools
    if (processedTags !== undefined) updateData.tags = processedTags

    // Update project attributes
    await prisma.project.update({
      where: { id },
      data: updateData,
    })

    // If gallery is explicitly sent, replace gallery items
    if (Array.isArray(gallery)) {
      await prisma.projectMedia.deleteMany({ where: { projectId: id } })
      if (gallery.length > 0) {
        await prisma.projectMedia.createMany({
          data: serializeGallery(gallery).map(item => ({ projectId: id, ...item })),
        })
      }
    }

    // Refresh project with gallery
    const refreshed = await prisma.project.findUnique({
      where: { id },
      include: {
        category: true,
        gallery: { orderBy: { order: 'asc' } },
      },
    })

    try {
      revalidatePath('/', 'layout')
      revalidatePath('/')
      revalidatePath('/work')
      revalidatePath(`/work/${cleanSlug}`)
      if (existingProject.slug !== cleanSlug) {
        revalidatePath(`/work/${existingProject.slug}`)
      }
    } catch {}

    return NextResponse.json(refreshed)
  } catch (error) {
    console.error('Update project error:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const unauthorized = requireAdmin(request)
  if (unauthorized) return unauthorized

  const { id } = await params
  try {
    const project = await prisma.project.findUnique({ where: { id } })
    if (project) {
      await prisma.project.delete({ where: { id } })
      try {
        revalidatePath('/', 'layout')
        revalidatePath('/')
        revalidatePath('/work')
        revalidatePath(`/work/${project.slug}`)
      } catch {}
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete project error:', error)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
