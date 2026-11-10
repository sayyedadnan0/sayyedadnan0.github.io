import path from 'node:path'
import { createReadStream } from 'node:fs'
import { Readable } from 'node:stream'
import { getUploadedFile, UPLOAD_MIME_TYPES } from '@/server/upload-files'
import { parseByteRange } from '@/lib/byte-range'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Context { params: Promise<{ path: string[] }> }

async function serve(request: Request, context: Context, headOnly = false) {
  const segments = (await context.params).path
  const file = await getUploadedFile(segments)
  const type = UPLOAD_MIME_TYPES[path.extname(segments.at(-1) || '').toLowerCase()]
  if (!file || !type) return new Response('Not found', { status: 404 })

  const etag = `"${file.stat.size.toString(16)}-${Math.trunc(file.stat.mtimeMs).toString(16)}"`
  const headers = new Headers({
    'Content-Type': type,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Accept-Ranges': 'bytes',
    'ETag': etag,
    'Last-Modified': file.stat.mtime.toUTCString(),
  })
  if (type === 'image/svg+xml') headers.set('Content-Security-Policy', "default-src 'none'; sandbox")
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers })

  const ifRange = request.headers.get('if-range')
  const rangeHeader = ifRange && ifRange !== etag && ifRange !== file.stat.mtime.toUTCString() ? null : request.headers.get('range')
  const range = headOnly ? null : parseByteRange(rangeHeader, file.stat.size)
  if (range === 'unsatisfiable') {
    headers.set('Content-Range', `bytes */${file.stat.size}`)
    return new Response(null, { status: 416, headers })
  }
  headers.set('Content-Length', String(range ? range.end - range.start + 1 : file.stat.size))
  if (range) headers.set('Content-Range', `bytes ${range.start}-${range.end}/${file.stat.size}`)
  if (headOnly) return new Response(null, { status: 200, headers })

  const stream = createReadStream(file.path, { ...(range || {}), signal: request.signal })
  return new Response(Readable.toWeb(stream) as ReadableStream, { status: range ? 206 : 200, headers })
}

export const GET = (request: Request, context: Context) => serve(request, context)
export const HEAD = (request: Request, context: Context) => serve(request, context, true)
