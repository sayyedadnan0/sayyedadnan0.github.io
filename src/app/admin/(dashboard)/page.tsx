import { Metadata } from 'next'
import AdminDashboard from '@/features/admin/components/AdminDashboard'
import { prisma } from '@/server/prisma'

export const metadata: Metadata = {
  title: { absolute: 'Dashboard — ADNAN CMS' },
  robots: { index: false, follow: false },
}

async function getDashboardStats() {
  const [totalProjects, publishedProjects, draftProjects, totalMedia, recentMessages] =
    await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { published: true } }),
      prisma.project.count({ where: { published: false } }),
      prisma.mediaAsset.count(),
      prisma.contactSubmission.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

  return { totalProjects, publishedProjects, draftProjects, totalMedia, recentMessages }
}

export default async function AdminPage() {
  const stats = await getDashboardStats()
  return <AdminDashboard stats={stats} />
}
