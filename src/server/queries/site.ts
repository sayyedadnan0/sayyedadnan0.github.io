import { cache } from 'react'
import { prisma } from '@/server/prisma'
import { DEFAULT_SETTINGS, DEFAULT_SOCIALS } from '@/config/site'
import type { SocialLink, SiteSettings } from '@/types/site'

export const getAuthoritativeSocials = cache(async (): Promise<SocialLink[]> => {
  try {
    const list = await prisma.socialLink.findMany({ where: { visible: true }, orderBy: { order: 'asc' } })
    return list.map(({ platform, url, label }) => ({ platform, url, label: label || platform }))
  } catch (error) {
    console.error('Could not load social links:', error)
    return DEFAULT_SOCIALS
  }
})

export const getAuthoritativeSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const settings = await prisma.siteSettings.findMany()
    return Object.fromEntries(settings.map(({ key, value }) => [key, value]))
  } catch (error) {
    console.error('Could not load website settings:', error)
    return DEFAULT_SETTINGS
  }
})

export const getSiteContext = cache(async () => {
  const [settings, socials] = await Promise.all([getAuthoritativeSettings(), getAuthoritativeSocials()])
  return { settings, socials }
})
