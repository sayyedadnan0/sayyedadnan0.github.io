import type { MetadataRoute } from 'next'
import { absoluteUrl, siteIndexable } from '@/server/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: siteIndexable
      ? { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }
      : { userAgent: '*', disallow: '/' },
    ...(siteIndexable ? { sitemap: absoluteUrl('/sitemap.xml') } : {}),
  }
}
