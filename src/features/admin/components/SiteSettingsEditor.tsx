'use client'

import { useState } from 'react'
import MediaPickerDialog from './MediaPickerDialog'
import type { MediaAsset } from './MediaLibrary'

interface SocialLink {
  id?: string
  platform: string
  url: string
  label?: string | null
  order?: number
  visible?: boolean
}

interface Props {
  initialSettings: Record<string, string>
  initialPageContent: Record<string, Record<string, string>>
  initialSocials: SocialLink[]
}

export default function SiteSettingsEditor({
  initialSettings,
  initialPageContent,
  initialSocials,
}: Props) {
  const [activeTab, setActiveTab] = useState<'home' | 'about' | 'contact' | 'global'>('home')
  const [settings, setSettings] = useState<Record<string, string>>(initialSettings)
  const [pageContent] = useState<Record<string, Record<string, string>>>(initialPageContent)
  const [socials, setSocials] = useState<SocialLink[]>(initialSocials)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [mediaPickerKey, setMediaPickerKey] = useState<string | null>(null)

  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const setSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handlePublish = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings,
          pageContent,
          socials,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to publish settings')
      }

      showNotify('All changes successfully published live to the website!')
    } catch (err: unknown) {
      showNotify(err instanceof Error ? err.message : 'Error publishing changes', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Social link helpers
  const updateSocial = (index: number, field: keyof SocialLink, value: SocialLink[keyof SocialLink]) => {
    const updated = [...socials]
    updated[index] = { ...updated[index], [field]: value }
    setSocials(updated)
  }

  const addSocial = () => {
    setSocials([...socials, { platform: 'Platform', url: 'https://', label: '', visible: true }])
  }

  const removeSocial = (index: number) => {
    setSocials(socials.filter((_, i) => i !== index))
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* Toast */}
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

      {mediaPickerKey && <MediaPickerDialog onClose={() => setMediaPickerKey(null)} onSelect={(asset: MediaAsset) => {
                setSetting(mediaPickerKey, asset.url)
                setMediaPickerKey(null)
                showNotify(`Selected ${asset.originalName}`)
               }} />}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-text mb-1">Website Content Editor</h1>
          <p className="text-text-secondary text-sm">Customize text, copy, brand assets, social links and SEO without touching code.</p>
        </div>

        <button
          onClick={handlePublish}
          disabled={saving}
          className="btn-primary"
        >
          <span className="btn-primary-label">
            {saving ? 'Publishing...' : 'Publish Live to Website'}
          </span>
          <span className="btn-primary-glow" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 mb-8 overflow-x-auto pb-1">
        {([
          { key: 'home', label: 'Homepage' },
          { key: 'about', label: 'About Page' },
          { key: 'contact', label: 'Contact Page' },
          { key: 'global', label: 'Global & SEO' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-accent-amber text-text'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Homepage */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          <div className="admin-card p-6 space-y-5">
            <h2 className="text-base font-bold text-text mb-1">Hero Section</h2>
            <p className="text-xs text-text-muted">Content displayed in the full-screen cinematic eclipse view.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="admin-label">Hero Wordmark (Brand Name)</label>
                <input
                  type="text"
                  value={settings.hero_wordmark || 'ADNAN'}
                  onChange={(e) => setSetting('hero_wordmark', e.target.value)}
                  className="admin-input w-full font-bold tracking-wider"
                />
              </div>

              <div>
                <label className="admin-label">Hero Subtitle</label>
                <input
                  type="text"
                  value={settings.hero_subtitle || 'Marketing / Design / Motion'}
                  onChange={(e) => setSetting('hero_subtitle', e.target.value)}
                  className="admin-input w-full"
                />
              </div>
            </div>

            <div>
              <label className="admin-label">Introduction Text</label>
              <textarea
                value={settings.hero_intro || 'Crafting immersive digital experiences that live at the intersection of art and technology.'}
                onChange={(e) => setSetting('hero_intro', e.target.value)}
                className="admin-input w-full min-h-[80px]"
              />
            </div>

            <div>
              <label className="admin-label">Scroll CTA Text</label>
              <input
                type="text"
                value={settings.hero_cta || 'Scroll to Explore'}
                onChange={(e) => setSetting('hero_cta', e.target.value)}
                className="admin-input w-full max-w-sm"
              />
            </div>
          </div>

          <div className="admin-card p-6 space-y-5">
            <h2 className="text-base font-bold text-text mb-1">Teasers & Sections</h2>
            <div>
              <label className="admin-label">About Teaser Headline</label>
              <input
                type="text"
                value={settings.about_teaser_headline || 'A design ethos rooted in distinction'}
                onChange={(e) => setSetting('about_teaser_headline', e.target.value)}
                className="admin-input w-full"
              />
            </div>
            <div>
              <label className="admin-label">About Teaser Body</label>
              <textarea
                value={settings.about_teaser_body || 'Balancing aesthetic purity with functional clarity, every project is treated as an original canvas.'}
                onChange={(e) => setSetting('about_teaser_body', e.target.value)}
                className="admin-input w-full min-h-[80px]"
              />
            </div>
            <div>
              <label className="admin-label">Contact Teaser Headline</label>
              <input
                type="text"
                value={settings.contact_teaser_headline || "Let's create something extraordinary together."}
                onChange={(e) => setSetting('contact_teaser_headline', e.target.value)}
                className="admin-input w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: About Page */}
      {activeTab === 'about' && (
        <div className="space-y-6">
          <div className="admin-card p-6 space-y-5">
            <h2 className="text-base font-bold text-text mb-1">Personal Biography & Philosophy</h2>

            <div>
              <label className="admin-label">Headline / Intro</label>
              <input
                type="text"
                value={settings.about_intro || "Hi, I'm Adnan."}
                onChange={(e) => setSetting('about_intro', e.target.value)}
                className="admin-input w-full text-lg font-bold"
              />
            </div>

            <div>
              <label className="admin-label">Full Biography</label>
              <textarea
                value={settings.about_bio || ''}
                onChange={(e) => setSetting('about_bio', e.target.value)}
                rows={5}
                className="admin-input w-full"
              />
            </div>

            <div>
              <label className="admin-label">Name & location line</label>
              <input className="admin-input w-full" value={settings.about_eyebrow || ''} onChange={e => setSetting('about_eyebrow', e.target.value)} />
            </div>
            <div>
              <label className="admin-label">Experience</label>
              <p className="text-xs text-text-muted mb-2">One role per line: Role | Organisation | Dates</p>
              <textarea className="admin-input w-full" rows={5} value={settings.about_experience || ''} onChange={e => setSetting('about_experience', e.target.value)} />
            </div>
            <div>
              <label className="admin-label">Education</label>
              <p className="text-xs text-text-muted mb-2">One qualification per line: Qualification | Institution | Dates</p>
              <textarea className="admin-input w-full" rows={3} value={settings.about_education || ''} onChange={e => setSetting('about_education', e.target.value)} />
            </div>
            <div>
              <label className="admin-label">Creative Philosophy</label>
              <textarea
                value={settings.about_philosophy || ''}
                onChange={(e) => setSetting('about_philosophy', e.target.value)}
                rows={4}
                className="admin-input w-full"
              />
            </div>

            <div>
              <label className="admin-label">Resume / CV Download URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.resume_url || ''}
                  onChange={(e) => setSetting('resume_url', e.target.value)}
                  placeholder="/uploads/documents/adnan-resume.pdf"
                  className="admin-input flex-1"
                />
                <button
                  type="button"
                  onClick={() => setMediaPickerKey('resume_url')}
                  className="btn-secondary text-xs"
                >
                  Pick from Media
                </button>
              </div>
            </div>

            <div>
              <label className="admin-label">Profile / Portrait Image URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.about_image || ''}
                  onChange={(e) => setSetting('about_image', e.target.value)}
                  placeholder="/uploads/general/portrait.jpg"
                  className="admin-input flex-1"
                />
                <button
                  type="button"
                  onClick={() => setMediaPickerKey('about_image')}
                  className="btn-secondary text-xs"
                >
                  Pick from Media
                </button>
              </div>
            </div>
          </div>

          <div className="admin-card p-6 space-y-5">
            <h2 className="text-base font-bold text-text mb-1">Skills & Capabilities</h2>
            <div>
              <label className="admin-label">Key Skills (comma separated)</label>
              <textarea
                value={settings.about_skills || 'Premiere Pro, After Effects, Photoshop, Illustrator, Adobe Animate, Autodesk Maya, Foundry Nuke, Dragonframe'}
                onChange={(e) => setSetting('about_skills', e.target.value)}
                rows={3}
                className="admin-input w-full"
              />
              <p className="text-[11px] text-text-muted mt-1">Separate skills with commas. They will appear as pills on the About page.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Contact Page */}
      {activeTab === 'contact' && (
        <div className="space-y-6">
          <div className="admin-card p-6 space-y-5">
            <h2 className="text-base font-bold text-text mb-1">Contact Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="admin-label">Contact Email Address</label>
                <input
                  type="email"
                  value={settings.contact_email || 'aali15262@gmail.com'}
                  onChange={(e) => setSetting('contact_email', e.target.value)}
                  className="admin-input w-full"
                />
              </div>

              <div>
                <label className="admin-label">Contact Headline</label>
                <input
                  type="text"
                  value={settings.contact_headline || "LET'S MAKE SOMETHING REMARKABLE."}
                  onChange={(e) => setSetting('contact_headline', e.target.value)}
                  className="admin-input w-full font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div><label className="admin-label">Contact phone</label><input className="admin-input w-full" type="tel" value={settings.contact_phone || ''} onChange={e => setSetting('contact_phone', e.target.value)} /></div>
              <div><label className="admin-label">Location</label><input className="admin-input w-full" value={settings.contact_location || ''} onChange={e => setSetting('contact_location', e.target.value)} /></div>
            </div>
            <div>
              <label className="admin-label">Contact Subtext / Availability</label>
              <input
                type="text"
                value={settings.contact_subtext || 'Available for select projects and collaborations.'}
                onChange={(e) => setSetting('contact_subtext', e.target.value)}
                className="admin-input w-full"
              />
            </div>
          </div>

          {/* Social Media Links */}
          <div className="admin-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-text">Social Media Links</h2>
                <p className="text-xs text-text-muted">Manage your social profiles shown across header, contact and footer.</p>
              </div>
              <button
                type="button"
                onClick={addSocial}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-text"
              >
                + Add Social Link
              </button>
            </div>

            <div className="space-y-3">
              {socials.map((link, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <input
                    type="text"
                    value={link.platform}
                    onChange={(e) => updateSocial(idx, 'platform', e.target.value)}
                    placeholder="Platform (e.g. LinkedIn)"
                    className="admin-input text-xs w-36"
                  />
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => updateSocial(idx, 'url', e.target.value)}
                    placeholder="URL (https://...)"
                    className="admin-input text-xs flex-1"
                  />
                  <input
                    type="text"
                    value={link.label || ''}
                    onChange={(e) => updateSocial(idx, 'label', e.target.value)}
                    placeholder="Label (optional)"
                    className="admin-input text-xs w-32"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={link.visible !== false}
                      onChange={(e) => updateSocial(idx, 'visible', e.target.checked)}
                    />
                    Visible
                  </label>
                  <button
                    type="button"
                    onClick={() => removeSocial(idx)}
                    className="text-xs text-red-400 hover:text-red-300 p-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Global & SEO */}
      {activeTab === 'global' && (
        <div className="space-y-6">
          <div className="admin-card p-6 space-y-5">
            <h2 className="text-base font-bold text-text mb-1">Global Branding & Footer</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="admin-label">Website Title</label>
                <input
                  type="text"
                  value={settings.site_name || 'ADNAN'}
                  onChange={(e) => setSetting('site_name', e.target.value)}
                  className="admin-input w-full"
                />
              </div>

              <div>
                <label className="admin-label">Tagline</label>
                <input
                  type="text"
                  value={settings.site_tagline || 'Creative Portfolio'}
                  onChange={(e) => setSetting('site_tagline', e.target.value)}
                  className="admin-input w-full"
                />
              </div>
            </div>

            <div>
              <label className="admin-label">Footer Copyright Text</label>
              <input
                type="text"
                value={settings.footer_text || '© 2025 Adnan. All rights reserved.'}
                onChange={(e) => setSetting('footer_text', e.target.value)}
                className="admin-input w-full"
              />
            </div>
          </div>

          <div className="admin-card p-6 space-y-5">
            <h2 className="text-base font-bold text-text mb-1">SEO & Metadata</h2>

            <div>
              <label className="admin-label">Default Meta Title</label>
              <input
                type="text"
                value={settings.seo_default_title || 'ADNAN — Creative Portfolio'}
                onChange={(e) => setSetting('seo_default_title', e.target.value)}
                className="admin-input w-full"
              />
            </div>

            <div>
              <label className="admin-label">Default Meta Description</label>
              <textarea
                value={settings.site_description || 'Adnan is a creative director and designer crafting immersive digital experiences at the intersection of art and technology.'}
                onChange={(e) => setSetting('site_description', e.target.value)}
                rows={3}
                className="admin-input w-full"
              />
            </div>

            <div>
              <label className="admin-label">Open Graph / Social Share Image URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.og_image || ''}
                  onChange={(e) => setSetting('og_image', e.target.value)}
                  placeholder="/uploads/general/og-preview.jpg"
                  className="admin-input flex-1"
                />
                <button
                  type="button"
                  onClick={() => setMediaPickerKey('og_image')}
                  className="btn-secondary text-xs"
                >
                  Pick from Media
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
