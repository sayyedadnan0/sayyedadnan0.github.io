import path from 'node:path'
import fs from 'node:fs/promises'

export function getUploadRoot(): string {
  return path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads'))
}

export function isWithinDirectory(root: string, target: string): boolean {
  const relative = path.relative(root, target)
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative)
}

export function resolveUploadPath(segments: string[], root = getUploadRoot()): string | null {
  if (!segments.length || segments.some(segment => !/^[a-zA-Z0-9_.-]+$/.test(segment) || segment === '.' || segment === '..')) return null
  const target = path.resolve(root, ...segments)
  return isWithinDirectory(root, target) ? target : null
}

export async function getUploadedFile(segments: string[]) {
  const root = getUploadRoot()
  const target = resolveUploadPath(segments, root)
  if (!target) return null
  try {
    const [realRoot, realFile] = await Promise.all([fs.realpath(root), fs.realpath(target)])
    if (!isWithinDirectory(realRoot, realFile)) return null
    const stat = await fs.stat(realFile)
    return stat.isFile() ? { path: realFile, stat } : null
  } catch { return null }
}

export const UPLOAD_MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.avif': 'image/avif', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogg': 'video/ogg', '.pdf': 'application/pdf',
}
