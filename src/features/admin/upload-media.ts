import type { MediaAsset } from './components/MediaLibrary'

export async function uploadMedia(file: File, options: { folder?: string; alt?: string; replaceId?: string } = {}): Promise<MediaAsset> {
  const response = await fetch('/api/admin/media/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, size: file.size, mimeType: file.type, ...options }) })
  const prepared = await response.json()
  if (!response.ok) throw new Error(prepared.error || 'Could not prepare the upload.')

  if (prepared.mode === 'local') {
    const body = new FormData()
    body.set('file', file)
    if (options.folder) body.set('folder', options.folder)
    if (options.alt !== undefined) body.set('alt', options.alt)
    const uploaded = await fetch('/api/admin/media' + (options.replaceId ? `/${options.replaceId}` : ''), { method: options.replaceId ? 'PUT' : 'POST', body })
    const result = await uploaded.json()
    if (!uploaded.ok) throw new Error(result.error || 'Upload failed.')
    return result
  }

  // Only this single object can be created with the short-lived signed URL.
  const upload = await fetch(prepared.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type, 'cache-control': 'max-age=31536000', 'x-upsert': 'false' }, body: file })
  if (!upload.ok) throw new Error('The file could not be uploaded. Please try again.')
  const completed = await fetch('/api/admin/media/upload', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket: prepared.ticket }) })
  const result = await completed.json()
  if (!completed.ok) throw new Error(result.error || 'Could not save the uploaded file.')
  return result
}
