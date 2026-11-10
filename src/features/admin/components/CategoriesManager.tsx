'use client'

import { useState } from 'react'

interface Category {
  id: string
  name: string
  slug: string
  color?: string | null
  order: number
  _count?: { projects: number }
}

interface Props {
  initialCategories: Category[]
}

export default function CategoriesManager({ initialCategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [color, setColor] = useState('#E8C99A')
  const [order, setOrder] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notification, setNotification] = useState('')

  const notify = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(''), 3000)
  }

  const startEdit = (c: Category) => {
    setEditingId(c.id)
    setName(c.name)
    setSlug(c.slug)
    setColor(c.color || '#E8C99A')
    setOrder(c.order)
    setError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setName('')
    setSlug('')
    setColor('#E8C99A')
    setOrder(categories.length + 1)
    setError('')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    const targetSlug = slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

    setSaving(true)
    setError('')

    try {
      if (editingId) {
        // Update
        const res = await fetch(`/api/admin/categories/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, slug: targetSlug, color, order: Number(order) }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to update')

        setCategories(categories.map((c) => (c.id === editingId ? { ...c, ...data } : c)))
        notify('Category updated')
        cancelEdit()
      } else {
        // Create
        const res = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, slug: targetSlug, color, order: Number(order) }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create')

        setCategories([...categories, data].sort((a, b) => a.order - b.order))
        notify('Category created')
        cancelEdit()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? Associated projects will be unassigned.')) return

    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')

      setCategories(categories.filter((c) => c.id !== id))
      notify('Category deleted')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting category')
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      {notification && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-lg text-sm font-semibold bg-green-950 text-green-300 border border-green-700/50 shadow-2xl">
          {notification}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-text mb-1">Categories</h1>
        <p className="text-text-secondary text-sm">Organize projects into distinct artistic and discipline classifications.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form card */}
        <div className="lg:col-span-1">
          <div className="admin-card p-6 sticky top-6">
            <h2 className="text-base font-bold text-text mb-4">
              {editingId ? 'Edit Category' : 'New Category'}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="admin-label">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (!editingId && !slug) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
                    }
                  }}
                  placeholder="e.g. Creative Direction"
                  className="admin-input w-full"
                  required
                />
              </div>

              <div>
                <label className="admin-label">Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. creative-direction"
                  className="admin-input w-full"
                  required
                />
              </div>

              <div>
                <label className="admin-label">Color Accent</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="admin-input flex-1 font-mono text-xs uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="admin-label">Display Order</label>
                <input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                  className="admin-input w-full"
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="flex items-center gap-2 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  <span className="btn-primary-label">{saving ? 'Saving...' : editingId ? 'Update' : 'Add Category'}</span>
                </button>
                {editingId && (
                  <button type="button" onClick={cancelEdit} className="btn-secondary">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Categories list */}
        <div className="lg:col-span-2">
          <div className="admin-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs font-bold text-text-muted uppercase">
                  <th className="px-5 py-4">Color</th>
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">Slug</th>
                  <th className="px-5 py-4 text-center">Projects</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-text-muted text-sm">
                      No categories defined yet.
                    </td>
                  </tr>
                ) : (
                  categories.map((c) => (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-5 py-4">
                        <span
                          className="w-4 h-4 rounded-full inline-block"
                          style={{ backgroundColor: c.color || '#E8C99A' }}
                        />
                      </td>
                      <td className="px-5 py-4 font-semibold text-text text-sm">{c.name}</td>
                      <td className="px-5 py-4 font-mono text-xs text-text-muted">{c.slug}</td>
                      <td className="px-5 py-4 text-center text-xs text-text-secondary">
                        {c._count?.projects ?? 0}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(c)}
                            className="text-xs px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-xs px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
