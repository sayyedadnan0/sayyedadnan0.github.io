import ContactPage from '@/features/contact/components/ContactPage'
import { getSiteContext } from '@/server/queries/site'
import { createPageMetadata } from '@/server/seo'

export const metadata = createPageMetadata({ title: 'Contact', path: '/contact', description: 'Contact Sayyed Adnan Ali in Dubai for marketing, graphic design, animation, video editing, UI/UX, and website projects.' })

export default async function Contact() {
  const { settings, socials } = await getSiteContext()
  return <ContactPage settings={settings} socials={socials} />
}
