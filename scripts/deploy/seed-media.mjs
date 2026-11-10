import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

try {
  const assets = JSON.parse(await fs.readFile(new URL('../../prisma/data/media.json', import.meta.url), 'utf8'));
  let added = 0;
  for (const asset of assets) {
    if (await prisma.mediaAsset.findFirst({ where: { url: asset.url }, select: { id: true } })) continue;
    await prisma.mediaAsset.create({ data: asset });
    added++;
  }
  console.log(`Media Library ready: ${added} new public portfolio assets indexed.`);
} finally { await prisma.$disconnect(); }
