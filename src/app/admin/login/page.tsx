import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/server/auth'
import AdminLogin from '@/features/admin/components/AdminLogin'

export const metadata: Metadata = {
  title: { absolute: 'Admin Login — ADNAN CMS' },
  robots: { index: false, follow: false },
}

export default async function AdminLoginPage() {
  const session = await getSession()
  if (session) redirect('/admin')

  return <AdminLogin />
}
