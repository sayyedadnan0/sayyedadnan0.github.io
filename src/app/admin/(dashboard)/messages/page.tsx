import { Metadata } from 'next'
import { prisma } from '@/server/prisma'
import MessagesManager from '@/features/admin/components/MessagesManager'

export const metadata: Metadata = {
  title: { absolute: 'Messages — ADNAN CMS' },
  robots: { index: false, follow: false },
}

export default async function MessagesPage() {
  const messages = await prisma.contactSubmission.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return <MessagesManager initialMessages={messages} />
}
