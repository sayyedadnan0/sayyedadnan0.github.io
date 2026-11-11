import { createClient } from '@supabase/supabase-js'

export const cloudStorageEnabled = () => process.env.STORAGE_PROVIDER === 'supabase'

export function cloudBucket() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Cloud media storage is not configured.')
  const origin = new URL(url)
  if (origin.protocol !== 'https:' || !origin.hostname.endsWith('.supabase.co')) throw new Error('Invalid cloud media origin.')
  return createClient(origin.origin, key, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'portfolio-media')
}

/** Only delete objects from this site's bucket; existing versioned artwork is retained. */
export function cloudObjectPath(value: string): string | null {
  try {
    const origin = new URL(process.env.SUPABASE_URL || '')
    const url = new URL(value)
    const prefix = `/storage/v1/object/public/${process.env.SUPABASE_STORAGE_BUCKET || 'portfolio-media'}/`
    if (url.origin !== origin.origin || !url.pathname.startsWith(prefix)) return null
    const key = decodeURIComponent(url.pathname.slice(prefix.length))
    return /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(key) ? key : null
  } catch { return null }
}
