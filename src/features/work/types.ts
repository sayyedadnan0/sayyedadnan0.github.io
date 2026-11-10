export interface ProjectMedia {
  id: string
  url: string
  type: string
  alt?: string | null
  caption?: string | null
  order: number
}

export interface ProjectSection {
  id: string
  title: string
  content: string
  order: number
}

export interface Project {
  id: string
  title: string
  slug: string
  subtitle?: string | null
  shortDescription?: string | null
  fullDescription?: string | null
  challenge?: string | null
  concept?: string | null
  process?: string | null
  execution?: string | null
  outcome?: string | null
  client?: string | null
  year?: string | null
  myRole?: string | null
  tools?: string | null
  tags?: string | null
  heroImageUrl?: string | null
  heroVideoUrl?: string | null
  thumbnailUrl?: string | null
  featuredImageUrl?: string | null
  accentColor?: string | null
  externalUrl?: string | null
  behanceUrl?: string | null
  githubUrl?: string | null
  category?: { name: string; color?: string | null } | null
  gallery: ProjectMedia[]
  sections: ProjectSection[]
}

export interface AdjacentProject {
  title: string
  slug: string
  thumbnailUrl?: string | null
}
