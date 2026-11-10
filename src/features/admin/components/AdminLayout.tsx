'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface AdminLayoutProps {
  children: React.ReactNode
  user: { name: string; email: string }
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '⬡', exact: true },
  { href: '/admin/projects', label: 'Projects', icon: '◈' },
  { href: '/admin/media', label: 'Media Library', icon: '⬚' },
  { href: '/admin/categories', label: 'Categories', icon: '◇' },
  { href: '/admin/messages', label: 'Messages', icon: '◻' },
  { href: '/admin/settings', label: 'Site Settings', icon: '⚙' },
]

export default function AdminLayout({ children, user }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0a0a0a', color: '#F5F5F3' }}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: '#050505',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-6 py-6"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <path d="M16 2L2 28H6.5L16 8.5L25.5 28H30L16 2Z" fill="white" fillRule="evenodd" />
            <path d="M9.5 22H22.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div>
            <p className="text-sm font-bold text-text">ADNAN Studio</p>
            <p className="text-xs text-text-muted">CMS</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-6 px-3 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isActive(item.href, item.exact)
                      ? 'bg-white/10 text-text'
                      : 'text-text-secondary hover:text-text hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="text-base w-5 text-center">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User section */}
        <div
          className="px-4 py-5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
              style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37' }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text truncate">{user.name}</p>
              <p className="text-xs text-text-muted truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center text-xs py-2 rounded-lg text-text-secondary hover:text-text hover:bg-white/[0.04] transition-all"
            >
              Preview Site ↗
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 text-center text-xs py-2 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div
          className="flex items-center justify-between px-5 py-4 lg:hidden"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-text-secondary hover:text-text transition-colors p-1"
            aria-label="Open navigation"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <p className="text-sm font-bold text-text">ADNAN CMS</p>
          <div className="w-6" />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
