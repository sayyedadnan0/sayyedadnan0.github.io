import { Metadata } from 'next'
import MediaLibrary from '@/features/admin/components/MediaLibrary'

export const metadata: Metadata = {
  title: { absolute: 'Media Library — ADNAN CMS' },
  robots: { index: false, follow: false },
}

export default function MediaPage() {
  return <MediaLibrary />
}
