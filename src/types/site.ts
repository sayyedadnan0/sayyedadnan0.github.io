export interface SocialLink {
  platform: string
  url: string
  label?: string | null
}

export type SiteSettings = Record<string, string>
