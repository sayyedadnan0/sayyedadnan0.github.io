'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let lenisInstance: Lenis | null = null

// Active scroll locks registry by source identifier ('home-experience', 'mobile-drawer', etc.)
const activeLocks = new Set<string>()

export function getLenis(): Lenis | null {
  return lenisInstance
}

export function isScrollLocked(): boolean {
  return activeLocks.size > 0
}

export function acquireScrollLock(source: string) {
  activeLocks.add(source)
  applyScrollLockState()
}

export function releaseScrollLock(source: string) {
  activeLocks.delete(source)
  applyScrollLockState()
}

export function releaseAllScrollLocks() {
  activeLocks.clear()
  applyScrollLockState()
}

function applyScrollLockState() {
  if (typeof document === 'undefined') return
  const isLocked = activeLocks.size > 0
  const lenis = lenisInstance

  if (isLocked) {
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    if (lenis) {
      lenis.stop()
    }
  } else {
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
    if (lenis) {
      lenis.start()
    }
  }
}

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Initialize Lenis singleton
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.8,
      infinite: false,
    })

    lenisInstance = lenis

    // Synchronize Lenis scroll position with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update)

    // Drive Lenis RAF through GSAP ticker for frame-level synchronization
    const tickerCallback = (time: number) => {
      lenis.raf(time * 1000)
    }

    gsap.ticker.add(tickerCallback)
    gsap.ticker.lagSmoothing(0)

    // Apply any initial lock state
    applyScrollLockState()

    return () => {
      gsap.ticker.remove(tickerCallback)
      lenis.destroy()
      lenisInstance = null
      releaseAllScrollLocks()
    }
  }, [])

  // Coordinate route changes: leaving homepage must release home experience locks
  useEffect(() => {
    if (pathname !== '/') {
      // Release any lingering home experience locks on standard pages
      if (activeLocks.has('home-experience')) {
        activeLocks.delete('home-experience')
      }
      applyScrollLockState()
    }
  }, [pathname])

  return <>{children}</>
}
