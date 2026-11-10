export function embeddedVideoUrl(value?: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    const match = url.pathname.match(/^\/file\/d\/([\w-]+)\/(?:view|preview)\/?$/)
    if (url.protocol !== 'https:') return null
    if (url.hostname === 'drive.google.com' && match) return `https://drive.google.com/file/d/${match[1]}/preview`
    if (url.hostname === 'www-ccv.adobe.io' && /^\/v1\/player\/ccv\/[\w-]+\/embed$/.test(url.pathname)) return url.href
    return null
  } catch { return null }
}
