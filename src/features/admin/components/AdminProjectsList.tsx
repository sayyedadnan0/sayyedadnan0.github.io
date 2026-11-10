'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Category {
  id: string
  name: string
  color?: string | null
}

interface Project {
  id: string
  title: string
  slug: string
  published: boolean
  featured: boolean
  order: number
  thumbnailUrl?: string | null
  year?: string | null
  category?: Category | null
  updatedAt: Date
}

interface AdminProjectsListProps {
  projects: Project[]
}

export default function AdminProjectsList({ projects }: AdminProjectsListProps) {
  const [list, setList] = useState<Project[]>(projects)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')

  const handleTogglePublish = async (project: Project) => {
    const res = await fetch(`/api/admin/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !project.published }),
    })
    if (res.ok) {
      setList(list.map((p) => (p.id === project.id ? { ...p, published: !p.published } : p)))
    }
  }

  const handleToggleFeatured = async (project: Project) => {
    const res = await fetch(`/api/admin/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featured: !project.featured }),
    })
    if (res.ok) {
      setList(list.map((p) => (p.id === project.id ? { ...p, featured: !p.featured } : p)))
    }
  }

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === list.length - 1)
    )
      return

    const updated = [...list]
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    const currentProj = updated[index]
    const targetProj = updated[targetIdx]

    // Swap order values
    const currentOrder = currentProj.order
    const targetOrder = targetProj.order

    updated[index] = { ...targetProj, order: currentOrder }
    updated[targetIdx] = { ...currentProj, order: targetOrder }

    setList(updated)

    // Persist to server
    await Promise.all([
      fetch(`/api/admin/projects/${currentProj.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: targetOrder }),
      }),
      fetch(`/api/admin/projects/${targetProj.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: currentOrder }),
      }),
    ])
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return
    setDeleting(id)
    const res = await fetch(`/api/admin/projects/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setList(list.filter((p) => p.id !== id))
    }
    setDeleting(null)
  }

  const filteredList = list.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'published'
        ? p.published
        : !p.published
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Search and filters toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search projects by title, slug, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-input text-xs py-2 px-3 min-w-[260px]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'draft')}
            className="admin-input text-xs py-2 px-3"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
        </div>

        <Link href="/admin/projects/new" className="btn-primary text-xs">
          <span className="btn-primary-label">+ New Project</span>
          <span className="btn-primary-glow" />
        </Link>
      </div>

      {filteredList.length === 0 ? (
        <div className="admin-card p-16 text-center">
          <p className="text-text-secondary mb-4">No matching projects found.</p>
          <Link href="/admin/projects/new" className="btn-secondary inline-flex text-xs">
            Create a project
          </Link>
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th className="px-5 py-4 text-center text-xs font-bold text-text-muted uppercase w-16">
                    Order
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider hidden md:table-cell">
                    Category
                  </th>
                  <th className="px-5 py-4 text-center text-xs font-bold text-text-muted uppercase tracking-wider hidden sm:table-cell">
                    Featured
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider hidden md:table-cell">
                    Status
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider hidden lg:table-cell">
                    Year
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-bold text-text-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((project, idx) => (
                  <tr
                    key={project.id}
                    className="hover:bg-white/[0.02] transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    {/* Order Controls */}
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveOrder(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-text-muted disabled:opacity-20"
                          title="Move Up"
                        >
                          ▲
                        </button>
                        <span className="text-xs font-mono text-text-muted w-5 text-center">
                          {project.order}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMoveOrder(idx, 'down')}
                          disabled={idx === filteredList.length - 1}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-text-muted disabled:opacity-20"
                          title="Move Down"
                        >
                          ▼
                        </button>
                      </div>
                    </td>

                    {/* Project Thumbnail & Title */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-4">
                        {project.thumbnailUrl ? (
                          <div className="relative w-12 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-black/60">
                            <Image
                              src={project.thumbnailUrl}
                              alt={project.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xs text-text-muted flex-shrink-0">
                            ◈
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-text">{project.title}</p>
                          <p className="text-xs text-text-muted font-mono">/work/{project.slug}</p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-4 hidden md:table-cell">
                      {project.category && (
                        <span
                          className="category-chip text-xs"
                          style={{
                            color: project.category.color || '#E8C99A',
                            borderColor: (project.category.color || '#E8C99A') + '50',
                          }}
                        >
                          {project.category.name}
                        </span>
                      )}
                    </td>

                    {/* Featured toggle */}
                    <td className="px-5 py-4 text-center hidden sm:table-cell">
                      <button
                        onClick={() => handleToggleFeatured(project)}
                        className={`text-xs px-2.5 py-1 rounded-full font-bold transition-all ${
                          project.featured
                            ? 'bg-amber-400/15 text-amber-300 hover:bg-amber-400/25'
                            : 'text-text-muted hover:text-text hover:bg-white/5'
                        }`}
                        title="Toggle Featured on Homepage"
                      >
                        {project.featured ? '★ Featured' : '☆ Standard'}
                      </button>
                    </td>

                    {/* Status toggle */}
                    <td className="px-5 py-4 hidden md:table-cell">
                      <button
                        onClick={() => handleTogglePublish(project)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          project.published
                            ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                            : 'bg-white/[0.07] text-text-muted hover:bg-white/15'
                        }`}
                      >
                        {project.published ? 'Published' : 'Draft'}
                      </button>
                    </td>

                    {/* Year */}
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className="text-sm text-text-secondary">{project.year || '—'}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/work/${project.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-text-muted hover:text-text transition-colors p-2"
                          title="View on public site"
                        >
                          ↗
                        </Link>
                        <Link
                          href={`/admin/projects/${project.id}`}
                          className="text-xs text-text-secondary hover:text-text transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.06]"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(project.id)}
                          disabled={deleting === project.id}
                          className="text-xs text-red-500/60 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10 disabled:opacity-50"
                        >
                          {deleting === project.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
