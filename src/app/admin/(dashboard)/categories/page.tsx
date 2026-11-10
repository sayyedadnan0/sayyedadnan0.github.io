import { Metadata } from 'next'
import { prisma } from '@/server/prisma'
import CategoriesManager from '@/features/admin/components/CategoriesManager'

export const metadata: Metadata = {
  title: { absolute: 'Categories — ADNAN CMS' },
  robots: { index: false, follow: false },
}

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { projects: true } },
    },
    orderBy: { order: 'asc' },
  })

  return <CategoriesManager initialCategories={categories} />
}
