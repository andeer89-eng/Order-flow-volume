/**
 * Run once in the Deltalytix project to generate a personal API key for a user.
 *
 * Usage:
 *   npx ts-node deltalytix-integration/scripts/generate-api-key.ts <userId>
 *
 * The script prints the raw key (copy it into ELITE Settings → Personal API Key).
 * Only the hash is stored in the database — the raw key is never persisted.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function main() {
  const userId = process.argv[2]
  if (!userId) {
    console.error('Usage: npx ts-node generate-api-key.ts <userId>')
    process.exit(1)
  }

  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    console.error(`User not found: ${userId}`)
    process.exit(1)
  }

  const rawKey  = 'dlx_' + crypto.randomBytes(32).toString('hex')
  const keyHash = await bcrypt.hash(rawKey, 12)

  await prisma.personalApiKey.create({
    data: { userId, keyHash, label: 'Order Flow Elite' },
  })

  console.log('\n✅ API key created for', user.email ?? userId)
  console.log('\nCopy this key into ELITE → Settings → Personal API Key:\n')
  console.log('  ' + rawKey)
  console.log('\nThis key will NOT be shown again.\n')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
