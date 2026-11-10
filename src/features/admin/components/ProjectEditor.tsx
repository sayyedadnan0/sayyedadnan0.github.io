'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import MediaPickerDialog from './MediaPickerDialog'
import type { MediaAsset } from './MediaLibrary'

interface Category {
  id: string
  name: string
  color?: string | null
}

interface GalleryItem {
  id?: string
  url: string
  type: string
  alt?: string | null
  caption?: string | null
  order: number
}

interface Project {
  id: string
  title: string
  slug: string
  subtitle?: string | null
  shortDescription?: string | null
  fullDescription?: string | null
  challenge?: string | null
  concept?: string | null
  process?: string | null
  execution?: string | null
  outcome?: string | null
  client?: string | null
  year?: string | null
  myRole?: string | null
  tools?: string | null
  tags?: string | null
  thumbnailUrl?: string | null
  featuredImageUrl?: string | null
  heroImageUrl?: string | null
  heroVideoUrl?: string | null
  accentColor?: string | null
  featured: boolean
  published: boolean
  order: number
  externalUrl?: string | null
  behanceUrl?: string | null
  githubUrl?: string | null
  videoUrl?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  ogImageUrl?: string | null
  categoryId?: string | null
  gallery?: GalleryItem[]
}

type TabKey = 'details' | 'media' | 'gallery' | 'case_study' | 'seo'

interface Props {
  project: Project | null
  categories: Category[]
}

