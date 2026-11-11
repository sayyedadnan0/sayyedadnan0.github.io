import type { Metadata } from 'next'
import { SITE } from '@/config/site'
import { isPublicSite, resolveSiteUrl } from '@/lib/url'

export const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || process.env.RENDER_EXTERNAL_URL)
export const siteIndexable = isPublicSite(siteUrl, process.env.SITE_INDEXABLE)

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl).href
}

interface PageMetadata {
  title: string
  description: string
  path: string
  image?: string | null
  absoluteTitle?: boolean
}

export function createPageMetadata({ title, description, path, image, absoluteTitle }: PageMetadata): Metadata {
  const shareImage = image || SITE.shareImage
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: { type: 'website', title, description, url: absoluteUrl(path), siteName: SITE.title, images: [shareImage] },
    twitter: { card: 'summary_large_image', title, description, images: [shareImage] },
  }
}
