'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Modal from '@/components/ui/Modal'

import type { Project, AdjacentProject } from '../types'
import { embeddedVideoUrl } from '@/lib/media'
import { parseStringList } from '@/lib/json'

interface ProjectDetailProps {
  project: Project
  prev?: AdjacentProject | null
  next?: AdjacentProject | null
}

export default function ProjectDetail({ project, prev, next }: ProjectDetailProps) {
  const galleryMedia = project.gallery.filter(media => ['image', 'video', 'embed'].includes(media.type))
  const documents = project.gallery.filter(media => !['image', 'video', 'embed'].includes(media.type))
  const heroEmbed = embeddedVideoUrl(project.heroVideoUrl)
  const [heroPlayerLoaded, setHeroPlayerLoaded] = useState(false)

  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null)

  const galleryCount = galleryMedia.length
  const lightboxOpen = activeLightboxIndex !== null
  const handleNextLightbox = () => setActiveLightboxIndex(index => index === null || !galleryCount ? null : (index + 1) % galleryCount)
  const handlePrevLightbox = () => setActiveLightboxIndex(index => index === null || !galleryCount ? null : (index - 1 + galleryCount) % galleryCount)

  useEffect(() => {
    if (!lightboxOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); setActiveLightboxIndex(index => index === null || !galleryCount ? null : (index + 1) % galleryCount) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setActiveLightboxIndex(index => index === null || !galleryCount ? null : (index - 1 + galleryCount) % galleryCount) }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxOpen, galleryCount])

  const tags = parseStringList(project.tags)
  const tools = parseStringList(project.tools)
  const accent = project.accentColor || '#E8C99A'

  const contentSections = [
    { key: 'fullDescription', label: '01 — Overview', content: project.fullDescription },
    { key: 'challenge', label: '02 — Challenge', content: project.challenge },
    { key: 'concept', label: '03 — Concept & Strategy', content: project.concept },
    { key: 'process', label: '04 — Process', content: project.process },
    { key: 'execution', label: '05 — Execution', content: project.execution },
    { key: 'outcome', label: '06 — Final Outcome', content: project.outcome },
  ].filter((s) => s.content)

  return (
    <article className="min-h-screen" style={{ background: '#050505' }}>
      {/* Hero */}
      <div className="relative">
        {/* Hero media */}
        <div
          className={`relative w-full overflow-hidden ${project.heroVideoUrl ? 'project-video-hero' : ''}`}
          style={project.heroVideoUrl ? undefined : { height: 'clamp(60vh, 75vh, 90vh)' }}
        >
          {heroEmbed ? <div className="absolute inset-0 bg-black">
            {heroPlayerLoaded ? <iframe src={heroEmbed} title={`${project.title} video`} className="w-full h-full border-0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /> : <button type="button" className="relative w-full h-full flex items-center justify-center" onClick={() => setHeroPlayerLoaded(true)} aria-label={`Play ${project.title}`}>
              {(project.heroImageUrl || project.featuredImageUrl || project.thumbnailUrl) && <Image src={(project.heroImageUrl || project.featuredImageUrl || project.thumbnailUrl)!} alt="" fill className="object-cover opacity-65" priority sizes="100vw" />}
              <span className="relative page-button page-button-primary">▶ Play video</span>
            </button>}
          </div> : project.heroVideoUrl ? (
            <video
              src={project.heroVideoUrl}
              poster={project.heroImageUrl || project.featuredImageUrl || project.thumbnailUrl || undefined}
              controls
              preload="metadata"
              playsInline
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : project.heroImageUrl || project.featuredImageUrl || project.thumbnailUrl ? (
            <Image
              src={(project.heroImageUrl || project.featuredImageUrl || project.thumbnailUrl)!}
              alt={project.title}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
          ) : (
            <div className="w-full h-full bg-background-secondary" />
          )}

          {/* Gradient overlay */}
          {!project.heroVideoUrl && <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, rgba(5,5,5,0.3) 0%, transparent 30%, transparent 60%, rgba(5,5,5,1) 100%)',
            }}
            aria-hidden="true"
          />}
        </div>

        {/* Project title block */}
        <div className={`container relative z-10 pb-16 ${project.heroVideoUrl ? 'pt-10' : '-mt-20'}`}>
          <div className="max-w-4xl">
            {/* Back link */}
            <Link
              href="/work"
              className="hero-reveal inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text transition-colors mb-8"

            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              All Work
            </Link>

            {/* Category & year */}
            <div className="hero-reveal flex items-center gap-4 mb-5" >
              {project.category && (
                <span
                  className="category-chip"
                  style={{
                    color: project.category.color || accent,
                    borderColor: (project.category.color || accent) + '60',
                  }}
                >
                  {project.category.name}
                </span>
              )}
              {project.year && (
                <span className="text-sm text-text-secondary">{project.year}</span>
              )}
            </div>

            {/* Title */}
            <h1
              className="hero-reveal font-black text-text mb-4 break-words"
              style={{
                fontSize: 'clamp(2.5rem, 6vw, 5rem)',
                letterSpacing: '-0.03em',
                lineHeight: '1',
              }}
            >
              {project.title}
            </h1>

            {project.subtitle && (
              <p
                className="hero-reveal text-xl text-text-secondary mb-8"

              >
                {project.subtitle}
              </p>
            )}

            {/* Meta info */}
            <div
              className="hero-reveal grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-white/[0.07]"

            >
              {project.client && (
                <div>
                  <span className="text-overline text-text-muted block mb-2">Client</span>
                  <span className="text-sm font-semibold text-text">{project.client}</span>
                </div>
              )}
              {project.myRole && (
                <div>
                  <span className="text-overline text-text-muted block mb-2">Role</span>
                  <span className="text-sm font-semibold text-text">{project.myRole}</span>
                </div>
              )}
              {project.year && (
                <div>
                  <span className="text-overline text-text-muted block mb-2">Year</span>
                  <span className="text-sm font-semibold text-text">{project.year}</span>
                </div>
              )}
              {tools.length > 0 && (
                <div>
                  <span className="text-overline text-text-muted block mb-2">Tools</span>
                  <div className="flex flex-wrap gap-1">
                    {tools.slice(0, 3).map((tool) => (
                      <span key={tool} className="text-xs text-text-secondary">
                        {tool}
                      </span>
                    ))}
                    {tools.length > 3 && (
                      <span className="text-xs text-text-muted">+{tools.length - 3}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* External links */}
            {(project.externalUrl || project.behanceUrl || project.githubUrl) && (
              <div className="hero-reveal flex gap-3 mt-6" >
                {project.externalUrl && (
                  <a
                    href={project.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-sm"
                  >
                    Visit Project ↗
                  </a>
                )}
                {project.behanceUrl && (
                  <a
                    href={project.behanceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-sm"
                  >
                    Behance ↗
                  </a>
                )}
                {project.githubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-sm"
                  >
                    GitHub ↗
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content sections */}
      <div className="container py-16 md:py-24">
        {/* Short description */}
        {project.shortDescription && (
          <div className="content-section max-w-2xl mb-20">
            <p
              className="text-xl md:text-2xl text-text-secondary leading-relaxed font-medium"
              style={{ lineHeight: 1.6 }}
            >
              {project.shortDescription}
            </p>
          </div>
        )}

        {/* Content sections */}
        <div className="space-y-20 md:space-y-28">
          {contentSections.map((section, index) => (
            <div
              key={section.key}
              className="content-section grid grid-cols-1 md:grid-cols-12 gap-8"
            >
              <div className="md:col-span-3">
                <span className="text-overline text-text-muted">{String(index + 1).padStart(2, '0')} — {section.label.replace(/^\d+ — /, '')}</span>
              </div>
              <div className="md:col-span-9">
                <div
                  className="rich-text"
                  dangerouslySetInnerHTML={{ __html: section.content! }}
                />
              </div>
            </div>
          ))}

          {/* Custom CMS sections */}
          {project.sections.map((section) => (
            <div
              key={section.id}
              className="content-section grid grid-cols-1 md:grid-cols-12 gap-8"
            >
              <div className="md:col-span-3">
                <span className="text-overline text-text-muted">{section.title}</span>
              </div>
              <div className="md:col-span-9">
                <div
                  className="rich-text"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              </div>
            </div>
          ))}
        </div>

        {galleryMedia.length > 0 && <section className="content-section mt-24 md:mt-32" aria-label="Project gallery">
          <h2 className="text-overline text-text-muted block mb-8">Gallery / A closer look</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {galleryMedia.map((media, index) => <button key={media.id} type="button" onClick={() => setActiveLightboxIndex(index)} aria-label={`Open gallery item ${index + 1}: ${media.alt || project.title}`} className={`project-gallery-button relative overflow-hidden rounded-card group border border-white/10 hover:border-white/30 transition-colors ${media.type === 'embed' ? 'project-embed-card' : ''}`} style={{ aspectRatio: media.type === 'embed' ? undefined : '16/10' }}>
              {media.type === 'embed' ? <span className="project-embed-play" aria-hidden="true">▶</span> : media.type === 'video' ? <video src={media.url} preload="metadata" muted playsInline className="w-full h-full object-cover" /> : <Image src={media.url} alt={media.alt || project.title} fill className="object-cover transition-transform duration-500 group-hover:scale-[1.025]" sizes="(max-width: 768px) 100vw, 50vw" />}
              <span className="absolute top-4 right-4 bg-black/70 text-white rounded-full px-3 py-2 text-xs">{media.type === 'video' || media.type === 'embed' ? 'Play video ↗' : 'View image ↗'}</span>
              {media.caption && <span className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/90 to-transparent text-sm text-white">{media.caption}</span>}
            </button>)}
          </div>
        </section>}
        {documents.length > 0 && <section className="mt-16" aria-label="Project documents"><h2 className="text-overline mb-6">Project documents</h2><div className="grid gap-4">{documents.map(media => <a className="project-document" key={media.id} href={media.url} target="_blank" rel="noopener noreferrer"><span>{media.caption || media.alt || 'View document'}</span><span aria-hidden="true">↗</span></a>)}</div></section>}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="content-section mt-16 pt-8 border-t border-white/[0.07]">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="category-chip text-xs"
                  style={{ color: '#A3A3A3', borderColor: 'rgba(163,163,163,0.3)' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Previous / Next navigation */}
      <nav
        className="project-adjacent border-t border-white/[0.06]"
        aria-label="Project navigation"
      >
        <div className="container">
          <div className="grid grid-cols-2">
            {prev ? (
              <Link
                href={`/work/${prev.slug}`}
                data-cursor="view"
                className="group py-8 pr-8 border-r border-white/[0.06] hover:bg-white/[0.02] transition-colors duration-300"
              >
                <span className="text-overline text-text-muted block mb-3">Previous</span>
                <div className="flex items-center gap-4">
                  {prev.thumbnailUrl && (
                    <div
                      className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
                    >
                      <Image
                        src={prev.thumbnailUrl}
                        alt={prev.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <h3 className="text-base font-bold text-text group-hover:opacity-80 transition-opacity">
                    {prev.title}
                  </h3>
                </div>
              </Link>
            ) : (
              <div />
            )}

            {next ? (
              <Link
                href={`/work/${next.slug}`}
                data-cursor="view"
                className="group py-8 pl-8 text-right hover:bg-white/[0.02] transition-colors duration-300"
              >
                <span className="text-overline text-text-muted block mb-3">Next</span>
                <div className="flex items-center justify-end gap-4">
                  <h3 className="text-base font-bold text-text group-hover:opacity-80 transition-opacity">
                    {next.title}
                  </h3>
                  {next.thumbnailUrl && (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={next.thumbnailUrl}
                        alt={next.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>
      </nav>

      {/* Fullscreen Lightbox Modal */}
      {activeLightboxIndex !== null && galleryMedia[activeLightboxIndex] && (
        <Modal title="Project gallery preview" hideHeader onClose={() => setActiveLightboxIndex(null)}
          className="project-lightbox fixed inset-0 m-0 h-dvh w-screen max-w-none max-h-none open:flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 md:p-10 select-none animate-[fadeIn_0.2s_ease-out]"
        >
          {/* Close button */}
          <button
            onClick={() => setActiveLightboxIndex(null)}
            className="absolute top-6 right-6 z-20 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Close fullscreen preview"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Previous control */}
          {galleryMedia.length > 1 && (
            <button
              onClick={handlePrevLightbox}
              className="absolute left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors"
              aria-label="Previous image"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Media preview container */}
          <div className="relative max-w-6xl w-full h-[80vh] flex flex-col items-center justify-center">
            {galleryMedia[activeLightboxIndex].type === 'embed' && embeddedVideoUrl(galleryMedia[activeLightboxIndex].url) ? <iframe src={embeddedVideoUrl(galleryMedia[activeLightboxIndex].url)!} title={galleryMedia[activeLightboxIndex].caption || project.title} className="w-full h-full border-0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /> : galleryMedia[activeLightboxIndex].type === 'video' ? (
              <video
                src={galleryMedia[activeLightboxIndex].url}
                controls
                autoPlay
                className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
              />
            ) : (
              <div className="relative w-full h-full">
                <Image
                  src={galleryMedia[activeLightboxIndex].url}
                  alt={galleryMedia[activeLightboxIndex].alt || project.title}
                  fill
                  className="object-contain"
                  sizes="90vw"
                  priority
                />
              </div>
            )}

            {/* Bottom info bar */}
            <div className="absolute -bottom-8 flex items-center justify-between w-full text-xs font-mono text-text-secondary px-2">
              <span>
                {galleryMedia[activeLightboxIndex].caption || project.title}
              </span>
              <span>
                {activeLightboxIndex + 1} / {galleryMedia.length}
              </span>
            </div>
          </div>

          {/* Next control */}
          {galleryMedia.length > 1 && (
            <button
              onClick={handleNextLightbox}
              className="absolute right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors"
              aria-label="Next image"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </Modal>
      )}
    </article>
  )
}
