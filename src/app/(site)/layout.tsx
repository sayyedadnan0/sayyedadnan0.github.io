import type { ReactNode } from 'react'
import Navigation from '@/components/layout/Navigation'
import Footer from '@/components/layout/Footer'
import { getSiteContext } from '@/server/queries/site'

export const dynamic = 'force-dynamic'

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const { settings, socials } = await getSiteContext()
  return <>
    <Navigation contactEmail={settings.contact_email} />
    <main id="main-content">{children}</main>
    <Footer socialLinks={socials} footerText={settings.footer_text} email={settings.contact_email} />
  </>
}
