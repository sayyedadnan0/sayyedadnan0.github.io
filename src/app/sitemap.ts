import type { MetadataRoute } from 'next'
import { getSitemapProjects } from '@/server/queries/projects'
import { absoluteUrl } from '@/server/seo'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await getSitemapProjects()
  return [
    ...['/', '/work', '/about', '/contact'].map(path => ({ url: absoluteUrl(path) })),
    ...projects.map(project => ({ url: absoluteUrl(`/work/${project.slug}`), lastModified: project.updatedAt })),
  ]
}
