import { redirect } from 'next/navigation'
import { getSession } from '@/server/auth'
import AdminLayout from '@/features/admin/components/AdminLayout'

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  return <AdminLayout user={{ name: session.name, email: session.email }}>{children}</AdminLayout>
}
