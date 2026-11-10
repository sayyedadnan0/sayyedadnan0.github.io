import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/server/prisma'
import ProjectEditor from '@/features/admin/components/ProjectEditor'

export const metadata: Metadata = {
  title: { absolute: 'Edit Project — ADNAN CMS' },
  robots: { index: false, follow: false },
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params

  if (id === 'new') {
    const categories = await prisma.category.findMany({ orderBy: { order: 'asc' } })
    return <ProjectEditor project={null} categories={categories} />
  }

  const [project, categories] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        category: true,
        gallery: { orderBy: { order: 'asc' } },
        sections: { orderBy: { order: 'asc' } },
      },
    }),
    prisma.category.findMany({ orderBy: { order: 'asc' } }),
  ])

  if (!project) notFound()

  return <ProjectEditor project={project} categories={categories} />
}
