'use client'

import Link from 'next/link'
import { DEFAULT_SOCIALS, SITE } from '@/config/site'
import type { SocialLink } from '@/types/site'
import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getLenis } from '@/components/providers/SmoothScrollProvider'

gsap.registerPlugin(ScrollTrigger)

interface FooterProps {
  socialLinks?: SocialLink[]
  footerText?: string
  email?: string
}

export default function Footer({ socialLinks, footerText, email = SITE.email }: FooterProps) {
  const footerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const footerElement = footerRef.current
    if (!footerElement) return

    const ctx = gsap.context(() => {
      const targets = footerElement.querySelectorAll('.footer-reveal')
      if (targets.length === 0) return

      ScrollTrigger.create({
        trigger: footerElement,
        start: 'top 90%',
        once: true,
        onEnter: () => {
          const currentTargets = footerElement.querySelectorAll('.footer-reveal')
          if (currentTargets.length > 0) {
            gsap.fromTo(
              currentTargets,
              { y: 20, opacity: 0 },
              { y: 0, opacity: 1, stagger: 0.08, duration: 0.8, ease: 'expo.out' }
            )
          }
        },
      })
    }, footerElement)

    return () => ctx.revert()
  }, [])

  const displaySocials = socialLinks ?? DEFAULT_SOCIALS

  const scrollToTop = () => {
    const lenis = getLenis()
    if (lenis) {
      lenis.scrollTo(0, {
        duration: 1.0,
        onComplete: () => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('adnan:return-from-footer', { detail: { toHero: false } }))
          }
        },
      })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('adnan:return-from-footer', { detail: { toHero: false } }))
      }
    }
  }

  return (
    <footer
      ref={footerRef}
      className="relative border-t border-white/[0.06]"
      style={{ background: '#050505' }}
    >
      <div className="container py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 mb-16">
          {/* Brand column */}
          <div className="footer-reveal">
            <Link href="/" className="inline-block mb-4" aria-label="ADNAN — Home">
              <svg
                width="28"
                height="28"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
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
            <p className="text-sm text-text-secondary leading-relaxed max-w-xs">
              Marketing strategy, visual storytelling, design, animation, and digital experiences.
            </p>
          </div>

          {/* Navigation */}
          <div className="footer-reveal">
            <h3 className="text-xs font-bold tracking-widest uppercase text-text-muted mb-5">
              Navigation
            </h3>
            <nav aria-label="Footer navigation">
              <ul className="space-y-3">
                {[
                  { href: '/', label: 'Home' },
                  { href: '/work', label: 'Our Work' },
                  { href: '/about', label: 'About Me' },
                  { href: '/contact', label: 'Contact' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-secondary hover:text-text transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Social */}
          <div className="footer-reveal">
            <h3 className="text-xs font-bold tracking-widest uppercase text-text-muted mb-5">
              Connect
            </h3>
            <ul className="space-y-3">
              {displaySocials.map((social) => (
                <li key={social.platform}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-sm text-text-secondary hover:text-text transition-colors duration-200 group"
                  >
                    <span>{social.label || social.platform}</span>
                    <svg
                      className="w-3.5 h-3.5 opacity-0 group-hover:opacity-70 transition-opacity"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={`mailto:${email}`}
                  className="flex items-center justify-between text-sm text-text-secondary hover:text-text transition-colors duration-200 group"
                >
                  <span>Email</span>
                  <svg
                    className="w-3.5 h-3.5 opacity-0 group-hover:opacity-70 transition-opacity"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-reveal flex items-center justify-between pt-8 border-t border-white/[0.06]">
          <p className="text-xs text-text-muted">
            {footerText || `© ${new Date().getFullYear()} ADNAN. All rights reserved.`}
          </p>
          <button
            onClick={scrollToTop}
            className="text-xs font-semibold text-text-secondary hover:text-text transition-colors duration-200 flex items-center gap-2"
            aria-label="Back to top"
          >
            Back to Top
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  )
}
