import "dotenv/config"
import bcrypt from "bcryptjs"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { PrismaClient } from "../src/generated/prisma/client"

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string)
const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.documentCategory.upsert({
    where: { code: "ST-LT" },
    update: {},
    create: { code: "ST-LT", name: "Surat / Letter (ST-LT)" },
  })

  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@g7aerospace.com.my"
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!"
  const passwordHash = await bcrypt.hash(password, 10)

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: process.env.SEED_ADMIN_NAME ?? "Admin",
      email,
      passwordHash,
      role: "ADMIN",
      position: "Administrator",
    },
  })

  console.log(`Seeded category ST-LT and admin user ${email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
