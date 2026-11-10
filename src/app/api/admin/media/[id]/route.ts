import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/server/api'
import { deleteLocalFile, saveLocalFile, validateFile } from '@/server/storage'
import { prisma } from '@/server/prisma'
import { deleteUnusedMedia, MediaInUseError, replaceMediaAsset } from '@/server/services/media'

interface Params {
  params: Promise<{ id: string }>
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const unauthorized = requireAdmin(request)
  if (unauthorized) return unauthorized

  const { id } = await params
  try {
    const asset = await prisma.mediaAsset.findUnique({ where: { id } })
    if (!asset) {
      return NextResponse.json({ error: 'Media asset not found' }, { status: 404 })
    }

    await deleteUnusedMedia(id, asset.url)

    // Delete the file only after its unused metadata record has been removed.
    if (asset.url) {
      await deleteLocalFile(asset.url)
    }


    return NextResponse.json({ success: true, message: 'Media asset deleted successfully' })
  } catch (error) {
    if (error instanceof MediaInUseError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Delete media error:', error)
    return NextResponse.json({ error: 'Failed to delete media asset' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const unauthorized = requireAdmin(request)
  if (unauthorized) return unauthorized

  const { id } = await params

  try {
    const existing = await prisma.mediaAsset.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Media asset not found' }, { status: 404 })
    }

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // File replacement
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      const altText = (formData.get('alt') as string) || existing.alt || ''
      const folder = (formData.get('folder') as string) || existing.folder || 'general'

      if (!file) {
        return NextResponse.json({ error: 'No replacement file provided' }, { status: 400 })
      }

      const validationError = validateFile({ size: file.size, type: file.type, name: file.name })
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 })
      }

      const bytes = await file.arrayBuffer()
      const result = await saveLocalFile(Buffer.from(bytes), file.name, file.type, folder)
      let updated
      try {
        updated = await replaceMediaAsset(id, existing.url, result, altText, folder)
      } catch (error) {
        await deleteLocalFile(result.url)
        throw error
      }
      await deleteLocalFile(existing.url)

      return NextResponse.json(updated)
    } else {
      // Metadata update (alt, folder)
      const body = await request.json()
      const { alt, folder } = body

      const updated = await prisma.mediaAsset.update({
        where: { id },
        data: {
          ...(alt !== undefined ? { alt } : {}),
          ...(folder !== undefined ? { folder } : {}),
        },
      })

      return NextResponse.json(updated)
    }
  } catch (error) {
    console.error('Update media error:', error)
    return NextResponse.json({ error: 'Failed to update media asset' }, { status: 500 })
  }
}
