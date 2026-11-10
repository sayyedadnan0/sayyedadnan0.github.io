import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import { getUploadRoot, getUploadedFile, isWithinDirectory } from './upload-files'

export interface UploadResult {
  url: string
  filename: string
  originalName: string
  type: string
  mimeType: string
  size: number
  width?: number
  height?: number
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg']
const ALLOWED_DOC_TYPES = ['application/pdf']
const MAX_FILE_SIZE = Math.max(1, Number.parseInt(process.env.MAX_FILE_SIZE || '', 10) || 50000000) // 50MB

export function getFileType(mimeType: string): 'image' | 'video' | 'document' | 'unknown' {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'image'
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return 'video'
  if (ALLOWED_DOC_TYPES.includes(mimeType)) return 'document'
  return 'unknown'
}

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg',
  '.mp4', '.webm', '.ogg',
  '.pdf'
])

export function sanitizeFolder(folder?: string): string {
  if (!folder) return 'general'
  const sanitized = folder.replace(/[^a-zA-Z0-9_-]/g, '')
  return sanitized || 'general'
}

export function sanitizeFileName(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_')
  return base.slice(0, 100) || 'file'
}

export function validateFile(file: { size: number; type: string; name?: string }): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
  }
  const fileType = getFileType(file.type)
  if (fileType === 'unknown') {
    return `File type ${file.type} is not allowed`
  }
  if (file.name) {
    const ext = path.extname(file.name).toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return `File extension ${ext} is not supported`
    }
  }
  return null
}

export async function saveLocalFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder: string = 'general'
): Promise<UploadResult> {
  const cleanFolder = sanitizeFolder(folder)
  const safeOriginalName = sanitizeFileName(originalName)
  const ext = path.extname(safeOriginalName).toLowerCase()

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`File extension ${ext} is not allowed`)
  }

  const uploadsRoot = getUploadRoot()
  const targetDir = path.resolve(uploadsRoot, cleanFolder)

  // Ensure target directory is strictly within public/uploads
  if (!isWithinDirectory(uploadsRoot, targetDir)) {
    throw new Error('Invalid upload directory destination')
  }

  await fs.mkdir(targetDir, { recursive: true })
  const [realRoot, realDirectory] = await Promise.all([fs.realpath(uploadsRoot), fs.realpath(targetDir)])
  if (!isWithinDirectory(realRoot, realDirectory)) throw new Error('Invalid upload directory destination')

  const filename = `${uuidv4()}${ext}`
  const filePath = path.resolve(targetDir, filename)

  await fs.writeFile(filePath, buffer, { flag: 'wx' })

  const url = `/uploads/${cleanFolder}/${filename}`
  const fileType = getFileType(mimeType)
  const size = buffer.length

  let width: number | undefined
  let height: number | undefined

  // Get image dimensions
  if (fileType === 'image' && mimeType !== 'image/svg+xml') {
    try {
      const metadata = await sharp(buffer).metadata()
      width = metadata.width
      height = metadata.height
    } catch {
      // Ignore sharp errors
    }
  }

  return {
    url,
    filename,
    originalName: safeOriginalName,
    type: fileType,
    mimeType,
    size,
    width,
    height,
  }
}

export async function deleteLocalFile(url: string): Promise<void> {
  if (!url || typeof url !== 'string' || !url.startsWith('/uploads/')) return
  const file = await getUploadedFile(url.slice('/uploads/'.length).split('/'))
  if (!file) return
  await fs.unlink(file.path)
}
