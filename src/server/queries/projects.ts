import { cache } from 'react'
import { prisma } from '@/server/prisma'
import { SITE } from '@/config/site'

export const getPublishedProjects = cache(() => prisma.project.findMany({
  where: { published: true },
  include: { category: true },
  orderBy: [{ order: 'asc' }, { id: 'asc' }],
}))

export const getCategories = cache(() => prisma.category.findMany({ orderBy: { order: 'asc' } }))

export const getFeaturedProjects = cache(() => prisma.project.findMany({
  where: { published: true, featured: true },
  select: {
    id: true, title: true, slug: true, accentColor: true, thumbnailUrl: true,
    featuredImageUrl: true, heroImageUrl: true, client: true, year: true, order: true,
    category: { select: { name: true } },
  },
  orderBy: [{ order: 'asc' }, { id: 'asc' }],
  take: SITE.featuredProjectLimit,
}))

// Shared by metadata and page rendering; React cache lasts only for the current render request.
export const getPublishedProject = cache((slug: string) => prisma.project.findUnique({
  where: { slug, published: true },
  include: { category: true, gallery: { orderBy: { order: 'asc' } }, sections: { where: { visible: true }, orderBy: { order: 'asc' } } },
}))

export async function getAdjacentProjects(id: string) {
  const projects = await getPublishedProjects()
  const index = projects.findIndex(project => project.id === id)
  return { prev: index > 0 ? projects[index - 1] : null, next: index >= 0 ? projects[index + 1] || null : null }
}

export const getSitemapProjects = cache(() => prisma.project.findMany({
  where: { published: true }, select: { slug: true, updatedAt: true }, orderBy: { order: 'asc' },
}))
