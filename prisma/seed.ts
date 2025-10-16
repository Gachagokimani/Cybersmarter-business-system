import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Try to create user
    await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: { email: 'admin@example.com', name: 'Admin' },
    })
  } catch (error) {
    if (error.code === 'P2021') {
      console.log('User table missing. Creating it now...')
      // Manually create table if missing
      await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "User" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        name TEXT
      )`
      // Retry user creation
      await prisma.user.create({
        data: { email: 'admin@example.com', name: 'Admin' }
      })
    } else {
      throw error
    }
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 