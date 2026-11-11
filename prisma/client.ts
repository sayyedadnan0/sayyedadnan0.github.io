import { PrismaClient } from '@prisma/client'
import { PrismaClient as CloudPrismaClient } from '../src/generated/cloud'

/** Both clients are generated from the same model definitions. */
export function createDatabaseClient(): PrismaClient {
  const cloud = /^postgres(?:ql)?:/.test(process.env.DATABASE_URL || '')
  if (cloud) return new CloudPrismaClient({ log: ['error'] }) as unknown as PrismaClient
  return new PrismaClient({ log: ['error'] })
}
