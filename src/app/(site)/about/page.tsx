import AboutContent from '@/features/about/components/AboutContent'
import { getAuthoritativeSettings } from '@/server/queries/site'
import { createPageMetadata } from '@/server/seo'

export const metadata = createPageMetadata({ title: 'About Me', path: '/about', description: 'Meet Sayyed Adnan Ali, a Dubai-based marketing and creative professional working across design, animation, video, UI/UX, and AI-assisted websites.' })

export default async function AboutPage() {
  return <AboutContent content={await getAuthoritativeSettings()} />
}
