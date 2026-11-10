export type ByteRange = { start: number; end: number } | 'unsatisfiable' | null

/** Single-range requests cover browser video seeking without buffering the entire file. */
export function parseByteRange(header: string | null, size: number): ByteRange {
  if (!header) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match || (!match[1] && !match[2]) || size <= 0) return 'unsatisfiable'
  if (!match[1]) {
    const suffix = Number(match[2])
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return 'unsatisfiable'
    return { start: Math.max(0, size - suffix), end: size - 1 }
  }
  const start = Number(match[1])
  const end = match[2] ? Number(match[2]) : size - 1
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) return 'unsatisfiable'
  return { start, end: Math.min(end, size - 1) }
}
