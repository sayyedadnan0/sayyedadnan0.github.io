import Navigation from '@/components/layout/Navigation'
import HomeExperience from '@/features/home/components/HomeExperience'
import Footer from '@/components/layout/Footer'
import { getFeaturedProjects } from '@/server/queries/projects'
import StructuredData from '@/components/seo/StructuredData'
import { SITE } from '@/config/site'
import { absoluteUrl, createPageMetadata } from '@/server/seo'
import { getSiteContext } from '@/server/queries/site'

export const dynamic = 'force-dynamic'

export const metadata = createPageMetadata({ title: SITE.title, description: SITE.description, path: '/', absoluteTitle: true })

export default async function HomePage() {
  const [featuredProjects, { settings, socials: socialLinks }] = await Promise.all([getFeaturedProjects(), getSiteContext()])

  return (
    <>
      <StructuredData data={{ '@context': 'https://schema.org', '@graph': [
        { '@type': 'WebSite', '@id': absoluteUrl('/#website'), name: SITE.title, url: absoluteUrl('/') },
        { '@type': 'Person', '@id': absoluteUrl('/#person'), name: SITE.author, url: absoluteUrl('/about'),
          image: settings.about_image ? absoluteUrl(settings.about_image) : undefined,
          jobTitle: 'Marketing and creative professional', sameAs: socialLinks.map(social => social.url) },
      ] }} />
      <Navigation contactEmail={settings.contact_email} />

      {/* Main content with visible 3D experience and reachable footer */}
      <main id="main-content" className="relative w-full min-h-screen bg-[#020203]">
        {/* Continuous 3D Experience: Settled Hero -> Camera Journey -> 3D Spatial Gallery */}
        <section id="experience-section" data-lenis-prevent="true" className="relative w-full h-screen overflow-hidden">
          <HomeExperience
            projects={featuredProjects}
            wordmark={settings.hero_wordmark || 'ADNAN'}
            subtitle={settings.hero_subtitle || 'Creative Director & Designer'}
            ctaText={settings.hero_cta || 'Scroll to start exploring'}
          />
        </section>

        {/* Visible, Accessible Homepage Footer Section */}
        <section id="homepage-footer-section" className="relative w-full z-20 bg-[#020203]">
          <Footer socialLinks={socialLinks} footerText={settings.footer_text} email={settings.contact_email} />
        </section>
      </main>
    </>
  )
}
