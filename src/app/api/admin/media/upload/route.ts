import { randomUUID } from 'node:crypto'
import path from 'node:path'
import jwt from 'jsonwebtoken'
import sharp from 'sharp'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/server/api'
import { getJwtSecret, getSessionFromRequest } from '@/server/auth'
import { prisma } from '@/server/prisma'
import { cloudStorageEnabled, cloudBucket } from '@/server/supabase-storage'
import { validateFile, sanitizeFolder, sanitizeFileName, getFileType, deleteLocalFile } from '@/server/storage'
import { replaceMediaAsset } from '@/server/services/media'

interface UploadTicket { sub: string; key: string; originalName: string; mimeType: string; size: number; folder: string; alt: string; replaceId?: string; previousUrl?: string }
const ticketOptions = { audience: 'portfolio-media-upload', issuer: 'adnan-cms', algorithms: ['HS256'] as jwt.Algorithm[] }

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request)
  if (denied) return denied
  try {
    const body = await request.json()
    if (typeof body.name !== 'string' || typeof body.mimeType !== 'string' || !Number.isSafeInteger(body.size) || body.size < 1) return NextResponse.json({ error: 'Please choose a valid file.' }, { status: 400 })
    const invalid = validateFile({ name: body.name, type: body.mimeType, size: body.size })
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })
    if (!cloudStorageEnabled()) return NextResponse.json({ mode: 'local' })
    const existing = typeof body.replaceId === 'string' ? await prisma.mediaAsset.findUnique({ where: { id: body.replaceId } }) : null
    if (body.replaceId && !existing) return NextResponse.json({ error: 'Media asset not found.' }, { status: 404 })
    const folder = sanitizeFolder(typeof body.folder === 'string' ? body.folder : existing?.folder || 'general')
    const originalName = sanitizeFileName(body.name)
    const key = `${folder}/${randomUUID()}${path.extname(originalName).toLowerCase()}`
    const payload: UploadTicket = { sub: getSessionFromRequest(request)!.userId, key, originalName, mimeType: body.mimeType, size: body.size, folder, alt: typeof body.alt === 'string' ? body.alt.slice(0, 1000) : existing?.alt || '', ...(existing ? { replaceId: existing.id, previousUrl: existing.url } : {}) }
    const { data, error } = await cloudBucket().createSignedUploadUrl(key, { upsert: false })
    if (error || !data) throw new Error('Could not prepare cloud storage.')
    const ticket = jwt.sign(payload, getJwtSecret(), { audience: ticketOptions.audience, issuer: ticketOptions.issuer, algorithm: 'HS256', expiresIn: '2h' })
    return NextResponse.json({ mode: 'supabase', signedUrl: data.signedUrl, ticket }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Could not prepare the file upload.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const denied = requireAdmin(request)
  if (denied) return denied
  if (!cloudStorageEnabled()) return NextResponse.json({ error: 'Direct upload is not enabled.' }, { status: 400 })
  let ticket: UploadTicket
  try {
    const body = await request.json()
    ticket = jwt.verify(body.ticket, getJwtSecret(), ticketOptions) as unknown as UploadTicket
    if (ticket.sub !== getSessionFromRequest(request)!.userId) throw new Error('Wrong upload owner')
  } catch { return NextResponse.json({ error: 'The upload has expired. Please upload the file again.' }, { status: 400 }) }
  try {
    const bucket = cloudBucket()
    const url = bucket.getPublicUrl(ticket.key).data.publicUrl
    const saved = await prisma.mediaAsset.findFirst({ where: { url } })
    if (saved) return NextResponse.json(saved)
    const { data: info, error } = await bucket.info(ticket.key)
    if (error || !info) return NextResponse.json({ error: 'The file has not finished uploading.' }, { status: 409 })
    if (info.size !== ticket.size || info.contentType?.split(';')[0] !== ticket.mimeType) return NextResponse.json({ error: 'The uploaded file does not match the approved file.' }, { status: 400 })
    const existing = ticket.replaceId ? await prisma.mediaAsset.findUnique({ where: { id: ticket.replaceId } }) : null
    if (ticket.replaceId && (!existing || existing.url !== ticket.previousUrl)) return NextResponse.json({ error: 'This asset changed during the upload. Refresh the Media Library and try again.' }, { status: 409 })
    let width: number | undefined
    let height: number | undefined
    if (getFileType(ticket.mimeType) === 'image' && ticket.mimeType !== 'image/svg+xml' && ticket.size <= 10_000_000) {
      const { data } = await bucket.download(ticket.key)
      if (data) {
        try { const metadata = await sharp(Buffer.from(await data.arrayBuffer())).metadata(); width = metadata.width; height = metadata.height } catch { /* Dimensions are optional. */ }
      }
    }
    const result = { url, filename: path.basename(ticket.key), originalName: ticket.originalName, mimeType: ticket.mimeType, type: getFileType(ticket.mimeType), size: ticket.size, width, height }
    const asset = existing ? await replaceMediaAsset(existing.id, existing.url, result, ticket.alt, ticket.folder) : await prisma.mediaAsset.create({ data: { ...result, alt: ticket.alt, folder: ticket.folder } })
    if (existing) {
      try { await deleteLocalFile(existing.url) } catch { console.error('Replacement succeeded; the unused old media file could not be removed.') }
    }
    return NextResponse.json(asset, { status: existing ? 200 : 201 })
  } catch { return NextResponse.json({ error: 'The upload is stored but could not be added to the library. Please retry saving it.' }, { status: 500 }) }
}
