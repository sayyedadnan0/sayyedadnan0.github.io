'use client'

import { useState } from 'react'
import CallToAction from '@/components/ui/CallToAction'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, LayoutGrid, List } from 'lucide-react'

interface Category { id: string; name: string; slug: string; color?: string | null }
interface Project {
  id: string; title: string; slug: string; subtitle?: string | null
  shortDescription?: string | null; thumbnailUrl?: string | null
  featuredImageUrl?: string | null; heroImageUrl?: string | null
  year?: string | null; category?: Category | null
}

export default function WorkGallery({ projects, categories }: { projects: Project[]; categories: Category[] }) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const filtered = activeCategory ? projects.filter(p => p.category?.slug === activeCategory) : projects
  const availableCategories = categories.filter(c => projects.some(p => p.category?.id === c.id))

  return (
    <div className="portfolio-page">
      <div className="page-shell">
        <header className="page-hero page-hero-row page-enter">
          <div><span className="page-kicker">ADNAN / Portfolio</span><h1 className="page-heading">Selected work.</h1></div>
          <p className="page-lede">Graphic design, animation, video, and digital experiences. Selected work by Sayyed Adnan Ali.</p>
        </header>
        <div className="work-toolbar page-divider">
          <div className="work-filters" role="group" aria-label="Filter projects by category">
            <button className="work-filter" aria-pressed={activeCategory === null} onClick={() => setActiveCategory(null)}>All projects<span className="work-filter-count" aria-hidden="true">{projects.length.toString().padStart(2, '0')}</span></button>
            {availableCategories.map(category => <button key={category.id} className="work-filter" aria-pressed={activeCategory === category.slug} onClick={() => setActiveCategory(category.slug)}>{category.name}<span className="work-filter-count" aria-hidden="true">{projects.filter(p => p.category?.id === category.id).length.toString().padStart(2, '0')}</span></button>)}
          </div>
          <div className="work-views" role="group" aria-label="Project layout">
            <button aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><LayoutGrid aria-hidden="true" /></button>
            <button aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')}><List aria-hidden="true" /></button>
          </div>
        </div>
        <p className="work-summary" role="status" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'project' : 'projects'}{activeCategory ? ` / ${availableCategories.find(c => c.slug === activeCategory)?.name || 'Filtered'}` : ' / All disciplines'}</p>
        <div className={view === 'grid' ? 'work-grid' : 'work-list'}>
          {filtered.map((project, index) => {
            const image = project.thumbnailUrl || project.featuredImageUrl || project.heroImageUrl
            return <Link key={project.id} href={`/work/${project.slug}`} className="work-card" data-cursor="view">
              <div className="work-image">
                {image ? <Image src={image} alt="" fill sizes={view === 'list' ? '140px' : index === 0 && filtered.length % 2 === 1 ? '(max-width: 640px) 100vw, 90vw' : '(max-width: 640px) 100vw, 45vw'} priority={index === 0} /> : <span className="work-image-placeholder" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>}
                <span className="work-open" aria-hidden="true"><ArrowUpRight /></span>
              </div>
              <div className="work-card-info"><div><h2>{project.title}</h2>{project.subtitle && <p className="work-card-subtitle">{project.subtitle}</p>}</div><p className="work-card-meta">{project.category?.name || 'Independent project'}<br />{project.year}</p></div>
            </Link>
          })}
          {filtered.length === 0 && <div className="work-empty"><h2>No projects here yet.</h2><p style={{ marginTop: 12 }}>Explore another discipline or check back for new work.</p>{activeCategory && <button className="page-button" style={{ marginTop: 24 }} onClick={() => setActiveCategory(null)}>Show all projects</button>}</div>}
        </div>
        <CallToAction eyebrow="The next project could be yours" title="Have something in mind?" href="/contact" label="Let’s talk" />
      </div>
    </div>
  )
}
