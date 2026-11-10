'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setError('')

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        setStatus('error')
        return
      }

      router.push('/admin')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#050505' }}
    >
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(212,175,55,0.04), transparent)',
        }}
        aria-hidden="true"
      />

      <div className="w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="text-center mb-10">
          <svg
            width="40"
            height="40"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mx-auto mb-4"
          >
            <path
              d="M16 2L2 28H6.5L16 8.5L25.5 28H30L16 2Z"
              fill="white"
              fillRule="evenodd"
            />
            <path
              d="M9.5 22H22.5"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          <h1 className="text-xl font-bold text-text">ADNAN Studio</h1>
          <p className="text-sm text-text-secondary mt-1">Content Management System</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="admin-card p-8 space-y-6"
          noValidate
        >
          <div>
            <label htmlFor="email" className="admin-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="admin-input"
              placeholder="admin@adnan.design"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'loading'}
            />
          </div>

          <div>
            <label htmlFor="password" className="admin-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="admin-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={status === 'loading'}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full btn-primary justify-center"
          >
            <span className="btn-primary-label w-full justify-center">
              {status === 'loading' ? 'Signing in...' : 'Sign In'}
            </span>
            <span className="btn-primary-glow" aria-hidden="true" />
          </button>
        </form>

        <p className="text-center text-xs text-text-muted mt-6">
          Secure admin access only.
        </p>
      </div>
    </div>
  )
}