export default function ProjectEditor({ project, categories }: Props) {
  const router = useRouter()

  // Parse tools & tags from string/JSON
  const parseJsonArray = (val?: string | null): string => {
    if (!val) return ''
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) return parsed.join(', ')
    } catch {}
    return val
  }

  const [form, setForm] = useState({
    title: project?.title || '',
    slug: project?.slug || '',
    subtitle: project?.subtitle || '',
    shortDescription: project?.shortDescription || '',
    fullDescription: project?.fullDescription || '',
    challenge: project?.challenge || '',
    concept: project?.concept || '',
    process: project?.process || '',
    execution: project?.execution || '',
    outcome: project?.outcome || '',
    client: project?.client || '',
    year: project?.year || new Date().getFullYear().toString(),
    myRole: project?.myRole || '',
    tools: parseJsonArray(project?.tools),
    tags: parseJsonArray(project?.tags),
    thumbnailUrl: project?.thumbnailUrl || '',
    featuredImageUrl: project?.featuredImageUrl || '',
    heroImageUrl: project?.heroImageUrl || '',
    heroVideoUrl: project?.heroVideoUrl || '',
    accentColor: project?.accentColor || '#E8C99A',
    featured: project?.featured ?? false,
    published: project?.published ?? false,
    order: project?.order ?? 0,
    externalUrl: project?.externalUrl || '',
    behanceUrl: project?.behanceUrl || '',
    githubUrl: project?.githubUrl || '',
    videoUrl: project?.videoUrl || '',
    seoTitle: project?.seoTitle || '',
    seoDescription: project?.seoDescription || '',
    ogImageUrl: project?.ogImageUrl || '',
    categoryId: project?.categoryId || '',
  })

  const [gallery, setGallery] = useState<GalleryItem[]>(
    project?.gallery && Array.isArray(project.gallery) ? [...project.gallery] : []
  )

  const [activeTab, setActiveTab] = useState<'details' | 'media' | 'gallery' | 'case_study' | 'seo'>('details')
  const [saving, setSaving] = useState(false)
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [mediaPickerTarget, setMediaPickerTarget] = useState<string | null>(null)

  const setField = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const autoGenerateSlug = (title: string) => {
    const slugified = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    setField('slug', slugified)
  }

  // Upload file helper
  const handleUploadFile = async (file: File, targetField: string) => {
    setUploadingTarget(targetField)
    setError('')
    try {
      const data = new FormData()
      data.append('file', file)
      data.append('folder', 'projects')

      const res = await fetch('/api/admin/media', { method: 'POST', body: data })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Upload failed')

      if (targetField === 'gallery_add') {
        setGallery((prev) => [
          ...prev,
          {
            url: result.url,
            type: result.type || 'image',
            alt: file.name.replace(/\.[^/.]+$/, ''),
            caption: '',
            order: prev.length,
          },
        ])
      } else {
        setField(targetField, result.url)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload error')
    } finally {
      setUploadingTarget(null)
    }
  }

  // Gallery item helpers
  const removeGalleryItem = (index: number) => {
    setGallery(gallery.filter((_, i) => i !== index))
  }

  const moveGalleryItem = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === gallery.length - 1)
    )
      return

    const updated = [...gallery]
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    const [moved] = updated.splice(index, 1)
    updated.splice(targetIdx, 0, moved)

    // Reassign order
    setGallery(updated.map((item, idx) => ({ ...item, order: idx })))
  }

  const updateGalleryCaption = (index: number, caption: string) => {
    const updated = [...gallery]
    updated[index] = { ...updated[index], caption }
    setGallery(updated)
  }

  const handleSave = async (publishOverride?: boolean) => {
    setSaving(true)
    setError('')

    const isPublished = publishOverride !== undefined ? publishOverride : form.published

    // Process tools & tags into string array
    const toolsArray = form.tools
      ? form.tools.split(',').map((s) => s.trim()).filter(Boolean)
      : []
    const tagsArray = form.tags
      ? form.tags.split(',').map((s) => s.trim()).filter(Boolean)
      : []

    const payload = {
      ...form,
      published: isPublished,
      categoryId: form.categoryId || null,
      tools: toolsArray,
      tags: tagsArray,
      gallery,
    }

    try {
      const url = project ? `/api/admin/projects/${project.id}` : '/api/admin/projects'
      const method = project ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to save project')

      router.push('/admin/projects')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving project')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {mediaPickerTarget && <MediaPickerDialog onClose={() => setMediaPickerTarget(null)} onSelect={(asset: MediaAsset) => {
                if (mediaPickerTarget === 'gallery_add') {
                  setGallery((prev) => [
                    ...prev,
                    {
                      url: asset.url,
                      type: asset.type || 'image',
                      alt: asset.originalName,
                      caption: '',
                      order: prev.length,
                    },
                  ])
                } else {
                  setField(mediaPickerTarget, asset.url)
                }
                setMediaPickerTarget(null)
               }} />}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-text mb-1">
            {project ? `Edit: ${project.title}` : 'Create New Project'}
          </h1>
          <p className="text-text-secondary text-sm">
            Configure visual assets, case study storytelling, and metadata.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="btn-secondary text-xs"
          >
            Save as Draft
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="btn-primary text-xs"
          >
            <span className="btn-primary-label">
              {saving ? 'Publishing...' : 'Publish Project'}
            </span>
            <span className="btn-primary-glow" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/80 border border-red-700/60 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 mb-8 overflow-x-auto pb-1">
        {([
          { key: 'details' as TabKey, label: 'Overview & Info' },
          { key: 'media' as TabKey, label: 'Hero & Preview Media' },
          { key: 'gallery' as TabKey, label: `Gallery (${gallery.length})` },
          { key: 'case_study' as TabKey, label: 'Case Study Narrative' },
          { key: 'seo' as TabKey, label: 'Links & SEO' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-accent-amber text-text'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Details */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          <div className="admin-card p-6 space-y-5">
            <h2 className="text-base font-bold text-text mb-1">Project Identity</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="admin-label">Project Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => {
                    setField('title', e.target.value)
                    if (!project) autoGenerateSlug(e.target.value)
                  }}
                  placeholder="e.g. Luminary Brand Identity"
                  className="admin-input w-full font-bold"
                  required
                />
              </div>

              <div>
                <label className="admin-label">URL Slug</label>
                <div className="flex items-center gap-1 font-mono text-xs">
                  <span className="text-text-muted">/work/</span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setField('slug', e.target.value)}
                    placeholder="luminary-brand-identity"
                    className="admin-input flex-1 font-mono"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="admin-label">Category</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setField('categoryId', e.target.value || null)}
                  className="admin-input w-full"
                >
                  <option value="">No Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="admin-label">Client</label>
                <input
                  type="text"
                  value={form.client}
                  onChange={(e) => setField('client', e.target.value)}
                  placeholder="e.g. Luminary Co."
                  className="admin-input w-full"
                />
              </div>

              <div>
                <label className="admin-label">Year</label>
                <input
                  type="text"
                  value={form.year}
                  onChange={(e) => setField('year', e.target.value)}
                  placeholder="2025"
                  className="admin-input w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="admin-label">My Role</label>
                <input
                  type="text"
                  value={form.myRole}
                  onChange={(e) => setField('myRole', e.target.value)}
                  placeholder="e.g. Creative Director & Brand Designer"
                  className="admin-input w-full"
                />
              </div>

              <div>
                <label className="admin-label">Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.accentColor}
                    onChange={(e) => setField('accentColor', e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={form.accentColor}
                    onChange={(e) => setField('accentColor', e.target.value)}
                    className="admin-input flex-1 font-mono text-xs uppercase"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="admin-label">Subtitle / Tagline</label>
              <input
                type="text"
                value={form.subtitle}
                onChange={(e) => setField('subtitle', e.target.value)}
                placeholder="e.g. A luxury brand brought to life"
                className="admin-input w-full"
              />
            </div>

            <div>
              <label className="admin-label">Short Description (Cards & Showcases)</label>
              <textarea
                value={form.shortDescription}
                onChange={(e) => setField('shortDescription', e.target.value)}
                rows={3}
                placeholder="Brief summary used in cards and teaser sections..."
                className="admin-input w-full"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="admin-label">Tools Used (comma separated)</label>
                <input
                  type="text"
                  value={form.tools}
                  onChange={(e) => setField('tools', e.target.value)}
                  placeholder="Figma, Three.js, GSAP, Blender"
                  className="admin-input w-full"
                />
              </div>

              <div>
                <label className="admin-label">Project Tags (comma separated)</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setField('tags', e.target.value)}
                  placeholder="WebGL, Interactive, 3D, Creative UI"
                  className="admin-input w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-8 pt-4 border-t border-white/5">
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setField('featured', e.target.checked)}
                />
                Featured on Homepage
              </label>

              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setField('published', e.target.checked)}
                />
                Published
              </label>

              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">Display Order:</span>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setField('order', Number(e.target.value))}
                  className="admin-input w-20 text-center py-1 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Media */}
      {activeTab === 'media' && (
        <div className="space-y-6">
          {/* Media upload cards */}
          {[
            {
              field: 'thumbnailUrl',
              label: 'Thumbnail Image',
              desc: 'Used in work list grids and interactive previews (Square or 4:3 recommended)',
              accept: 'image/*',
            },
            {
              field: 'heroImageUrl',
              label: 'Hero Header Image',
              desc: 'High-resolution banner displayed at the top of the project detail page (16:9)',
              accept: 'image/*',
            },
            {
              field: 'heroVideoUrl',
              label: 'Hero Video (Optional)',
              desc: 'Looping ambient video preview (MP4 / WebM)',
              accept: 'video/mp4,video/webm',
            },
            {
              field: 'featuredImageUrl',
              label: 'Featured Showcase Image',
              desc: 'High-impact asset displayed on the homepage showcase',
              accept: 'image/*',
            },
          ].map((item) => {
            const currentValue = String(form[item.field as keyof typeof form] ?? '')
            return (
              <div key={item.field} className="admin-card p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-text">{item.label}</h3>
                    <p className="text-xs text-text-muted">{item.desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMediaPickerTarget(item.field)}
                      className="btn-secondary text-xs"
                    >
                      Pick from Media Library
                    </button>
                    <label className="btn-secondary text-xs cursor-pointer">
                      <span>{uploadingTarget === item.field ? 'Uploading...' : 'Upload File'}</span>
                      <input
                        type="file"
                        accept={item.accept}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) handleUploadFile(f, item.field)
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={currentValue || ''}
                    onChange={(e) => setField(item.field, e.target.value)}
                    placeholder="URL path (e.g. /uploads/projects/...)"
                    className="admin-input flex-1 font-mono text-xs"
                  />
                  {currentValue && (
                    <button
                      type="button"
                      onClick={() => setField(item.field, '')}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Preview */}
                {currentValue && (
                  <div className="relative w-48 h-28 rounded-xl overflow-hidden border border-white/10 bg-black/60">
                    {item.field.includes('Video') ? (
                      <video src={currentValue} controls className="w-full h-full object-cover" />
                    ) : (
                      <Image src={currentValue} alt={item.label} fill className="object-cover" />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Tab 3: Gallery */}
      {activeTab === 'gallery' && (
        <div className="space-y-6">
          <div className="admin-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-text">Project Gallery</h2>
                <p className="text-xs text-text-muted">
                  Add photos, renders, diagrams, or video clips showcasing the full case study.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMediaPickerTarget('gallery_add')}
                  className="btn-secondary text-xs"
                >
                  + Add from Media Library
                </button>
                <label className="btn-primary text-xs cursor-pointer">
                  <span className="btn-primary-label">
                    {uploadingTarget === 'gallery_add' ? 'Uploading...' : '+ Upload New Asset'}
                  </span>
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/webm"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleUploadFile(f, 'gallery_add')
                    }}
                  />
                </label>
              </div>
            </div>

            {gallery.length === 0 ? (
              <div className="p-12 text-center text-text-muted text-sm border border-dashed border-white/10 rounded-xl">
                No gallery items added yet. Click &ldquo;Add from Media Library&rdquo; or &ldquo;Upload New Asset&rdquo; above.
              </div>
            ) : (
              <div className="space-y-3">
                {gallery.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-black/60 border border-white/10">
                      {item.type === 'video' ? (
                        <video src={item.url} className="w-full h-full object-cover" />
                      ) : (
                        <Image src={item.url} alt={item.alt || ''} fill className="object-cover" />
                      )}
                    </div>

                    {/* Metadata & Caption */}
                    <div className="flex-1 min-w-0 space-y-2 w-full">
                      <p className="text-xs font-mono text-text-muted truncate">{item.url}</p>
                      <input
                        type="text"
                        value={item.caption || ''}
                        onChange={(e) => updateGalleryCaption(idx, e.target.value)}
                        placeholder="Caption / description for this image..."
                        className="admin-input text-xs w-full py-1.5"
                      />
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => moveGalleryItem(idx, 'up')}
                        disabled={idx === 0}
                        className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-xs disabled:opacity-30"
                        title="Move Up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveGalleryItem(idx, 'down')}
                        disabled={idx === gallery.length - 1}
                        className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-xs disabled:opacity-30"
                        title="Move Down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeGalleryItem(idx)}
                        className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Case Study Narrative */}
      {activeTab === 'case_study' && (
        <div className="space-y-6">
          <div className="admin-card p-6 space-y-5">
            <h2 className="text-base font-bold text-text mb-1">In-Depth Case Study Sections</h2>
            <p className="text-xs text-text-muted">
              Structured narrative detailing the strategic creative journey. HTML markup or rich text is supported.
            </p>

            <div>
              <label className="admin-label">Full Project Overview / Story</label>
              <textarea
                value={form.fullDescription}
                onChange={(e) => setField('fullDescription', e.target.value)}
                rows={5}
                placeholder="Comprehensive background on the client and mission..."
                className="admin-input w-full"
              />
            </div>

            <div>
              <label className="admin-label">The Challenge</label>
              <textarea
                value={form.challenge}
                onChange={(e) => setField('challenge', e.target.value)}
                rows={4}
                placeholder="What obstacles, questions, or constraints were addressed?"
                className="admin-input w-full"
              />
            </div>

            <div>
              <label className="admin-label">The Concept & Strategy</label>
              <textarea
                value={form.concept}
                onChange={(e) => setField('concept', e.target.value)}
                rows={4}
                placeholder="The creative hypothesis, architectural metaphor, or core inspiration..."
                className="admin-input w-full"
              />
            </div>

            <div>
              <label className="admin-label">Process & Craft</label>
              <textarea
                value={form.process}
                onChange={(e) => setField('process', e.target.value)}
                rows={4}
                placeholder="Iterative prototyping, typography explorations, technical spikes..."
                className="admin-input w-full"
              />
            </div>

            <div>
              <label className="admin-label">Execution & Implementation</label>
              <textarea
                value={form.execution}
                onChange={(e) => setField('execution', e.target.value)}
                rows={4}
                placeholder="Technical stack, WebGL shaders, visual system delivery..."
                className="admin-input w-full"
              />
            </div>

            <div>
              <label className="admin-label">Outcome & Impact</label>
              <textarea
                value={form.outcome}
                onChange={(e) => setField('outcome', e.target.value)}
                rows={4}
                placeholder="Key results, metric increases, reception, and long-term legacy..."
                className="admin-input w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Links & SEO */}
      {activeTab === 'seo' && (
        <div className="space-y-6">
          <div className="admin-card p-6 space-y-5">
            <h2 className="text-base font-bold text-text mb-1">External Links</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="admin-label">Live Site / External URL</label>
                <input
                  type="text"
                  value={form.externalUrl}
                  onChange={(e) => setField('externalUrl', e.target.value)}
                  placeholder="https://..."
                  className="admin-input w-full"
                />
              </div>

              <div>
                <label className="admin-label">Behance Project URL</label>
                <input
                  type="text"
                  value={form.behanceUrl}
                  onChange={(e) => setField('behanceUrl', e.target.value)}
                  placeholder="https://behance.net/gallery/..."
                  className="admin-input w-full"
                />
              </div>

              <div>
                <label className="admin-label">GitHub Repository URL</label>
                <input
                  type="text"
                  value={form.githubUrl}
                  onChange={(e) => setField('githubUrl', e.target.value)}
                  placeholder="https://github.com/..."
                  className="admin-input w-full"
                />
              </div>

              <div>
                <label className="admin-label">External Video Embed / Stream URL</label>
                <input
                  type="text"
                  value={form.videoUrl}
                  onChange={(e) => setField('videoUrl', e.target.value)}
                  placeholder="https://vimeo.com/... or youtube"
                  className="admin-input w-full"
                />
              </div>
            </div>
          </div>

          <div className="admin-card p-6 space-y-5">
            <h2 className="text-base font-bold text-text mb-1">SEO & Social Sharing</h2>

            <div>
              <label className="admin-label">SEO Title Tag</label>
              <input
                type="text"
                value={form.seoTitle}
                onChange={(e) => setField('seoTitle', e.target.value)}
                placeholder="e.g. Luminary Brand Identity — Adnan Studio"
                className="admin-input w-full"
              />
            </div>

            <div>
              <label className="admin-label">SEO Meta Description</label>
              <textarea
                value={form.seoDescription}
                onChange={(e) => setField('seoDescription', e.target.value)}
                rows={3}
                placeholder="A compelling snippet for search engine previews..."
                className="admin-input w-full"
              />
            </div>

            <div>
              <label className="admin-label">Social Share (OG) Image URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.ogImageUrl}
                  onChange={(e) => setField('ogImageUrl', e.target.value)}
                  placeholder="/uploads/projects/og.jpg"
                  className="admin-input flex-1"
                />
                <button
                  type="button"
                  onClick={() => setMediaPickerTarget('ogImageUrl')}
                  className="btn-secondary text-xs"
                >
                  Pick from Media
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sticky Action Bar */}
      <div className="sticky bottom-6 mt-10 p-4 rounded-2xl bg-background-elevated/90 backdrop-blur-md border border-white/10 flex items-center justify-between shadow-2xl">
        <button
          type="button"
          onClick={() => router.push('/admin/projects')}
          className="btn-secondary text-xs"
        >
          Cancel
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="btn-secondary text-xs"
          >
            Save as Draft
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="btn-primary text-xs"
          >
            <span className="btn-primary-label">
              {saving ? 'Publishing...' : 'Publish Project'}
            </span>
            <span className="btn-primary-glow" />
          </button>
        </div>
      </div>
    </div>
  )
}
