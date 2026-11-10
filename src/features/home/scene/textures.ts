import * as THREE from 'three'
import { ARCHITECTURAL_SILHOUETTE_POINTS } from './geometry'

/**
 * Compact radial distance field texture following the actual stepped perimeter.
 * Encodes stepped architectural radius around the perimeter for grazing ground halo.
 */
export function createRoofProfile(): THREE.DataTexture {
  const count = 1024
  const pixels = new Uint8Array(count * 4)
  const points = ARCHITECTURAL_SILHOUETTE_POINTS.map(([x, y]) => [x, -y])
  for (let i = 0; i < count; i++) {
    const angle = ((i + 0.5) / count - 0.5) * Math.PI * 2
    const dx = Math.cos(angle), dz = Math.sin(angle)
    let radius = 0
    for (let j = 0; j < points.length; j++) {
      const a = points[j], b = points[(j + 1) % points.length]
      const vx = b[0] - a[0], vz = b[1] - a[1]
      const cross = dx * vz - dz * vx
      if (Math.abs(cross) < 1e-8) continue
      const distance = (a[0] * vz - a[1] * vx) / cross
      const along = (a[0] * dz - a[1] * dx) / cross
      if (distance > 0 && along >= 0 && along <= 1) radius = Math.max(radius, distance)
    }
    const packed = Math.round(Math.min(radius / 1.15, 1) * 65535)
    pixels[i * 4] = packed >> 8
    pixels[i * 4 + 1] = packed & 255
    pixels[i * 4 + 3] = 255
  }
  const texture = new THREE.DataTexture(pixels, count, 1, THREE.RGBAFormat)
  texture.minFilter = texture.magFilter = THREE.LinearFilter
  texture.wrapS = THREE.RepeatWrapping
  texture.needsUpdate = true
  return texture
}

/** Seamless, mipmapped normal and mineral field, generated once per scene. */
export function createSandSurface(): THREE.DataTexture {
  const size = 512
  const tileWidth = 8
  const heights = new Float32Array(size * size)
  const grains = new Float32Array(size * size)
  const wrap = (n: number, period: number) => ((n % period) + period) % period
  const hash = (x: number, y: number) => {
    const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
    return value - Math.floor(value)
  }
  const noise = (u: number, v: number, period: number) => {
    const x = u * period, y = v * period
    const ix = Math.floor(x), iy = Math.floor(y)
    const fx = x - ix, fy = y - iy
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
    const a = hash(wrap(ix, period), wrap(iy, period))
    const b = hash(wrap(ix + 1, period), wrap(iy, period))
    const c = hash(wrap(ix, period), wrap(iy + 1, period))
    const d = hash(wrap(ix + 1, period), wrap(iy + 1, period))
    return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy
  }
  // Periodic noise keeps the normal field continuous across all tile edges.
  // Calculate the expensive domain warp once, rather than three times per pixel.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size
      const phase = Math.PI * 2 * (48 * v + 3 * u + 2.4 * noise(u, v, 4)
        + 0.55 * Math.sin(u * Math.PI * 2))
      const breakup = 0.25 + 0.75 * noise(u, v, 12)
      const grain = noise(u, v, 128)
      const index = y * size + x
      heights[index] = Math.pow(0.5 + 0.5 * Math.sin(phase), 2.7) * breakup * 0.009
        + grain * 0.00025
      grains[index] = grain
    }
  }
  const pixels = new Uint8Array(size * size * 4)
  const step = tileWidth / size
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = y * size + x
      const dx = (heights[y * size + wrap(x - 1, size)] - heights[y * size + wrap(x + 1, size)]) / (2 * step)
      const dz = (heights[wrap(y - 1, size) * size + x] - heights[wrap(y + 1, size) * size + x]) / (2 * step)
      const invLength = 1 / Math.hypot(dx, 1, dz)
      pixels[index * 4] = Math.round((dx * invLength * 0.5 + 0.5) * 255)
      pixels[index * 4 + 1] = Math.round((invLength * 0.5 + 0.5) * 255)
      pixels[index * 4 + 2] = Math.round((dz * invLength * 0.5 + 0.5) * 255)
      pixels[index * 4 + 3] = Math.round(grains[index] * 255)
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

/** Derive light colour from luminous pixels in the loaded artwork. */
export function extractImageRadiance(image: CanvasImageSource): { color: [number, number, number]; intensity: number } {
  try {
    const offCanvas = document.createElement('canvas')
    offCanvas.width = 32
    offCanvas.height = 32
    const ctx = offCanvas.getContext('2d')
    if (!ctx) return { color: [0.85, 0.82, 0.78], intensity: 1.25 }

    ctx.drawImage(image, 0, 0, 32, 32)
    const imgData = ctx.getImageData(0, 0, 32, 32).data

    let totalWeight = 0
    let rSum = 0, gSum = 0, bSum = 0

    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i] / 255
      const g = imgData[i + 1] / 255
      const b = imgData[i + 2] / 255
      const lum = 0.299 * r + 0.587 * g + 0.114 * b

      const maxC = Math.max(r, g, b)
      const minC = Math.min(r, g, b)
      const sat = maxC > 0.001 ? (maxC - minC) / maxC : 0

      // Prioritize luminous, colorful pixels over dull gray or pure black
      const weight = Math.pow(lum, 1.4) * (0.35 + 0.65 * sat)
      if (weight > 0.02) {
        rSum += r * weight
        gSum += g * weight
        bSum += b * weight
        totalWeight += weight
      }
    }

    if (totalWeight > 0.01) {
      let r = rSum / totalWeight
      let g = gSum / totalWeight
      let b = bSum / totalWeight

      const maxChannel = Math.max(r, Math.max(g, b), 0.001)
      const boost = Math.min(1.0 / maxChannel, 1.25)
      r *= boost
      g *= boost
      b *= boost

      return { color: [r, g, b], intensity: 1.35 }
    }
  } catch {
    // Cross-origin fallback or non-renderable media
  }
  return { color: [0.85, 0.82, 0.78], intensity: 1.20 }
}
