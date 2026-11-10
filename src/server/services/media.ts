import type { Prisma } from '@prisma/client'
import { prisma } from '@/server/prisma'
import type { UploadResult } from '@/server/storage'

const assetFields = ['thumbnailUrl', 'featuredImageUrl', 'heroImageUrl', 'heroVideoUrl', 'mobileImageUrl', 'mobileVideoUrl', 'videoUrl', 'ogImageUrl'] as const
const richFields = ['fullDescription', 'challenge', 'concept', 'process', 'execution', 'outcome'] as const

export class MediaInUseError extends Error {}

export async function deleteUnusedMedia(id: string, url: string) {
  await prisma.$transaction(async tx => {
    const [project, gallery, section, setting, content] = await Promise.all([
      tx.project.findFirst({ where: { OR: [...assetFields.map(field => ({ [field]: url })), ...richFields.map(field => ({ [field]: { contains: url } }))] }, select: { id: true } }),
      tx.projectMedia.findFirst({ where: { url }, select: { id: true } }),
      tx.projectSection.findFirst({ where: { content: { contains: url } }, select: { id: true } }),
      tx.siteSettings.findFirst({ where: { value: { contains: url } }, select: { id: true } }),
      tx.pageContent.findFirst({ where: { value: { contains: url } }, select: { id: true } }),
    ])
    if (project || gallery || section || setting || content) throw new MediaInUseError('This file is used by portfolio content. Replace it or remove its references before deleting it.')
    await tx.mediaAsset.delete({ where: { id } })
  })
}

/** Replace metadata and references together; the old file remains until this commits. */
export async function replaceMediaAsset(id: string, oldUrl: string, file: UploadResult, alt: string, folder: string) {
  return prisma.$transaction(async tx => {
    const updated = await tx.mediaAsset.update({ where: { id }, data: { ...file, alt, folder } })
    for (const field of assetFields) await tx.project.updateMany({ where: { [field]: oldUrl }, data: { [field]: file.url } })
    await tx.projectMedia.updateMany({ where: { url: oldUrl }, data: { url: file.url, type: file.type, width: file.width || null, height: file.height || null } })
    const projects = await tx.project.findMany({ where: { OR: richFields.map(field => ({ [field]: { contains: oldUrl } })) } })
    for (const project of projects) {
      const data: Prisma.ProjectUpdateInput = {}
      for (const field of richFields) if (project[field]?.includes(oldUrl)) data[field] = project[field]!.replaceAll(oldUrl, file.url)
      await tx.project.update({ where: { id: project.id }, data })
    }
    for (const section of await tx.projectSection.findMany({ where: { content: { contains: oldUrl } } })) {
      await tx.projectSection.update({ where: { id: section.id }, data: { content: section.content.replaceAll(oldUrl, file.url) } })
    }
    for (const setting of await tx.siteSettings.findMany({ where: { value: { contains: oldUrl } } })) {
      await tx.siteSettings.update({ where: { id: setting.id }, data: { value: setting.value.replaceAll(oldUrl, file.url) } })
    }
    for (const content of await tx.pageContent.findMany({ where: { value: { contains: oldUrl } } })) {
      await tx.pageContent.update({ where: { id: content.id }, data: { value: content.value.replaceAll(oldUrl, file.url) } })
    }
    return updated
  }, { timeout: 15000 })
}
