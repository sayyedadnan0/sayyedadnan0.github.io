import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/server/api'
import { saveLocalFile, validateFile } from '@/server/storage'
import { prisma } from '@/server/prisma'

export const config = {
  api: { bodyParser: false },
}

// Increase limit for Next.js App Router
export const maxDuration = 30

export async function POST(request: NextRequest) {
  const unauthorized = requireAdmin(request)
  if (unauthorized) return unauthorized

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'general'
    const altText = (formData.get('alt') as string) || ''

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file
    const validationError = validateFile({ size: file.size, type: file.type, name: file.name })
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    // Convert to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Save file
    const result = await saveLocalFile(buffer, file.name, file.type, folder)

    // Save to database
    const asset = await prisma.mediaAsset.create({
      data: {
        filename: result.filename,
        originalName: result.originalName,
        url: result.url,
        type: result.type,
        mimeType: result.mimeType,
        size: result.size,
        width: result.width,
        height: result.height,
        alt: altText,
        folder,
      },
    })

    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request)
  if (unauthorized) return unauthorized

  const { searchParams } = new URL(request.url)
  const folder = searchParams.get('folder')
  const type = searchParams.get('type')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  const where: Record<string, unknown> = {}
  if (folder) where.folder = folder
  if (type) where.type = type
  if (search) where.originalName = { contains: search }

  const [assets, total] = await Promise.all([
    prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.mediaAsset.count({ where }),
  ])

  return NextResponse.json({ assets, total, page, limit, pages: Math.ceil(total / limit) })
}
