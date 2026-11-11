import { createDatabaseClient } from './client'
import { loadEnvConfig } from '@next/env'
import catalog from './data/portfolio.json'

loadEnvConfig(process.cwd())
const prisma = createDatabaseClient()

async function main() {
  if (await prisma.project.count()) {
    console.log('Projects already exist; portfolio import skipped to preserve CMS edits.')
    return
  }
  await prisma.$transaction(async tx => {
    for (const { category, gallery, sections, ...project } of catalog.projects) {
      const savedCategory = category ? await tx.category.upsert({ where: { slug: category.slug }, create: category, update: {} }) : null
      await tx.project.create({ data: { ...project, categoryId: savedCategory?.id || null, gallery: { create: gallery }, sections: { create: sections } } })
    }
    for (const setting of catalog.settings) await tx.siteSettings.upsert({ where: { key: setting.key }, create: setting, update: {} })
    if (!await tx.socialLink.count()) await tx.socialLink.createMany({ data: catalog.socials })
  }, { timeout: 30000 })
  console.log('Imported the published portfolio catalog. No administrator accounts or messages were imported.')
}

main().catch(error => { console.error(error.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
