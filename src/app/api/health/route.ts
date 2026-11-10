import fs from 'node:fs/promises'
import { prisma } from '@/server/prisma'
import { getUploadRoot } from '@/server/upload-files'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await Promise.all([prisma.$queryRaw`SELECT 1`, fs.access(getUploadRoot())])
    return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
