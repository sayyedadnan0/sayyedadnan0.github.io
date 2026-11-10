import type { Metadata } from 'next'
import { AuthProvider } from '@/components/providers/AuthProvider'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthProvider>{children}</AuthProvider>
}
