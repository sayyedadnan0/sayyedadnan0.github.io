import fs from 'node:fs/promises'
import { prisma } from '@/server/prisma'
import { getUploadRoot } from '@/server/upload-files'
import { cloudStorageEnabled, cloudBucket } from '@/server/supabase-storage'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await Promise.all([prisma.$queryRaw`SELECT 1`, cloudStorageEnabled() ? Promise.resolve(cloudBucket()) : fs.access(getUploadRoot())])
    return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
