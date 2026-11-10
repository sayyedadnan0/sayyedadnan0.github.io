import { Metadata } from 'next'
import { prisma } from '@/server/prisma'
import SiteSettingsEditor from '@/features/admin/components/SiteSettingsEditor'

export const metadata: Metadata = {
  title: { absolute: 'Site Settings & Content — ADNAN CMS' },
  robots: { index: false, follow: false },
}

export default async function SettingsPage() {
  const [settingsList, contentsList, socialsList] = await Promise.all([
    prisma.siteSettings.findMany(),
    prisma.pageContent.findMany(),
    prisma.socialLink.findMany({ orderBy: { order: 'asc' } }),
  ])

  const settings = Object.fromEntries(settingsList.map((s) => [s.key, s.value]))
  const pageContent: Record<string, Record<string, string>> = {}

  for (const item of contentsList) {
    if (!pageContent[item.page]) {
      pageContent[item.page] = {}
    }
    pageContent[item.page][`${item.section}_${item.key}`] = item.value
  }

  return (
    <SiteSettingsEditor
      initialSettings={settings}
      initialPageContent={pageContent}
      initialSocials={socialsList}
    />
  )
}
