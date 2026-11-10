import Link from 'next/link'
import CallToAction from '@/components/ui/CallToAction'
import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'

const services = [
  { name: 'Marketing & creative strategy', description: 'Campaign concepts, brand messaging, content planning, and creative production shaped around the audience and business goal.' },
  { name: 'Graphic design & branding', description: 'Social campaigns, brand communications, brochures, presentations, and visual identities.' },
  { name: 'Video editing & advertising', description: 'Short-form Reels, long-form videos, promotional films, and advertisements from scripting to final edit.' },
  { name: 'Animation & motion design', description: '2D and 3D animation, motion graphics, typography, compositing, and visual storytelling.' },
  { name: 'UI/UX design', description: 'Clear interfaces, considered user journeys, and visual design for digital products and websites.' },
  { name: 'AI-assisted website development', description: 'Responsive websites built with AI-assisted workflows, bringing design, content, and working interactions together.' },
]

const getEntries = (value?: string) => (value || '').split('\n').map(line => line.split('|').map(part => part.trim())).filter(parts => parts.length >= 2 && parts[0])

function getSkills(value?: string): string[] {
  if (!value?.trim()) return ['Premiere Pro', 'After Effects', 'Photoshop', 'Illustrator', 'Adobe Animate', 'Autodesk Maya', 'Foundry Nuke', 'Dragonframe']
  try { const parsed: unknown = JSON.parse(value); if (Array.isArray(parsed)) return parsed.filter((s): s is string => typeof s === 'string' && !!s.trim()) } catch { /* Comma-separated CMS values are also supported. */ }
  return value.split(',').map(s => s.trim()).filter(Boolean)
}

export default function AboutContent({ content }: { content: Record<string, string> }) {
  const intro = content.about_intro?.trim() || 'Hi, I’m Adnan.'
  const bio = content.about_bio?.trim() || 'I’m Sayyed Adnan Ali, a Dubai-based marketing and creative professional working across graphic design, animation, video, UI/UX, and AI-assisted website development.'
  const philosophy = content.about_philosophy?.trim() || 'Design should make an idea feel clear. I work with proportion, typography, light, and movement to create experiences that feel considered from beginning to end.'

  return <div className="portfolio-page"><div className="page-shell">
    <header className="page-hero about-hero page-enter">
      <div><span className="page-kicker">{content.about_eyebrow || 'The person behind the work'}</span><h1 className="page-heading">{intro}</h1><p className="page-lede">{bio}</p><div className="about-actions"><Link href="/contact" className="page-button page-button-primary">Start a conversation <ArrowUpRight aria-hidden="true" /></Link>{content.resume_url?.trim() && <a href={content.resume_url} target="_blank" rel="noopener noreferrer" className="page-button">View résumé <ArrowUpRight aria-hidden="true" /></a>}</div></div>
      <div className="about-portrait">{content.about_image?.trim() ? <Image src={content.about_image} alt="Adnan" fill sizes="(max-width: 640px) 100vw, 45vw" priority /> : <><div className="about-mark" aria-hidden="true"><span>A</span></div><div className="about-portrait-caption"><span>ADNAN</span><span>Design / Motion / Digital</span></div></>}</div>
    </header>
    <section className="page-section page-divider"><h2>My approach</h2><p className="about-philosophy">{philosophy}</p></section>
    <section className="page-section page-divider"><h2>What I can help with</h2><div className="about-services">{services.map(service => <div className="about-service" key={service.name}><h3>{service.name}</h3><p>{service.description}</p></div>)}</div></section>
    {getEntries(content.about_experience).length > 0 && <section className="page-section page-divider"><h2>Experience</h2><div>{getEntries(content.about_experience).map(([role, company, dates]) => <div className="about-experience-row" key={`${role}-${company}`}><div><h3>{role}</h3><p>{company}</p></div><span>{dates}</span></div>)}</div></section>}
    {getEntries(content.about_education).length > 0 && <section className="page-section page-divider"><h2>Education</h2><div>{getEntries(content.about_education).map(([degree, university, dates]) => <div className="about-experience-row" key={degree}><div><h3>{degree}</h3><p>{university}</p></div><span>{dates}</span></div>)}</div></section>}
    <section className="page-section page-divider"><h2>Tools & practice</h2><div className="about-skills">{getSkills(content.about_skills).map(skill => <span key={skill}>{skill}</span>)}</div></section>
    <CallToAction eyebrow="Good work starts with a conversation" title="Let’s make it happen." href="/work" label="Explore the work" primary={false} />
  </div></div>
}
