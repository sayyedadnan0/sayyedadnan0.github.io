'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ArrowRight, Check } from 'lucide-react'
import { SITE } from '@/config/site'
import type { SocialLink } from '@/types/site'
import { validateContact, type ContactFields } from '@/features/contact/validation'

const emptyForm: ContactFields = { name: '', email: '', subject: '', message: '' }

export default function ContactPage({ settings, socials }: { settings: Record<string, string>; socials: SocialLink[] }) {
  const [form, setForm] = useState<ContactFields>(emptyForm)
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const successRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const email = settings.contact_email?.trim() || SITE.email

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current) }, [])
  useEffect(() => {
    if (status === 'success') successRef.current?.focus()
    if (status === 'error') errorRef.current?.focus()
  }, [status])

  const copyEmail = async () => {
    if (copyTimer.current) clearTimeout(copyTimer.current)
    try { await navigator.clipboard.writeText(email); setCopyStatus('copied') }
    catch { setCopyStatus('error') }
    copyTimer.current = setTimeout(() => setCopyStatus('idle'), 3000)
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (status === 'loading') return
    const validated = validateContact(form)
    if (!validated.ok) { setError(validated.error); setStatus('error'); return }
    if (process.env.NEXT_PUBLIC_STATIC_SITE === 'true') {
      const body = `From: ${validated.data.name} <${validated.data.email}>\n\n${validated.data.message}`
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(validated.data.subject || 'Portfolio enquiry')}&body=${encodeURIComponent(body)}`
      setStatus('success'); return
    }
    setStatus('loading'); setError('')
    try {
      const response = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validated.data, website }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Your message could not be saved. Please try again.')
      setForm(emptyForm); setStatus('success')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Please check your connection and try again.'); setStatus('error') }
  }

  return <div className="portfolio-page"><div className="page-shell page-hero">
    <div className="contact-layout page-enter">
      <section>
        <span className="page-kicker">ADNAN / Contact</span>
        <h1 className="page-heading">{settings.contact_headline?.trim() || 'Let’s make something remarkable.'}</h1>
        <p className="page-lede contact-description">{settings.contact_subtext?.trim() || 'Have a project in mind? Tell me what you’re thinking.'}</p>
        <a className="contact-email" href={`mailto:${email}`}>{email}</a>
        {settings.contact_phone && <a className="contact-phone" href={`tel:${settings.contact_phone.replace(/[^+\d]/g, '')}`}>{settings.contact_phone}</a>}
        {settings.contact_location && <p className="contact-location">{settings.contact_location}</p>}
        <div className="contact-small-actions"><button type="button" className="page-button" onClick={copyEmail}>{copyStatus === 'copied' ? 'Email copied' : 'Copy email'}</button><span role="status" style={{ color: '#aaa79f', fontSize: 12 }}>{copyStatus === 'error' ? 'Please select and copy the email above.' : copyStatus === 'copied' ? 'Ready to paste.' : ''}</span></div>
        <div className="contact-socials">{socials.map(social => <a key={social.platform} href={social.url} target="_blank" rel="noopener noreferrer">{social.label || social.platform} <ArrowUpRight aria-hidden="true" size={12} style={{ display: 'inline' }} /></a>)}</div>
      </section>
      <section className="contact-form-panel" aria-label="Project enquiry">
        {status === 'success' ? <div className="contact-success" ref={successRef} tabIndex={-1} role="status" aria-live="polite"><Check aria-hidden="true" /><h2>{process.env.NEXT_PUBLIC_STATIC_SITE === 'true' ? 'Email draft opened.' : 'Message received.'}</h2><p>{process.env.NEXT_PUBLIC_STATIC_SITE === 'true' ? 'Please send the draft from your email app. If it did not open, use the email address shown on this page. Your message has not been sent automatically.' : 'Thank you for getting in touch. Your enquiry has been saved, and I’ll get back to you using the email you provided.'}</p><button className="page-button" onClick={() => setStatus('idle')}>Send another message <ArrowRight aria-hidden="true" /></button></div> : <>
          <h2>Tell me about your idea.</h2><p>A few details about the project, your timeline, and what you have in mind are a good place to start.</p>
          <form className="contact-form" onSubmit={submit} aria-busy={status === 'loading'}>
            <fieldset disabled={status === 'loading'}>
              <legend className="sr-only">Your contact details and project enquiry</legend>
              <div className="contact-form-row">
                <div className="contact-field"><label htmlFor="contact-name">Your name *</label><input id="contact-name" name="name" autoComplete="name" required maxLength={100} placeholder="Your name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="contact-field"><label htmlFor="contact-email">Email address *</label><input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@company.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div className="contact-field"><label htmlFor="contact-subject">What’s the project?</label><input id="contact-subject" name="subject" maxLength={200} placeholder="Brand identity, website, motion…" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
              <div className="contact-field"><label htmlFor="contact-message">A little more detail *</label><textarea id="contact-message" name="message" required minLength={10} maxLength={5000} rows={5} placeholder="The idea, the timeline, the possibilities…" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></div>
              <div className="contact-honeypot" aria-hidden="true"><label htmlFor="contact-website">Leave this blank</label><input id="contact-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></div>
              {error && <p className="contact-error" ref={errorRef} tabIndex={-1} role="alert">{error}</p>}
              <button className="page-button page-button-primary" type="submit" disabled={status === 'loading'}>{status === 'loading' ? 'Sending your message…' : (process.env.NEXT_PUBLIC_STATIC_SITE === 'true' ? 'Open email draft' : 'Send message')}<ArrowUpRight aria-hidden="true" /></button>
            </fieldset>
          </form>
        </>}
      </section>
    </div>
  </div></div>
}
