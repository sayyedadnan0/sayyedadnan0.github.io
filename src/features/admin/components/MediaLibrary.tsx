'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { uploadMedia } from '../upload-media'

export interface MediaAsset {
  id: string
  filename: string
  originalName: string
  url: string
  type: string
  mimeType: string
  size: number
  width?: number | null
  height?: number | null
  alt?: string | null
  folder?: string | null
  createdAt: string | Date
}

interface MediaLibraryProps {
  onSelect?: (asset: MediaAsset) => void
  selectable?: boolean
  initialFolder?: string
  acceptType?: 'all' | 'image' | 'video'
}

export default function MediaLibrary({
  onSelect,
  selectable = false,
  initialFolder = 'all',
  acceptType = 'all',
}: MediaLibraryProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [activeFolder, setActiveFolder] = useState<string>(initialFolder)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>(acceptType === 'all' ? '' : acceptType)
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [replacingAssetId, setReplacingAssetId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const loadMedia = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (activeFolder && activeFolder !== 'all') params.append('folder', activeFolder)
      if (filterType) params.append('type', filterType)
      if (search) params.append('search', search)
      params.append('limit', '100')

      const res = await fetch(`/api/admin/media?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load media')
      const data = await res.json()
      setAssets(data.assets || [])
    } catch {
      showNotify('Failed to load media assets', 'error')
    } finally {
      setLoading(false)
    }
  }, [activeFolder, filterType, search])

  useEffect(() => {
    let ignore = false
    const params = new URLSearchParams()
    if (activeFolder && activeFolder !== 'all') params.append('folder', activeFolder)
    if (filterType) params.append('type', filterType)
    if (search) params.append('search', search)
    params.append('limit', '100')

    fetch(`/api/admin/media?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load media')
        return res.json()
      })
      .then((data) => {
        if (!ignore) {
          setAssets(data.assets || [])
        }
      })
      .catch(() => {
        if (!ignore) {
          showNotify('Failed to load media assets', 'error')
        }
      })

    return () => {
      ignore = true
    }
  }, [activeFolder, filterType, search])

  const handleUploadFiles = async (files: FileList | File[], targetFolder = activeFolder) => {
    if (!files || files.length === 0) return
    setUploading(true)

    const folderToUse = targetFolder === 'all' ? 'general' : targetFolder

    try {
      let uploadedCount = 0
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        await uploadMedia(file, { folder: folderToUse, alt: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') })
        uploadedCount++
      }

      showNotify(`Successfully uploaded ${uploadedCount} file(s)`)
      await loadMedia()
    } catch (err: unknown) {
      showNotify(err instanceof Error ? err.message : 'Upload error', 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !replacingAssetId) return

    setUploading(true)
    try {
      const updated = await uploadMedia(file, { replaceId: replacingAssetId })
      showNotify('File replaced successfully')
      setSelectedAsset(updated)
      await loadMedia()
    } catch (err: unknown) {
      showNotify(err instanceof Error ? err.message : 'Replacement failed', 'error')
    } finally {
      setUploading(false)
      setReplacingAssetId(null)
      if (replaceInputRef.current) replaceInputRef.current.value = ''
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media asset? This file will be removed permanently.')) return

    try {
      const res = await fetch(`/api/admin/media/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')

      showNotify('Media deleted')
      if (selectedAsset?.id === id) setSelectedAsset(null)
      setAssets(assets.filter((a) => a.id !== id))
    } catch {
      showNotify('Failed to delete media', 'error')
    }
  }

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    showNotify('URL copied to clipboard!')
  }

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const folders = ['all', 'general', 'projects', 'branding', 'hero', 'about']

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Toast notification */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg text-sm font-semibold shadow-2xl transition-all ${
            notification.type === 'success'
              ? 'bg-green-950 text-green-300 border border-green-700/50'
              : 'bg-red-950 text-red-300 border border-red-700/50'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-text mb-1">Media Library</h1>
          <p className="text-text-secondary text-sm">Upload, organize, preview and replace portfolio imagery and video assets.</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/mp4,video/webm,application/pdf"
            className="hidden"
            onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
          />
          <input
            ref={replaceInputRef}
            type="file"
            accept="image/*,video/mp4,video/webm,application/pdf"
            className="hidden"
            onChange={handleReplaceFile}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary"
          >
            <span className="btn-primary-label">
              {uploading ? 'Uploading...' : '+ Upload Media'}
            </span>
            <span className="btn-primary-glow" />
          </button>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files) handleUploadFiles(e.dataTransfer.files)
        }}
        className={`mb-8 border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
          dragOver
            ? 'border-accent-amber bg-accent-amber/5 scale-[1.005]'
            : 'border-white/10 hover:border-white/20 bg-background-card/40'
        }`}
      >
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 text-xl mb-3 text-accent-amber">
            ↑
          </div>
          <p className="text-sm font-semibold text-text mb-1">Drag and drop images or videos here</p>
          <p className="text-xs text-text-muted mb-4">Supports PNG, JPG, WebP, AVIF, SVG, MP4, WebM (up to 50MB)</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-text-secondary hover:text-text underline transition-colors"
          >
            Or browse from computer
          </button>
        </div>
      </div>

      {/* Filter and search toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
        {/* Folders */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0">
          {folders.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFolder(f)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeFolder === f
                  ? 'bg-white/15 text-text border border-white/20'
                  : 'text-text-muted hover:text-text hover:bg-white/5 border border-transparent'
              }`}
            >
              {f === 'all' ? 'All Media' : f}
            </button>
          ))}
        </div>

        {/* Search & Type filter */}
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="admin-input text-xs py-1.5 px-3"
          >
            <option value="">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="document">Documents</option>
          </select>

          <input
            type="text"
            placeholder="Search media..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-input text-xs py-1.5 px-3 min-w-[160px]"
          />
        </div>
      </div>

      {/* Media Grid & Preview Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Assets Grid */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="admin-card p-16 text-center text-text-muted text-sm">
              Loading media library...
            </div>
          ) : assets.length === 0 ? (
            <div className="admin-card p-16 text-center">
              <p className="text-text-muted text-sm mb-4">No media assets found.</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary text-xs inline-flex"
              >
                Upload your first asset
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {assets.map((asset) => {
                const isSelected = selectedAsset?.id === asset.id
                return (
                  <div
                    key={asset.id}
                    onClick={() => {
                      setSelectedAsset(asset)
                      if (selectable && onSelect) onSelect(asset)
                    }}
                    className={`group relative rounded-xl overflow-hidden cursor-pointer border transition-all duration-200 bg-background-card aspect-square flex flex-col ${
                      isSelected
                        ? 'border-accent-amber ring-2 ring-accent-amber/40 shadow-lg'
                        : 'border-white/10 hover:border-white/25'
                    }`}
                  >
                    {/* Media Thumbnail */}
                    <div className="relative flex-1 w-full bg-black/40 overflow-hidden">
                      {asset.type === 'image' ? (
                        <Image
                          src={asset.url}
                          alt={asset.alt || asset.originalName}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : asset.type === 'video' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-black/60 text-text-secondary">
                          <span className="text-2xl mb-1">▶</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider">Video</span>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-black/60 text-text-secondary">
                          <span className="text-2xl mb-1">📄</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider">Doc</span>
                        </div>
                      )}

                      {/* Type badge */}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-black/70 text-text-muted backdrop-blur-sm">
                        {asset.type}
                      </span>
                    </div>

                    {/* Metadata strip */}
                    <div className="p-2.5 bg-background-elevated border-t border-white/5">
                      <p className="text-xs font-semibold text-text truncate mb-0.5">
                        {asset.originalName}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-text-muted">
                        <span>{formatBytes(asset.size)}</span>
                        <span>{asset.folder || 'general'}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected Asset Details Sidebar */}
        <div className="lg:col-span-1">
          {selectedAsset ? (
            <div className="admin-card p-5 sticky top-6 space-y-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
                Asset Details
              </h3>

              {/* Preview preview */}
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black/60 relative aspect-video flex items-center justify-center">
                {selectedAsset.type === 'image' ? (
                  <Image
                    src={selectedAsset.url}
                    alt={selectedAsset.alt || ''}
                    fill
                    className="object-contain"
                  />
                ) : selectedAsset.type === 'video' ? (
                  <video
                    src={selectedAsset.url}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <a
                    href={selectedAsset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-text-secondary underline"
                  >
                    Open Document ↗
                  </a>
                )}
              </div>

              {/* Info fields */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-bold">Filename</span>
                  <span className="text-text break-all font-mono">{selectedAsset.originalName}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-bold">URL</span>
                  <span className="text-text break-all font-mono text-[11px] select-all bg-white/5 p-1 rounded block mt-0.5">
                    {selectedAsset.url}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-text-muted block text-[10px] uppercase font-bold">Size</span>
                    <span className="text-text">{formatBytes(selectedAsset.size)}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[10px] uppercase font-bold">Dimensions</span>
                    <span className="text-text">
                      {selectedAsset.width && selectedAsset.height
                        ? `${selectedAsset.width} × ${selectedAsset.height} px`
                        : '—'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-bold">Folder</span>
                  <span className="text-text">{selectedAsset.folder || 'general'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                {selectable && onSelect && (
                  <button
                    onClick={() => onSelect(selectedAsset)}
                    className="btn-primary w-full text-center py-2"
                  >
                    <span className="btn-primary-label">Select This Asset</span>
                  </button>
                )}

                <button
                  onClick={() => copyUrl(selectedAsset.url)}
                  className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-text transition-all"
                >
                  Copy URL
                </button>

                <button
                  onClick={() => {
                    setReplacingAssetId(selectedAsset.id)
                    replaceInputRef.current?.click()
                  }}
                  className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text transition-all"
                >
                  Replace File
                </button>

                <button
                  onClick={() => handleDelete(selectedAsset.id)}
                  className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  Delete Asset
                </button>
              </div>
            </div>
          ) : (
            <div className="admin-card p-8 text-center text-text-muted text-xs">
              Select an asset from the grid to view details, copy URL, replace, or delete.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
