import { notFound } from 'next/navigation'
import ProjectDetail from '@/features/work/components/ProjectDetail'
import StructuredData from '@/components/seo/StructuredData'
import { getPublishedProject, getAdjacentProjects, getPublishedProjects } from '@/server/queries/projects'
import { absoluteUrl, createPageMetadata } from '@/server/seo'
import { SITE } from '@/config/site'

export async function generateStaticParams() { return (await getPublishedProjects()).map(project => ({slug:project.slug})) }

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const project = await getPublishedProject((await params).slug)
  if (!project) return { title: 'Project Not Found', robots: { index: false, follow: false } }
  return createPageMetadata({
    title: project.seoTitle || project.title,
    absoluteTitle: !!project.seoTitle,
    description: project.seoDescription || project.shortDescription || project.title,
    path: '/work/' + project.slug,
    image: project.ogImageUrl || project.featuredImageUrl || project.thumbnailUrl,
  })
}

export default async function ProjectPage({ params }: Props) {
  const project = await getPublishedProject((await params).slug)
  if (!project) notFound()
  const { prev, next } = await getAdjacentProjects(project.id)
  return <>
    <StructuredData data={{ '@context': 'https://schema.org', '@type': 'CreativeWork', name: project.title,
      url: absoluteUrl('/work/' + project.slug), description: project.shortDescription || undefined,
      image: absoluteUrl(project.featuredImageUrl || project.thumbnailUrl || SITE.shareImage),
      dateModified: project.updatedAt.toISOString(), creator: { '@type': 'Person', name: SITE.author, url: absoluteUrl('/about') } }} />
    <ProjectDetail project={project} prev={prev} next={next} />
  </>
}
