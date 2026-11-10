import WorkGallery from '@/features/work/components/WorkGallery'
import { getPublishedProjects, getCategories } from '@/server/queries/projects'
import { createPageMetadata } from '@/server/seo'

export const metadata = createPageMetadata({ title: 'Selected Work', path: '/work', description: 'Explore graphic design, animated films, motion graphics, video editing, advertising, and 3D work by Sayyed Adnan Ali.' })

export default async function WorkPage() {
  const [projects, categories] = await Promise.all([getPublishedProjects(), getCategories()])
  return <WorkGallery projects={projects} categories={categories} />
}
