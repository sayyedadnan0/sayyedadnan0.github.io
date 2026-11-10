'use client'

import Link from 'next/link'
import { SITE } from '@/config/site'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import SoundToggle from './SoundToggle'
import { acquireScrollLock, releaseScrollLock } from '@/components/providers/SmoothScrollProvider'

export default function Navigation({ contactEmail = SITE.email }: { contactEmail?: string }) {
  const pathname = usePathname()
  const headerRef = useRef<HTMLElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuOverlayRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const firstLinkRef = useRef<HTMLAnchorElement>(null)
  const lastLinkRef = useRef<HTMLAnchorElement>(null)
  const wasOpenedRef = useRef(false)
  const lastScrollY = useRef(0)
  const [homeExperienceHero, setHomeExperienceHero] = useState(true)
  const isHeroState = pathname === '/' && homeExperienceHero

  useEffect(() => {
    if (pathname !== '/') return
    const onState = (e: Event) => {
      const custom = e as CustomEvent<{ state: string }>
      if (custom.detail?.state) {
        setHomeExperienceHero(custom.detail.state === 'hero')
      }
    }
    window.addEventListener('adnan:experience-state', onState)
    return () => window.removeEventListener('adnan:experience-state', onState)
  }, [pathname])

  // Close mobile drawer on browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setMobileMenuOpen(false)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY > 80) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }

      // Only hide nav if scrolling down significantly and mobile menu is closed
      if (!mobileMenuOpen) {
        if (currentScrollY > lastScrollY.current + 50 && currentScrollY > 300) {
          setHidden(true)
        } else if (currentScrollY < lastScrollY.current - 10) {
          setHidden(false)
        }
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [mobileMenuOpen])

  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, ease: 'expo.out', delay: 0.3 }
      )
    }
  }, [])

  // Comprehensive keyboard focus trap, background inert, and focus restoration
  useEffect(() => {
    if (!mobileMenuOpen) {
      if (wasOpenedRef.current) {
        // Restore focus to trigger on close
        triggerRef.current?.focus()
        wasOpenedRef.current = false
      }
      return
    }

    wasOpenedRef.current = true
    acquireScrollLock('mobile-drawer')

    // Prevent background keyboard and accessibility interaction
    const mainEl = document.getElementById('main-content')
    const footerEl = document.querySelector('footer')
    if (mainEl) mainEl.setAttribute('inert', '')
    if (footerEl) footerEl.setAttribute('inert', '')

    // Focus first link on open
    const focusTimer = setTimeout(() => {
      firstLinkRef.current?.focus()
    }, 50)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setMobileMenuOpen(false)
        return
      }

      if (e.key === 'Tab') {
        const triggerEl = triggerRef.current
        const drawerEl = menuOverlayRef.current
        if (!drawerEl || !triggerEl) return

        const focusableInDrawer = Array.from(
          drawerEl.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
        )
        if (focusableInDrawer.length === 0) return

        // Interactive cycle: [triggerEl (Close Control), ...drawerFocusable]
        const cycleElements = [triggerEl, ...focusableInDrawer]
        const firstElement = cycleElements[0]
        const lastElement = cycleElements[cycleElements.length - 1]

        if (e.shiftKey) {
          // Shift + Tab on first element wraps to last element
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          // Tab on last element wraps to first element (close control)
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleKeyDown)
      releaseScrollLock('mobile-drawer')
      if (mainEl) mainEl.removeAttribute('inert')
      if (footerEl) footerEl.removeAttribute('inert')
    }
  }, [mobileMenuOpen])

  const navLinks = [
    { href: '/work', label: 'Our Work', num: '01' },
    { href: '/about', label: 'About Me', num: '02' },
  ]

  return (
    <>
      <header
        ref={headerRef}
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ease-out ${
          hidden ? '-translate-y-full' : 'translate-y-0'
        } ${scrolled ? 'border-b border-white/[0.05] bg-background/50 backdrop-blur-md' : ''}`}
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', opacity: 0, zIndex: 100 }}
      >
        {/* Multi-layer blur effect matching Studio Mirage */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div
            className="absolute inset-0"
            style={{
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              maskImage: 'linear-gradient(to bottom, #000 55%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, #000 55%, transparent 100%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              maskImage: 'linear-gradient(to bottom, #000 30%, transparent 75%)',
              WebkitMaskImage: 'linear-gradient(to bottom, #000 30%, transparent 75%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(5,5,5,0.7), transparent)',
            }}
          />
        </div>

        {/* Full-width container with viewport-edge spacing matching reference */}
        <div className="w-full px-6 sm:px-10 md:px-14 lg:px-16 relative flex items-center justify-between py-5 md:py-7">
          {/* Logo - Monogram (smoothly transitions in when entering gallery, hidden on settled hero) */}
          <div
            className={`flex-shrink-0 z-10 transition-opacity duration-500 ${
              pathname === '/' && isHeroState ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
            }`}
          >
            <Link
              href="/"
              className="block"
              aria-label="ADNAN — Home"
              tabIndex={pathname === '/' && isHeroState ? -1 : 0}
              onClick={(e) => {
                setMobileMenuOpen(false)
                if (typeof window !== 'undefined' && window.location.pathname === '/') {
                  e.preventDefault()
                  window.dispatchEvent(new CustomEvent('adnan:return-to-hero'))
                }
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="hover:opacity-80 transition-opacity duration-200"
              >
                <path
                  d="M16 2L2 28H6.5L16 8.5L25.5 28H30L16 2Z"
                  fill="white"
                  fillRule="evenodd"
                />
                <path
                  d="M9.5 22H22.5"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 md:gap-10" role="navigation" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative text-sm font-semibold tracking-wide transition-opacity duration-200 hover:opacity-100 ${
                  pathname === link.href ? 'opacity-100 text-white' : 'opacity-70 text-text-secondary hover:text-white'
                }`}
              >
                {pathname === link.href && (
                  <span
                    className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent-amber"
                    aria-hidden="true"
                  />
                )}
                {link.label}
              </Link>
            ))}

            {/* Sound Toggle */}
            <SoundToggle />

            {/* Contact button */}
            <Link href="/contact" className="btn-primary">
              <span className="btn-primary-label">
                Contact Me
              </span>
              <span className="btn-primary-glow" aria-hidden="true" />
            </Link>
          </nav>

          {/* Mobile Right Controls: SoundToggle + Animated Hamburger */}
          <div className="flex items-center gap-3 md:hidden z-10">
            <SoundToggle />

            <button
              ref={triggerRef}
              id="mobile-menu-trigger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="relative w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/[0.06] hover:bg-white/[0.12] transition-colors text-white"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu-drawer"
            >
              <span
                className={`w-4 h-[2px] bg-white rounded-full transition-transform duration-300 ${
                  mobileMenuOpen ? 'rotate-45 translate-y-[4px]' : ''
                }`}
              />
              <span
                className={`w-4 h-[2px] bg-white rounded-full transition-transform duration-300 ${
                  mobileMenuOpen ? '-rotate-45 -translate-y-[4px]' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Full-Screen Cinematic Drawer Overlay */}
      <div
        id="mobile-menu-drawer"
        ref={menuOverlayRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation"
        className={`fixed inset-0 z-40 md:hidden flex flex-col justify-between p-8 pt-32 bg-black/95 backdrop-blur-2xl transition-all duration-500 ease-out ${
          mobileMenuOpen
            ? 'opacity-100 pointer-events-auto translate-y-0'
            : 'opacity-0 pointer-events-none -translate-y-4'
        }`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: mobileMenuOpen ? 'flex' : 'none',
          zIndex: 90,
          paddingBottom: 'calc(2rem + var(--safe-bottom, 0px))',
        }}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="space-y-6">
          <span className="text-[10px] font-mono tracking-widest uppercase text-text-muted block">
            Navigation
          </span>

          <nav className="flex flex-col space-y-5">
            <Link
              ref={firstLinkRef}
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="group flex items-baseline justify-between border-b border-white/[0.06] pb-4 text-2xl font-black text-text focus:outline-none focus:text-accent-amber"
            >
              <span>Home</span>
              <span className="font-mono text-xs text-text-muted">00</span>
            </Link>

            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`group flex items-baseline justify-between border-b border-white/[0.06] pb-4 text-2xl font-black transition-colors focus:outline-none focus:text-accent-amber ${
                  pathname === link.href ? 'text-accent-amber' : 'text-text hover:text-accent-amber'
                }`}
              >
                <span>{link.label}</span>
                <span className="font-mono text-xs text-text-muted">{link.num}</span>
              </Link>
            ))}

            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className={`group flex items-baseline justify-between border-b border-white/[0.06] pb-4 text-2xl font-black transition-colors focus:outline-none focus:text-accent-amber ${
                pathname === '/contact' ? 'text-accent-amber' : 'text-text hover:text-accent-amber'
              }`}
            >
              <span>Contact Me</span>
              <span className="font-mono text-xs text-text-muted">03</span>
            </Link>
          </nav>
        </div>

        {/* Mobile Drawer Bottom Info */}
        <div className="pt-8 border-t border-white/[0.08] space-y-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted block mb-1">
              Direct Inquiries
            </span>
            <a
              ref={lastLinkRef}
              href={`mailto:${contactEmail}`}
              className="text-sm font-semibold text-text hover:text-accent-amber focus:outline-none focus:text-accent-amber transition-colors"
            >
              {contactEmail}
            </a>
          </div>

          <div className="flex items-center justify-between text-xs text-text-muted pt-2">
            <span className="font-mono text-[11px] tracking-wide text-text-secondary">Creative Director & Designer</span>
            <span className="font-mono">© {new Date().getFullYear()} ADNAN</span>
          </div>
        </div>
      </div>
    </>
  )
}
