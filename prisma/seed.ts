import { createDatabaseClient } from './client'
import bcrypt from 'bcryptjs'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())
const prisma = createDatabaseClient()

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  if (!email) throw new Error('Set ADMIN_EMAIL in .env before creating a CMS account.')
  if (await prisma.adminUser.findUnique({ where: { email } })) {
    console.log('CMS account already exists; its password and content were preserved.')
    return
  }
  if (!password || password.length < 12) throw new Error('Set an ADMIN_PASSWORD of at least 12 characters. There is no default password.')
  await prisma.adminUser.create({ data: { email, password: await bcrypt.hash(password, 12), name: 'Adnan', role: 'admin' } })
  console.log('Created the CMS account. No demo projects were inserted.')
}

main().catch(error => { console.error(error.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
