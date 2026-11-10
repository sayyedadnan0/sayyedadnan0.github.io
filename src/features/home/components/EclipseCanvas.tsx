'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import Link from 'next/link'
import * as THREE from 'three'
import { fboMaterialVertexShader, fboMaterialFragmentShader, canopyMaterialVertexShader, canopyMaterialFragmentShader, floorMaterialVertexShader, floorMaterialFragmentShader, haloMaterialVertexShader, haloMaterialFragmentShader, frameMaterialVertexShader, frameMaterialFragmentShader, duneMatVertexShader, duneMatFragmentShader, bloomExtractMatVertexShader, bloomExtractMatFragmentShader, blurMatVertexShader, blurMatFragmentShader, compositeMaterialVertexShader, compositeMaterialFragmentShader } from '../scene/shaders'
import type { CanvasProject } from '../types'
import { ARCHITECTURAL_SILHOUETTE_POINTS } from '../scene/geometry'
import { createRoofProfile, createSandSurface, extractImageRadiance } from '../scene/textures'

const emptySubscribe = () => () => {}
let cachedWebGLSupport: boolean | undefined
const checkWebGL = () => {
  if (typeof window === 'undefined') return true
  if (cachedWebGLSupport !== undefined) return cachedWebGLSupport
  try {
    const testCanvas = document.createElement('canvas')
    cachedWebGLSupport = !!(window.WebGL2RenderingContext && testCanvas.getContext('webgl2')) ||
           !!(window.WebGLRenderingContext && (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')))
  } catch {
    cachedWebGLSupport = false
  }
  return cachedWebGLSupport
}

declare global {
  interface Window {
    __threeSceneTelemetry?: {
      getRenderStats: () => {
        drawCalls: number
        triangles: number
        textures: number
        geometries: number
        effectiveDpr: number
        renderScale: number
        drawingBuffer: THREE.Vector2
      }
    }
  }
}





interface EclipseCanvasProps {
  projects?: CanvasProject[]
  progress?: number // 0.0 = Settled Hero, 1.0 = Settled Project Gallery
  progressRefObject?: React.MutableRefObject<number>
  activeProjectIndex?: number
  unwrappedIndex?: number
  onOpenProject?: (project: CanvasProject) => void
  onNavigatePrev?: () => void
  onNavigateNext?: () => void
  onVisualActiveChange?: (projectIndex: number, visualUnwrapped: number) => void
}

export default function EclipseCanvas({
  projects = [],
  progress = 0,
  progressRefObject,
  activeProjectIndex = 0,
  unwrappedIndex = 0,
  onOpenProject,
  onNavigatePrev,
  onNavigateNext,
  onVisualActiveChange,
}: EclipseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const webGlSupported = useSyncExternalStore(emptySubscribe, checkWebGL, () => true)

  const localProgressRef = useRef(progress)
  const stableProgressRef = useRef(progressRefObject || localProgressRef)
  useEffect(() => {
    stableProgressRef.current = progressRefObject || localProgressRef
    if (!progressRefObject) {
      localProgressRef.current = progress
    }
  }, [progress, progressRefObject])

  const activeIndexRef = useRef(activeProjectIndex)
  const unwrappedIndexRef = useRef(unwrappedIndex)
  const onOpenProjectRef = useRef(onOpenProject)
  const onNavigatePrevRef = useRef(onNavigatePrev)
  const onNavigateNextRef = useRef(onNavigateNext)
  const onVisualActiveChangeRef = useRef(onVisualActiveChange)

  useEffect(() => { activeIndexRef.current = activeProjectIndex }, [activeProjectIndex])
  useEffect(() => { unwrappedIndexRef.current = unwrappedIndex }, [unwrappedIndex])
  useEffect(() => { onOpenProjectRef.current = onOpenProject }, [onOpenProject])
  useEffect(() => { onNavigatePrevRef.current = onNavigatePrev }, [onNavigatePrev])
  useEffect(() => { onNavigateNextRef.current = onNavigateNext }, [onNavigateNext])
  useEffect(() => { onVisualActiveChangeRef.current = onVisualActiveChange }, [onVisualActiveChange])

  useEffect(() => {
    if (!webGlSupported) return
    const canvas = canvasRef.current
    if (!canvas) return

    // -------------------------------------------------------------
    // 0. OPTIMIZED RENDERER & ADAPTIVE RESOLUTION CONTROLLER
    // Base DPR capped at 1.35 to avoid fill-rate bottleneck
    // -------------------------------------------------------------
    const baseDpr = Math.min(window.devicePixelRatio || 1, 1.35)
    let renderScale = 1.0
    let lastScaleTime = performance.now()
    const frameTimes: number[] = []

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    })
    renderer.setPixelRatio(baseDpr)
    renderer.info.autoReset = false
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0x020203, 1)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)

    const ownedGeometries: THREE.BufferGeometry[] = []
    const ownedMaterials: THREE.Material[] = []
    const ownedTextures: THREE.Texture[] = []
    const ownedRenderTargets: THREE.WebGLRenderTarget[] = []

    // -------------------------------------------------------------
    // 1. DIRECTIONAL ADVECTION PING-PONG FBO DISTURBANCE SIMULATION
    // Stores: R = sand dust density, G = flowing grain phase, B = velX, A = velY
    // -------------------------------------------------------------
    const fboSize = 512
    const rtOptions: THREE.RenderTargetOptions = {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
    }
    let rtCurrent = new THREE.WebGLRenderTarget(fboSize, fboSize, rtOptions)
    let rtPrevious = new THREE.WebGLRenderTarget(fboSize, fboSize, rtOptions)
    ownedRenderTargets.push(rtCurrent, rtPrevious)

    const fboScene = new THREE.Scene()
    const fboCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const fboGeo = new THREE.PlaneGeometry(2, 2)
    ownedGeometries.push(fboGeo)

    const fboMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPrevTrail: { value: null },
        uMouse: { value: new THREE.Vector2(-10, -10) },
        uPrevMouse: { value: new THREE.Vector2(-10, -10) },
        uSpeed: { value: 0 },
        uDecay: { value: 0.94 },
        uAspect: { value: 1.0 },
        uDeltaTime: { value: 0.016 },
        uTime: { value: 0 },
      },
      vertexShader: fboMaterialVertexShader,
      fragmentShader: fboMaterialFragmentShader,
    })
    ownedMaterials.push(fboMaterial)
    fboScene.add(new THREE.Mesh(fboGeo, fboMaterial))

    // -------------------------------------------------------------
    // 2. UNIFIED 3D ROTUNDA PAVILION (Shared Footprint, Fixed World Scale)
    // -------------------------------------------------------------
    const pavilionGroup = new THREE.Group()
    scene.add(pavilionGroup)

    const rotundaRadius = 4.30
    const roofProfile = createRoofProfile()
    ownedTextures.push(roofProfile)

    // Narrow facets keep the ring round from above. Derive face dimensions and
    // camera distance from the same angular pitch, rather than overlapping slabs.
    const projectCount = projects.length || 5
    const numSlots = projectCount * Math.max(2, Math.ceil(20 / projectCount))
    const angleStep = (Math.PI * 2) / numSlots
    const panelWidth = 2 * rotundaRadius * Math.tan(angleStep / 2) * 0.955
    const panelHeight = panelWidth / 1.86
    const panelBottomY = -0.85
    const panelCenterY = panelBottomY + panelHeight / 2
    const panelTopY = panelBottomY + panelHeight
    const canopyTopY = panelTopY + 0.03

    const getHeroCameraY = (aspect: number, crownY: number) => {
      // Leave breathing room around the crown at landscape sizes.
      if (aspect >= 1.0) {
        return crownY + 16.75
      }
      // Mobile portrait adaptation
      const distance = rotundaRadius * 1.15 / (Math.tan(THREE.MathUtils.degToRad(21)) * aspect * 0.82)
      return crownY + distance
    }

    // Prepare valid project records
    const validProjects = projects.length > 0 ? projects : [
      { id: '1', title: 'Luminary Brand Identity', slug: 'luminary-brand-identity', featuredImageUrl: '/images/placeholder-project-1.jpg' },
      { id: '2', title: 'Nexus Digital Platform', slug: 'nexus-digital-platform', featuredImageUrl: '/images/placeholder-project-2.jpg' },
      { id: '3', title: 'Aura Motion Campaign', slug: 'aura-motion-campaign', featuredImageUrl: '/images/placeholder-project-3.jpg' },
      { id: '4', title: 'Vertex UX System', slug: 'vertex-ux-system', featuredImageUrl: '/images/placeholder-project-4.jpg' },
      { id: '5', title: 'Orbit App Experience', slug: 'orbit-app-experience', featuredImageUrl: '/images/placeholder-project-5.jpg' },
    ]

    const N = validProjects.length
    const backingWidth = 2 * rotundaRadius * Math.sin(angleStep / 2) * 1.025
    const backingSteps = [0.36, 0.64, 0.28, 0.50, 0.72, 0.34, 0.56, 0.30, 0.48, 0.66]

    // A. Architectural Stepped Coping Rim (63 Landmark Points, Open Interior)
    const canopyShape = new THREE.Shape()
    ARCHITECTURAL_SILHOUETTE_POINTS.forEach(([nx, ny], idx) => {
      const x = nx * rotundaRadius * 1.015
      const y = ny * rotundaRadius * 1.015
      if (idx === 0) canopyShape.moveTo(x, y)
      else canopyShape.lineTo(x, y)
    })
    canopyShape.closePath()

    // Open circular interior hole: coping rim with inner aperture allowing camera to see through into gallery
    const holePath = new THREE.Path()
    const holeSegs = 64
    const innerRadius = rotundaRadius * 0.86
    for (let i = 0; i <= holeSegs; i++) {
      const theta = -(i / holeSegs) * Math.PI * 2
      const hx = Math.cos(theta) * innerRadius
      const hy = Math.sin(theta) * innerRadius
      if (i === 0) holePath.moveTo(hx, hy)
      else holePath.lineTo(hx, hy)
    }
    canopyShape.holes.push(holePath)

    const canopyGeo = new THREE.ExtrudeGeometry(canopyShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.015,
      bevelThickness: 0.015,
    })
    ownedGeometries.push(canopyGeo)

    const canopyMaterial = new THREE.ShaderMaterial({
      depthWrite: true,
      depthTest: true,
      transparent: false,
      uniforms: {
        uProgress: { value: 0 },
      },
      vertexShader: canopyMaterialVertexShader,
      fragmentShader: canopyMaterialFragmentShader,
    })
    ownedMaterials.push(canopyMaterial)

    const canopyMesh = new THREE.Mesh(canopyGeo, canopyMaterial)
    canopyMesh.rotation.x = -Math.PI / 2
    canopyMesh.position.set(0, canopyTopY, 0)
    canopyMesh.visible = true
    pavilionGroup.add(canopyMesh)

    // Dedicated Pure Black Interior Floor Disc preserving continuous black centre
    const floorGeo = new THREE.CircleGeometry(rotundaRadius * 0.98, 64)
    ownedGeometries.push(floorGeo)
    const floorMaterial = new THREE.ShaderMaterial({
      depthWrite: true,
      depthTest: true,
      transparent: false,
      vertexShader: floorMaterialVertexShader,
      fragmentShader: floorMaterialFragmentShader,
    })
    ownedMaterials.push(floorMaterial)
    const floorMesh = new THREE.Mesh(floorGeo, floorMaterial)
    floorMesh.rotation.x = -Math.PI / 2
    floorMesh.position.set(0, -0.845, 0)
    pavilionGroup.add(floorMesh)

    // Inner drum lining joining recessed floor to coping rim.
    const linerHeight = canopyTopY + 0.85
    const linerGeo = new THREE.CylinderGeometry(rotundaRadius * 0.86, rotundaRadius * 0.86, linerHeight, 64, 1, true)
    ownedGeometries.push(linerGeo)
    const linerMaterial = floorMaterial.clone()
    linerMaterial.side = THREE.DoubleSide
    ownedMaterials.push(linerMaterial)
    const liner = new THREE.Mesh(linerGeo, linerMaterial)
    liner.position.y = -0.85 + linerHeight / 2
    pavilionGroup.add(liner)

    // B. Hero Background Sand Floor & Stepped Faceted Halo
    const haloGeo = new THREE.PlaneGeometry(38, 38)
    ownedGeometries.push(haloGeo)

    const haloMaterial = new THREE.ShaderMaterial({
      depthWrite: false,
      transparent: true,
      uniforms: {
        uHeroFootprint: { value: new THREE.Vector3(0, 0, rotundaRadius * 1.015) },
        uRoofProfile: { value: roofProfile },
        uOutlineRotation: { value: 0 },
        uProgress: { value: 0 },
      },
      vertexShader: haloMaterialVertexShader,
      fragmentShader: haloMaterialFragmentShader,
    })
    ownedMaterials.push(haloMaterial)

    const haloMesh = new THREE.Mesh(haloGeo, haloMaterial)
    haloMesh.rotation.x = -Math.PI / 2
    haloMesh.position.set(0, -0.850, 0)
    pavilionGroup.add(haloMesh)

    // C. Cylindrical Gallery Panels (Outward-Facing Pavilion Walls)
    const textureLoader = new THREE.TextureLoader()
    const projectPanelMeshes: THREE.Mesh[] = []
    const projectMaterials: THREE.ShaderMaterial[] = []

    const projectScreenVertex = `
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `

    const projectScreenFragment = `
      precision highp float;
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      uniform sampler2D uTexture;
      uniform float uVelocity;
      uniform float uTime;
      uniform float uActive;
      uniform vec3 uRadianceColor;
      uniform float uImageAspect;
      uniform float uPanelAspect;

      void main() {
        if (!gl_FrontFacing) {
          gl_FragColor = vec4(vec3(0.0001), 0.0);
          return;
        }
        vec2 uv = vUv;

        // Smooth flowing liquid refraction field
        float flow1 = sin(uv.y * 5.4 + uTime * 4.2 + uv.x * 2.8);
        float flow2 = cos(uv.y * 9.8 - uTime * 3.1 + uv.x * 4.2);
        float flow3 = sin((uv.x * 4.2 + uv.y * 6.5) - uTime * 5.0);
        float flow4 = cos((uv.x * 7.1 - uv.y * 3.8) + uTime * 2.5);

        float dispX = (flow1 * 0.60 + flow2 * 0.40) * uVelocity * 0.028;
        float dispY = (flow3 * 0.65 + flow4 * 0.35) * uVelocity * 0.014;

        float borderMask = smoothstep(0.0, 0.04, uv.x) * (1.0 - smoothstep(0.96, 1.0, uv.x)) *
                           smoothstep(0.0, 0.04, uv.y) * (1.0 - smoothstep(0.96, 1.0, uv.y));

        vec2 liquidOffset = vec2(dispX, dispY) * borderMask;
        vec2 refractedUv = clamp(uv + liquidOffset, 0.002, 0.998);
        if (uImageAspect > uPanelAspect) {
          refractedUv.x = 0.5 + (refractedUv.x - 0.5) * uPanelAspect / uImageAspect;
        } else {
          refractedUv.y = 0.5 + (refractedUv.y - 0.5) * uImageAspect / uPanelAspect;
        }

        float chroma = length(liquidOffset) * 0.16;
        float r = texture2D(uTexture, clamp(refractedUv + vec2(chroma, 0.0), 0.002, 0.998)).r;
        float g = texture2D(uTexture, refractedUv).g;
        float b = texture2D(uTexture, clamp(refractedUv - vec2(chroma, 0.0), 0.002, 0.998)).b;

        float edgeVignette = smoothstep(0.0, 0.006, uv.x) * (1.0 - smoothstep(0.994, 1.0, uv.x)) *
                             smoothstep(0.0, 0.008, uv.y) * (1.0 - smoothstep(0.992, 1.0, uv.y));

        vec3 col = vec3(r, g, b) * edgeVignette;

        // Local panel radiance boost on bright artwork pixels
        float lum = dot(col, vec3(0.299, 0.587, 0.114));
        if (lum > 0.40) {
          float glow = pow((lum - 0.40) / 0.60, 1.5) * 0.72;
          col += uRadianceColor * glow;
        }

        col *= mix(0.92, 1.06, uActive);

        // Alpha = 0.15 denotes panel geometry in surface mask
        gl_FragColor = vec4(col, 0.15);
      }
    `

    // Outward-facing panel faces with flush monolithic architectural backing enclosure
    const pGeo = new THREE.PlaneGeometry(panelWidth, panelHeight, 1, 1)
    ownedGeometries.push(pGeo)

    const frameMaterial = new THREE.ShaderMaterial({
      depthWrite: true,
      depthTest: true,
      transparent: false,
      vertexShader: frameMaterialVertexShader,
      fragmentShader: frameMaterialFragmentShader,
    })
    ownedMaterials.push(frameMaterial)

    // Backing enclosure wall: covers only from floor (-0.85) to panel top (panelTopY)
    // The canopy coping handles the zone above the panels — avoids a visible grey cap in gallery view
    const enclosureHeight = panelTopY - (-0.85)
    const frameGeo = new THREE.BoxGeometry(backingWidth, enclosureHeight, 0.08)
    ownedGeometries.push(frameGeo)

    // Shared artwork resource cache
    interface SharedArtworkResource {
      texture: THREE.Texture
      radiance: { color: [number, number, number]; intensity: number }
      materials: THREE.ShaderMaterial[]
      panelMeshes: THREE.Mesh[]
      loaded: boolean
      failed: boolean
      imageAspect: number
    }
    const sharedArtworkCache = new Map<string, SharedArtworkResource>()

    for (let slotIdx = 0; slotIdx < numSlots; slotIdx++) {
      const projIdx = slotIdx % N
      const proj = validProjects[projIdx]
      const imgUrl = proj.heroImageUrl || proj.featuredImageUrl || proj.thumbnailUrl || '/images/placeholder-project-1.jpg'

      const pMat = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        depthWrite: true,
        depthTest: true,
        uniforms: {
          uTexture: { value: null },
          uVelocity: { value: 0 },
          uTime: { value: 0 },
          uActive: { value: slotIdx === 0 ? 1 : 0 },
          uRadianceColor: { value: new THREE.Vector3(0.85, 0.82, 0.78) },
          uImageAspect: { value: panelWidth / panelHeight },
          uPanelAspect: { value: panelWidth / panelHeight },
        },
        vertexShader: projectScreenVertex,
        fragmentShader: projectScreenFragment,
      })
      ownedMaterials.push(pMat)
      projectMaterials.push(pMat)

      const panelMesh = new THREE.Mesh(pGeo, pMat)
      panelMesh.userData = {
        project: proj,
        slotIndex: slotIdx,
        projectIndex: projIdx,
        radianceProfile: { color: [0.85, 0.82, 0.78] as [number, number, number], intensity: 1.25 },
      }

      let shared = sharedArtworkCache.get(imgUrl)
      if (!shared) {
        const defaultRadiance = { color: [0.85, 0.82, 0.78] as [number, number, number], intensity: 1.25 }

        const fbCanvas = document.createElement('canvas')
        fbCanvas.width = 128
        fbCanvas.height = 160
        const fbCtx = fbCanvas.getContext('2d')
        if (fbCtx) {
          fbCtx.fillStyle = '#0a0a0f'
          fbCtx.fillRect(0, 0, 128, 160)
          fbCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
          fbCtx.strokeRect(8, 8, 112, 144)
        }
        const initialTex = new THREE.CanvasTexture(fbCanvas)
        initialTex.colorSpace = THREE.SRGBColorSpace
        ownedTextures.push(initialTex)

        const resource: SharedArtworkResource = {
          texture: initialTex,
          radiance: defaultRadiance,
          materials: [],
          panelMeshes: [],
          loaded: false,
          failed: false,
          imageAspect: panelWidth / panelHeight,
        }
        shared = resource
        sharedArtworkCache.set(imgUrl, resource)

        textureLoader.load(
          imgUrl,
          (loadedTex) => {
            if (disposed) { loadedTex.dispose(); return }
            loadedTex.colorSpace = THREE.SRGBColorSpace
            resource.texture = loadedTex
            ownedTextures.push(loadedTex)
            resource.loaded = true

            if (loadedTex.image) {
              const extracted = extractImageRadiance(loadedTex.image)
              resource.imageAspect = loadedTex.image.width / Math.max(loadedTex.image.height, 1)
              resource.radiance = extracted
              for (const mat of resource.materials) {
                mat.uniforms.uTexture.value = loadedTex
                mat.uniforms.uRadianceColor.value.set(...extracted.color)
                mat.uniforms.uImageAspect.value = resource.imageAspect
              }
              for (const mesh of resource.panelMeshes) {
                mesh.userData.radianceProfile = extracted
              }
            }
            wakePointer()
          },
          undefined,
          () => {
            if (disposed) return
            resource.failed = true
            const errCanvas = document.createElement('canvas')
            errCanvas.width = 128
            errCanvas.height = 160
            const errCtx = errCanvas.getContext('2d')
            if (errCtx) {
              errCtx.fillStyle = '#14141e'
              errCtx.fillRect(0, 0, 128, 160)
              errCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
              errCtx.strokeRect(6, 6, 116, 148)
              errCtx.fillStyle = 'rgba(255, 255, 255, 0.5)'
              errCtx.font = '11px sans-serif'
              errCtx.textAlign = 'center'
              errCtx.fillText(proj.title.split(' ')[0] || 'ADNAN', 64, 84)
            }
            const errTex = new THREE.CanvasTexture(errCanvas)
            errTex.colorSpace = THREE.SRGBColorSpace
            ownedTextures.push(errTex)
            for (const mat of resource.materials) {
              mat.uniforms.uTexture.value = errTex
            }
            wakePointer()
          }
        )
      }

      shared.materials.push(pMat)
      shared.panelMeshes.push(panelMesh)
      pMat.uniforms.uTexture.value = shared.texture
      pMat.uniforms.uRadianceColor.value.set(...shared.radiance.color)
      pMat.uniforms.uImageAspect.value = shared.imageAspect
      panelMesh.userData.radianceProfile = shared.radiance

      const angle = slotIdx * angleStep
      panelMesh.rotation.y = angle
      panelMesh.position.set(Math.sin(angle) * rotundaRadius, panelCenterY, Math.cos(angle) * rotundaRadius)

      // Backing wall centered between floor (-0.85) and panel top — stays below coping rim
      const panelFrame = new THREE.Mesh(frameGeo, frameMaterial)
      const stepHeight = backingSteps[slotIdx % backingSteps.length] * panelWidth / 2.74
      panelFrame.scale.y = (enclosureHeight + stepHeight) / enclosureHeight
      panelFrame.position.set(0, stepHeight / 2, -0.045)
      panelMesh.add(panelFrame)

      pavilionGroup.add(panelMesh)
      projectPanelMeshes.push(panelMesh)
    }

    // -------------------------------------------------------------
    // 3. UNIFIED LANDSCAPE & SCULPTED ASYMMETRIC DUNES
    // Believable desert landforms with sinuous knife-edge crest lines,
    // shadow troughs, and smooth falloff into dark foreground space.
    // -------------------------------------------------------------
    const duneGeo = new THREE.PlaneGeometry(32, 32, 160, 160)
    ownedGeometries.push(duneGeo)

    const posAttr = duneGeo.attributes.position
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i) // World X
      const vy = posAttr.getY(i) // Local Y in plane
      const wz = -vy             // World Z

      const rDist = Math.hypot(vx, wz)
      const outsidePavilion = THREE.MathUtils.smoothstep(rDist, 4.25, 4.55)

      // Banks sit between the display bases and gallery camera, so their crests
      // frame the artwork without a raised terrace covering its lower half.
      const primaryRidgeZ = 4.95 - vx * 0.10
      const distFromPrimary = wz - primaryRidgeZ
      // Steep leeward face (positive dist), gentle windward climb (negative dist)
      const leeward = distFromPrimary < 0 ? 0.45 : 0.65
      const primaryCrest = 0.16 * Math.exp(-Math.pow(distFromPrimary / leeward, 2))
                         * Math.exp(-Math.pow((vx + 0.85) / 1.2, 2))

      // 3. Secondary smaller dune further back
      const secRidgeZ = 5.05 + vx * 0.10
      const distFromSec = wz - secRidgeZ
      const secondaryCrest = 0.11 * Math.exp(-Math.pow(distFromSec / (distFromSec < 0 ? 0.55 : 0.65), 2))
                           * Math.exp(-Math.pow((vx - 0.95) / 1.25, 2))

      // 4. Gentle midground undulation
      const midSwell = 0.025 * Math.sin(vx * 0.52 + wz * 0.38) * Math.exp(-Math.pow((wz - 5.0) / 0.9, 2))

      const fgDrop = 0.08 * THREE.MathUtils.smoothstep(wz, 5.7, 6.5)

      const elevation = Math.max(0.0, Math.max(primaryCrest, secondaryCrest) + midSwell - fgDrop) * outsidePavilion
      posAttr.setZ(i, elevation)
    }
    duneGeo.computeVertexNormals()
    const sandSurface = createSandSurface()
    sandSurface.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
    ownedTextures.push(sandSurface)

    const duneMat = new THREE.ShaderMaterial({
      depthWrite: true,
      depthTest: true,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uSandSurface: { value: sandSurface },
        uHeroFootprint: { value: new THREE.Vector3(0, 0, rotundaRadius * 1.015) },
        uRoofProfile: { value: roofProfile },
        uOutlineRotation: { value: 0 },
        uPanelSize: { value: new THREE.Vector2(panelWidth, panelHeight) },
        uLightPos0: { value: new THREE.Vector3(0, 0, 0) },
        uLightColor0: { value: new THREE.Vector3(1, 1, 1) },
        uLightInt0: { value: 0 },
        uLightPos1: { value: new THREE.Vector3(0, 0, 0) },
        uLightColor1: { value: new THREE.Vector3(1, 1, 1) },
        uLightInt1: { value: 0 },
        uLightPos2: { value: new THREE.Vector3(0, 0, 0) },
        uLightColor2: { value: new THREE.Vector3(1, 1, 1) },
        uLightInt2: { value: 0 },
        uLightPos3: { value: new THREE.Vector3(0, 0, 0) },
        uLightColor3: { value: new THREE.Vector3(1, 1, 1) },
        uLightInt3: { value: 0 },
      },
      vertexShader: duneMatVertexShader,
      fragmentShader: duneMatFragmentShader,
    })
    ownedMaterials.push(duneMat)

    const foregroundDunes = new THREE.Mesh(duneGeo, duneMat)
    foregroundDunes.rotation.x = -Math.PI / 2
    foregroundDunes.position.set(0, -0.85, 0.0)
    foregroundDunes.visible = true
    scene.add(foregroundDunes)

    // -------------------------------------------------------------
    // 4. SEPARABLE GAUSSIAN BLOOM PIPELINE (Multi-Scale Atmospheric Halo)
    // -------------------------------------------------------------
    const initW = window.innerWidth || 1920
    const initH = window.innerHeight || 1080

    const sceneRenderTarget = new THREE.WebGLRenderTarget(initW, initH, {
      type: THREE.HalfFloatType,
      samples: Math.min(2, renderer.capabilities.maxSamples),
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      stencilBuffer: false,
    })
    ownedRenderTargets.push(sceneRenderTarget)

    const bloomW = Math.max(Math.floor(initW / 4), 128)
    const bloomH = Math.max(Math.floor(initH / 4), 128)
    const bloomRT1 = new THREE.WebGLRenderTarget(bloomW, bloomH, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
    })
    const bloomRT2 = new THREE.WebGLRenderTarget(bloomW, bloomH, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
    })
    ownedRenderTargets.push(bloomRT1, bloomRT2)

    const quadScene = new THREE.Scene()
    const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const quadGeo = new THREE.PlaneGeometry(2, 2)
    ownedGeometries.push(quadGeo)
    const quadMesh = new THREE.Mesh(quadGeo)
    quadScene.add(quadMesh)

    // Pass 1: Artwork bright emission mask
    const bloomExtractMat = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: null },
      },
      vertexShader: bloomExtractMatVertexShader,
      fragmentShader: bloomExtractMatFragmentShader,
    })
    ownedMaterials.push(bloomExtractMat)

    // Pass 2: Separable 9-tap 1D Gaussian blur
    const blurMat = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: null },
        uDirection: { value: new THREE.Vector2(1 / bloomW, 0) },
      },
      vertexShader: blurMatVertexShader,
      fragmentShader: blurMatFragmentShader,
    })
    ownedMaterials.push(blurMat)

    // Pass 3: Final composite pass with pristine artwork, atmospheric bloom, liquid formation & cursor wake
    const compositeScene = new THREE.Scene()
    const compositeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const compositeGeo = new THREE.PlaneGeometry(2, 2)
    ownedGeometries.push(compositeGeo)

    const compositeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uSceneTexture: { value: null },
        uBloomTexture: { value: null },
        uTrailTexture: { value: null },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(initW, initH) },
        uWakeStrength: { value: 1 },
        uFormation: { value: 1 },
        uJourney: { value: 0 },
        uBloomStrength: { value: 0 },
      },
      vertexShader: compositeMaterialVertexShader,
      fragmentShader: compositeMaterialFragmentShader,
    })
    ownedMaterials.push(compositeMaterial)
    compositeScene.add(new THREE.Mesh(compositeGeo, compositeMaterial))

    // -------------------------------------------------------------
    // 5. POINTER & INTERACTION CONTROLLER
    // -------------------------------------------------------------
    const motionPref = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reducedMotion = motionPref.matches
    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches
      wakePointer()
    }
    motionPref.addEventListener('change', onMotionChange)

    const mouseUV = new THREE.Vector2(-10, -10)
    const driftingMouseUV = new THREE.Vector2(-10, -10)
    const previousDriftingUV = new THREE.Vector2(-10, -10)
    const targetMouse = new THREE.Vector2(0, 0)
    const dampedMouse = new THREE.Vector2(0, 0)
    let wasOffscreen = true
    let fboSleepTimer = 2.5
    let isTrailActive = true
    let requestSceneFrame = () => {}

    const wakePointer = () => {
      fboSleepTimer = 3.2
      isTrailActive = true
      requestSceneFrame()
    }

    const onPointerMove = (e: PointerEvent) => {
      wakePointer()
      const rect = canvas.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      const clientX = e.clientX - rect.left
      const clientY = e.clientY - rect.top

      const u = clientX / rect.width
      const v = 1.0 - (clientY / rect.height)

      if (wasOffscreen || mouseUV.x < 0) {
        mouseUV.set(u, v)
        driftingMouseUV.set(u, v)
        previousDriftingUV.set(u, v)
        wasOffscreen = false
      } else {
        mouseUV.set(u, v)
      }

      const nx = (clientX / rect.width) * 2 - 1
      const ny = -(clientY / rect.height) * 2 + 1
      targetMouse.set(nx, ny)
    }

    const onWindowLeave = () => {
      wasOffscreen = true
      mouseUV.set(-10, -10)
      driftingMouseUV.set(-10, -10)
      previousDriftingUV.set(-10, -10)
      targetMouse.set(0, 0)
      requestSceneFrame()
    }

    const raycaster = new THREE.Raycaster()
    const pointerNDC = new THREE.Vector2()

    const onCanvasClick = (e: MouseEvent) => {
      if (stableProgressRef.current.current < 0.85) return
      const rect = canvas.getBoundingClientRect()
      pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(pointerNDC, camera)
      const interactables: THREE.Object3D[] = foregroundDunes.visible
        ? [foregroundDunes, ...projectPanelMeshes]
        : projectPanelMeshes

      const intersects = raycaster.intersectObjects(interactables)
      if (intersects.length > 0) {
        const hit = intersects[0].object
        if (hit === foregroundDunes) return

        const clickedSlot = hit.userData.slotIndex as number
        if (typeof clickedSlot !== 'number') return

        const visualUnwrapped = Math.round(-currentCarouselAngle / angleStep)
        const activeSlot = ((visualUnwrapped % numSlots) + numSlots) % numSlots
        const prevSlot = ((activeSlot - 1 + numSlots) % numSlots)
        const nextSlot = ((activeSlot + 1) % numSlots)

        if (clickedSlot === activeSlot) {
          const proj = hit.userData.project as CanvasProject
          if (proj && onOpenProjectRef.current) {
            onOpenProjectRef.current(proj)
          }
        } else if (clickedSlot === prevSlot) {
          if (onNavigatePrevRef.current) onNavigatePrevRef.current()
        } else if (clickedSlot === nextSlot) {
          if (onNavigateNextRef.current) onNavigateNextRef.current()
        }
      }
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerleave', onWindowLeave, { passive: true })
    window.addEventListener('pointerdown', wakePointer, { passive: true })
    window.addEventListener('wheel', wakePointer, { passive: true })
    window.addEventListener('keydown', wakePointer)
    window.addEventListener('adnan:experience-state', wakePointer)
    window.addEventListener('adnan:set-progress', wakePointer)
    canvas.addEventListener('click', onCanvasClick)

    let cachedClientW = 1920
    let cachedClientH = 1080
    let pavilionVerticalScale = 1

    const applyResolution = () => {
      const w = cachedClientW
      const h = cachedClientH
      if (w <= 0 || h <= 0) return

      const effectiveDpr = baseDpr * renderScale
      renderer.setPixelRatio(effectiveDpr)
      renderer.setSize(w, h, false)

      camera.aspect = w / h
      camera.updateProjectionMatrix()

      // Keep landscape billboard proportions grounded while framing in mobile portrait
      pavilionVerticalScale = w < h
        ? THREE.MathUtils.clamp(0.58 * panelWidth / (panelHeight * 0.85 * camera.aspect), 1.6, 2.8)
        : 1
      pavilionGroup.scale.y = pavilionVerticalScale
      pavilionGroup.position.y = 0.85 * (pavilionVerticalScale - 1)
      duneMat.uniforms.uPanelSize.value.set(panelWidth, panelHeight * pavilionVerticalScale)
      for (const material of projectMaterials) {
        material.uniforms.uPanelAspect.value = panelWidth / (panelHeight * pavilionVerticalScale)
      }

      const drawingSize = renderer.getDrawingBufferSize(new THREE.Vector2())
      sceneRenderTarget.setSize(drawingSize.x, drawingSize.y)
      compositeMaterial.uniforms.uResolution.value.copy(drawingSize)
      fboMaterial.uniforms.uAspect.value = w / h

      duneMat.uniforms.uHeroFootprint.value.set(0, 0, rotundaRadius * 1.015)

      const bw = Math.max(Math.floor(drawingSize.x / 4), 128)
      const bh = Math.max(Math.floor(drawingSize.y / 4), 128)
      bloomRT1.setSize(bw, bh)
      bloomRT2.setSize(bw, bh)
    }

    const resize = () => {
      const w = canvas.clientWidth || window.innerWidth
      const h = canvas.clientHeight || window.innerHeight
      if (w <= 0 || h <= 0) return
      cachedClientW = w
      cachedClientH = h
      applyResolution()
      requestSceneFrame()
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    resize()

    // -------------------------------------------------------------
    // TAB VISIBILITY & OFFSCREEN PAUSE CONTROLLER
    // -------------------------------------------------------------
    let isTabHidden = false
    let isOffscreen = false

    const onVisibilityChange = () => {
      isTabHidden = document.hidden
      if (!isTabHidden) {
        lastTime = performance.now()
        wakePointer()
        dampedMouse.copy(targetMouse)
        driftingMouseUV.copy(mouseUV)
        previousDriftingUV.copy(mouseUV)
        if (!animId && !disposed) animId = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    const io = new IntersectionObserver(([entry]) => {
      isOffscreen = !entry.isIntersecting
      if (!isOffscreen && !isTabHidden) {
        lastTime = performance.now()
        if (!animId && !disposed) animId = requestAnimationFrame(tick)
      }
    }, { threshold: 0.01 })
    io.observe(canvas)

    // -------------------------------------------------------------
    // 6. CONTINUOUS ANIMATION & RENDERING LOOP
    // -------------------------------------------------------------
    let animId: number | null = null
    let disposed = false
    let lastTime = performance.now()
    let currentCarouselAngle = 0
    let heroYaw = 0
    let heroYawVelocity = 0
    let animationTime = 0
    let smoothedLiquidVelocity = 0
    let smoothedProgress = 0
    let lastReportedProjectIndex = -1
    let lastPassCount = 0
    let lastProfileTime = 0
    const profileEnabled = new URLSearchParams(window.location.search).get('profile') === '1'
    const getFrameStats = () => {
      const sorted = [...frameTimes].sort((a, b) => a - b)
      return {
        median: sorted[Math.floor(sorted.length * 0.5)] || 0,
        p95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] || 0,
        samples: sorted.length,
      }
    }

    const tick = () => {
      if (disposed) return

      if (isTabHidden || (isOffscreen && window.scrollY > (cachedClientH || 800) * 0.9)) {
        animId = null
        return
      }

      const now = performance.now()
      const frameMs = now - lastTime
      const dt = Math.max(Math.min(frameMs * 0.001, 0.1), 0.001)
      lastTime = now
      // Simulation steps stay bounded, while the one-time reveal follows real
      // visible time. Visibility/resume handlers reset lastTime after a pause.
      animationTime += Math.max(frameMs, 0) * 0.001
      const elapsed = animationTime
      renderer.info.reset()
      const firstRenderFrame = renderer.info.render.frame

      // Adaptive quality monitoring targeting 60 Hz budget (16.67ms)
      frameTimes.push(frameMs)
      if (frameTimes.length > 60) frameTimes.shift()

      if (frameTimes.length >= 60 && now - lastScaleTime > 3500) {
        const sorted = frameTimes.filter(ms => ms < 250).sort((a, b) => a - b)
        if (sorted.length >= 30) {
          const p90 = sorted[Math.floor(sorted.length * 0.9)]
          const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length

          if ((p90 > 23 || avg > 22) && renderScale > 0.75) {
            renderScale = Math.max(0.75, renderScale - 0.15)
            lastScaleTime = now
            applyResolution()
          } else if (p90 < 18.5 && avg < 17.5 && renderScale < 1.0 && now - lastScaleTime > 4000) {
            renderScale = Math.min(1.0, renderScale + 0.15)
            lastScaleTime = now
            applyResolution()
          }
        }
      }

      // 1. Pointer decay & lag
      const lagFactor = 1.0 - Math.exp(-4.2 * dt)
      dampedMouse.lerp(targetMouse, lagFactor)

      // 2. FBO Disturbance Simulation Pass (Sleeps when idle)
      if (fboSleepTimer > 0) {
        fboSleepTimer -= Math.max(frameMs, 0) * 0.001
        fboMaterial.uniforms.uPrevTrail.value = rtCurrent.texture
        fboMaterial.uniforms.uDecay.value = Math.exp(-1.8 * dt)
        fboMaterial.uniforms.uDeltaTime.value = dt
        fboMaterial.uniforms.uTime.value = elapsed

        previousDriftingUV.copy(driftingMouseUV)
        if (mouseUV.x >= 0) driftingMouseUV.lerp(mouseUV, 1.0 - Math.exp(-5.2 * dt))
        const driftingSpeed = driftingMouseUV.distanceTo(previousDriftingUV) / dt
        if (driftingSpeed < 0.002 || mouseUV.x < 0 || reducedMotion) {
          fboMaterial.uniforms.uSpeed.value = 0.0
          fboMaterial.uniforms.uMouse.value.set(-10, -10)
          fboMaterial.uniforms.uPrevMouse.value.set(-10, -10)
        } else {
          fboMaterial.uniforms.uMouse.value.copy(driftingMouseUV)
          fboMaterial.uniforms.uPrevMouse.value.copy(previousDriftingUV)
          fboMaterial.uniforms.uSpeed.value = Math.min(driftingSpeed * 0.85, 1.25)
        }

        renderer.setRenderTarget(rtPrevious)
        renderer.render(fboScene, fboCamera)

        const tempRT = rtCurrent
        rtCurrent = rtPrevious
        rtPrevious = tempRT
      } else if (isTrailActive) {
        renderer.setClearColor(0x000000, 0)
        renderer.setRenderTarget(rtPrevious)
        renderer.clearColor()
        renderer.setRenderTarget(rtCurrent)
        renderer.clearColor()
        renderer.setClearColor(0x020203, 1)
        isTrailActive = false
      }

      // 3. Continuous Spatial Camera Journey & Calibrated Framing
      const targetProg = stableProgressRef.current.current
      if (reducedMotion) {
        smoothedProgress = targetProg
      } else {
        smoothedProgress += (targetProg - smoothedProgress) * (1.0 - Math.exp(-8.5 * dt))
      }

      const p = smoothedProgress
      haloMaterial.uniforms.uProgress.value = p
      duneMat.uniforms.uProgress.value = p
      canopyMaterial.uniforms.uProgress.value = p

      const isMobile = cachedClientW < cachedClientH
      const worldCanopyY = canopyTopY * pavilionVerticalScale + pavilionGroup.position.y
      const worldPanelY = panelCenterY * pavilionVerticalScale + pavilionGroup.position.y

      // Travel around the same ring rather than swapping hero and gallery scenes.
      const heroCamY = getHeroCameraY(camera.aspect, worldCanopyY)
      const heroCamZ = 0.92

      // Gallery eye-level view: active panel occupies 49.4% of viewport width
      const galleryWidthFraction = isMobile ? 0.85 : 0.494
      const galleryViewHeight = panelWidth / (camera.aspect * galleryWidthFraction)
      const projectedPanelHeight = panelHeight * cachedClientH / galleryViewHeight
      // Short landscape windows need extra headroom. Keep the display below
      // navigation without moving the fixed project title and controls.
      const galleryCenterY = Math.max(cachedClientH * 0.395,
        Math.min(92, cachedClientH * 0.18) + projectedPanelHeight * 0.5)
      const galleryCamY = isMobile
        ? worldPanelY - 0.08 * galleryViewHeight
        : worldPanelY - (0.5 - galleryCenterY / cachedClientH) * galleryViewHeight
      const galleryDistance = panelWidth / (2 * Math.tan(THREE.MathUtils.degToRad(21))
        * camera.aspect * galleryWidthFraction)
      const galleryCamZ = rotundaRadius + galleryDistance

      // Spatial camera trajectory: smooth forward-orbit descent
      const easeTarget = Math.pow(p, 1.15)
      const targetY = THREE.MathUtils.lerp(worldCanopyY, galleryCamY, p)
      const targetZ = THREE.MathUtils.lerp(0.0, rotundaRadius, easeTarget)
      const heroDistance = Math.hypot(heroCamY - worldCanopyY, heroCamZ)
      const heroPitch = Math.atan2(heroCamY - worldCanopyY, heroCamZ)
      const orbitDistance = THREE.MathUtils.lerp(heroDistance, galleryCamZ - rotundaRadius, Math.pow(p, 0.58))
      const orbitPitch = heroPitch * (1.0 - Math.pow(p, 0.85))
      const camY = targetY + Math.sin(orbitPitch) * orbitDistance
      const camZ = targetZ + Math.cos(orbitPitch) * orbitDistance

      const parallaxFactor = reducedMotion ? 0 : (1.0 - p * 0.65)
      const parallaxX = dampedMouse.x * 0.045 * parallaxFactor
      const parallaxY = dampedMouse.y * 0.030 * parallaxFactor

      camera.position.set(parallaxX, camY + parallaxY, camZ)
      camera.lookAt(0, targetY, targetZ)

      // 4. Inward/Outward Synchronized Project Carousel Continuous Rotation
      const unwrapped = unwrappedIndexRef.current
      const targetAngle = -unwrapped * angleStep
      const prevAngle = currentCarouselAngle

      if (reducedMotion) {
        currentCarouselAngle = targetAngle
      } else {
        currentCarouselAngle += (targetAngle - currentCarouselAngle) * (1.0 - Math.exp(-8.0 * dt))
      }

      // Restrained physical yaw response with heavy stone monolithic weight
      const targetHeroYaw = reducedMotion ? 0 : targetMouse.x * 0.16 + targetMouse.y * 0.030
      const springDt = Math.min(dt, 1 / 30)
      if (reducedMotion) {
        heroYaw = 0
        heroYawVelocity = 0
      } else {
        heroYawVelocity += ((targetHeroYaw - heroYaw) * 14.0 - heroYawVelocity * 7.5) * springDt
        heroYaw += heroYawVelocity * springDt
      }
      const heroInfluence = 1.0 - THREE.MathUtils.smoothstep(p, 0.02, 0.68)
      const worldAngle = currentCarouselAngle + heroYaw * heroInfluence
      pavilionGroup.rotation.y = worldAngle
      duneMat.uniforms.uOutlineRotation.value = worldAngle
      haloMaterial.uniforms.uOutlineRotation.value = worldAngle

      const angularVelocity = Math.abs(currentCarouselAngle - prevAngle) / Math.max(dt, 0.001)
      const targetDistortion = Math.min(angularVelocity * 1.4, 2.2)
      const attackFactor = 1.0 - Math.exp(-14.0 * dt)
      smoothedLiquidVelocity += (targetDistortion - smoothedLiquidVelocity) * attackFactor
      if (angularVelocity < 0.02) {
        smoothedLiquidVelocity *= Math.exp(-4.5 * dt)
      }

      const visualUnwrapped = Math.round(-currentCarouselAngle / angleStep)
      const currentSlot = ((visualUnwrapped % numSlots) + numSlots) % numSlots
      const currentProjectIndex = currentSlot % N

      if (currentProjectIndex !== lastReportedProjectIndex && onVisualActiveChangeRef.current) {
        lastReportedProjectIndex = currentProjectIndex
        onVisualActiveChangeRef.current(currentProjectIndex, visualUnwrapped)
      }

      projectMaterials.forEach((mat, idx) => {
        mat.uniforms.uTime.value = elapsed
        mat.uniforms.uVelocity.value = reducedMotion ? 0 : smoothedLiquidVelocity
        const isActive = idx === currentSlot ? 1.0 : 0.0
        mat.uniforms.uActive.value = THREE.MathUtils.lerp(mat.uniforms.uActive.value, isActive, 0.15)
      })

      // 5. Environmental Dune Lighting from Actual Loaded Image Surfaces
      const visibleOffsets = [0, -1, 1, 2]
      visibleOffsets.forEach((offset, i) => {
        const slot = ((currentSlot + offset) % numSlots + numSlots) % numSlots
        const pMesh = projectPanelMeshes[slot]
        if (!pMesh) return

        const pAngle = slot * angleStep + worldAngle
        const lx = Math.sin(pAngle) * rotundaRadius
        const ly = worldPanelY
        const lz = Math.cos(pAngle) * rotundaRadius

        const radProfile = pMesh.userData.radianceProfile as { color: [number, number, number]; intensity: number }
        const rCol = radProfile ? radProfile.color : [0.85, 0.82, 0.78]
        const rInt = radProfile ? radProfile.intensity : 1.25

        const envLightIntensity = rInt * THREE.MathUtils.lerp(0.10, 1.0, THREE.MathUtils.smoothstep(p, 0.05, 0.55))

        if (i === 0) {
          duneMat.uniforms.uLightPos0.value.set(lx, ly, lz)
          duneMat.uniforms.uLightColor0.value.set(...rCol)
          duneMat.uniforms.uLightInt0.value = envLightIntensity
        } else if (i === 1) {
          duneMat.uniforms.uLightPos1.value.set(lx, ly, lz)
          duneMat.uniforms.uLightColor1.value.set(...rCol)
          duneMat.uniforms.uLightInt1.value = envLightIntensity * 0.40
        } else if (i === 2) {
          duneMat.uniforms.uLightPos2.value.set(lx, ly, lz)
          duneMat.uniforms.uLightColor2.value.set(...rCol)
          duneMat.uniforms.uLightInt2.value = envLightIntensity * 0.40
        } else if (i === 3) {
          duneMat.uniforms.uLightPos3.value.set(lx, ly, lz)
          duneMat.uniforms.uLightColor3.value.set(...rCol)
          duneMat.uniforms.uLightInt3.value = envLightIntensity * 0.20
        }
      })

      duneMat.uniforms.uTime.value = elapsed

      // 6. Multi-Pass Render: Scene -> Bloom Extract -> Multi-Scale Blur -> Final Composite
      renderer.setRenderTarget(sceneRenderTarget)
      renderer.render(scene, camera)

      // The settled hero contains no emitting front faces. Its ground corona
      // is already part of the scene, so no bloom extraction or blur is needed.
      const bloomStrength = THREE.MathUtils.smoothstep(p, 0.025, 0.08)
      if (bloomStrength > 0) {
        quadMesh.material = bloomExtractMat
        bloomExtractMat.uniforms.uTexture.value = sceneRenderTarget.texture
        renderer.setRenderTarget(bloomRT1)
        renderer.render(quadScene, quadCamera)

        quadMesh.material = blurMat
        blurMat.uniforms.uTexture.value = bloomRT1.texture
        blurMat.uniforms.uDirection.value.set(1 / bloomRT1.width, 0)
        renderer.setRenderTarget(bloomRT2)
        renderer.render(quadScene, quadCamera)

        blurMat.uniforms.uTexture.value = bloomRT2.texture
        blurMat.uniforms.uDirection.value.set(0, 1 / bloomRT1.height)
        renderer.setRenderTarget(bloomRT1)
        renderer.render(quadScene, quadCamera)
      }

      // Step D: Final composite pass onto canvas
      renderer.setRenderTarget(null)
      compositeMaterial.uniforms.uSceneTexture.value = sceneRenderTarget.texture
      compositeMaterial.uniforms.uBloomTexture.value = bloomRT1.texture
      compositeMaterial.uniforms.uTrailTexture.value = rtCurrent.texture
      compositeMaterial.uniforms.uTime.value = elapsed
      compositeMaterial.uniforms.uWakeStrength.value = reducedMotion ? 0 : 1
      compositeMaterial.uniforms.uFormation.value = reducedMotion ? 0 : 1 - THREE.MathUtils.smoothstep(elapsed, 0, 3.4)
      compositeMaterial.uniforms.uJourney.value = p
      compositeMaterial.uniforms.uBloomStrength.value = bloomStrength
      renderer.render(compositeScene, compositeCamera)
      lastPassCount = renderer.info.render.frame - firstRenderFrame

      const unsettled = Math.abs(targetProg - p) > 0.00005
        || Math.abs(targetAngle - currentCarouselAngle) > 0.00005
        || Math.abs(heroYawVelocity) > 0.0001
        || Math.abs(targetHeroYaw - heroYaw) > 0.0001
        || dampedMouse.distanceToSquared(targetMouse) > 0.00000001
        || smoothedLiquidVelocity > 0.001
      // Finish the explicit clear pass before sleeping; otherwise a faint final
      // wake could remain frozen until the next interaction.
      const needsFrame = elapsed < 3.5 || fboSleepTimer > 0 || isTrailActive || unsettled
      if (profileEnabled && ((!needsFrame) || (frameTimes.length >= 30 && now - lastProfileTime > 3000))) {
        lastProfileTime = now
        console.info('ADNAN_PERF', JSON.stringify({
          state: p < 0.01 ? 'hero' : p > 0.99 ? 'gallery' : 'journey',
          sleeping: !needsFrame, passes: lastPassCount,
          drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
          frameMs: getFrameStats(), dpr: renderer.getPixelRatio(),
        }))
      }
      animId = needsFrame ? requestAnimationFrame(tick) : null
    }

    requestSceneFrame = () => {
      if (!disposed && !animId && !isTabHidden && !(isOffscreen && window.scrollY > cachedClientH * 0.9)) {
        lastTime = performance.now()
        animId = requestAnimationFrame(tick)
      }
    }
    animId = requestAnimationFrame(tick)

    if (typeof window !== 'undefined') {
      window.__threeSceneTelemetry = {
        getRenderStats: () => ({
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          textures: renderer.info.memory.textures,
          geometries: renderer.info.memory.geometries,
          effectiveDpr: renderer.getPixelRatio(),
          renderScale: renderScale,
          drawingBuffer: renderer.getDrawingBufferSize(new THREE.Vector2()),
          renderPasses: lastPassCount,
          active: animId !== null,
          frameMs: getFrameStats(),
        }),
      }
    }

    return () => {
      disposed = true
      requestSceneFrame = () => {}
      if (animId) cancelAnimationFrame(animId)
      if (typeof window !== 'undefined' && window.__threeSceneTelemetry) {
        delete window.__threeSceneTelemetry
      }
      document.removeEventListener('visibilitychange', onVisibilityChange)
      io.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onWindowLeave)
      window.removeEventListener('pointerdown', wakePointer)
      window.removeEventListener('wheel', wakePointer)
      window.removeEventListener('keydown', wakePointer)
      window.removeEventListener('adnan:experience-state', wakePointer)
      window.removeEventListener('adnan:set-progress', wakePointer)
      canvas.removeEventListener('click', onCanvasClick)
      resizeObserver.disconnect()
      motionPref.removeEventListener('change', onMotionChange)

      ownedGeometries.forEach((g) => g.dispose())
      ownedMaterials.forEach((m) => m.dispose())
      ownedTextures.forEach((t) => t.dispose())
      ownedRenderTargets.forEach((rt) => rt.dispose())
      renderer.dispose()
    }
  }, [webGlSupported, projects])

  if (!webGlSupported) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#020203] text-white/50 p-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-sm font-mono tracking-wider uppercase">WebGL Acceleration Disabled</p>
          <div className="flex flex-col gap-2 pt-2">
            {projects.slice(0, 4).map((proj) => (
              <Link
                key={proj.id}
                href={`/work/${proj.slug}`}
                className="px-4 py-2 text-xs font-mono border border-white/10 hover:border-white/30 rounded transition-colors text-white/80 hover:text-white"
              >
                {proj.title} →
              </Link>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block touch-none select-none"
      style={{ touchAction: 'none' }}
    />
  )
}
