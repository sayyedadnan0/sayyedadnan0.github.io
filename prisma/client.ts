import { PrismaClient } from '@prisma/client'
import { resolveDatabaseUrl } from './database-url.cjs'
import { PrismaClient as CloudPrismaClient } from '../src/generated/cloud'

/** Both clients are generated from the same model definitions. */
export function createDatabaseClient(): PrismaClient {
  const url = resolveDatabaseUrl(process.env.DATABASE_URL, process.env.DATABASE_PASSWORD)
  const cloud = /^postgres(?:ql)?:/.test(url || '')
  if (cloud) return new CloudPrismaClient({ log: ['error'], datasources: { db: { url } } }) as unknown as PrismaClient
  return new PrismaClient({ log: ['error'] })
}
