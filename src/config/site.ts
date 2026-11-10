import type { SocialLink } from '@/types/site'

export const SITE = {
  name: 'ADNAN',
  title: 'ADNAN — Creative Portfolio',
  author: 'Sayyed Adnan Ali',
  email: 'aali15262@gmail.com',
  description: 'Sayyed Adnan Ali — marketing and creative strategy, graphic design, animation, video editing, AI-assisted websites, and UI/UX design in Dubai.',
  shareImage: '/opengraph-image',
  featuredProjectLimit: 5,
} as const

export const DEFAULT_SOCIALS: SocialLink[] = [
  { platform: 'LinkedIn', url: 'https://www.linkedin.com/in/sayyed-adnan-ali-9ab674216/', label: 'LinkedIn' },
  { platform: 'Behance', url: 'https://www.behance.net/SayyedAdnanAli/projects', label: 'Behance' },
  { platform: 'Video portfolio', url: 'https://drive.google.com/drive/folders/1nFHGC7ijsYV-LgFwN1ZAucF0nx8QGE5R', label: 'Video portfolio' },
]

export const DEFAULT_SETTINGS = {
  site_name: SITE.name,
  footer_text: '© 2026 Sayyed Adnan Ali. All rights reserved.',
  hero_wordmark: SITE.name,
  hero_subtitle: 'Marketing / Design / Motion',
  contact_email: SITE.email,
}
