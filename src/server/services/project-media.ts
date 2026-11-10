interface GalleryItemInput {
  url: string
  type?: string
  alt?: string | null
  caption?: string | null
  order?: number
  width?: number | null
  height?: number | null
}

/** One representation for project creation and gallery replacement. */
export function serializeGallery(items: GalleryItemInput[]) {
  return items.map((item, index) => ({
    url: item.url,
    type: item.type || 'image',
    alt: item.alt || '',
    caption: item.caption || '',
    order: item.order !== undefined ? item.order : index,
    width: item.width || null,
    height: item.height || null,
  }))
}
