'use client'

import Link from 'next/link'

interface Stats {
  totalProjects: number
  publishedProjects: number
  draftProjects: number
  totalMedia: number
  recentMessages: {
    id: string
    name: string
    email: string
    subject?: string | null
    createdAt: Date
    read: boolean
  }[]
}

interface AdminDashboardProps {
  stats: Stats
}

export default function AdminDashboard({ stats }: AdminDashboardProps) {
  const statCards = [
    { label: 'Total Projects', value: stats.totalProjects, color: '#E8C99A', href: '/admin/projects' },
    { label: 'Published', value: stats.publishedProjects, color: '#86efac', href: '/admin/projects' },
    { label: 'Drafts', value: stats.draftProjects, color: '#fca5a5', href: '/admin/projects' },
    { label: 'Media Assets', value: stats.totalMedia, color: '#93c5fd', href: '/admin/media' },
  ]

  const quickActions = [
    { label: 'New Project', href: '/admin/projects/new', icon: '+', desc: 'Add a new portfolio project' },
    { label: 'Upload Media', href: '/admin/media', icon: '↑', desc: 'Add images or videos' },
    { label: 'Edit Settings', href: '/admin/settings', icon: '⚙', desc: 'Update site content' },
    { label: 'View Messages', href: '/admin/messages', icon: '✉', desc: 'Check contact submissions' },
  ]

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl md:text-3xl font-black text-text mb-1">Dashboard</h1>
        <p className="text-text-secondary text-sm">Welcome back. Here&apos;s what&apos;s happening with your portfolio.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="admin-card p-6 hover:border-white/20 transition-all duration-200 group"
          >
            <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-3">{stat.label}</p>
            <p
              className="text-4xl font-black"
              style={{ color: stat.color }}
            >
              {stat.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-5">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="admin-card p-5 hover:border-white/20 hover:bg-white/[0.04] transition-all duration-200 group"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 text-xl"
                  style={{ background: 'rgba(212,175,55,0.1)', color: '#E8C99A' }}
                >
                  {action.icon}
                </div>
                <p className="text-sm font-bold text-text group-hover:text-accent-amber transition-colors">{action.label}</p>
                <p className="text-xs text-text-muted mt-1">{action.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent messages */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest">Recent Messages</h2>
            <Link href="/admin/messages" className="text-xs text-text-muted hover:text-text transition-colors">
              View all →
            </Link>
          </div>
          <div className="admin-card overflow-hidden">
            {stats.recentMessages.length === 0 ? (
              <p className="p-6 text-text-muted text-sm">No messages yet.</p>
            ) : (
              <ul>
                {stats.recentMessages.map((msg, i) => (
                  <li
                    key={msg.id}
                    className={`px-5 py-4 ${i < stats.recentMessages.length - 1 ? 'border-b border-white/[0.06]' : ''} hover:bg-white/[0.02] transition-colors`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${!msg.read ? 'text-text' : 'text-text-secondary'}`}>
                          {msg.name}
                        </p>
                        <p className="text-xs text-text-muted truncate">{msg.subject || msg.email}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!msg.read && (
                          <span className="w-2 h-2 rounded-full bg-accent-amber flex-shrink-0" />
                        )}
                        <span className="text-xs text-text-muted">
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
