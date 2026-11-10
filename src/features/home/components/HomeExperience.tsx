'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { CanvasProject } from '../types'
import { acquireScrollLock, releaseScrollLock, getLenis } from '@/components/providers/SmoothScrollProvider'

const EclipseCanvas = dynamic(() => import('./EclipseCanvas'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#020203]" />,
})

export type ExperienceState = 'hero' | 'scrubbing' | 'entering' | 'gallery' | 'returning' | 'footer'

interface HomeExperienceProps {
  projects: CanvasProject[]
  wordmark?: string
  subtitle?: string
  ctaText?: string
}

export default function HomeExperience({
  projects,
  wordmark = 'ADNAN',
  subtitle = 'Creative Director & Designer',
  ctaText = 'Scroll to start exploring',
}: HomeExperienceProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  // Experience progression & settling state
  const [experienceState, setExperienceState] = useState<ExperienceState>('hero')

  // Unwrapped carousel index for continuous wrap-around rotation
  const [unwrappedIndex, setUnwrappedIndex] = useState(0)
  // Visually active project index derived directly from 3D carousel angle
  const [visualActiveIndex, setVisualActiveIndex] = useState(0)

  // Continuous animation controller via refs (avoids 60fps React re-renders)
  const progressRef = useRef(0)
  const experienceStateRef = useRef<ExperienceState>('hero')
  const unwrappedIndexRef = useRef(0)
  const animIdRef = useRef<number | null>(null)
  const animatingRef = useRef(false)
  const isTransitioningRef = useRef(false)

  // Direct DOM refs for 60fps continuous overlay opacity changes without React reconciliation
  const heroOverlayRef = useRef<HTMLDivElement>(null)
  const galleryOverlayRef = useRef<HTMLDivElement>(null)
  const explorePillRef = useRef<HTMLDivElement>(null)

  const updateOverlays = useCallback((p: number) => {
    // Clean, crisp hero fade that completely vanishes by p = 0.20 without lingering grey text
    const heroOpacity = Math.max(0, 1.0 - p * 5.0)
    const galleryOpacity = Math.min(1.0, Math.max(0, (p - 0.70) / 0.30))

    if (heroOverlayRef.current) {
      heroOverlayRef.current.style.opacity = String(heroOpacity)
      heroOverlayRef.current.style.visibility = heroOpacity <= 0.001 ? 'hidden' : 'visible'
      heroOverlayRef.current.style.pointerEvents = heroOpacity > 0.05 ? 'auto' : 'none'
    }
    if (galleryOverlayRef.current) {
      galleryOverlayRef.current.style.opacity = String(galleryOpacity)
      galleryOverlayRef.current.style.visibility = galleryOpacity <= 0.001 ? 'hidden' : 'visible'
      galleryOverlayRef.current.style.pointerEvents = galleryOpacity > 0.50 ? 'auto' : 'none'
    }
    if (explorePillRef.current) {
      explorePillRef.current.style.opacity = String(heroOpacity)
      explorePillRef.current.style.visibility = heroOpacity <= 0.001 ? 'hidden' : 'visible'
      explorePillRef.current.style.pointerEvents = heroOpacity > 0.05 ? 'auto' : 'none'
    }
  }, [])

  const setJourneyProgress = useCallback((val: number) => {
    const p = Math.max(0, Math.min(1.0, val))
    progressRef.current = p
    updateOverlays(p)
  }, [updateOverlays])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onSetProgress = (e: CustomEvent<{ progress: number }>) => {
      if (typeof e.detail?.progress === 'number') {
        setJourneyProgress(e.detail.progress)
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__setProgress = setJourneyProgress
    window.addEventListener('adnan:set-progress', onSetProgress as EventListener)
    return () => {
      window.removeEventListener('adnan:set-progress', onSetProgress as EventListener)
    }
  }, [setJourneyProgress])

  useEffect(() => {
    experienceStateRef.current = experienceState
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('adnan:experience-state', { detail: { state: experienceState } }))
    }
  }, [experienceState])

  useEffect(() => {
    unwrappedIndexRef.current = unwrappedIndex
  }, [unwrappedIndex])

  // Derive active project from 3D visual angle callback
  const handleVisualActiveChange = useCallback((projIndex: number) => {
    setVisualActiveIndex(projIndex)
  }, [])

  const numProjects = projects.length || 1
  const activeProject = projects[visualActiveIndex] || projects[0]
  const prevIndex = (visualActiveIndex - 1 + numProjects) % numProjects
  const nextIndex = (visualActiveIndex + 1) % numProjects
  const prevProject = projects[prevIndex]
  const nextProject = projects[nextIndex]

  // Establish single input owner on mount: pin document at top and acquire lock
  useEffect(() => {
    window.scrollTo(0, 0)
    acquireScrollLock('home-experience')
    return () => {
      releaseScrollLock('home-experience')
    }
  }, [])

  // Manage global scroll lock lifecycle based on experience state
  useEffect(() => {
    if (experienceState === 'footer') {
      releaseScrollLock('home-experience')
    } else {
      acquireScrollLock('home-experience')
    }
    return () => {
      releaseScrollLock('home-experience')
    }
  }, [experienceState])

  // Interruptible smooth cubic tween for journey progression
  const animateProgressTo = useCallback((target: number, durationMs = 1000, onDone?: () => void) => {
    if (animIdRef.current) {
      cancelAnimationFrame(animIdRef.current)
      animIdRef.current = null
    }
    animatingRef.current = true
    isTransitioningRef.current = true
    const startVal = progressRef.current
    const startTime = performance.now()

    const step = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / durationMs, 1.0)
      // Smoothstep cubic easing
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      const val = startVal + (target - startVal) * ease

      setJourneyProgress(val)

      if (t < 1.0) {
        animIdRef.current = requestAnimationFrame(step)
      } else {
        setJourneyProgress(target)
        animatingRef.current = false
        isTransitioningRef.current = false
        animIdRef.current = null
        if (target === 1.0) {
          setExperienceState('gallery')
        } else if (target === 0.0) {
          setExperienceState('hero')
        }
        if (onDone) onDone()
      }
    }

    animIdRef.current = requestAnimationFrame(step)
  }, [setJourneyProgress])

  // Start exploring action
  const startExploring = useCallback(() => {
    setExperienceState('entering')
    animateProgressTo(1.0, 1150)
  }, [animateProgressTo])

  // Explicit footer access (ONLY triggered by deliberate user click on Info & Contact button)
  const handleOpenFooter = useCallback(() => {
    releaseScrollLock('home-experience')
    setExperienceState('footer')
    const lenis = getLenis()
    const footerEl = document.getElementById('homepage-footer-section')
    if (lenis) {
      if (footerEl) {
        lenis.scrollTo(footerEl, { duration: 1.2 })
      } else {
        lenis.scrollTo(window.innerHeight, { duration: 1.2 })
      }
    } else if (footerEl) {
      footerEl.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  // Deliberate return from footer to experience
  const handleReturnFromFooter = useCallback((toHero = false) => {
    const lenis = getLenis()
    if (lenis) {
      lenis.scrollTo(0, {
        duration: 1.0,
        onComplete: () => {
          acquireScrollLock('home-experience')
          if (toHero) {
            setExperienceState('returning')
            animateProgressTo(0.0, 950)
          } else {
            setExperienceState('gallery')
          }
        },
      })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => {
        acquireScrollLock('home-experience')
        if (toHero) {
          setExperienceState('returning')
          animateProgressTo(0.0, 950)
        } else {
          setExperienceState('gallery')
        }
      }, 500)
    }
  }, [animateProgressTo])

  // Return to hero action
  const returnToHero = useCallback(() => {
    if (experienceStateRef.current === 'footer' || (typeof window !== 'undefined' && window.scrollY > 0)) {
      handleReturnFromFooter(true)
    } else {
      setExperienceState('returning')
      animateProgressTo(0.0, 1050)
    }
  }, [animateProgressTo, handleReturnFromFooter])

  // Continuous project navigation
  const goToNextProject = useCallback(() => {
    setUnwrappedIndex((prev) => prev + 1)
  }, [])

  const goToPrevProject = useCallback(() => {
    setUnwrappedIndex((prev) => prev - 1)
  }, [])

  // Open project detail
  const handleOpenProject = useCallback((project: CanvasProject) => {
    if (project?.slug) {
      router.push(`/work/${project.slug}`)
    }
  }, [router])

  // Consolidated listener for programmatic, navigation and external triggers
  useEffect(() => {
    const onNext = () => goToNextProject()
    const onPrev = () => goToPrevProject()
    const onReturnEvent = () => returnToHero()
    const onReturnFromFooter = (e: Event) => {
      const custom = e as CustomEvent
      handleReturnFromFooter(custom.detail?.toHero)
    }
    const onSetProgress = (e: Event) => {
      const custom = e as CustomEvent<{ progress: number }>
      if (typeof custom.detail?.progress === 'number') {
        const p = Math.max(0, Math.min(1.0, custom.detail.progress))
        setJourneyProgress(p)
        if (p >= 0.85) setExperienceState('gallery')
        else if (p <= 0.05) setExperienceState('hero')
        else setExperienceState('scrubbing')
      }
    }

    window.addEventListener('adnan:next-project', onNext)
    window.addEventListener('adnan:prev-project', onPrev)
    window.addEventListener('adnan:return-to-hero', onReturnEvent)
    window.addEventListener('adnan:return-from-footer', onReturnFromFooter)
    window.addEventListener('adnan:set-progress', onSetProgress)

    return () => {
      window.removeEventListener('adnan:next-project', onNext)
      window.removeEventListener('adnan:prev-project', onPrev)
      window.removeEventListener('adnan:return-to-hero', onReturnEvent)
      window.removeEventListener('adnan:return-from-footer', onReturnFromFooter)
      window.removeEventListener('adnan:set-progress', onSetProgress)
    }
  }, [goToNextProject, goToPrevProject, returnToHero, handleReturnFromFooter, setJourneyProgress])

  // Prevent programmatic or focus scroll from offsetting document during immersive experience
  useEffect(() => {
    const handleScrollGuards = () => {
      if (experienceStateRef.current !== 'footer' && window.scrollY !== 0) {
        window.scrollTo(0, 0)
      } else if (experienceStateRef.current === 'footer' && window.scrollY <= 0) {
        acquireScrollLock('home-experience')
        setExperienceState('gallery')
      }
    }
    window.addEventListener('scroll', handleScrollGuards, { passive: true })
    return () => window.removeEventListener('scroll', handleScrollGuards)
  }, [])

  // Wheel and trackpad controller with deliberate gesture handling
  useEffect(() => {
    let accumulatedDelta = 0
    let gestureCommitted = false
    let lastGestureTime = 0
    let lastWheelEventTime = 0
    let lastStepTime = 0
    let stepSign = 0

    const onWheel = (e: WheelEvent) => {
      // 1. If currently in 'footer' state, yield 100% of input to document scroll
      if (experienceStateRef.current === 'footer') {
        return
      }

      // Pause input if mobile menu is open
      const menu = document.getElementById('mobile-menu-drawer')
      const isMenuOpen = menu && menu.style.display !== 'none' && menu.getAttribute('aria-hidden') === 'false'
      if (isMenuOpen) return

      // Pin document at top while immersive experience owns input
      e.preventDefault()

      // Normalize deltaMode
      let dy = e.deltaY
      if (e.deltaMode === 1) dy *= 20
      else if (e.deltaMode === 2) dy *= window.innerHeight

      let dx = e.deltaX
      if (e.deltaMode === 1) dx *= 20
      else if (e.deltaMode === 2) dx *= window.innerWidth

      const now = performance.now()
      const currentP = progressRef.current

      // 2. Entering or returning state: committed camera journey in flight
      // Normal momentum MUST NOT cancel it or strand the camera!
      if (experienceStateRef.current === 'entering' || experienceStateRef.current === 'returning') {
        return
      }

      // 3. Hero & Reversible Journey Phase: scrub smoothly until commit threshold
      if (currentP < 0.85 && experienceStateRef.current !== 'gallery') {
        if (dy > 0) {
          const delta = dy * 0.0016
          const nextP = Math.min(1.0, currentP + delta)
          setJourneyProgress(nextP)

          if (nextP >= 0.40) {
            // Commit to entering gallery smoothly and reliably
            setExperienceState('entering')
            animateProgressTo(1.0, 950)
          } else if (experienceStateRef.current !== 'scrubbing') {
            setExperienceState('scrubbing')
          }
        } else if (dy < 0 && currentP > 0) {
          const delta = dy * 0.0016
          const nextP = Math.max(0.0, currentP + delta)
          setJourneyProgress(nextP)
          if (nextP === 0) {
            setExperienceState('hero')
          } else if (experienceStateRef.current !== 'scrubbing') {
            setExperienceState('scrubbing')
          }
        }
        return
      }

      // 4. Settled Gallery Phase: project browsing (NEVER JUMPS TO FOOTER!)
      const dominantDelta = Math.abs(dx) > Math.abs(dy) ? dx : dy

      // Check for discrete mouse wheel notch (typically >= 50 units with interval >= 50ms)
      const isDiscreteNotch = e.deltaMode === 1 || (Math.abs(dy) >= 50 && now - lastWheelEventTime > 50)
      lastWheelEventTime = now

      if (isDiscreteNotch) {
        if (now - lastStepTime > 280) {
          lastStepTime = now
          if (dy > 0) goToNextProject()
          else goToPrevProject()
        }
        return
      }

      // Continuous trackpad gesture handling with momentum suppression
      if (now - lastGestureTime > 140) {
        accumulatedDelta = 0
        gestureCommitted = false
      }
      lastGestureTime = now
      accumulatedDelta += dominantDelta

      if (!gestureCommitted) {
        if (Math.abs(accumulatedDelta) >= 34) {
          gestureCommitted = true
          lastStepTime = now
          stepSign = Math.sign(accumulatedDelta)
          if (accumulatedDelta > 0) {
            goToNextProject()
          } else {
            goToPrevProject()
          }
        }
      } else {
        // Immediate directional reversal support during the same gesture stroke
        const currentSign = Math.sign(dominantDelta)
        if (stepSign !== 0 && currentSign !== 0 && currentSign !== stepSign && Math.abs(dominantDelta) > 12) {
          accumulatedDelta = dominantDelta
          stepSign = currentSign
          lastStepTime = now
          gestureCommitted = true
          if (currentSign > 0) {
            goToNextProject()
          } else {
            goToPrevProject()
          }
        } else if (now - lastStepTime > 380 && Math.abs(accumulatedDelta) >= 50) {
          // Allow deliberate sustained trackpad scrolling to advance only after generous cooldown
          accumulatedDelta = 0
          lastStepTime = now
          if (dominantDelta > 0) {
            goToNextProject()
          } else {
            goToPrevProject()
          }
        }
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [animateProgressTo, goToNextProject, goToPrevProject, setJourneyProgress])

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (experienceStateRef.current === 'footer') return
      // Pause input if mobile menu is open
      const menu = document.getElementById('mobile-menu-drawer')
      const isMenuOpen = menu && menu.style.display !== 'none' && menu.getAttribute('aria-hidden') === 'false'
      if (isMenuOpen) return

      const target = e.target as HTMLElement | null
      const tag = target?.tagName

      if (progressRef.current >= 0.85 || experienceStateRef.current === 'gallery') {
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          goToNextProject()
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          goToPrevProject()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          returnToHero()
        } else if (e.key === 'Enter') {
          if (tag === 'BUTTON' || tag === 'A') return
          e.preventDefault()
          if (activeProject) handleOpenProject(activeProject)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goToNextProject, goToPrevProject, returnToHero, handleOpenProject, activeProject])

  // Touch gesture handling
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let touchStartX = 0
    let touchStartY = 0
    let touchStartProgress = 0

    const onTouchStart = (e: TouchEvent) => {
      const menu = document.getElementById('mobile-menu-drawer')
      const isMenuOpen = menu && menu.style.display !== 'none' && menu.getAttribute('aria-hidden') === 'false'
      if (isMenuOpen) return

      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX
        touchStartY = e.touches[0].clientY
        touchStartProgress = progressRef.current

        // A tap must not strand the controller during in-flight committed transitions
        if (experienceStateRef.current !== 'entering' && experienceStateRef.current !== 'returning') {
          if (animatingRef.current && animIdRef.current) {
            cancelAnimationFrame(animIdRef.current)
            animIdRef.current = null
            animatingRef.current = false
          }
          isTransitioningRef.current = false
        }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (experienceStateRef.current === 'footer') return
      const menu = document.getElementById('mobile-menu-drawer')
      const isMenuOpen = menu && menu.style.display !== 'none' && menu.getAttribute('aria-hidden') === 'false'
      if (isMenuOpen) return

      if (e.touches.length !== 1) return
      const dy = touchStartY - e.touches[0].clientY

      // Don't interrupt a committed in-flight journey
      if (experienceStateRef.current === 'entering' || experienceStateRef.current === 'returning') {
        return
      }

      if (progressRef.current < 0.85 && experienceStateRef.current !== 'gallery') {
        if (Math.abs(dy) > 4) {
          e.preventDefault()
          const nextP = Math.max(0, Math.min(1.0, touchStartProgress + dy * 0.002))
          setJourneyProgress(nextP)
          if (nextP >= 0.40) {
            setExperienceState('entering')
            animateProgressTo(1.0, 950)
          } else if (experienceStateRef.current !== 'scrubbing') {
            setExperienceState('scrubbing')
          }
        }
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (experienceStateRef.current === 'footer') return
      const menu = document.getElementById('mobile-menu-drawer')
      const isMenuOpen = menu && menu.style.display !== 'none' && menu.getAttribute('aria-hidden') === 'false'
      if (isMenuOpen) return

      isTransitioningRef.current = false

      if ((progressRef.current >= 0.85 || experienceStateRef.current === 'gallery') && e.changedTouches.length === 1) {
        const dx = touchStartX - e.changedTouches[0].clientX
        const dy = touchStartY - e.changedTouches[0].clientY
        const absDx = Math.abs(dx)
        const absDy = Math.abs(dy)
        const isHorizontal = absDx >= absDy
        const magnitude = isHorizontal ? absDx : absDy
        const sign = isHorizontal ? Math.sign(dx) : Math.sign(dy)

        if (magnitude > 28) {
          if (sign > 0) {
            goToNextProject()
          } else {
            goToPrevProject()
          }
        }
      }
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove', onTouchMove, { passive: false })
    container.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', onTouchEnd)
    }
  }, [animateProgressTo, goToNextProject, goToPrevProject, setJourneyProgress])

  const isGalleryInteractive = experienceState === 'gallery'

  return (
    <div
      ref={containerRef}
      id="home-experience-viewport"
      data-lenis-prevent="true"
      className="relative w-full h-screen overflow-hidden select-none bg-[#020203]"
      style={{ touchAction: 'none' }}
    >
      {/* 1. UNIFIED 3D WEBGL SCENE */}
      <EclipseCanvas
        projects={projects}
        progressRefObject={progressRef}
        activeProjectIndex={visualActiveIndex}
        unwrappedIndex={unwrappedIndex}
        onOpenProject={handleOpenProject}
        onNavigatePrev={goToPrevProject}
        onNavigateNext={goToNextProject}
        onVisualActiveChange={handleVisualActiveChange}
      />

      {/* 2. HERO OVERLAY (Settled Hero State) */}
      <div
        ref={heroOverlayRef}
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ opacity: 1, transform: 'translateZ(0)' }}
      >
        {/* Independently Centered ADNAN Wordmark at Viewport Center (50%, 50%) */}
        {/* Keep the wordmark comfortably inside the crown on narrow phones. */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <h1
            className="relative font-extrabold text-white uppercase leading-none select-none"
            style={{
              fontFamily: "var(--font-geist), 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
              fontSize: 'clamp(30px, 8.5vw, 58px)',
              letterSpacing: '0.08em',
              lineHeight: 1,
            }}
          >
            {wordmark}
          </h1>
        </div>

        {/* Lateral Metadata Labels hidden on mobile to prevent overlapping centered exploration pill */}
        <div className="hidden md:block absolute left-6 sm:left-10 md:left-14 bottom-8 text-[11px] font-mono tracking-[0.22em] uppercase text-text-muted select-none pointer-events-none">
          ADNAN — PORTFOLIO
        </div>

        <div className="hidden md:block absolute right-6 sm:right-10 md:right-14 bottom-8 text-[11px] font-mono tracking-[0.22em] uppercase text-text-muted select-none pointer-events-none">
          {subtitle}
        </div>

        {/* Restrained Exploration Pill Button matching reference footprint (~260 x 52 px) */}
        <div
          ref={explorePillRef}
          className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-auto"
          style={{
            bottom: 'max(24px, env(safe-area-inset-bottom, 20px))',
          }}
        >
          <button
            onClick={startExploring}
            className="group relative flex items-center justify-center gap-2.5 whitespace-nowrap px-6 py-3 rounded-full border border-white/15 bg-white/[0.04] hover:bg-white/[0.12] hover:border-white/30 backdrop-blur-md transition-all duration-300 shadow-lg text-white"
            aria-label="Scroll to start exploring projects"
            tabIndex={experienceState === 'hero' ? 0 : -1}
          >
            <span className="text-xs font-medium tracking-wide text-white/90">
              {ctaText}
            </span>
            <svg
              className="w-3.5 h-3.5 text-white/80 transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      </div>

      {/* 3. IMMERSIVE PROJECT GALLERY OVERLAYS (Stationary & Independent Layout) */}
      <div
        ref={galleryOverlayRef}
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          opacity: 0,
          pointerEvents: 'none',
        }}
      >
        {/* Stationary Active Project Title Anchored Over Active Artwork Panel (Matching Reference Composition) */}
        <div className="absolute top-[34%] sm:top-[36%] md:top-[38%] left-0 right-0 w-full flex flex-col items-center justify-start text-center px-4 pointer-events-none">
          <div className="space-y-1.5 w-full max-w-4xl min-h-40 flex flex-col items-center justify-start">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.24em] text-white/70 h-4 leading-4 block drop-shadow-md">
              {activeProject?.category?.name || 'Featured Project'}
            </span>

            <h2
              onClick={() => activeProject && handleOpenProject(activeProject)}
              className={`text-[26px] sm:text-4xl md:text-[44px] lg:text-5xl font-extrabold text-white tracking-tight leading-[1.15] text-balance break-words w-full hover:text-white/90 transition-colors cursor-pointer drop-shadow-2xl ${
                isGalleryInteractive ? 'pointer-events-auto' : 'pointer-events-none'
              }`}
              tabIndex={isGalleryInteractive ? 0 : -1}
              role="button"
              aria-label={`View project: ${activeProject?.title}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (activeProject) handleOpenProject(activeProject)
                }
              }}
            >
              {activeProject?.title || ''}
            </h2>
          </div>
        </div>

        {/* Stationary Bottom Controls Container */}
        <div className="absolute bottom-0 left-0 right-0 w-full pointer-events-none">
          {/* Mobile deliberate layout (portrait < md, e.g. 390 x 844) */}
          <div
            className="w-full flex md:hidden flex-col items-center gap-3 pointer-events-none px-4"
            style={{
              paddingBottom: 'max(16px, env(safe-area-inset-bottom, 12px))',
            }}
          >
            {/* Central action pill */}
            <Link
              href={activeProject?.slug ? `/work/${activeProject.slug}` : '/work'}
              data-testid="view-project-pill-mobile"
              className={`flex items-center justify-center gap-2 w-full max-w-[260px] h-12 rounded-full border border-white/25 bg-white/[0.10] active:bg-white/[0.20] backdrop-blur-lg transition-colors text-white font-medium text-sm shadow-lg ${
                isGalleryInteractive ? 'pointer-events-auto' : 'pointer-events-none'
              }`}
              tabIndex={isGalleryInteractive ? 0 : -1}
            >
              <span>View Project</span>
              <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            {/* Prev / Return / Next controls row (Stationary 3-column grid with >= 44px touch targets) */}
            <div className="w-full grid grid-cols-[44px_minmax(0,1fr)_44px] items-center max-w-sm">
              <button
                onClick={goToPrevProject}
                data-testid="prev-project-button-mobile"
                className={`min-h-[44px] w-11 flex items-center justify-center py-2.5 justify-self-start transition-colors rounded-lg active:bg-white/10 ${
                  isGalleryInteractive ? 'pointer-events-auto' : 'pointer-events-none'
                }`}
                aria-label="Previous project"
                tabIndex={isGalleryInteractive ? 0 : -1}
              >
                <span className="text-xs font-mono text-white/60 shrink-0">←</span>
                <span className="sr-only">
                  {prevProject?.title || 'Prev'}
                </span>
              </button>

              <div className="flex items-center gap-1 justify-self-center shrink-0">
                <button
                  onClick={returnToHero}
                  data-testid="return-overview-button-mobile"
                  aria-label="Return to overview"
                  className={`min-h-[44px] flex items-center text-[10px] font-mono tracking-widest uppercase text-white/50 hover:text-white py-2 px-2 transition-colors rounded-lg active:bg-white/10 ${
                    isGalleryInteractive ? 'pointer-events-auto' : 'pointer-events-none'
                  }`}
                  tabIndex={isGalleryInteractive ? 0 : -1}
                >
                  ↑ Overview
                </button>
                <button
                  onClick={handleOpenFooter}
                  data-testid="view-footer-button-mobile"
                  className={`min-h-[44px] flex items-center text-[10px] font-mono tracking-widest uppercase text-white/40 hover:text-white py-2 px-2 transition-colors rounded-lg active:bg-white/10 ${
                    isGalleryInteractive ? 'pointer-events-auto' : 'pointer-events-none'
                  }`}
                  tabIndex={isGalleryInteractive ? 0 : -1}
                >
                  ↓ Info
                </button>
              </div>

              <button
                onClick={goToNextProject}
                data-testid="next-project-button-mobile"
                className={`min-h-[44px] w-11 flex items-center justify-center py-2.5 justify-self-end transition-colors rounded-lg active:bg-white/10 ${
                  isGalleryInteractive ? 'pointer-events-auto' : 'pointer-events-none'
                }`}
                aria-label="Next project"
                tabIndex={isGalleryInteractive ? 0 : -1}
              >
                <span className="sr-only">
                  {nextProject?.title || 'Next'}
                </span>
                <span className="text-xs font-mono text-white/60 shrink-0">→</span>
              </button>
            </div>
          </div>

          {/* Desktop gallery bottom navigation (>= md, Independent 3-column Grid) */}
          <div
            className="hidden md:grid grid-cols-[1fr_auto_1fr] items-end w-full px-6 sm:px-10 pointer-events-none"
            style={{
              paddingBottom: 'max(28px, env(safe-area-inset-bottom, 10px))',
            }}
          >
            {/* Left Slot: Previous Project */}
            <div className="justify-self-start min-w-0 max-w-[280px] w-full">
              <button
                onClick={goToPrevProject}
                data-testid="prev-project-button"
                className={`group flex flex-col items-start text-left w-full h-[46px] justify-between transition-colors ${
                  isGalleryInteractive ? 'pointer-events-auto' : 'pointer-events-none'
                }`}
                aria-label="Previous project"
                tabIndex={isGalleryInteractive ? 0 : -1}
              >
                <span className="text-[10px] font-mono tracking-widest uppercase text-white/50 group-hover:text-white transition-colors h-4 block">
                  ← PREV
                </span>
                <span className="text-sm font-semibold text-white truncate w-full block group-hover:text-white/80 transition-colors h-5 leading-5">
                  {prevProject?.title || 'Previous'}
                </span>
              </button>
            </div>

            {/* Center Slot: View Project Pill + Return Link */}
            <div className="justify-self-center flex flex-col items-center gap-2 pointer-events-none">
              <Link
                href={activeProject?.slug ? `/work/${activeProject.slug}` : '/work'}
                data-testid="view-project-pill"
                className={`group relative flex items-center gap-2.5 px-6 py-2.5 rounded-full border border-white/20 bg-white/[0.08] hover:bg-white/[0.18] backdrop-blur-md transition-colors duration-200 shadow-md text-white ${
                  isGalleryInteractive ? 'pointer-events-auto' : 'pointer-events-none'
                }`}
                tabIndex={isGalleryInteractive ? 0 : -1}
              >
                <span className="text-sm font-semibold tracking-wide">
                  View Project
                </span>
                <svg
                  className="w-3.5 h-3.5 text-white/80 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>

              <div className="flex items-center gap-4">
                <button
                  onClick={returnToHero}
                  data-testid="return-overview-button"
                  aria-label="Return to overview"
                  className={`text-[10px] font-mono tracking-widest uppercase text-white/50 hover:text-white transition-colors ${
                    isGalleryInteractive ? 'pointer-events-auto' : 'pointer-events-none'
                  }`}
                  tabIndex={isGalleryInteractive ? 0 : -1}
                >
                  ↑ Return to Overview
                </button>
                <button
                  onClick={handleOpenFooter}
                  data-testid="view-footer-button"
                  className={`text-[10px] font-mono tracking-widest uppercase text-white/40 hover:text-white transition-colors ${
                    isGalleryInteractive ? 'pointer-events-auto' : 'pointer-events-none'
                  }`}
                  tabIndex={isGalleryInteractive ? 0 : -1}
                >
                  ↓ Info & Contact
                </button>
              </div>
            </div>

            {/* Right Slot: Next Project */}
            <div className="justify-self-end min-w-0 max-w-[280px] w-full text-right">
              <button
                onClick={goToNextProject}
                data-testid="next-project-button"
                className={`group flex flex-col items-end text-right w-full h-[46px] justify-between transition-colors ${
                  isGalleryInteractive ? 'pointer-events-auto' : 'pointer-events-none'
                }`}
                aria-label="Next project"
                tabIndex={isGalleryInteractive ? 0 : -1}
              >
                <span className="text-[10px] font-mono tracking-widest uppercase text-white/50 group-hover:text-white transition-colors h-4 block">
                  NEXT →
                </span>
                <span className="text-sm font-semibold text-white truncate w-full block group-hover:text-white/80 transition-colors h-5 leading-5">
                  {nextProject?.title || 'Next'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
