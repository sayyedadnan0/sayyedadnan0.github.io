export interface CanvasProject {
  id: string
  title: string
  slug: string
  accentColor?: string | null
  thumbnailUrl?: string | null
  featuredImageUrl?: string | null
  heroImageUrl?: string | null
  category?: { name: string } | null
  client?: string | null
  year?: string | null
}
