'use client'

import { useState } from 'react'

interface Message {
  id: string
  name: string
  email: string
  subject?: string | null
  message: string
  read: boolean
  createdAt: string | Date
}

interface Props {
  initialMessages: Message[]
}

export default function MessagesManager({ initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [selected, setSelected] = useState<Message | null>(null)

  const toggleRead = async (msg: Message) => {
    try {
      const res = await fetch(`/api/admin/messages/${msg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: !msg.read }),
      })
      if (res.ok) {
        const updated = { ...msg, read: !msg.read }
        setMessages(messages.map((m) => (m.id === msg.id ? updated : m)))
        if (selected?.id === msg.id) setSelected(updated)
      }
    } catch {}
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return
    try {
      const res = await fetch(`/api/admin/messages/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMessages(messages.filter((m) => m.id !== id))
        if (selected?.id === id) setSelected(null)
      }
    } catch {}
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-text mb-1">Messages</h1>
        <p className="text-text-secondary text-sm">Review client inquiries submitted through the contact form.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Messages List */}
        <div className="lg:col-span-5">
          <div className="admin-card overflow-hidden">
            {messages.length === 0 ? (
              <p className="p-8 text-center text-text-muted text-sm">No messages yet.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {messages.map((m) => {
                  const isSelected = selected?.id === m.id
                  return (
                    <li
                      key={m.id}
                      onClick={() => {
                        setSelected(m)
                        if (!m.read) toggleRead(m)
                      }}
                      className={`p-4 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-white/10'
                          : m.read
                          ? 'hover:bg-white/[0.02]'
                          : 'bg-white/[0.04] hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          {!m.read && (
                            <span className="w-2 h-2 rounded-full bg-accent-amber flex-shrink-0" />
                          )}
                          <p className={`text-sm truncate ${!m.read ? 'font-bold text-text' : 'text-text-secondary'}`}>
                            {m.name}
                          </p>
                        </div>
                        <span className="text-[10px] text-text-muted whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted truncate mb-1">{m.subject || m.email}</p>
                      <p className="text-xs text-text-secondary line-clamp-2">{m.message}</p>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Message Details */}
        <div className="lg:col-span-7">
          {selected ? (
            <div className="admin-card p-6 space-y-6">
              <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-text mb-1">{selected.name}</h2>
                  <a
                    href={`mailto:${selected.email}`}
                    className="text-xs text-accent-amber hover:underline"
                  >
                    {selected.email}
                  </a>
                  {selected.subject && (
                    <p className="text-xs text-text-secondary mt-1">
                      <span className="text-text-muted">Subject:</span> {selected.subject}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleRead(selected)}
                    className="text-xs px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-text-secondary"
                  >
                    Mark as {selected.read ? 'Unread' : 'Read'}
                  </button>
                  <button
                    onClick={() => handleDelete(selected.id)}
                    className="text-xs px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs text-text-muted uppercase font-bold mb-2">Message</p>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-sm text-text leading-relaxed whitespace-pre-wrap">
                  {selected.message}
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={`mailto:${selected.email}?subject=${encodeURIComponent(
                    selected.subject ? `Re: ${selected.subject}` : 'Regarding your inquiry'
                  )}`}
                  className="btn-primary inline-flex"
                >
                  <span className="btn-primary-label">Reply via Email →</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="admin-card p-16 text-center text-text-muted text-sm">
              Select an inquiry from the left to read its full message and details.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
