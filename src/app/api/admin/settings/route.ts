import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/server/prisma'
import { requireAdmin } from '@/server/api'

export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request)
  if (unauthorized) return unauthorized

  try {
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

    return NextResponse.json({
      settings,
      pageContent,
      socials: socialsList,
    })
  } catch (error) {
    console.error('Fetch settings error:', error)
    return NextResponse.json({ error: 'Failed to retrieve site settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAdmin(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const { settings, pageContent, socials } = body

    // 1. Update site settings
    if (settings && typeof settings === 'object') {
      for (const [key, val] of Object.entries(settings)) {
        if (typeof val === 'string') {
          await prisma.siteSettings.upsert({
            where: { key },
            update: { value: val },
            create: { key, value: val, type: 'text' },
          })
        }
      }
    }

    // 2. Update page content
    if (pageContent && typeof pageContent === 'object') {
      for (const [page, sectionMap] of Object.entries(pageContent)) {
        if (sectionMap && typeof sectionMap === 'object') {
          for (const [compositeKey, val] of Object.entries(sectionMap as Record<string, string>)) {
            const underscoreIdx = compositeKey.indexOf('_')
            const section = underscoreIdx !== -1 ? compositeKey.slice(0, underscoreIdx) : 'general'
            const key = underscoreIdx !== -1 ? compositeKey.slice(underscoreIdx + 1) : compositeKey

            await prisma.pageContent.upsert({
              where: {
                page_section_key: {
                  page,
                  section,
                  key,
                },
              },
              update: { value: String(val) },
              create: {
                page,
                section,
                key,
                value: String(val),
                type: 'text',
              },
            })
          }
        }
      }
    }

    // 3. Update socials
    if (Array.isArray(socials)) {
      // Clear and re-populate to maintain exact user ordering & visibility
      await prisma.socialLink.deleteMany({})
      for (let i = 0; i < socials.length; i++) {
        const item = socials[i]
        if (item.platform && item.url) {
          await prisma.socialLink.create({
            data: {
              platform: item.platform,
              url: item.url,
              label: item.label || item.platform,
              icon: item.icon || null,
              order: i + 1,
              visible: item.visible !== false,
            },
          })
        }
      }
    }

    // Revalidate public caches for instant update across the site
    try {
      revalidatePath('/', 'layout')
      revalidatePath('/')
      revalidatePath('/work')
      revalidatePath('/about')
      revalidatePath('/contact')
    } catch {
      // Revalidation best effort
    }

    return NextResponse.json({ success: true, message: 'Settings published successfully' })
  } catch (error) {
    console.error('Save settings error:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
