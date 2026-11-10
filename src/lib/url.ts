export function resolveSiteUrl(value?: string): URL {
  const url = new URL(value || 'http://localhost:3000')
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('NEXT_PUBLIC_SITE_URL must be a public HTTP(S) origin without credentials.')
  }
  return new URL(url.origin)
}

export function isPublicSite(url: URL, indexable?: string): boolean {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.hostname.endsWith('.localhost')
  return !local && indexable === 'true'
}
