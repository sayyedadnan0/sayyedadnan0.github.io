'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { acquireScrollLock, releaseScrollLock } from '@/components/providers/SmoothScrollProvider'

interface Props {
  title: string
  children: ReactNode
  onClose: () => void
  className?: string
  hideHeader?: boolean
}

export default function Modal({ title, children, onClose, className, hideHeader = false }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement as HTMLElement | null
    if (!dialog) return
    acquireScrollLock(titleId)
    dialog.showModal()
    return () => {
      dialog.close()
      releaseScrollLock(titleId)
      previousFocus?.focus({ preventScroll: true })
    }
  }, [titleId])

  return <dialog ref={dialogRef} className={className || 'admin-modal'} aria-labelledby={hideHeader ? undefined : titleId} aria-label={hideHeader ? title : undefined} onCancel={event => { event.preventDefault(); onClose() }}>
    {!hideHeader && <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
      <h2 id={titleId} className="text-base font-bold text-text">{title}</h2>
      <button type="button" aria-label="Close media picker" onClick={onClose} className="text-text-muted hover:text-text p-2 text-lg">✕</button>
    </div>}
    {children}
  </dialog>
}
