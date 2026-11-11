import catalog from '../../../prisma/data/portfolio.json'
import type { Prisma, Category } from '@prisma/client'
type Project = Prisma.ProjectGetPayload<{include:{category:true;gallery:true;sections:true}}>
const stamp = new Date('2026-11-11T00:00:00Z')
export function gitProjects(): Project[] {
  return catalog.projects.filter(p => p.published).map(p => ({...p, id:p.slug, categoryId:p.category?.slug || null, createdAt:stamp,updatedAt:stamp,
    category:p.category ? {...p.category,id:p.category.slug,createdAt:stamp,updatedAt:stamp}:null,
    gallery:p.gallery.map((m,i)=>({...m,id:p.slug+'-media-'+i,projectId:p.slug,createdAt:stamp})),
    sections:(p.sections as Project['sections']).filter(s=>s.visible).map((s,i)=>({...s,id:p.slug+'-section-'+i,projectId:p.slug,createdAt:stamp})),
  } as unknown as Project)).sort((a,b)=>a.order-b.order || a.id.localeCompare(b.id))
}
export function gitCategories(): Category[] {
  return [...new Map(gitProjects().filter(p=>p.category).map(p=>[p.category!.id,p.category!])).values()].sort((a,b)=>a.order-b.order)
}
