import { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/server/prisma'
import AdminProjectsList from '@/features/admin/components/AdminProjectsList'

export const metadata: Metadata = {
  title: { absolute: 'Projects — ADNAN CMS' },
  robots: { index: false, follow: false },
}

export default async function AdminProjectsPage() {
  const projects = await prisma.project.findMany({
    include: { category: true },
    orderBy: { order: 'asc' },
  })

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-text mb-1">Projects</h1>
          <p className="text-text-secondary text-sm">{projects.length} total projects</p>
        </div>
        <Link
          href="/admin/projects/new"
          className="btn-primary"
        >
          <span className="btn-primary-label">
            + New Project
          </span>
          <span className="btn-primary-glow" aria-hidden="true" />
        </Link>
      </div>
      <AdminProjectsList projects={projects} />
    </div>
  )
}
